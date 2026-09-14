-- Found live during the full-platform walkthrough, and much more severe than it first looked:
-- deleting an auth.users row (the standard cleanup step used throughout this entire session's
-- verification passes) does NOT cascade-delete the matching public.profiles row, despite the
-- original schema (20260912000001) declaring `id UUID PRIMARY KEY REFERENCES auth.users(id) ON
-- DELETE CASCADE`. Confirmed live: deleted a throwaway instructor's auth.users row (verified
-- genuinely gone - a direct lookup returned 404 user_not_found), then found their public.profiles
-- row still present. A full sweep found 37 orphaned profiles out of 43 total, dating back to
-- Step 26 - every verification pass this session that deleted a throwaway account left its profile
-- row behind. This is not just clutter: several of these orphans have institution_id set (Step 26's
-- auto-linking) and role='student', so they were silently inflating the Step 28 billing dashboard's
-- consumed-seat count with accounts that no longer exist.
--
-- Reasserts the correct FK. profiles_id_fkey is the default name Postgres assigns to this
-- single-column FK, matching the naming convention already relied on elsewhere in this project
-- (e.g. profiles_role_check).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
