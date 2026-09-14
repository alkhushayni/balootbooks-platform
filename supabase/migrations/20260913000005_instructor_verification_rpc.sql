-- Approves a pending instructor application: flips a profile from 'unverified_instructor' to
-- 'instructor', gated by the existing is_platform_admin() helper. SECURITY DEFINER so the
-- UPDATE itself can proceed regardless of what RLS policies exist on profiles (there is
-- currently no admin-facing UPDATE policy on that table at all) — the authorization boundary
-- is the explicit is_platform_admin() check below, not table-level RLS.
CREATE OR REPLACE FUNCTION public.verify_instructor_profile(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'You do not have permission to verify instructors.';
  END IF;

  UPDATE public.profiles
  SET role = 'instructor'
  WHERE id = p_profile_id AND role = 'unverified_instructor';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That profile is not currently pending instructor verification.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_instructor_profile(uuid) TO authenticated;

-- Lists profiles pending instructor verification, same admin gate as above. This is a second,
-- necessary function beyond what was asked: profiles.email doesn't exist (email lives on
-- auth.users, which PostgREST never exposes to the client under any RLS policy), so there is no
-- way to display "Email" per pending applicant without a SECURITY DEFINER function doing the
-- join server-side — the same reason get_class_roster needed one earlier in this project.
CREATE OR REPLACE FUNCTION public.list_unverified_instructors()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  institution_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'You do not have permission to view pending instructor applications.';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, u.email::text, p.institution_name
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'unverified_instructor'
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_unverified_instructors() TO authenticated;
