-- Step 40 hotfix #2: independent live verification (with a full test-account cleanup first, to
-- rule out stale data from an earlier crashed test run) confirmed the instructor SELECT policy on
-- lab_submissions STILL wasn't live even after hotfix #1's redeploy of byte-for-byte identical
-- SQL - a fresh instructor, fresh class, and fresh submission for that class's own course/section
-- still returned zero rows, filtered or unfiltered.
--
-- The actual root cause, found on review before this was deployed: a hand-adjusted version of
-- this statement collapsed the join straight from sections to classes
-- (`s.chapter_id = c.course_id`), skipping the chapters table entirely - comparing a chapter's
-- UUID to a course's UUID, two different ID namespaces that only match by astronomical
-- coincidence. That would make the EXISTS clause evaluate false in essentially every real case,
-- a more broken version of the same "policy exists but never matches" symptom, not a fix for it.
-- This is the corrected version actually deployed: the original 3-table join through chapters,
-- exactly like get_class_roster() and Step 39's policies already do it, with the co_instructors
-- (underscore) policy-name spelling preserved from that review round.
DROP POLICY IF EXISTS "Allow instructors and co-instructors to read course submissions" ON public.lab_submissions;
DROP POLICY IF EXISTS "Instructors and co-instructors view their course's submission matrix" ON public.lab_submissions;
DROP POLICY IF EXISTS "Instructors and co-instructors view their course submission matrix" ON public.lab_submissions;
DROP POLICY IF EXISTS "Instructors and co_instructors view course submission matrix" ON public.lab_submissions;

CREATE POLICY "Instructors and co_instructors view course submission matrix"
    ON public.lab_submissions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.sections s
            JOIN public.chapters ch ON ch.id = s.chapter_id
            JOIN public.classes c ON c.course_id = ch.course_id
            WHERE s.id = lab_submissions.section_id
              AND (c.instructor_id = auth.uid() OR public.is_co_instructor_of_class(c.id))
        )
    );

NOTIFY pgrst, 'reload schema';
