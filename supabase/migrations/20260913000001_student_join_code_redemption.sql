-- Students need to see classes.* for the classes they've joined (to render their dashboard
-- cards), without exposing the rest of the table the way a broad "authenticated -> true"
-- policy would. Join-code lookup itself is handled by a SECURITY DEFINER function below
-- instead of a table policy, since a permissive "any authenticated user can SELECT" policy
-- would let any signed-in student list every class (and every join code) on the platform,
-- not just the one they already hold the code for.
CREATE POLICY "Students can view classes they are enrolled in"
    ON public.classes FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.class_id = classes.id AND e.student_id = auth.uid()
        )
    );

-- Redeems a class join code: looks the class up (bypassing the table's normal RLS via
-- SECURITY DEFINER, since students can't SELECT arbitrary classes rows directly), enforces
-- the class's restricted_domain guardrail against the caller's own email, and inserts the
-- enrollment row scoped to the caller's own auth.uid() only. No enrollments INSERT policy
-- is needed for students since this function is the only path that writes that row.
CREATE OR REPLACE FUNCTION public.redeem_class_join_code(p_join_code text)
RETURNS public.classes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class public.classes;
  v_email text;
  v_domain text;
  v_restricted text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to join a class.';
  END IF;

  SELECT * INTO v_class
  FROM public.classes
  WHERE join_code = upper(trim(p_join_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid classroom join token.';
  END IF;

  IF v_class.restricted_domain IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
    v_domain := lower(split_part(coalesce(v_email, ''), '@', 2));
    v_restricted := lower(v_class.restricted_domain);

    IF v_domain = '' OR NOT (
      v_domain = v_restricted
      OR right(v_domain, length(v_restricted) + 1) = '.' || v_restricted
    ) THEN
      RAISE EXCEPTION 'This class is restricted to % email addresses.', v_class.restricted_domain;
    END IF;
  END IF;

  INSERT INTO public.enrollments (student_id, class_id)
  VALUES (auth.uid(), v_class.id)
  ON CONFLICT (student_id, class_id) DO NOTHING;

  RETURN v_class;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_class_join_code(text) TO authenticated;
