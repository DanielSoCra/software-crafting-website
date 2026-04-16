-- 004_questionnaire_supabase_sot.sql
-- Extend forms/responses for questionnaire publishing workflow
-- Adds 'published' status, timestamps, RLS enhancements
-- Date: 2026-04-07

BEGIN;

-- ============================================================================
-- 1. Extend forms table with new columns and status
-- ============================================================================

-- Add new columns (safe: IF NOT EXISTS pattern)
ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT now();

-- Update status CHECK constraint to include 'published'
ALTER TABLE forms
  DROP CONSTRAINT IF EXISTS forms_status_check;

ALTER TABLE forms
  ADD CONSTRAINT forms_status_check
  CHECK (status IN ('draft', 'published', 'sent', 'in_progress', 'completed'));

-- Add UNIQUE constraint: only one draft per client (use index, not constraint)
CREATE UNIQUE INDEX IF NOT EXISTS uq_forms_draft_per_client
  ON forms (client_id, status) WHERE status = 'draft';

-- ============================================================================
-- 2. Extend user_roles with client_id for cleaner RLS (optional)
-- ============================================================================

-- Add client_id column if not already present
ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_client_id ON user_roles(client_id);

-- Note: admin role keeps client_id = NULL (represents "all clients")
--       client role has client_id = specific (e.g., arinya's UUID)

-- ============================================================================
-- 3. Extend responses table with client_id for direct filtering
-- ============================================================================

-- Add client_id to responses for efficient RLS
ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Populate existing rows (join through forms → clients)
UPDATE responses
SET client_id = f.client_id
FROM forms f
WHERE responses.form_id = f.id
  AND responses.client_id IS NULL;

-- Make client_id NOT NULL after population
ALTER TABLE responses
  ALTER COLUMN client_id SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_responses_client_id ON responses(client_id);

-- Add unique constraint: one response per form
ALTER TABLE responses
  DROP CONSTRAINT IF EXISTS uq_responses_form_id;

ALTER TABLE responses
  ADD CONSTRAINT uq_responses_form_id UNIQUE (form_id);

-- ============================================================================
-- 4. Update status transition trigger to handle 'published' status
-- ============================================================================

-- New trigger: enforce_form_status_transition
-- Allows: draft → published, published → sent, published → in_progress
--         sent → in_progress, in_progress → completed
-- Clients may only: sent → in_progress → completed
-- Admins: unrestricted
CREATE OR REPLACE FUNCTION enforce_form_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins are unrestricted
  IF is_admin() THEN
    -- Track status change timestamp
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.status_updated_at := now();
      -- Set sent_at when transitioning to 'sent'
      IF NEW.status = 'sent' AND OLD.status IS DISTINCT FROM 'sent' THEN
        NEW.sent_at := now();
      END IF;
      -- Set published_at when transitioning to 'published'
      IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
        NEW.published_at := now();
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Clients may only transition: sent → in_progress → completed
  IF NEW.status = OLD.status THEN
    -- Status unchanged, allow (draft_answers save)
    RETURN NEW;
  END IF;

  -- Validate forward-only transitions for clients
  IF (OLD.status = 'sent' AND NEW.status = 'in_progress') OR
     (OLD.status = 'in_progress' AND NEW.status = 'completed') THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.status_updated_at := now();
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid status transition from % to % for non-admin', OLD.status, NEW.status;
END;
$$;

-- Trigger already exists; just recreate if needed (idempotent)
DROP TRIGGER IF EXISTS trg_enforce_form_status_transition ON forms;
CREATE TRIGGER trg_enforce_form_status_transition
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION enforce_form_status_transition();

-- ============================================================================
-- 5. Set published_at when form transitions to published (admin action)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_form_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_form_published_at ON forms;
CREATE TRIGGER trg_set_form_published_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION set_form_published_at();

-- ============================================================================
-- 6. RLS Policies — update for published form access and tenant isolation
-- ============================================================================

-- Drop existing policies to replace them (PostgreSQL doesn't support CREATE OR REPLACE POLICY)
DROP POLICY IF EXISTS forms_select ON forms;
DROP POLICY IF EXISTS forms_insert ON forms;
DROP POLICY IF EXISTS forms_update ON forms;
DROP POLICY IF EXISTS responses_select ON responses;
DROP POLICY IF EXISTS responses_insert ON responses;

-- Admin can see all forms regardless of status
CREATE POLICY forms_select ON forms
  FOR SELECT USING (
    is_admin() OR (client_id = get_client_id_for_user() AND status IN ('sent', 'in_progress', 'completed'))
  );

-- Only admins can insert forms (creates draft)
CREATE POLICY forms_insert ON forms
  FOR INSERT WITH CHECK (
    is_admin()
  );

-- Admins unrestricted; clients can update sent/in_progress forms
-- Transition validation is enforced by enforce_form_status_transition() trigger
CREATE POLICY forms_update ON forms
  FOR UPDATE
  USING (
    is_admin() OR (client_id = get_client_id_for_user() AND status IN ('sent', 'in_progress'))
  )
  WITH CHECK (
    is_admin() OR (client_id = get_client_id_for_user() AND status IN ('in_progress', 'completed'))
  );

-- Update responses policies to use client_id directly and enforce tenant isolation
CREATE POLICY responses_select ON responses
  FOR SELECT USING (
    is_admin() OR (client_id = get_client_id_for_user())
  );

-- Insert check: verify both client_id AND form belongs to same client
CREATE POLICY responses_insert ON responses
  FOR INSERT WITH CHECK (
    is_admin() OR (
      client_id = get_client_id_for_user() AND
      form_id IN (
        SELECT id FROM forms
        WHERE client_id = get_client_id_for_user()
          AND status IN ('sent', 'in_progress')
      )
    )
  );

COMMIT;
