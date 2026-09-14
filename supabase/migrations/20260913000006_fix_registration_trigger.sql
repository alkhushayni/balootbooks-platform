-- Re-asserts the correct handle_new_user() logic. Confirmed live (registering a real account,
-- "Jordan Rivera", with the instructor checkbox checked) that new instructor signups land as
-- role='student' instead of 'unverified_instructor'.
--
-- This is NOT a frontend key-naming bug: frontend/src/app/(auth)/register/actions.ts already
-- resolves and sends the correct payload —
--   const role = isInstructor ? "unverified_instructor" : "student";
--   options: { data: { full_name: fullName, role } }
-- — under the key `role`, which is exactly what this function reads. Given every other RPC/
-- function deployed this session ended up differing from its migration file once live, the far
-- more likely explanation is that the deployed handle_new_user() itself has drifted from
-- 20260912000002_handle_new_user_trigger.sql. CREATE OR REPLACE overwrites whatever is
-- currently live under this function name — no need to touch the trigger binding itself, since
-- it already points at public.handle_new_user by name.
--
-- Logic is otherwise unchanged from the original: self-registration may only ever produce
-- 'student' or 'unverified_instructor' (never an admin/instructor role, since raw_user_meta_data
-- is fully client-controlled), and full_name falls back through the email's local part to a
-- literal default, since the column is NOT NULL.
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
