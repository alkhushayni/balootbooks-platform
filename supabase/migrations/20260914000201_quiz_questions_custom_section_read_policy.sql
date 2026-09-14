-- Live testing found that quiz_questions rows linked via class_custom_section_id are invisible
-- to everyone except the service role - confirmed via direct query: the row exists, but both the
-- owning instructor and an enrolled student get an empty result, while the section_id-linked
-- question works fine for both. This means the deployed SELECT policy only covers the
-- section_id path and was never extended to class_custom_section_id, the same class of gap
-- already fixed once this session for class_custom_sections/class_section_content_overrides.
--
-- Additive only - a new PERMISSIVE policy is OR'd with whatever the existing section_id-based
-- policy does, so the already-working path is untouched. Reuses is_instructor_of_class()/
-- is_enrolled_in_class() from 20260913000014.
CREATE POLICY "Instructors and enrolled students view custom-section quiz questions"
    ON public.quiz_questions FOR SELECT TO authenticated
    USING (
      class_custom_section_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM public.class_custom_sections ccs
        JOIN public.class_chapter_overrides cco ON cco.id = ccs.chapter_override_id
        WHERE ccs.id = quiz_questions.class_custom_section_id
          AND (public.is_instructor_of_class(cco.class_id) OR public.is_enrolled_in_class(cco.class_id))
      )
    );
