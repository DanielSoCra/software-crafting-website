-- 001_initial_schema.sql
-- Full initial schema for Pixelschmiede client portal
-- Includes tables, indexes, helper functions, triggers, and RLS policies

-- ============================================================================
-- 1. Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. Tables
-- ============================================================================

CREATE TABLE clients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id),
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  role       TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE forms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clients(id),
  title         TEXT NOT NULL,
  schema        JSONB NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'completed')),
  draft_answers JSONB,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE responses (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id    UUID NOT NULL REFERENCES forms(id),
  answers    JSONB NOT NULL DEFAULT '{}',
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. Indexes
-- ============================================================================

CREATE INDEX idx_clients_user_id ON clients(user_id);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

CREATE INDEX idx_forms_client_id ON forms(client_id);
CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX idx_forms_created_by ON forms(created_by);

CREATE INDEX idx_responses_form_id ON responses(form_id);
CREATE INDEX idx_responses_submitted_by ON responses(submitted_by);

-- ============================================================================
-- 4. Unique constraints
-- ============================================================================

-- Each auth user maps to at most one client
CREATE UNIQUE INDEX uq_clients_user_id ON clients(user_id) WHERE user_id IS NOT NULL;

-- One response per form
ALTER TABLE responses ADD CONSTRAINT uq_responses_form_id UNIQUE (form_id);

-- Prevent duplicate role assignments
CREATE UNIQUE INDEX uq_user_roles_user_role ON user_roles(user_id, role);

-- ============================================================================
-- 5. Helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION get_client_id_for_user()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM clients
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- 6. Triggers
-- ============================================================================

-- 6a. enforce_form_status_transition
--     Clients may only advance: sent → in_progress → completed.
--     Admins are unrestricted.
--     If status is unchanged, allow (draft_answers saves).
--     After completed, block all client changes.
CREATE OR REPLACE FUNCTION enforce_form_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  valid_transitions JSONB := '{"sent":"in_progress","in_progress":"completed"}'::JSONB;
BEGIN
  -- Admins are unrestricted
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  -- After completed, block all client changes
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Form is completed and cannot be modified';
  END IF;

  -- If status unchanged, allow (draft_answers save)
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Validate forward-only transition
  IF valid_transitions ->> OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER trg_enforce_form_status_transition
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION enforce_form_status_transition();

-- 6b. protect_form_columns
--     Non-admin users cannot change protected columns; reset to OLD values.
CREATE OR REPLACE FUNCTION protect_form_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    NEW.schema     := OLD.schema;
    NEW.title      := OLD.title;
    NEW.created_by := OLD.created_by;
    NEW.client_id  := OLD.client_id;
    NEW.created_at := OLD.created_at;
  END IF;
  -- Always auto-update updated_at
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_form_columns
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION protect_form_columns();

-- 6c. set_form_completed_at
--     When status transitions to 'completed', set completed_at and clear draft_answers.
CREATE OR REPLACE FUNCTION set_form_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.completed_at  := now();
    NEW.draft_answers := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_form_completed_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION set_form_completed_at();

-- 6d. update_updated_at on clients
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 7. Row Level Security
-- ============================================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- ---------- clients ----------

CREATE POLICY clients_select ON clients
  FOR SELECT USING (
    user_id = auth.uid() OR is_admin()
  );

CREATE POLICY clients_insert ON clients
  FOR INSERT WITH CHECK (
    is_admin()
  );

CREATE POLICY clients_update ON clients
  FOR UPDATE USING (
    is_admin()
  );

-- ---------- user_roles ----------

CREATE POLICY user_roles_select ON user_roles
  FOR SELECT USING (
    user_id = auth.uid() OR is_admin()
  );

CREATE POLICY user_roles_insert ON user_roles
  FOR INSERT WITH CHECK (
    is_admin()
  );

CREATE POLICY user_roles_update ON user_roles
  FOR UPDATE USING (
    is_admin()
  );

-- ---------- forms ----------

CREATE POLICY forms_select ON forms
  FOR SELECT USING (
    client_id = get_client_id_for_user() OR is_admin()
  );

CREATE POLICY forms_insert ON forms
  FOR INSERT WITH CHECK (
    is_admin()
  );

CREATE POLICY forms_update ON forms
  FOR UPDATE USING (
    (client_id = get_client_id_for_user() AND status != 'completed')
    OR is_admin()
  );

-- ---------- responses ----------

CREATE POLICY responses_select ON responses
  FOR SELECT USING (
    form_id IN (
      SELECT id FROM forms WHERE client_id = get_client_id_for_user()
    )
    OR is_admin()
  );

CREATE POLICY responses_insert ON responses
  FOR INSERT WITH CHECK (
    (
      form_id IN (
        SELECT id FROM forms
        WHERE client_id = get_client_id_for_user()
          AND status != 'completed'
      )
    )
    OR is_admin()
  );

-- ============================================================================
-- NOTE: DELETE policies are intentionally omitted.
-- Deletions should only happen via service-role key from the admin dashboard.
-- ============================================================================
