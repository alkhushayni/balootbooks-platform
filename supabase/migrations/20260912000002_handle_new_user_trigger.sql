-- Auto-provision a public.profiles row whenever a new auth.users record is created.
-- raw_user_meta_data is client-controlled (it comes straight from the signUp() options.data
-- payload), so the role value can never be trusted verbatim: self-registration is only ever
-- allowed to produce 'student' or 'unverified_instructor'. Anything else (missing, malformed,
-- or an attempt to claim 'instructor'/'platform_admin'/'super_admin') is downgraded to 'student'.
-- Elevation beyond that must go through the admin-driven verification/privilege flows.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT := NEW.raw_user_meta_data ->> 'role';
  resolved_role TEXT;
  resolved_name TEXT;
BEGIN
  resolved_role := CASE
    WHEN requested_role IN ('student', 'unverified_instructor') THEN requested_role
    ELSE 'student'
  END;

  resolved_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'New User'
  );

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, resolved_name, resolved_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
