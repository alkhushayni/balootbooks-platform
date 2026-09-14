-- REST verification of 20260913000011 found the deployed create_generated_chapter() fails on
-- every call with `42702 column reference "course_id" is ambiguous` (confirmed via direct RPC
-- calls - both a valid 3-section payload and an invalid 2-section payload hit the same error
-- before reaching any application logic). Rollback held correctly in both cases (no orphaned
-- rows), but the function itself does not work as deployed.
--
-- Root cause class: the original RETURNS TABLE output columns (chapter_id, content_type,
-- markdown_content, display_order, ...) are named identically to real columns on
-- public.chapters/public.sections. In PL/pgSQL, RETURNS TABLE columns become implicit variables
-- in scope for the entire function body, so any reference to those names anywhere inside -
-- including columns not obviously related, once the deployed body diverged from the file as
-- written this session - can resolve ambiguously against the same-named table column instead of
-- the intended one. This migration removes the whole collision class by renaming every OUT
-- column with an out_ prefix that cannot collide with any table column, and fully qualifies
-- every column reference throughout.
CREATE OR REPLACE FUNCTION public.create_generated_chapter(
    p_course_id uuid,
    p_chapter_title text,
    p_sections jsonb
)
RETURNS TABLE (
    out_chapter_id uuid,
    out_chapter_title text,
    out_section_id uuid,
    out_section_title text,
    out_content_type text,
    out_markdown_content text,
    out_display_order int
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_chapter_id uuid;
  v_next_order int;
  v_section jsonb;
  v_order int := 1;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can write AI-generated curriculum content.';
  END IF;

  IF jsonb_array_length(p_sections) <> 3 THEN
    RAISE EXCEPTION 'Expected exactly 3 sections, received %.', jsonb_array_length(p_sections);
  END IF;

  SELECT COALESCE(MAX(chapters.display_order), 0) + 1 INTO v_next_order
  FROM public.chapters
  WHERE chapters.course_id = p_course_id;

  INSERT INTO public.chapters (course_id, title, display_order)
  VALUES (p_course_id, p_chapter_title, v_next_order)
  RETURNING chapters.id INTO v_chapter_id;

  FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections)
  LOOP
    INSERT INTO public.sections (chapter_id, title, content_type, markdown_content, display_order)
    VALUES (
      v_chapter_id,
      v_section ->> 'title',
      v_section ->> 'content_type',
      v_section ->> 'markdown_content',
      v_order
    );
    v_order := v_order + 1;
  END LOOP;

  RETURN QUERY
  SELECT
    chapters.id,
    chapters.title,
    sections.id,
    sections.title,
    sections.content_type,
    sections.markdown_content,
    sections.display_order
  FROM public.chapters
  JOIN public.sections ON sections.chapter_id = chapters.id
  WHERE chapters.id = v_chapter_id
  ORDER BY sections.display_order;
END;
$$;
