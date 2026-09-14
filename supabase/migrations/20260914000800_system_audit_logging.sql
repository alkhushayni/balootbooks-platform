-- Step 30: Real-Time Audit Log Ledger. An append-only compliance record of administrative
-- actions across the platform.
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Strictly append-only: any UPDATE or DELETE attempt is rejected outright, regardless of caller
-- (this fires before RLS is even relevant, for every role including service_role - a compliance
-- ledger that anyone, including our own backend code, could quietly edit or delete rows from
-- after the fact would defeat its entire purpose).
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutations()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are immutable - % operations are not permitted.', TG_OP;
END;
$$;

CREATE TRIGGER audit_logs_prevent_update
    BEFORE UPDATE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutations();

CREATE TRIGGER audit_logs_prevent_delete
    BEFORE DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutations();

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Read access only, and only for admins. is_platform_admin() is SECURITY DEFINER since the
-- Step 28 hotfix, so referencing it here carries no recursion risk - audit_logs isn't queried
-- from within any other table's policy, and profiles' own policies don't reference audit_logs.
CREATE POLICY "Admins view audit logs"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_platform_admin());

-- Deliberately no INSERT/UPDATE/DELETE policy for the authenticated role at all - not even for
-- admins. Every write goes through the service-role client from trusted server code only (see
-- frontend/src/lib/audit-log.ts), which bypasses RLS entirely. This means no authenticated
-- session, admin or otherwise, can forge a log entry via a direct client-side REST call; only
-- server-side code holding the service-role key can write to this table at all, and even that
-- code can never edit or delete a row once written, per the trigger above.
