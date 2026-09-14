-- Live REST testing after 20260914000300 deployed found list_instructor_accounts() failing with
-- `42703 column p.email does not exist` - the deployed function apparently selects email from
-- the profiles alias, but public.profiles has never had an email column (confirmed repeatedly
-- this session; email lives only in auth.users, which is why this function is SECURITY DEFINER
-- in the first place - to join it safely). Reasserting the correct definition, unchanged from
-- the migration file: select email from the auth.users join, not profiles.
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
