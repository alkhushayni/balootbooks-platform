-- class_custom_sections was designed with a single ownership path: chapter_override_id ->
-- class_chapter_overrides.class_id (chapter_override_id is NOT NULL, so this path is always
-- populated). REST inspection after the 20260913000014 redeploy found the live table now also
-- has a class_id column, which was never part of this table's design - it's never set by the
-- app (neither the migration file nor the frontend insert payload populate it), so any policy
-- checking it directly evaluates against NULL and always fails, exactly matching the symptom:
-- a legitimate instructor's insert was rejected identically to a fake/garbage one.
--
-- Rather than add a fallback that also depends on that stray column (which doesn't exist on a
-- fresh deploy of this table, since this file's CREATE TABLE never declares it), this rebuilds
-- the write policies to depend solely on the chapter_override_id join - the one ownership path
-- guaranteed to exist and be populated in every version of this table.
DROP POLICY IF EXISTS "Instructors insert custom sections in their own classes" ON public.class_custom_sections;
DROP POLICY IF EXISTS "Instructors update custom sections in their own classes" ON public.class_custom_sections;
DROP POLICY IF EXISTS "Instructors delete custom sections in their own classes" ON public.class_custom_sections;
DROP POLICY IF EXISTS "Allow write operations for class instructor" ON public.class_custom_sections;

CREATE POLICY "Instructors insert custom sections in their own classes"
    ON public.class_custom_sections FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.class_chapter_overrides co
        WHERE co.id = chapter_override_id
          AND public.is_instructor_of_class(co.class_id)
      )
    );

CREATE POLICY "Instructors update custom sections in their own classes"
    ON public.class_custom_sections FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.class_chapter_overrides co
        WHERE co.id = chapter_override_id
          AND public.is_instructor_of_class(co.class_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.class_chapter_overrides co
        WHERE co.id = chapter_override_id
          AND public.is_instructor_of_class(co.class_id)
      )
    );

CREATE POLICY "Instructors delete custom sections in their own classes"
    ON public.class_custom_sections FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.class_chapter_overrides co
        WHERE co.id = chapter_override_id
          AND public.is_instructor_of_class(co.class_id)
      )
    );
