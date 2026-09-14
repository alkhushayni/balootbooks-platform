-- CRITICAL fix: discovered via live REST verification for Step 27, but the actual regression
-- shipped with Step 26. Every authenticated SELECT or INSERT against public.classes has been
-- failing with "infinite recursion detected in policy for relation classes" (Postgres 42P17) -
-- confirmed via a real authenticated session, not just service-role. This affects EVERY role
-- (students, instructors, chairs, admins) and every page that reads classes, not just Step 27's
-- new admin allocation console.
--
-- Root cause: two policies on two different tables, each a raw (non-SECURITY DEFINER) subquery
-- into the OTHER table -
--   classes:     "Students can view classes they are enrolled in" (Step 6)  -> subqueries enrollments
--   enrollments: "Chairs view enrollments under their institutional umbrella" (Step 26) -> subqueries classes
-- Postgres detects this as a structural policy cycle at plan time and refuses the query outright,
-- independent of which row or branch would actually apply. Every other cross-table RLS check this
-- session (is_instructor_of_class, is_chair_over_profile, is_chair_over_progress_row, etc.) was
-- wrapped in a SECURITY DEFINER helper specifically to avoid this - a SECURITY DEFINER function's
-- internal queries are not subject to the calling session's RLS, so they can read another table
-- without re-triggering that table's own policies. The enrollments Chair policy was the one place
-- a raw subquery was used instead. Wrapping it the same way breaks the cycle.
CREATE OR REPLACE FUNCTION public.is_chair_over_enrolled_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    JOIN public.profiles chair ON chair.id = auth.uid()
    JOIN public.profiles instructor ON instructor.id = c.instructor_id
    WHERE c.id = p_class_id
      AND chair.role = 'department_chair'
      AND chair.institution_id IS NOT NULL
      AND instructor.institution_id = chair.institution_id
  );
$$;

DROP POLICY IF EXISTS "Chairs view enrollments under their institutional umbrella" ON public.enrollments;

CREATE POLICY "Chairs view enrollments under their institutional umbrella"
    ON public.enrollments FOR SELECT TO authenticated
    USING (public.is_chair_over_enrolled_class(class_id));
