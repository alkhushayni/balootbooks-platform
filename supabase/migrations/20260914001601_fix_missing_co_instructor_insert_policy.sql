-- Step 39 hotfix: independent live verification found that the "Primary instructors manage their
-- class co-instructor roster" FOR ALL policy from 20260914001600 never actually took effect
-- (almost certainly a casualty of the manual DROP FUNCTION cleanup done before pasting that file
-- in) - only the SELECT-only co-instructor policy was live. Diagnosed by isolating that
-- is_instructor_of_class(class_id) correctly returns true for the calling instructor's own class
-- in a standalone RPC call, yet every INSERT into class_co_instructors for that same class_id was
-- unconditionally rejected regardless of the instructor_id value on the new row - the signature of
-- zero applicable permissive policies for INSERT, not a predicate evaluating false.
--
-- DROP POLICY IF EXISTS makes this safe to run whether or not the original policy is present.
DROP POLICY IF EXISTS "Primary instructors manage their class co-instructor roster" ON public.class_co_instructors;

CREATE POLICY "Primary instructors manage their class co-instructor roster"
  ON public.class_co_instructors
  FOR ALL
  TO authenticated
  USING (public.is_instructor_of_class(class_id))
  WITH CHECK (public.is_instructor_of_class(class_id));

NOTIFY pgrst, 'reload schema';
