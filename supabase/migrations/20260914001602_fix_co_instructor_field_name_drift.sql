-- Step 39 hotfix #2: independent live verification found create_class_with_co_instructors()'s
-- deployed body reads v_co->>'firstName' / v_co->>'lastName' (camelCase) instead of the
-- v_co->>'first_name' / v_co->>'last_name' (snake_case) keys the API route actually sends and
-- every other RPC/column in this project consistently uses - almost certainly introduced during
-- the manual DROP FUNCTION cleanup before pasting 20260914001600 in. Diagnosed by sending a
-- payload with BOTH naming conventions present in the same object and observing which one the
-- resulting row actually carried (camelCase won, snake_case was silently ignored).
--
-- Same signature as before (uuid,text,text,text,text,jsonb) -> uuid, so a plain CREATE OR REPLACE
-- is sufficient; no DROP FUNCTION needed this time.
CREATE OR REPLACE FUNCTION public.create_class_with_co_instructors(
  p_course_id uuid,
  p_course_identifier text,
  p_section_title text,
  p_term_token text,
  p_join_code text,
  p_co_instructors jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_class_id uuid;
  v_co jsonb;
  v_resolved_id uuid;
BEGIN
  INSERT INTO public.classes (instructor_id, course_id, course_identifier, section_title, term_token, join_code)
  VALUES (auth.uid(), p_course_id, p_course_identifier, p_section_title, p_term_token, p_join_code)
  RETURNING id INTO v_class_id;

  FOR v_co IN SELECT * FROM jsonb_array_elements(p_co_instructors)
  LOOP
    v_resolved_id := public.resolve_instructor_profile_by_email(v_co->>'email');

    INSERT INTO public.class_co_instructors (class_id, instructor_id, first_name, last_name, email)
    VALUES (v_class_id, v_resolved_id, v_co->>'first_name', v_co->>'last_name', v_co->>'email');
  END LOOP;

  RETURN v_class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_class_with_co_instructors(uuid, text, text, text, text, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
