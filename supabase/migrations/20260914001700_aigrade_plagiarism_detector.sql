-- Step 40: "AIGrade" Structural Plagiarism Detector & AST Code Hashing Parser.

CREATE TABLE public.lab_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  raw_code_content TEXT NOT NULL,
  code_structure_hash TEXT NOT NULL,
  is_flagged_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hot path for the duplicate-hash lookup below.
CREATE INDEX idx_lab_submissions_section_hash ON public.lab_submissions (section_id, code_structure_hash);

ALTER TABLE public.lab_submissions ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER is required here, not incidental: a student's own RLS SELECT policy only lets
-- them see their own rows, so if this ran as SECURITY INVOKER the duplicate lookup could never see
-- another student's submission to compare against. Overriding NEW.is_flagged_duplicate
-- unconditionally (regardless of whatever value a client sends) also closes the obvious integrity
-- hole of a student flipping their own flag back to false on a direct table insert - the flag is
-- always server-computed, never client-trusted, matching this project's established pattern for
-- every other security-sensitive computed column (e.g. monthly_ai_queries).
CREATE OR REPLACE FUNCTION public.compute_lab_submission_duplicate_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_flagged_duplicate := EXISTS (
    SELECT 1
    FROM public.lab_submissions
    WHERE section_id = NEW.section_id
      AND code_structure_hash = NEW.code_structure_hash
      AND student_id <> NEW.student_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_lab_submission_duplicate_flag
  BEFORE INSERT ON public.lab_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_lab_submission_duplicate_flag();

CREATE POLICY "Students view their own lab submissions"
  ON public.lab_submissions
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students insert their own lab submissions"
  ON public.lab_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Instructors and co-instructors get full read visibility over every submission for any section
-- belonging to a course one of their classes adopts - not narrowed to just their own class's
-- roster. This is deliberate: structural plagiarism detection is only useful if it can catch a
-- match across different classes/sections/terms of the same course (a student copying from a
-- friend in a different section), the same threat model real code-similarity tools use. It does
-- mean two different instructors teaching the same course can each see the other's students'
-- flagged submissions for that shared course - an intentional trade-off for cross-section
-- detection, not a scope leak.
CREATE POLICY "Instructors and co-instructors view their course's submission matrix"
  ON public.lab_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sections s
      JOIN public.chapters ch ON ch.id = s.chapter_id
      JOIN public.classes c ON c.course_id = ch.course_id
      WHERE s.id = public.lab_submissions.section_id
        AND (c.instructor_id = auth.uid() OR public.is_co_instructor_of_class(c.id))
    )
  );

NOTIFY pgrst, 'reload schema';
