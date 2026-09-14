-- Step 26: Department Chair Compliance View. Chairs are institution-scoped, read-only
-- observers - they can see every class, curriculum override, and progress row under their
-- institution's instructors, but they never write to any of it. Self-registration can never
-- produce this role (handle_new_user() below still only ever resolves 'student' or
-- 'unverified_instructor' from client-controlled metadata) - a platform admin must promote an
-- existing profile to 'department_chair' and set its institution_id directly, the same way
-- super_admin/platform_admin promotions have always been done in this project.

-- role is a TEXT CHECK, not a native Postgres enum (see 20260912000001) - profiles_role_check is
-- the default constraint name Postgres assigns to an unnamed column-level CHECK, matching what
-- was actually deployed for every other constraint of this shape this session.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('super_admin', 'platform_admin', 'instructor', 'unverified_instructor', 'student', 'department_chair'));

-- profiles.institution_id already exists (Step 25) and is exactly the "chair assigned to an
-- institution" relationship the blueprint asks for - a chair profile just needs role =
-- 'department_chair' and institution_id set. No new column needed on profiles for this.
--
-- That column has never actually been populated anywhere though: the Step 25 registration gate
-- only checked whether a domain was allowlisted, it never recorded which institution matched. So
-- every existing instructor profile has institution_id = NULL today, which would make this
-- entire feature show zero classes for any real institution. Closing that gap here is a
-- prerequisite for Step 26 to ever return real data, not a separate feature: handle_new_user() now
-- also resolves the signing-up user's institution from their email domain, the same lookup
-- is_domain_allowlisted() already performs.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role TEXT := NEW.raw_user_meta_data ->> 'role';
  resolved_role TEXT;
  resolved_name TEXT;
  resolved_institution_id UUID;
BEGIN
  resolved_role := CASE
    WHEN requested_role IN ('student', 'unverified_instructor') THEN requested_role
    ELSE 'student'
  END;

  resolved_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(split_part(NEW.email, '@', 1), ''),
    'New User'
  );

  SELECT institution_id INTO resolved_institution_id
  FROM public.tenant_domains
  WHERE lower(domain_string) = lower(split_part(NEW.email, '@', 2))
  LIMIT 1;

  INSERT INTO public.profiles (id, full_name, role, institution_id)
  VALUES (NEW.id, resolved_name, resolved_role, resolved_institution_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Narrow SECURITY DEFINER check, mirroring is_domain_allowlisted()'s shape from Step 25: it only
-- ever resolves whether the CALLING user is a chair whose institution_id matches the given
-- profile's institution_id. It never exposes any institution/profile data beyond that yes/no -
-- the caller still can't read the target row directly except through the narrow SELECT policies
-- below, which reuse this same check.
CREATE OR REPLACE FUNCTION public.is_chair_over_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles chair
    JOIN public.profiles target ON target.id = p_profile_id
    WHERE chair.id = auth.uid()
      AND chair.role = 'department_chair'
      AND chair.institution_id IS NOT NULL
      AND target.institution_id = chair.institution_id
  );
$$;

-- Same shape, for student_progress rows - resolved via the student's enrollment -> class ->
-- instructor chain rather than a direct profile id.
CREATE OR REPLACE FUNCTION public.is_chair_over_progress_row(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.classes c ON c.id = e.class_id
    JOIN public.profiles chair ON chair.id = auth.uid()
    JOIN public.profiles instructor ON instructor.id = c.instructor_id
    WHERE e.student_id = p_student_id
      AND chair.role = 'department_chair'
      AND chair.institution_id IS NOT NULL
      AND instructor.institution_id = chair.institution_id
  );
$$;

-- Ironclad, read-only: classes, class_chapter_overrides, and student_progress, exactly as asked.
CREATE POLICY "Chairs view classes under their institutional umbrella"
    ON public.classes FOR SELECT TO authenticated
    USING (public.is_chair_over_profile(instructor_id));

CREATE POLICY "Chairs view chapter overrides under their institutional umbrella"
    ON public.class_chapter_overrides FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = class_chapter_overrides.class_id
          AND public.is_chair_over_profile(c.instructor_id)
      )
    );

CREATE POLICY "Chairs view progress logs under their institutional umbrella"
    ON public.student_progress FOR SELECT TO authenticated
    USING (public.is_chair_over_progress_row(student_id));

-- Not explicitly listed in the blueprint, but required for the dashboard to render at all: the
-- Course Cohort Registry needs the instructor's display name (profiles.full_name) and a per-class
-- student headcount (enrollments), neither of which any existing policy grants a chair. Scoped by
-- the identical institutional-umbrella check as everything else above - a chair still can never
-- see a student's own profile row or a class outside their institution.
CREATE POLICY "Chairs view instructor profiles under their institutional umbrella"
    ON public.profiles FOR SELECT TO authenticated
    USING (public.is_chair_over_profile(id));

CREATE POLICY "Chairs view enrollments under their institutional umbrella"
    ON public.enrollments FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.classes c
        WHERE c.id = enrollments.class_id
          AND public.is_chair_over_profile(c.instructor_id)
      )
    );
