-- Removes the fabricated chapter/section rows left over from the two failed attempts at
-- 20260913000008 (content that was generated rather than copy-pasted verbatim, confirmed via
-- a literal "\n" artifact in one section's markdown_content and titles matching nothing in the
-- migration file). The correct rows landed successfully in a later run and are untouched here.
--
-- The 8 fabricated chapters below are identified by their predictable, hand-crafted IDs
-- (c202c001-0000-..., a2020101-0000-..., etc.) -- gen_random_uuid() never produces IDs with
-- this kind of visible pattern, which is how these are distinguished from the correct chapters
-- sitting alongside them (random UUIDs, e.g. 626daebe-1bfe-40f7-b6d3-9dcc8f95cc93).
--
-- Deleting the chapters cascades to their sections automatically via
-- sections.chapter_id REFERENCES chapters(id) ON DELETE CASCADE -- no separate sections DELETE
-- is needed or included, to avoid any risk of matching a section that isn't actually a child of
-- one of these specific chapters.
DELETE FROM public.chapters
WHERE id IN (
  'c202c001-0000-0000-0000-000000000001',
  'c202c002-0000-0000-0000-000000000002',
  'c350c001-0000-0000-0000-000000000001',
  'c350c002-0000-0000-0000-000000000002',
  'c483c001-0000-0000-0000-000000000001',
  'c483c002-0000-0000-0000-000000000002',
  'c631c001-0000-0000-0000-000000000001',
  'c631c002-0000-0000-0000-000000000002'
);
