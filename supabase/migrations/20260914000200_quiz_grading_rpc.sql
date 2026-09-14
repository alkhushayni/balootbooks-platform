-- The column-level hardening on quiz_questions.correct_index (REVOKE SELECT FROM authenticated)
-- blocks more than intended: the Next.js API route at /api/quiz/submit reads correct_index
-- using the SSR client tied to the student's own session cookies, not a service-role bypass -
-- there's no separate "trusted server" Postgres role in this architecture, so it hits the same
-- REVOKE as the browser and grading breaks entirely (confirmed live: every submission now 404s).
--
-- The correct fix is the same SECURITY DEFINER pattern already used for
-- redeem_class_join_code/verify_instructor_profile: a narrow function that runs with elevated
-- privileges for exactly this one operation, reads correct_index internally, grades, and logs
-- the submission atomically in a single statement - never returning the raw column to any caller
-- who hasn't just answered.
CREATE OR REPLACE FUNCTION public.grade_quiz_answer(p_question_id uuid, p_selected_index int)
RETURNS TABLE (is_correct boolean, correct_index int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_index int;
  v_is_correct boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Only student accounts can submit quiz answers.';
  END IF;

  SELECT quiz_questions.correct_index INTO v_correct_index
  FROM public.quiz_questions
  WHERE quiz_questions.id = p_question_id;

  IF v_correct_index IS NULL THEN
    RAISE EXCEPTION 'Quiz question not found.';
  END IF;

  v_is_correct := (p_selected_index = v_correct_index);

  INSERT INTO public.quiz_submissions (student_id, question_id, selected_index, is_correct)
  VALUES (auth.uid(), p_question_id, p_selected_index, v_is_correct);

  RETURN QUERY SELECT v_is_correct, v_correct_index;
END;
$$;
