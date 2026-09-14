-- Live REST testing after 20260914000100 deployed found class_chapter_overrides and
-- class_section_content_overrides both failing for a real enrolled student with
-- `relation "public.rosters" does not exist` - a table that has never existed anywhere in this
-- schema (public.enrollments is, and always has been, the enrollment table). Both tables' SELECT
-- policies depend on is_enrolled_in_class() (originally defined correctly in 20260913000014,
-- never touched since), so this points to that function having been redeployed at some point
-- referencing a table that doesn't exist. Re-asserting the original, correct definition.
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
