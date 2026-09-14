-- Step 17: per-class private overrides of a master section's markdown content, extending the
-- Step 16 sandbox model (class_chapter_overrides / class_custom_sections). An instructor saving
-- content here never touches public.sections.markdown_content - every other class of the course,
-- and every admin/student view of the shared catalog, keeps seeing the original master content
-- untouched. Reuses is_instructor_of_class()/is_enrolled_in_class() from 20260913000014.
CREATE TABLE public.class_section_content_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
    markdown_content TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (class_id, section_id)
);

ALTER TABLE public.class_section_content_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors and enrolled students view their class's section content overrides"
    ON public.class_section_content_overrides FOR SELECT TO authenticated
    USING (public.is_instructor_of_class(class_id) OR public.is_enrolled_in_class(class_id));

CREATE POLICY "Instructors insert section content overrides for their own classes"
    ON public.class_section_content_overrides FOR INSERT TO authenticated
    WITH CHECK (public.is_instructor_of_class(class_id));

CREATE POLICY "Instructors update section content overrides for their own classes"
    ON public.class_section_content_overrides FOR UPDATE TO authenticated
    USING (public.is_instructor_of_class(class_id))
    WITH CHECK (public.is_instructor_of_class(class_id));

CREATE POLICY "Instructors delete section content overrides for their own classes"
    ON public.class_section_content_overrides FOR DELETE TO authenticated
    USING (public.is_instructor_of_class(class_id));
