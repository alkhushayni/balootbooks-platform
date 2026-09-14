-- Fixes a real bug discovered live in Step 29's CSV roster import route
-- (frontend/src/app/api/admin/sections/import/route.ts): its "this student already has an
-- account" fallback called GET /auth/v1/admin/users?email=... expecting the `email` query param
-- to filter results. It doesn't - confirmed live that this GoTrue Admin API deployment silently
-- ignores unknown query params and just returns page 1 of ALL users regardless of the email
-- requested. Every prior test of this path only had one real candidate account to resolve, so it
-- always "passed" by accident - with more than one real user in the system, it would have silently
-- resolved to the WRONG student and enrolled them instead of the one actually being re-imported.
--
-- A single indexed lookup against auth.users.email is both the correct fix and far more efficient
-- than paginating through every user over HTTP to filter client-side. Gated to platform admins
-- only (raises otherwise) since a UUID-for-email lookup exposed to any authenticated caller would
-- be a straightforward account-enumeration primitive - same reasoning as list_instructor_accounts().
CREATE OR REPLACE FUNCTION public.find_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can resolve a user id by email.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_auth_user_id_by_email(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
