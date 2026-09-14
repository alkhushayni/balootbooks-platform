-- 1. User Profiles Extensions Table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'platform_admin', 'instructor', 'unverified_instructor', 'student')),
    institution_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Instructor Class Workspace Table
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    course_identifier TEXT NOT NULL, -- e.g., "CIS 462"
    section_title TEXT NOT NULL,     -- e.g., "Web Application Development"
    term_token TEXT NOT NULL,         -- e.g., "Summer 2026"
    join_code TEXT UNIQUE NOT NULL,  -- Specialized Structured Class Join Code
    restricted_domain TEXT,          -- Guardrail filter (e.g. "university.edu")
    time_zone_anchor TEXT DEFAULT 'CDT' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Student Enrollment Junction Matrix
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    institutional_id TEXT, -- Mandatory Student ID configuration rule
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, class_id)
);

-- 4. Gradebook Tri-Metrics Activity Ledger
CREATE TABLE public.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    lab_percentage NUMERIC DEFAULT 0.00 NOT NULL,
    challenge_percentage NUMERIC DEFAULT 0.00 NOT NULL,
    participation_percentage NUMERIC DEFAULT 0.00 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, section_id)
);

-- Enable Security Guardrails across User Layers
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- Peer-to-Peer Perimeter Shield Policies (Isolation Protections)
CREATE POLICY "Users can safely view their own public profile records"
    ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Students see only their own metric rows"
    ON public.student_progress FOR SELECT TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "Students see only their own classroom enrollments"
    ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- Faculty Multi-Tenant Insulation Workspace Policies
CREATE POLICY "Instructors read progress of students enrolled in their classes"
    ON public.student_progress FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.classes c
        JOIN public.enrollments e ON e.class_id = c.id
        WHERE c.instructor_id = auth.uid() AND e.student_id = public.student_progress.student_id
    ));

CREATE POLICY "Instructors manage their unique class configurations"
    ON public.classes ALL TO authenticated USING (instructor_id = auth.uid());
