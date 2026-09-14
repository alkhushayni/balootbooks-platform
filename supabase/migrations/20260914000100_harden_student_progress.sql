-- Step 19: student_progress currently has a hard NOT NULL FK to public.sections, so a student
-- completing a class-private custom section (Step 16's class_custom_sections) fails with a
-- foreign key violation - there's nowhere to record that completion today. This adds a second,
-- parallel reference column and makes the original one nullable, with a CHECK ensuring every row
-- points at exactly one of the two.
ALTER TABLE public.student_progress
    ALTER COLUMN section_id DROP NOT NULL;

ALTER TABLE public.student_progress
    ADD COLUMN class_custom_section_id UUID REFERENCES public.class_custom_sections(id) ON DELETE CASCADE;

ALTER TABLE public.student_progress
    ADD CONSTRAINT check_single_section_reference
    CHECK (
        (section_id IS NOT NULL AND class_custom_section_id IS NULL) OR
        (section_id IS NULL AND class_custom_section_id IS NOT NULL)
    );

-- The original UNIQUE(student_id, section_id) only dedupes master-section rows - Postgres treats
-- NULLs as distinct, so once section_id is always NULL on custom-section rows that constraint
-- silently allows unlimited duplicates there. Add the matching constraint for the new column so
-- the upsert path in /api/progress has a real conflict target for custom sections too.
ALTER TABLE public.student_progress
    ADD CONSTRAINT student_progress_student_custom_section_unique
    UNIQUE (student_id, class_custom_section_id);

-- RLS is already enabled with student_id = auth.uid() SELECT/INSERT/UPDATE policies from
-- 20260912000001 ("Students see only their own metric rows") and 20260913000004 ("Students
-- insert/update their own progress entries"). Those check row ownership only, never which
-- reference column is populated, so they already cover both master and custom section rows
-- without any changes here.
