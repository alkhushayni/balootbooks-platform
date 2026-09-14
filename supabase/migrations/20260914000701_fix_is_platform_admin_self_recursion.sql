-- CRITICAL, app-wide fix: discovered via live REST verification for Step 28, but this breaks
-- every authenticated read of public.profiles, for every role, including a plain student reading
-- their OWN row - the exact query every guard-chain page in this app runs first. Confirmed live:
-- both an elevated admin session and a completely unmodified throwaway student session both got
-- 42P17 "infinite recursion detected in policy for relation profiles" on the simplest possible
-- self-row SELECT.
--
-- Root cause: is_platform_admin() (Step 7) was written as the SQL default, SECURITY INVOKER,
-- because at the time its only caller context was OTHER tables' policies (courses, institutions,
-- classes, etc.) checking a one-directional dependency on profiles - safe, since profiles' own
-- policies never called back into those tables. Step 28's new "Admins view all profiles" policy
-- put is_platform_admin() directly ON profiles itself for the first time. Since the function is
-- SECURITY INVOKER, its internal `SELECT ... FROM public.profiles WHERE id = auth.uid()` is
-- subject to the calling session's own RLS on profiles - which means evaluating profiles' policy
-- set again, which calls is_platform_admin() again, forming a direct self-referential cycle that
-- Postgres detects structurally and refuses to plan at all, for any row.
--
-- Fixed by making is_platform_admin() SECURITY DEFINER, exactly the pattern already used for
-- every other reusable permission-check function in this schema (is_domain_allowlisted,
-- is_chair_over_profile, is_chair_over_progress_row, is_chair_over_enrolled_class) for precisely
-- this reason - a SECURITY DEFINER function's internal queries are not subject to the caller's
-- RLS, so it can read profiles without re-triggering profiles' own policy set. This is a body-only
-- change: every existing caller across institutions, tenant_domains, courses, chapters, sections,
-- and classes keeps working unchanged, since SECURITY DEFINER only affects how the function's own
-- internal query is evaluated, not its signature or return value.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'platform_admin')
  );
$$;
