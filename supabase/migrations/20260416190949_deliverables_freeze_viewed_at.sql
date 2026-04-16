-- Harden deliverables UPDATE policy and trigger:
--   1. Add WITH CHECK so the row's client_id cannot be changed to a foreign
--      client via UPDATE (RLS otherwise only enforces USING on the read side).
--   2. Freeze viewed_at for non-admins after first set — first-set-wins.
--      Prevents clients from clearing their own view timestamp, which would
--      confuse the admin-dashboard "Warten" alerts.

-- 1. Scope the client UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS deliverables_update_client ON public.deliverables;
CREATE POLICY deliverables_update_client ON public.deliverables
  FOR UPDATE
  USING (client_id = public.get_client_id_for_user())
  WITH CHECK (client_id = public.get_client_id_for_user());

-- 1b. Symmetric admin policy — both USING and WITH CHECK. Admins are trusted,
-- but symmetric policies are easier to audit and a future role scope (e.g.
-- per-client admins) would already have the right shape.
DROP POLICY IF EXISTS deliverables_update_admin ON public.deliverables;
CREATE POLICY deliverables_update_admin ON public.deliverables
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Freeze viewed_at for non-admins once it's set
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
    -- First-set-wins for viewed_at: once written, a non-admin cannot clear or rewrite it.
    NEW.viewed_at := COALESCE(OLD.viewed_at, NEW.viewed_at);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
