-- REST testing after 20260913000015 found the actual blocker: public.class_custom_sections has
-- a live class_id column that was never part of this table's design in any migration file in
-- this repo, and is NOT NULL - so every insert failed with a constraint violation once the RLS
-- policy fix (000015) stopped rejecting requests earlier. Neither this migration history nor the
-- frontend (frontend/src/app/instructor/course/[courseId]/editor/ActionPanel.tsx) ever populates
-- it - chapter_override_id -> class_chapter_overrides.class_id is the only ownership path this
-- table needs, and it's already NOT NULL. Dropping the stray column rather than starting to
-- populate a redundant, unvalidated denormalization of data the join already provides.
ALTER TABLE public.class_custom_sections DROP COLUMN IF EXISTS class_id;
