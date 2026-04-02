-- 002_deliverables.sql
-- Adds deliverables table for tracking published client deliverables

CREATE TABLE public.deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('analysis', 'mood-board', 'brand-guide', 'website-preview', 'proposal')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'viewed')),
  published_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, type)
);

CREATE INDEX idx_deliverables_client_id ON public.deliverables(client_id);

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY deliverables_select ON public.deliverables
  FOR SELECT USING (client_id = public.get_client_id_for_user() OR public.is_admin());
CREATE POLICY deliverables_insert_admin ON public.deliverables
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY deliverables_update_admin ON public.deliverables
  FOR UPDATE USING (public.is_admin());
CREATE POLICY deliverables_update_client ON public.deliverables
  FOR UPDATE USING (client_id = public.get_client_id_for_user());

CREATE OR REPLACE FUNCTION public.protect_deliverable_columns()
RETURNS trigger AS $func$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.type := OLD.type;
    IF OLD.status = 'published' AND NEW.status = 'viewed' THEN
      NULL;
    ELSE
      NEW.status := OLD.status;
    END IF;
    NEW.published_at := OLD.published_at;
    NEW.metadata := OLD.metadata;
    NEW.client_id := OLD.client_id;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_protect_deliverable_columns
  BEFORE UPDATE ON public.deliverables FOR EACH ROW
  EXECUTE FUNCTION public.protect_deliverable_columns();
