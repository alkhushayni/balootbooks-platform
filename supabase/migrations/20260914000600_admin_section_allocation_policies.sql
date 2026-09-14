-- Step 27: Automated Section Allocation Engine. The existing classes RLS ("Instructors manage
-- their unique class configurations", FOR ALL USING (instructor_id = auth.uid())) only ever lets
-- an instructor write a class row for themselves. A platform admin bulk-provisioning sections on
-- behalf of OTHER instructors would have every single row rejected by RLS - there is currently no
-- path for anyone but the instructor themselves to create or view a classes row. This adds
-- exactly the missing admin path, mirroring the "Admins insert catalog courses" precedent from
-- Step 7 (20260913000002): a plain is_platform_admin()-gated policy, no service-role client
-- needed for the write.
CREATE POLICY "Admins provision classes for any instructor"
    ON public.classes FOR INSERT TO authenticated
    WITH CHECK (public.is_platform_admin());

-- Needed for the Section Allocation Manager's registry grid to read back what it just created
-- (and every other class already on the platform) - admins currently have no SELECT visibility
-- into public.classes at all.
CREATE POLICY "Admins view all classes"
    ON public.classes FOR SELECT TO authenticated
    USING (public.is_platform_admin());
