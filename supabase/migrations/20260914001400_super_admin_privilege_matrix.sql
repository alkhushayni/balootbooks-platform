-- Step: Super Admin Privilege Matrix. Renumbered to 001400 - 001300 was already used for the
-- profiles cascade-delete hotfix in the immediately preceding session turn.
CREATE TABLE public.admin_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    can_prompt_ai_factory BOOLEAN DEFAULT FALSE NOT NULL,
    can_verify_faculty BOOLEAN DEFAULT FALSE NOT NULL,
    can_manage_billing BOOLEAN DEFAULT FALSE NOT NULL,
    can_view_audit_logs BOOLEAN DEFAULT FALSE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.admin_capabilities ENABLE ROW LEVEL SECURITY;

-- The existing is_platform_admin() matches BOTH platform_admin and super_admin - this spec wants
-- exclusively super_admin, so a separate, narrower helper is needed rather than reusing it.
-- SECURITY DEFINER from the outset, matching every other reusable role-check function in this
-- schema (is_platform_admin itself only became DEFINER after a real recursion bug - starting this
-- one correctly avoids that class of bug entirely).
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE POLICY "Super admins view capability matrix"
    ON public.admin_capabilities FOR SELECT TO authenticated
    USING (public.is_super_admin());

CREATE POLICY "Super admins manage capability matrix"
    ON public.admin_capabilities FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Auto-instantiates an all-false capability row whenever a profile is promoted to platform_admin
-- or super_admin. Scoped to UPDATE OF role specifically (fires only when role is part of the SET
-- list, not on every unrelated profile edit) and guarded by OLD.role IS DISTINCT FROM NEW.role so
-- re-saving the same role doesn't re-fire pointlessly. SECURITY DEFINER so the auto-provisioning
-- insert succeeds regardless of which session's RLS permissions triggered the promotion - role
-- promotions in this project have always been run as the postgres superuser via the Supabase SQL
-- console (which bypasses RLS anyway), but this keeps the trigger correct even if a future
-- authenticated route performs the promotion instead.
CREATE OR REPLACE FUNCTION public.instantiate_admin_capabilities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IN ('platform_admin', 'super_admin') AND (OLD.role IS DISTINCT FROM NEW.role) THEN
    INSERT INTO public.admin_capabilities (admin_id)
    VALUES (NEW.id)
    ON CONFLICT (admin_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_instantiate_admin_capabilities
    AFTER UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.instantiate_admin_capabilities();

NOTIFY pgrst, 'reload schema';
