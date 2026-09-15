-- Step 40 follow-up, retry #3: the deployed is_instructor_of_enrolled_student(p_section_id,
-- p_student_id) - a hand-modified two-parameter redesign - is confirmed callable (returns a clean
-- 200) but returns false for a fully valid positive case (a real instructor's own class, a real
-- enrolled student, a real section). Its internal logic has a bug I can't see without reading the
-- function body directly, which I don't have SQL access to do.
--
-- Separately, scoping this check by section_id at all is a regression versus the original policy:
-- student_progress also tracks progress on class_custom_sections via a second nullable FK
-- (class_custom_section_id, added in 20260914000100), and the original enrollment-only predicate
-- covered both master and custom sections correctly since it never referenced section identity.
-- A section_id-scoped check would silently drop instructor visibility into their own
-- custom-section progress - something that was never broken before this fix attempt.
--
-- Reverting to a single-parameter function matching the original policy's semantics exactly:
-- "is this student enrolled in a class I instruct" - no section-level scoping, so both master and
-- custom section progress rows remain visible, exactly as they always were meant to be.
DROP FUNCTION IF EXISTS public.is_instructor_of_enrolled_student(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_instructor_of_enrolled_student(uuid);

CREATE FUNCTION public.is_instructor_of_enrolled_student(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.enrollments e ON e.class_id = c.id
    WHERE c.instructor_id = auth.uid()
      AND e.student_id = p_student_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_instructor_of_enrolled_student(uuid) TO authenticated;

DROP POLICY IF EXISTS "Instructors read progress of students enrolled in their classes" ON public.student_progress;

CREATE POLICY "Instructors read progress of students enrolled in their classes"
  ON public.student_progress
  FOR SELECT
  TO authenticated
  USING (public.is_instructor_of_enrolled_student(student_id));

NOTIFY pgrst, 'reload schema';
