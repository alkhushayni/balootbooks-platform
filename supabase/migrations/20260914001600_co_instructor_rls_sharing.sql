-- Step 39: Multi-Stage Adoption Wizard co-instructor sharing.
--
-- Design note on scope: `public.enrollments` has never had a direct RLS SELECT policy for
-- instructors — instructor roster access has always gone entirely through the SECURITY DEFINER
-- `get_class_roster()` RPC (see 20260913000003_class_roster_rpc.sql), which re-checks ownership
-- internally and bypasses RLS by design specifically to avoid needing a broad enrollments policy.
-- So "upgrading" enrollments for co-instructors means two things: widening that RPC's internal
-- gate (below), and additionally adding a narrow SELECT policy directly on enrollments for any
-- other read path that might query it directly in the future. classes and student_progress, by
-- contrast, already have real instructor-scoped RLS policies, so those get a clean additive
-- mirror policy each.

CREATE TABLE public.class_co_instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (class_id, email)
);

ALTER TABLE public.class_co_instructors ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER, narrow: returns only a yes/no over one class_id, never row data — matching
-- the is_chair_over_*/is_co_instructor_* helper pattern used throughout this project's RLS.
CREATE OR REPLACE FUNCTION public.is_co_instructor_of_class(p_class_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_co_instructors
    WHERE class_id = p_class_id
      AND instructor_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_co_instructor_of_class(uuid) TO authenticated;

-- Only the primary (owning) instructor can add, edit, or remove co-instructor records; both the
-- primary instructor and the co-instructor themselves can see who's on the roster.
CREATE POLICY "Primary instructors manage their class co-instructor roster"
  ON public.class_co_instructors
  FOR ALL
  TO authenticated
  USING (public.is_instructor_of_class(class_id))
  WITH CHECK (public.is_instructor_of_class(class_id));

CREATE POLICY "Co-instructors view their own assignment records"
  ON public.class_co_instructors
  FOR SELECT
  TO authenticated
  USING (instructor_id = auth.uid());

-- classes: additive SELECT-only policy (co-instructors get read access, not the primary
-- instructor's full ALL/management rights).
CREATE POLICY "Co-instructors view their assigned class configurations"
  ON public.classes
  FOR SELECT
  TO authenticated
  USING (public.is_co_instructor_of_class(id));

-- student_progress: mirrors the existing instructor read policy structure exactly, substituting
-- the co-instructor check for the instructor_id = auth.uid() check.
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

-- enrollments: no pre-existing instructor policy to mirror (see note above), but adding a narrow
-- co-instructor SELECT policy is safe and additive for any direct-query path that isn't the
-- get_class_roster() RPC.
CREATE POLICY "Co-instructors view enrollments in their assigned classes"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (public.is_co_instructor_of_class(class_id));

-- Widen get_class_roster()'s internal ownership gate to also accept a verified co-instructor.
-- Full existing body reasserted unchanged apart from the IF condition.
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

-- Narrow SECURITY DEFINER lookup used by the co-instructor provisioning API route to resolve an
-- email to a profile id. Unlike find_auth_user_id_by_email() (platform_admin only, added in the
-- walkthrough-fixes commit), this is deliberately scoped to instructor-tier callers only — it
-- still permits limited account enumeration by design (an instructor learns whether an email has
-- an account), which is an acceptable, bounded tradeoff for provisioning a co-instructor by email,
-- but it must never be exposed to student-role callers.
CREATE OR REPLACE FUNCTION public.resolve_instructor_profile_by_email(p_email TEXT)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_profile_id uuid;
BEGIN
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('instructor', 'department_chair', 'platform_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Not authorized to resolve instructor accounts.';
  END IF;

  SELECT u.id INTO v_profile_id
  FROM auth.users u
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;

  RETURN v_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_instructor_profile_by_email(text) TO authenticated;

-- SECURITY INVOKER (not DEFINER): the class insert and the co-instructor inserts must both pass
-- through RLS as the calling instructor, exactly as the prior client-side direct insert did — this
-- function's only job is bundling both inserts into one Postgres transaction for real atomicity
-- (a join_code collision or a bad co-instructor row rolls back the whole thing, not just part of
-- it), not widening any permission. Called from the adoption API route below.
CREATE OR REPLACE FUNCTION public.create_class_with_co_instructors(
  p_course_id uuid,
  p_course_identifier text,
  p_section_title text,
  p_term_token text,
  p_join_code text,
  p_co_instructors jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_class_id uuid;
  v_co jsonb;
  v_resolved_id uuid;
BEGIN
  INSERT INTO public.classes (instructor_id, course_id, course_identifier, section_title, term_token, join_code)
  VALUES (auth.uid(), p_course_id, p_course_identifier, p_section_title, p_term_token, p_join_code)
  RETURNING id INTO v_class_id;

  FOR v_co IN SELECT * FROM jsonb_array_elements(p_co_instructors)
  LOOP
    v_resolved_id := public.resolve_instructor_profile_by_email(v_co->>'email');

    INSERT INTO public.class_co_instructors (class_id, instructor_id, first_name, last_name, email)
    VALUES (v_class_id, v_resolved_id, v_co->>'first_name', v_co->>'last_name', v_co->>'email');
  END LOOP;

  RETURN v_class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_class_with_co_instructors(uuid, text, text, text, text, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
