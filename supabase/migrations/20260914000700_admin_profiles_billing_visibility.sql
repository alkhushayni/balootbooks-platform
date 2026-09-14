-- Step 28: Institutional Invoicing & License Seat Manager. The seat-consumption calculation
-- needs to count public.profiles rows (role = 'student') grouped by institution_id, but no
-- admin has ever had SELECT visibility into arbitrary profiles rows - the only existing paths are
-- "view your own row" (Step 1) and the Step 26 chair policy, which is narrowly scoped to
-- instructor-role targets within the chair's own institution. Without this, the new billing route
-- would silently compute zero consumed seats for every institution. Mirrors the "Admins view all
-- classes" precedent from Step 27: a plain is_platform_admin()-gated SELECT policy.
CREATE POLICY "Admins view all profiles"
    ON public.profiles FOR SELECT TO authenticated
    USING (public.is_platform_admin());
