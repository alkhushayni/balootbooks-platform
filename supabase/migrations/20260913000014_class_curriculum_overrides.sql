-- Option B: Class Override Sandbox, extended to support genuinely class-private custom
-- chapters/sections (not just reorder/hide of master catalog rows). Replaces the scratched
-- 20260913000013 (which gave instructors blanket write access to the shared public.chapters/
-- public.sections tables - one instructor's edit would have changed what every other class of
-- that course, and every enrolled student, saw). Nothing here ever writes to the shared catalog:
-- it stays admin-owned exactly as it was before Step 16.
--
-- class_chapter_overrides does double duty:
--   1. An override of an existing master chapter: chapter_id references public.chapters,
--      title is NULL (the master title is used), display_order/is_hidden customize this
--      class's view of that chapter only.
--   2. A wholly custom, class-private chapter: chapter_id is NULL, title holds the chapter's
--      own name. It never touches public.chapters, so it's invisible to every other class.
CREATE TABLE public.class_chapter_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    title TEXT,
    display_order INT,
    is_hidden BOOLEAN DEFAULT false NOT NULL,
    -- One override row per (class, master chapter). Does not constrain custom chapters
    -- (chapter_id NULL) since Postgres treats NULLs as distinct in unique constraints - a class
    -- can freely have many custom chapters.
    UNIQUE (class_id, chapter_id),
    CONSTRAINT class_chapter_overrides_custom_needs_title
        CHECK (chapter_id IS NOT NULL OR title IS NOT NULL)
);

-- Sections belonging to a class_chapter_overrides row - whether that row anchors a master
-- chapter (a class-private extra section bolted onto shared content) or a fully custom chapter
-- (that chapter's only sections). Always class-private; public.sections is never touched.
-- Named chapter_override_id (not class_chapter_override_id) to match this schema's existing FK
-- naming convention (sections.chapter_id, enrollments.class_id, etc. all drop the owning
-- table's name and keep just the referenced table's).
CREATE TABLE public.class_custom_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_override_id UUID REFERENCES public.class_chapter_overrides(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('READING', 'LAB')),
    markdown_content TEXT,
    display_order INT NOT NULL DEFAULT 1
);

ALTER TABLE public.class_chapter_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_custom_sections ENABLE ROW LEVEL SECURITY;

-- SECURITY INVOKER: both helpers only read rows already visible to the caller under existing
-- policies (classes.instructor_id = auth.uid(), enrollments.student_id = auth.uid()), so no
-- privilege escalation is needed.
CREATE OR REPLACE FUNCTION public.is_instructor_of_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = p_class_id AND instructor_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled_in_class(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE class_id = p_class_id AND student_id = auth.uid()
  );
$$;

CREATE POLICY "Instructors and enrolled students view their class's curriculum overrides"
    ON public.class_chapter_overrides FOR SELECT TO authenticated
    USING (public.is_instructor_of_class(class_id) OR public.is_enrolled_in_class(class_id));

CREATE POLICY "Instructors insert overrides for their own classes"
    ON public.class_chapter_overrides FOR INSERT TO authenticated
    WITH CHECK (public.is_instructor_of_class(class_id));

CREATE POLICY "Instructors update overrides for their own classes"
    ON public.class_chapter_overrides FOR UPDATE TO authenticated
    USING (public.is_instructor_of_class(class_id))
    WITH CHECK (public.is_instructor_of_class(class_id));

CREATE POLICY "Instructors delete overrides for their own classes"
    ON public.class_chapter_overrides FOR DELETE TO authenticated
    USING (public.is_instructor_of_class(class_id));

CREATE POLICY "Instructors and enrolled students view class custom sections"
    ON public.class_custom_sections FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.class_chapter_overrides o
        WHERE o.id = class_custom_sections.chapter_override_id
          AND (public.is_instructor_of_class(o.class_id) OR public.is_enrolled_in_class(o.class_id))
      )
    );

CREATE POLICY "Instructors insert custom sections in their own classes"
    ON public.class_custom_sections FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.class_chapter_overrides o
        WHERE o.id = class_custom_sections.chapter_override_id
          AND public.is_instructor_of_class(o.class_id)
      )
    );

CREATE POLICY "Instructors update custom sections in their own classes"
    ON public.class_custom_sections FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.class_chapter_overrides o
        WHERE o.id = class_custom_sections.chapter_override_id
          AND public.is_instructor_of_class(o.class_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.class_chapter_overrides o
        WHERE o.id = class_custom_sections.chapter_override_id
          AND public.is_instructor_of_class(o.class_id)
      )
    );

CREATE POLICY "Instructors delete custom sections in their own classes"
    ON public.class_custom_sections FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.class_chapter_overrides o
        WHERE o.id = class_custom_sections.chapter_override_id
          AND public.is_instructor_of_class(o.class_id)
      )
    );
