-- Step 38: Bounded AI Chat Study Buddy quota tracking.
ALTER TABLE public.profiles ADD COLUMN monthly_ai_queries INT NOT NULL DEFAULT 0;

-- Self-referential by construction - no parameter at all, just auth.uid() internally, so there is
-- no possible way to pass the wrong user id (a stricter guarantee than an IF p_user_id != auth.uid()
-- check on a parameterized version would give). Returns the new count, which the caller can use
-- directly instead of re-querying profiles. profiles has no general UPDATE policy for regular
-- users at all (only self-SELECT and admin-broad-SELECT exist), so this SECURITY DEFINER function
-- is the only path capable of writing this column - there is no separate RLS policy to add for it.
CREATE OR REPLACE FUNCTION public.increment_user_ai_query_count()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count int;
BEGIN
  UPDATE public.profiles
  SET monthly_ai_queries = monthly_ai_queries + 1
  WHERE id = auth.uid()
  RETURNING monthly_ai_queries INTO v_new_count;

  RETURN v_new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_user_ai_query_count() TO authenticated;

NOTIFY pgrst, 'reload schema';
