-- Step 40 hotfix: independent live verification found that the "Instructors and co-instructors
-- view their course's submission matrix" SELECT policy from 20260914001700 never actually took
-- effect - every table its predicate depends on (sections, chapters, the instructor's own classes
-- row) reads back correctly and consistently for a real instructor of a real class mapped to a
-- real section's course, yet SELECT on lab_submissions itself returns empty both filtered and
-- unfiltered. That is the same "zero applicable permissive policies for this command" signature
-- diagnosed in Step 39's very first hotfix, not a bad predicate.
--
-- DROP POLICY IF EXISTS makes this safe to run regardless of the table's current state.
DROP POLICY IF EXISTS "Instructors and co-instructors view their course's submission matrix" ON public.lab_submissions;

CREATE POLICY "Instructors and co-instructors view their course's submission matrix"
  ON public.lab_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sections s
      JOIN public.chapters ch ON ch.id = s.chapter_id
      JOIN public.classes c ON c.course_id = ch.course_id
      WHERE s.id = public.lab_submissions.section_id
        AND (c.instructor_id = auth.uid() OR public.is_co_instructor_of_class(c.id))
    )
  );

NOTIFY pgrst, 'reload schema';
