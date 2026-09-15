-- Step 39 hotfix #3: independent live verification found two more casualties of the same manual
-- deployment process that already required hotfixes #1 and #2:
--
-- 1. The "Co-instructors read progress of students enrolled in their classes" SELECT policy on
--    student_progress never actually took effect live, even though its siblings on classes and
--    enrollments did (confirmed working in the same test pass). Diagnosed by inserting a real
--    student_progress row for a student genuinely enrolled in the co-instructor's assigned class,
--    then observing the co-instructor's SELECT return empty despite the EXISTS predicate being
--    satisfiable and structurally identical to the working sibling policies.
--
-- 2. get_class_roster() is still returning its pre-widening body (or one missing the ::text cast
--    on email) - `42804: Returned type character varying(255) does not match expected type text
--    in column 3` is exactly what happens when auth.users.email (varchar(255) in Supabase's
--    built-in auth schema) is selected without an explicit ::text cast against a RETURNS TABLE
--    column declared text.
--
-- DROP POLICY IF EXISTS makes the policy reassertion safe regardless of current state; the
-- function reassertion is a plain CREATE OR REPLACE since the signature is unchanged.

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
  SELECT p.id, p.full_name, u.email::text, e.institutional_id,
    COALESCE(AVG(sp.participation_percentage), 0)::numeric,
    COALESCE(AVG(sp.challenge_percentage), 0)::numeric,
    COALESCE(AVG(sp.lab_percentage), 0)::numeric
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
