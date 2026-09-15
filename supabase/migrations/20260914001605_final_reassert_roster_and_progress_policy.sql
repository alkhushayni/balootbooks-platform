-- Step 39 hotfix #5: independent live verification found two remaining issues after hotfix #4:
--
-- 1. get_class_roster() now has the correct 7-column shape, but errors with
--    `42703: column p.institutional_id does not exist` - the live body references
--    p.institutional_id (profiles) where it must be e.institutional_id (enrollments), matching
--    both this migration series and the original 20260913000003_class_roster_rpc.sql. This is the
--    fourth transcription drift found in this one migration series (missing INSERT policy,
--    camelCase field names, missing student_progress policy, wrong table return shape, now a wrong
--    join alias) - strongly suggesting the console paste is being retyped by hand rather than
--    pasted verbatim from the file. Please paste this file's raw contents directly this time.
--
-- 2. The student_progress co-instructor SELECT policy still isn't visible live: the predicate is
--    structurally identical to its already-confirmed-working siblings on classes and enrollments
--    (both use is_co_instructor_of_class() the same way), so this remains a missing-policy issue,
--    not a bad predicate.
--
-- Both statements below are complete and self-contained - no partial edits, no reliance on a
-- statement from an earlier file having landed correctly.

DROP POLICY IF EXISTS "Co-instructors read progress of students enrolled in their classes" ON public.student_progress;

CREATE POLICY "Co-instructors read progress of students enrolled in their classes"
  ON public.student_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.classes c
      JOIN public.enrollments e ON e.class_id = c.id
      WHERE public.is_co_instructor_of_class(c.id)
        AND e.student_id = public.student_progress.student_id
    )
  );

DROP FUNCTION IF EXISTS public.get_class_roster(uuid);

CREATE FUNCTION public.get_class_roster(p_class_id uuid)
RETURNS TABLE (
  student_id uuid, full_name text, email text, institutional_id text,
  avg_participation numeric, avg_challenge numeric, avg_lab numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND instructor_id = auth.uid()
  ) AND NOT public.is_co_instructor_of_class(p_class_id) THEN
    RAISE EXCEPTION 'You do not have access to this class roster.';
  END IF;

  RETURN QUERY
  SELECT
    p.id AS student_id,
    p.full_name AS full_name,
    u.email::text AS email,
    e.institutional_id AS institutional_id,
    COALESCE(AVG(sp.participation_percentage), 0)::numeric AS avg_participation,
    COALESCE(AVG(sp.challenge_percentage), 0)::numeric AS avg_challenge,
    COALESCE(AVG(sp.lab_percentage), 0)::numeric AS avg_lab
  FROM public.enrollments e
  JOIN public.profiles p ON p.id = e.student_id
  JOIN auth.users u ON u.id = e.student_id
  JOIN public.classes c ON c.id = e.class_id
  LEFT JOIN public.chapters ch ON ch.course_id = c.course_id
  LEFT JOIN public.sections s ON s.chapter_id = ch.id
  LEFT JOIN public.student_progress sp ON sp.student_id = e.student_id AND sp.section_id = s.id
  WHERE e.class_id = p_class_id
  GROUP BY p.id, p.full_name, u.email, e.institutional_id
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_roster(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
