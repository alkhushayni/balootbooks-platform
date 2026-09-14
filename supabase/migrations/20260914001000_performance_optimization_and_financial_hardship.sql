-- Step 32: Performance indices + Administrative Temporary Hardship Grace Period Extension Suite.
--
-- Design note on scope, confirmed with the user before writing this: classroom enrollment
-- (public.enrollments, a class join code) has meant full, free content access since Step 6, and
-- every real student enrolled today keeps that behavior completely unchanged - nothing here adds
-- a payment check on top of an existing enrollment. Everything below is a THIRD and FOURTH way (an
-- admin-granted hardship grant, or an automatic institutional seat-pool check) for a student with
-- NO class enrollment to gain access, layered alongside Step 31's direct-purchase path. The
-- "Institutional Seat Voucher/Pre-paid Key" concept is implemented as an automatic seat-pool
-- comparison against institutions.max_license_seats - no redeemable code, no new balance to
-- decrement, since no such consumable-balance concept exists anywhere in this schema yet.

-- Performance-critical B-Tree indexes on the highest-frequency filter columns. Purely additive -
-- IF NOT EXISTS makes this safe to re-run, and none of this touches RLS, triggers, or table shape.
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON public.student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_section_id ON public.student_progress(section_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON public.quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_question_id ON public.quiz_submissions(question_id);
CREATE INDEX IF NOT EXISTS idx_classes_instructor_id ON public.classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);

-- Admin-granted temporary access, scoped to a specific class so the reader has a class context to
-- merge instructor overrides from, exactly like a real enrollment would.
CREATE TABLE public.temporary_access_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.temporary_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view their own access grants"
    ON public.temporary_access_grants FOR SELECT TO authenticated
    USING (student_id = auth.uid());

CREATE POLICY "Admins manage all access grants"
    ON public.temporary_access_grants FOR ALL TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Narrow SECURITY DEFINER check, same shape as is_chair_over_profile/is_chair_over_enrolled_class
-- from Steps 26/27: only ever resolves whether the CALLING student holds an active grant for the
-- given class. Needed so the reader can safely join temporary_access_grants -> classes to resolve
-- the grant's course_id, without granting students broad classes visibility - a raw subquery here
-- instead of this function would risk exactly the classes/enrollments RLS recursion fixed in
-- Step 27, since is_active_access_grant is invoked from a NEW policy directly on classes.
CREATE OR REPLACE FUNCTION public.has_active_access_grant(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.temporary_access_grants
    WHERE class_id = p_class_id AND student_id = auth.uid() AND expires_at > now()
  );
$$;

CREATE POLICY "Students view classes they hold an active access grant for"
    ON public.classes FOR SELECT TO authenticated
    USING (public.has_active_access_grant(id));

-- Automatic institutional seat-pool check ("Institutional Seat Voucher/Pre-paid Key", no code to
-- redeem): true if the calling student's own institution has not exceeded its purchased seat cap.
-- A student has no RLS read access to institutions or to other students' profiles today (Step 25
-- restricted institutions to admins only, Step 28 to admins only for profiles), so this has to be
-- a narrow DEFINER function rather than a new broad grant on either table - it only ever exposes a
-- yes/no for the caller's own institution, nothing else.
CREATE OR REPLACE FUNCTION public.has_institutional_seat_available()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles me
    JOIN public.institutions inst ON inst.id = me.institution_id
    WHERE me.id = auth.uid()
      AND me.institution_id IS NOT NULL
      AND inst.max_license_seats IS NOT NULL
      AND (
        SELECT COUNT(*) FROM public.profiles p
        WHERE p.institution_id = me.institution_id AND p.role = 'student'
      ) < inst.max_license_seats
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_institutional_seat_available() TO authenticated;

-- Forces PostgREST to reload its schema cache immediately rather than waiting for its next
-- automatic detection cycle.
NOTIFY pgrst, 'reload schema';
