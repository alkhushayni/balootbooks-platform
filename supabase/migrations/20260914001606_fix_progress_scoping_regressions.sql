-- Step 39 hotfix #6: corrects two scoping regressions found in a hand-rewritten version of the
-- co-instructor migration before it was deployed (caught in review, never went live in this
-- broken form).
--
-- 1. The proposed student_progress policy matched by shared course_id via
--    classes -> chapters -> sections, with no reference to enrollments/student_id at all. Since
--    many classes can adopt the same course, that would let a co-instructor of ONE section see
--    progress for students enrolled in ANY OTHER instructor's section of the same course. Fixed
--    by scoping through enrollments exactly like the already-working sibling policies on classes
--    and enrollments, and like the original (pre-Step-39) primary-instructor policy on this same
--    table.
--
-- 2. The proposed get_class_roster() aggregated a student's progress by student_id alone
--    (`sp.student_id = e.student_id AND sp.class_custom_section_id IS NULL`), losing the join
--    through classes -> chapters -> sections entirely. A student enrolled in more than one class
--    would have their progress averaged across every enrollment platform-wide, not just sections
--    belonging to this specific class's course - wrong numbers shown to instructors, not just a
--    style difference. Restored to the original, correctly-scoped join chain.

DROP POLICY IF EXISTS "Allow co-instructors to read student progress" ON public.student_progress;

CREATE POLICY "Allow co-instructors to read student progress"
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

CREATE OR REPLACE FUNCTION public.get_class_roster(p_class_id uuid)
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
