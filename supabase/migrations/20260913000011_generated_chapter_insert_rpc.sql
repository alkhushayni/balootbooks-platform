-- Atomic write path for the AI Textbook Factory (Step 15). A PL/pgSQL function body runs as a
-- single transaction, so a chapter insert can never land without its sections (or vice versa) -
-- any exception mid-loop rolls back the whole call. Runs SECURITY INVOKER: the caller's own
-- session performs the inserts, so the existing "Admins insert catalog chapters/sections"
-- WITH CHECK (is_platform_admin()) policies from 20260913000002 are the real enforcement here.
-- The explicit check below only exists to raise a friendlier error than a bare RLS violation.
CREATE OR REPLACE FUNCTION public.create_generated_chapter(
    p_course_id uuid,
    p_chapter_title text,
    p_sections jsonb
)
RETURNS TABLE (
    chapter_id uuid,
    chapter_title text,
    section_id uuid,
    section_title text,
    content_type text,
    markdown_content text,
    display_order int
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

  SELECT COALESCE(MAX(c.display_order), 0) + 1 INTO v_next_order
  FROM public.chapters c
  WHERE c.course_id = p_course_id;

  INSERT INTO public.chapters (course_id, title, display_order)
  VALUES (p_course_id, p_chapter_title, v_next_order)
  RETURNING id INTO v_chapter_id;

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
  SELECT c.id, c.title, s.id, s.title, s.content_type, s.markdown_content, s.display_order
  FROM public.chapters c
  JOIN public.sections s ON s.chapter_id = c.id
  WHERE c.id = v_chapter_id
  ORDER BY s.display_order;
END;
$$;
