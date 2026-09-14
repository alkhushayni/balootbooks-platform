-- Step 31: Stripe B2C E-Commerce Checkout Funnel. A standalone, direct-pay permission ledger,
-- independent of the classroom/enrollment model entirely - a student can unlock a course's
-- content either through a class join code (public.enrollments) or by paying for it directly.
CREATE TABLE public.student_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    stripe_session_id TEXT UNIQUE NOT NULL,
    amount_paid NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.student_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view their own purchases"
    ON public.student_purchases FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- Deliberately no INSERT/UPDATE/DELETE policy for the authenticated role, admin included - the
-- only legitimate writer is the Stripe webhook handler, which uses the service-role client after
-- independently verifying the Stripe signature. A row here represents real money changing hands;
-- nothing should be able to create or backdate one through an ordinary client session, mirroring
-- the same write-restriction reasoning applied to public.audit_logs in Step 30.
