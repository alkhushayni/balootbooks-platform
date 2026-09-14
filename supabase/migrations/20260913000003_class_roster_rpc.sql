-- Surfaces a class roster (student name, email, institutional ID, and aggregated tri-metrics
-- progress) to the OWNING instructor only.
--
-- Runs as SECURITY DEFINER for two reasons:
--   1. auth.users.email is never exposed through the REST API at all — the `auth` schema isn't
--      part of what PostgREST serves, so there is no RLS-policy path to a student's email
--      whatsoever. A function executing inside Postgres itself is the only way to surface it,
--      gated by the ownership check below rather than by table-level RLS.
--   2. It avoids needing new broad SELECT policies on enrollments/profiles for instructors;
--      the ownership check is the only gate, mirroring redeem_class_join_code.
--
-- student_progress is keyed per (student_id, section_id), not per class, since content belongs
-- to the shared course rather than any one class instance. This aggregates (AVG) each metric
-- across every section under the class's course that the student has a recorded progress row
-- for — a student with zero progress rows still appears (LEFT JOIN + COALESCE to 0), but a
-- section they haven't touched yet doesn't drag their average down to 0.
CREATE OR REPLACE FUNCTION public.get_class_roster(p_class_id uuid)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  email text,
  institutional_id text,
  avg_participation numeric,
  avg_challenge numeric,
  avg_lab numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND instructor_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have access to this class roster.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    u.email::text,
    e.institutional_id,
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
