-- Step 40 follow-up, retry #2: the raw inline EXISTS predicate for "Instructors read progress of
-- students enrolled in their classes" has now failed to grant access twice in a row (20260914001800
-- and its predecessor), despite every table it depends on (classes, enrollments) being
-- independently confirmed visible to the primary instructor under their own RLS in isolation.
--
-- Rather than retry the identical inline predicate a third time, this wraps the same check in a
-- narrow SECURITY DEFINER helper function - the established idiom this codebase already uses for
-- every other cross-table RLS check (is_instructor_of_class, is_co_instructor_of_class, etc.).
-- This removes any remaining uncertainty about subquery-level RLS visibility and gives a genuinely
-- different code path than the two prior attempts.
CREATE OR REPLACE FUNCTION public.is_instructor_of_enrolled_student(p_student_id uuid)
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
