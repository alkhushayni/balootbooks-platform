-- Step 24: generalizes Step 11's one-directional verify_instructor_profile()/
-- list_unverified_instructors() into a single admin-managed verify+revoke flow. There is no
-- is_verified_instructor column in this schema (confirmed repeatedly this session) -
-- "verification" has always been represented by profiles.role transitioning between
-- 'unverified_instructor' and 'instructor'; this migration keeps that model rather than adding a
-- redundant boolean column, and extends it to allow reverting role back to
-- 'unverified_instructor' (a "revoke" action Step 11 never supported).
--
-- Both functions are SECURITY DEFINER because auth.users.email is never exposed via any RLS
-- policy path, and because updating another user's profiles row requires elevated privileges no
-- authenticated session has by default. Both re-check public.is_platform_admin() internally, so
-- the elevated privilege is exercised only for a genuine admin caller.
CREATE OR REPLACE FUNCTION public.set_instructor_verification(p_profile_id uuid, p_is_verified boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can verify or revoke instructor accounts.';
  END IF;

  UPDATE public.profiles
  SET role = CASE WHEN p_is_verified THEN 'instructor' ELSE 'unverified_instructor' END
  WHERE id = p_profile_id
    AND role IN ('instructor', 'unverified_instructor');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target profile not found or is not an instructor-track account.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_instructor_accounts()
RETURNS TABLE (
    id uuid,
    full_name text,
    email text,
    institution_name text,
    role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can list instructor accounts.';
  END IF;

  RETURN QUERY
  SELECT p.id, p.full_name, u.email::text, p.institution_name, p.role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role IN ('instructor', 'unverified_instructor')
  ORDER BY (p.role = 'unverified_instructor') DESC, p.full_name;
END;
$$;
