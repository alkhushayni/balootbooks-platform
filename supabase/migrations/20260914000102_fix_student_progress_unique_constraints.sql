-- Live REST testing after 20260914000100 deployed found the student_progress upsert path
-- completely broken: `42P10 no unique or exclusion constraint matching the ON CONFLICT
-- specification` for BOTH (student_id, section_id) and (student_id, class_custom_section_id).
-- The first has existed since the table's original CREATE TABLE (20260912000001, inline
-- UNIQUE(student_id, section_id)); the second was specified in 20260914000100. Since ON CONFLICT
-- matches by column set regardless of constraint name, this proves neither constraint currently
-- exists under any name - something in the section_id nullability change dropped the original
-- without recreating it, and the new one from 20260914000100 never actually landed either.
--
-- Re-asserting both explicitly, guarded so this is safe to run even if one of them already
-- exists correctly. NULLs are never considered equal for UNIQUE constraints, so a custom-section
-- row (section_id NULL) can never collide with a master-section row here, and vice versa.
DO $$
BEGIN
  ALTER TABLE public.student_progress
    ADD CONSTRAINT student_progress_student_section_unique UNIQUE (student_id, section_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.student_progress
    ADD CONSTRAINT student_progress_student_custom_section_unique UNIQUE (student_id, class_custom_section_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;
