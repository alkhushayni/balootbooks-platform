-- student_progress currently has SELECT-only RLS policies. Nothing can write to it yet, so
-- the "Mark as Complete" toggle in the Student Core Learning View has nowhere to save. This
-- grants students INSERT/UPDATE on their own rows only — both are needed together since the
-- toggle upserts (INSERT on first completion, UPDATE on any later re-save).
CREATE POLICY "Students insert their own progress entries"
    ON public.student_progress FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students update their own progress entries"
    ON public.student_progress FOR UPDATE TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);
