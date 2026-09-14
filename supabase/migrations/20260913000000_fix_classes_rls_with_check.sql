-- The original "FOR ALL ... USING (...)" policy on public.classes had no explicit WITH CHECK
-- clause. Verified live against the project: an instructor adopting a course through the
-- Course Manager got "new row violates row-level security policy for table classes" on INSERT
-- even though instructor_id correctly matched auth.uid(). A bare ALL policy does not reliably
-- extend its USING expression to WITH CHECK for INSERT, so state both explicitly.
DROP POLICY IF EXISTS "Instructors manage their unique class configurations" ON public.classes;

CREATE POLICY "Instructors manage their unique class configurations"
    ON public.classes
    FOR ALL
    TO authenticated
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());
