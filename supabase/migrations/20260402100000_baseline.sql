-- Baseline snapshot of the `web_agency` Supabase project as of 2026-04-16.
--
-- Consolidates the prior fragmented migrations (001 initial schema, 002
-- deliverables, 003 storage_uploads, 004 questionnaire, mood_board_feedback,
-- deliverables_freeze_viewed_at) into a single reproducible starting point,
-- plus schema drift that was previously applied manually via the Supabase
-- dashboard and never recorded as a migration.
--
-- A fresh `supabase db push` to a new project after this file runs produces
-- an identical schema to production.

BEGIN;

-- ============================================================================
-- 1. Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================================================
-- 2. Helper functions (pure SQL, SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_client_id_for_user()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.clients
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- 3. Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id       uuid REFERENCES auth.users(id),
  company       text NOT NULL,
  contact_name  text,
  slug          text NOT NULL UNIQUE,
  email         text,
  phone         text,
  formality     text CHECK (formality IN ('du', 'sie')),
  industry_key  text,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  role       text NOT NULL CHECK (role IN ('admin', 'client')),
  client_id  uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.forms (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  client_id         uuid NOT NULL REFERENCES public.clients(id),
  title             text,
  schema            jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_answers     jsonb DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'sent', 'in_progress', 'completed')),
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now(),
  completed_at      timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  sent_at           timestamptz,
  published_at      timestamptz,
  status_updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.responses (
  id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  form_id       uuid NOT NULL REFERENCES public.forms(id),
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  answers       jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deliverables (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type          text NOT NULL
                CHECK (type IN ('analysis', 'mood-board', 'brand-guide', 'website-preview', 'proposal')),
  status        text NOT NULL DEFAULT 'published'
                CHECK (status IN ('published', 'viewed')),
  published_at  timestamptz DEFAULT now(),
  viewed_at     timestamptz,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (client_id, type)
);

CREATE TABLE IF NOT EXISTS public.mood_board_feedback (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id     uuid NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  client_id          uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  variant_name       text NOT NULL,
  vote               text,
  is_favorite        boolean DEFAULT false,
  comment_negative   text,
  comment_positive   text,
  comment_very_good  text,
  status             text DEFAULT 'editing',
  submitted_at       timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE (deliverable_id, client_id, variant_name)
);

-- ============================================================================
-- 4. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clients_user_id   ON public.clients (user_id);
CREATE INDEX IF NOT EXISTS idx_clients_slug      ON public.clients (slug);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_user_id
  ON public.clients (user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id   ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_client_id ON public.user_roles (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_user_role
  ON public.user_roles (user_id, role);

CREATE INDEX IF NOT EXISTS idx_forms_client_id ON public.forms (client_id);
CREATE INDEX IF NOT EXISTS idx_forms_status    ON public.forms (status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_forms_draft_per_client
  ON public.forms (client_id, status) WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_responses_form_id   ON public.responses (form_id);
CREATE INDEX IF NOT EXISTS idx_responses_client_id ON public.responses (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_responses_form_id
  ON public.responses (form_id);

CREATE INDEX IF NOT EXISTS idx_deliverables_client_id
  ON public.deliverables (client_id);

CREATE INDEX IF NOT EXISTS idx_mood_board_deliverable
  ON public.mood_board_feedback (deliverable_id);
CREATE INDEX IF NOT EXISTS idx_mood_board_client
  ON public.mood_board_feedback (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mood_board_favorite
  ON public.mood_board_feedback (deliverable_id, client_id) WHERE is_favorite = true;

-- ============================================================================
-- 5. Trigger functions (plpgsql, SECURITY DEFINER where needed)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_form_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.status_updated_at := now();
      IF NEW.status = 'sent' AND OLD.status IS DISTINCT FROM 'sent' THEN
        NEW.sent_at := now();
      END IF;
      IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
        NEW.published_at := now();
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.protect_form_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.schema     := OLD.schema;
    NEW.title      := OLD.title;
    NEW.created_by := OLD.created_by;
    NEW.client_id  := OLD.client_id;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_form_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.completed_at  := now();
    NEW.draft_answers := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_form_published_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_deliverable_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.type := OLD.type;
    IF OLD.status = 'published' AND NEW.status = 'viewed' THEN
      NULL;
    ELSE
      NEW.status := OLD.status;
    END IF;
    NEW.published_at := OLD.published_at;
    NEW.metadata     := OLD.metadata;
    NEW.client_id    := OLD.client_id;
    NEW.created_at   := OLD.created_at;
    -- First-set-wins: once viewed_at is written, a non-admin cannot clear it.
    NEW.viewed_at    := COALESCE(OLD.viewed_at, NEW.viewed_at);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 6. Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_enforce_form_status_transition ON public.forms;
CREATE TRIGGER trg_enforce_form_status_transition
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.enforce_form_status_transition();

DROP TRIGGER IF EXISTS trg_protect_form_columns ON public.forms;
CREATE TRIGGER trg_protect_form_columns
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.protect_form_columns();

DROP TRIGGER IF EXISTS trg_set_form_completed_at ON public.forms;
CREATE TRIGGER trg_set_form_completed_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.set_form_completed_at();

DROP TRIGGER IF EXISTS trg_set_form_published_at ON public.forms;
CREATE TRIGGER trg_set_form_published_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.set_form_published_at();

DROP TRIGGER IF EXISTS trg_protect_deliverable_columns ON public.deliverables;
CREATE TRIGGER trg_protect_deliverable_columns
  BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.protect_deliverable_columns();

-- ============================================================================
-- 7. Row Level Security — enable
-- ============================================================================

ALTER TABLE public.clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_board_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. Policies — clients
-- ============================================================================

DROP POLICY IF EXISTS clients_select_own ON public.clients;
CREATE POLICY clients_select_own ON public.clients
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS clients_insert_admin ON public.clients;
CREATE POLICY clients_insert_admin ON public.clients
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS clients_update_admin ON public.clients;
CREATE POLICY clients_update_admin ON public.clients
  FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- 9. Policies — user_roles
-- ============================================================================

DROP POLICY IF EXISTS roles_select ON public.user_roles;
CREATE POLICY roles_select ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS roles_insert_admin ON public.user_roles;
CREATE POLICY roles_insert_admin ON public.user_roles
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS roles_update_admin ON public.user_roles;
CREATE POLICY roles_update_admin ON public.user_roles
  FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- 10. Policies — forms
-- Admins have full access. Clients only see published-to-them statuses and
-- may only advance their own form (transition validated by the trigger).
-- ============================================================================

DROP POLICY IF EXISTS forms_select ON public.forms;
CREATE POLICY forms_select ON public.forms
  FOR SELECT USING (
    public.is_admin()
    OR (
      client_id = public.get_client_id_for_user()
      AND status IN ('sent', 'in_progress', 'completed')
    )
  );

DROP POLICY IF EXISTS forms_insert ON public.forms;
CREATE POLICY forms_insert ON public.forms
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS forms_update ON public.forms;
CREATE POLICY forms_update ON public.forms
  FOR UPDATE
  USING (
    public.is_admin()
    OR (client_id = public.get_client_id_for_user() AND status IN ('sent', 'in_progress'))
  )
  WITH CHECK (
    public.is_admin()
    OR (client_id = public.get_client_id_for_user() AND status IN ('in_progress', 'completed'))
  );

-- ============================================================================
-- 11. Policies — responses
-- ============================================================================

DROP POLICY IF EXISTS responses_select ON public.responses;
CREATE POLICY responses_select ON public.responses
  FOR SELECT USING (
    public.is_admin() OR client_id = public.get_client_id_for_user()
  );

DROP POLICY IF EXISTS responses_insert ON public.responses;
CREATE POLICY responses_insert ON public.responses
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR (
      client_id = public.get_client_id_for_user()
      AND form_id IN (
        SELECT id FROM public.forms
        WHERE client_id = public.get_client_id_for_user()
          AND status IN ('sent', 'in_progress')
      )
    )
  );

-- ============================================================================
-- 12. Policies — deliverables
-- client_id immutability enforced by trigger; WITH CHECK seals RLS on writes.
-- ============================================================================

DROP POLICY IF EXISTS deliverables_select ON public.deliverables;
CREATE POLICY deliverables_select ON public.deliverables
  FOR SELECT USING (
    client_id = public.get_client_id_for_user() OR public.is_admin()
  );

DROP POLICY IF EXISTS deliverables_insert_admin ON public.deliverables;
CREATE POLICY deliverables_insert_admin ON public.deliverables
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS deliverables_update_admin ON public.deliverables;
CREATE POLICY deliverables_update_admin ON public.deliverables
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS deliverables_update_client ON public.deliverables;
CREATE POLICY deliverables_update_client ON public.deliverables
  FOR UPDATE
  USING (client_id = public.get_client_id_for_user())
  WITH CHECK (client_id = public.get_client_id_for_user());

-- ============================================================================
-- 13. Policies — mood_board_feedback
-- Clients: SELECT/INSERT/UPDATE own rows while status='editing'.
-- Admins: SELECT all, UPDATE (for unlock).
-- ============================================================================

DROP POLICY IF EXISTS "Clients can view own feedback" ON public.mood_board_feedback;
CREATE POLICY "Clients can view own feedback"
  ON public.mood_board_feedback FOR SELECT
  USING (client_id = public.get_client_id_for_user());

DROP POLICY IF EXISTS "Clients can insert feedback" ON public.mood_board_feedback;
CREATE POLICY "Clients can insert feedback"
  ON public.mood_board_feedback FOR INSERT
  WITH CHECK (client_id = public.get_client_id_for_user());

DROP POLICY IF EXISTS "Clients can update own feedback if editing" ON public.mood_board_feedback;
CREATE POLICY "Clients can update own feedback if editing"
  ON public.mood_board_feedback FOR UPDATE
  USING (client_id = public.get_client_id_for_user() AND status = 'editing');

DROP POLICY IF EXISTS "Admins can view all feedback" ON public.mood_board_feedback;
CREATE POLICY "Admins can view all feedback"
  ON public.mood_board_feedback FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can unlock feedback" ON public.mood_board_feedback;
CREATE POLICY "Admins can unlock feedback"
  ON public.mood_board_feedback FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- 14. Storage bucket for form uploads
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-uploads',
  'form-uploads',
  false,
  10485760,
  ARRAY[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'application/pdf',
    'application/postscript',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS form_uploads_insert ON storage.objects;
CREATE POLICY form_uploads_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'form-uploads'
    AND (
      (split_part(name, '/', 1))::uuid IN (
        SELECT f.id FROM public.forms f
        WHERE f.client_id = public.get_client_id_for_user()
      )
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS form_uploads_select ON storage.objects;
CREATE POLICY form_uploads_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'form-uploads'
    AND (
      (split_part(name, '/', 1))::uuid IN (
        SELECT f.id FROM public.forms f
        WHERE f.client_id = public.get_client_id_for_user()
      )
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS form_uploads_update ON storage.objects;
CREATE POLICY form_uploads_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'form-uploads'
    AND (
      (split_part(name, '/', 1))::uuid IN (
        SELECT f.id FROM public.forms f
        WHERE f.client_id = public.get_client_id_for_user()
      )
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS form_uploads_delete_admin ON storage.objects;
CREATE POLICY form_uploads_delete_admin ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'form-uploads' AND public.is_admin());

-- ============================================================================
-- 15. Realtime publication — mood_board_feedback needs live UPDATE events
-- so the admin unlock flow can reload the client's browser.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'mood_board_feedback'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mood_board_feedback;
  END IF;
END $$;

COMMIT;
