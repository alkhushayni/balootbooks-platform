-- courses/chapters/sections currently have SELECT-only RLS policies (read access for any
-- authenticated user, per the "Catalog Template Protection" model in the spec). There is no
-- INSERT or UPDATE policy on any of the three tables yet, so with RLS enabled every write is
-- denied by default regardless of the caller's profiles.role. This adds exactly that: a
-- reusable admin-check helper, plus explicit INSERT/UPDATE policies (both USING and WITH CHECK
-- stated directly — no bare "FOR ALL USING" shortcuts this time) scoped to
-- profiles.role IN ('super_admin', 'platform_admin'). DELETE is intentionally left alone since
-- it wasn't asked for and cascades through chapters/sections.
--
-- is_platform_admin() only ever reads the CALLER's own profiles row (id = auth.uid()), which the
-- existing "Users can safely view their own public profile records" SELECT policy already
-- permits under normal invoker rights, so this runs as SECURITY INVOKER (no privilege escalation
-- needed).
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'platform_admin')
  );
$$;

CREATE POLICY "Admins insert catalog courses"
    ON public.courses FOR INSERT TO authenticated
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admins update catalog courses"
    ON public.courses FOR UPDATE TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admins insert catalog chapters"
    ON public.chapters FOR INSERT TO authenticated
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admins update catalog chapters"
    ON public.chapters FOR UPDATE TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admins insert catalog sections"
    ON public.sections FOR INSERT TO authenticated
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admins update catalog sections"
    ON public.sections FOR UPDATE TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());
