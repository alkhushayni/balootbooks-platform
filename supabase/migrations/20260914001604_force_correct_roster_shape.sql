-- Step 39 hotfix #4: independent live verification found get_class_roster()'s successful response
-- shape is {student_id, full_name, email, enrolled_at} - 4 columns - not the 7-column
-- {student_id, full_name, email, institutional_id, avg_participation, avg_challenge, avg_lab}
-- shape this migration series has defined since the original 20260913000003 file. Hotfix #3's
-- CREATE OR REPLACE never actually took effect: Postgres refuses to CREATE OR REPLACE a function
-- when its RETURNS TABLE column list changes, requiring DROP FUNCTION first - the exact same class
-- of problem that required a manual DROP FUNCTION before this whole migration series could be
-- pasted in originally. This also explains why the student_progress co-instructor policy appeared
-- to still fail after hotfix #3: the live roster function isn't joining student_progress at all
-- right now, so that failure was a symptom of this stale function, not a second RLS bug.
--
-- Explicit DROP FUNCTION this time removes any ambiguity about whether the replace will apply.
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
