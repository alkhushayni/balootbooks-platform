-- Step 40 follow-up: repairs the dormant "Instructors read progress of students enrolled in
-- their classes" SELECT policy on public.student_progress. Independent testing during Step 39's
-- verification found that even the PRIMARY instructor - not just co-instructors - never actually
-- gets access via a direct table SELECT, despite the predicate structurally matching the
-- already-proven-working classes/enrollments co-instructor policies (is_co_instructor_of_class(...)
-- swapped for instructor_id = auth.uid()). This was never a blocker for any real feature, since
-- every actual instructor-facing read goes through the get_class_roster() SECURITY DEFINER RPC,
-- which bypasses RLS entirely - that's the only reason it went unnoticed.
--
-- DROP POLICY IF EXISTS + CREATE POLICY is the same idempotent remediation that has correctly
-- fixed every other "policy never took effect live" case in Steps 39 and 40.
DROP POLICY IF EXISTS "Instructors read progress of students enrolled in their classes" ON public.student_progress;

CREATE POLICY "Instructors read progress of students enrolled in their classes"
  ON public.student_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.classes c
      JOIN public.enrollments e ON e.class_id = c.id
      WHERE c.instructor_id = auth.uid()
        AND e.student_id = public.student_progress.student_id
    )
  );

NOTIFY pgrst, 'reload schema';
