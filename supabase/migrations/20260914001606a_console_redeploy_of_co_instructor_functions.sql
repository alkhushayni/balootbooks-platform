-- Step 39 provenance record: this file captures, verbatim, SQL that was pasted directly into the
-- Supabase console (not from a file in this repo) between hotfix #5
-- (20260914001605_final_reassert_roster_and_progress_policy.sql) and hotfix #6
-- (20260914001606_fix_progress_scoping_regressions.sql) in the actual live deployment order. It is
-- recorded here after the fact so that replaying this migrations folder from scratch on a fresh
-- database reproduces what is actually live, rather than skipping a step that only ever existed in
-- the console. Two scoping regressions this script introduced (a student_progress policy that
-- didn't check enrollment, and a get_class_roster() that aggregated progress across all of a
-- student's enrollments instead of scoping to this class's course) were caught in review before
-- being deployed and are corrected by 20260914001606, which is why the corrected policy/function
-- both appear again there.

-- 1. CLEAN RESET: Clear only the table-returning signatures that require a shape overwrite
DROP FUNCTION IF EXISTS public.get_class_roster(UUID);
DROP FUNCTION IF EXISTS public.create_class_with_co_instructors(UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.resolve_instructor_profile_by_email(TEXT);

-- 2. CREATE CO-INSTRUCTOR STORAGE LEDGER
CREATE TABLE IF NOT EXISTS public.class_co_instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. CASE-INSENSITIVE RESOLUTION UNIQUE INDEX
DROP INDEX IF EXISTS public.unique_class_co_instructor_lower_email;
CREATE UNIQUE INDEX IF NOT EXISTS unique_class_co_instructor_lower_email
ON public.class_co_instructors (class_id, LOWER(email));

-- 4. INSULATED SECURITY DEFINER CHECKER HELPER
CREATE OR REPLACE FUNCTION public.is_co_instructor_of_class(p_class_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.class_co_instructors
        WHERE instructor_id = auth.uid()
          AND class_id = p_class_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_co_instructor_of_class(UUID) TO authenticated;

-- 5. FACULTY PROFILE EMAIL RESOLVER GATED BY ROLE
CREATE OR REPLACE FUNCTION public.resolve_instructor_profile_by_email(p_email TEXT)
RETURNS TABLE (id UUID) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE public.profiles.id = auth.uid()
          AND public.profiles.role IN ('instructor', 'department_chair', 'platform_admin', 'super_admin')
    ) THEN
        RAISE EXCEPTION 'Access Denied: Instructor or higher administrative clearance required.';
    END IF;

    RETURN QUERY
    SELECT p.id
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE LOWER(u.email) = LOWER(p_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_instructor_profile_by_email(TEXT) TO authenticated;

-- 6. MULTI-TENANT ROW-LEVEL SECURITY GRIDS
ALTER TABLE public.class_co_instructors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read for verified co-instructors" ON public.class_co_instructors;
CREATE POLICY "Allow read for verified co-instructors" ON public.class_co_instructors FOR SELECT TO authenticated
    USING (public.is_co_instructor_of_class(class_id) OR EXISTS (
        SELECT 1 FROM public.classes WHERE id = class_id AND instructor_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Allow primary instructors full controls over co-instructors" ON public.class_co_instructors;
CREATE POLICY "Allow primary instructors full controls over co-instructors" ON public.class_co_instructors FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND instructor_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND instructor_id = auth.uid()));

DROP POLICY IF EXISTS "Allow co-instructors to read classes" ON public.classes;
CREATE POLICY "Allow co-instructors to read classes" ON public.classes FOR SELECT TO authenticated
    USING (public.is_co_instructor_of_class(id));

DROP POLICY IF EXISTS "Allow co-instructors to select enrollments" ON public.enrollments;
CREATE POLICY "Allow co-instructors to select enrollments" ON public.enrollments FOR SELECT TO authenticated
    USING (public.is_co_instructor_of_class(class_id));

-- NOTE: this student_progress policy, as originally pasted, scoped by shared course_id via
-- classes -> chapters -> sections with no reference to enrollments/student_id at all - corrected
-- by 20260914001606 immediately after (see that file's header for the full explanation).
DROP POLICY IF EXISTS "Allow co-instructors to read student progress" ON public.student_progress;
CREATE POLICY "Allow co-instructors to read student progress" ON public.student_progress FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.classes c
        JOIN public.chapters ch ON ch.course_id = c.course_id
        JOIN public.sections s ON s.chapter_id = ch.id
        WHERE s.id = student_progress.section_id AND public.is_co_instructor_of_class(c.id)
    ));

-- 7. THE 7-COLUMN FACULTY ANALYTICS ROSTER RPC
-- NOTE: this version's progress aggregation, as originally pasted, matched by student_id alone
-- with no join back through this class's course/sections - also corrected by 20260914001606.
CREATE OR REPLACE FUNCTION public.get_class_roster(p_class_id UUID)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    email TEXT,
    institutional_id TEXT,
    avg_participation NUMERIC,
    avg_challenge NUMERIC,
    avg_lab NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.classes
        WHERE id = p_class_id AND instructor_id = auth.uid()
    ) AND NOT public.is_co_instructor_of_class(p_class_id) THEN
        RAISE EXCEPTION 'Access Denied: Un-authorized faculty mapping section.';
    END IF;

    RETURN QUERY
    SELECT
        p.id AS student_id,
        p.full_name::text AS full_name,
        u.email::text AS email,
        e.institutional_id::text AS institutional_id,

        COALESCE(AVG(sp.participation_percentage), 0)::NUMERIC AS avg_participation,
        COALESCE(AVG(sp.challenge_percentage), 0)::NUMERIC AS avg_challenge,
        COALESCE(AVG(sp.lab_percentage), 0)::NUMERIC AS avg_lab

    FROM public.enrollments e
    JOIN public.profiles p ON p.id = e.student_id
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.student_progress sp ON sp.student_id = e.student_id AND sp.class_custom_section_id IS NULL
    WHERE e.class_id = p_class_id
    GROUP BY p.id, u.email, p.full_name, e.institutional_id
    ORDER BY p.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_roster(UUID) TO authenticated;

-- 8. ATOMIC INJECT TRANSACTIONAL WRAPPER
CREATE OR REPLACE FUNCTION public.create_class_with_co_instructors(
    p_course_id UUID,
    p_term_token TEXT,
    p_section_title TEXT,
    p_course_identifier TEXT,
    p_join_code TEXT,
    p_co_instructors JSONB
)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
    v_class_id UUID;
    v_co_item JSONB;
    v_co_id UUID;
BEGIN
    INSERT INTO public.classes (course_id, instructor_id, term_token, section_title, course_identifier, join_code)
    VALUES (p_course_id, auth.uid(), p_term_token, p_section_title, p_course_identifier, p_join_code)
    RETURNING id INTO v_class_id;

    IF p_co_instructors IS NOT NULL AND jsonb_array_length(p_co_instructors) > 0 THEN
        FOR v_co_item IN SELECT * FROM jsonb_array_elements(p_co_instructors) LOOP
            SELECT id INTO v_co_id FROM public.resolve_instructor_profile_by_email(v_co_item->>'email');

            INSERT INTO public.class_co_instructors (class_id, instructor_id, first_name, last_name, email)
            VALUES (v_class_id, v_co_id, v_co_item->>'first_name', v_co_item->>'last_name', v_co_item->>'email');
        END LOOP;
    END IF;

    RETURN v_class_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_class_with_co_instructors(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- 9. CACHE RELOAD
NOTIFY pgrst, 'reload schema';
