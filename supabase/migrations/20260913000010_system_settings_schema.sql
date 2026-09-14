-- Global platform configuration store. Any authenticated profile may read the current settings
-- (client-side feature gating, e.g. hiding AI generation controls when disabled), but writes are
-- restricted to platform admins via the existing public.is_platform_admin() helper from
-- 20260913000002_admin_catalog_write_policies.sql.
CREATE TABLE public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated profiles can view system settings"
    ON public.system_settings FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins insert system settings"
    ON public.system_settings FOR INSERT TO authenticated
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admins update system settings"
    ON public.system_settings FOR UPDATE TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

CREATE POLICY "Admins delete system settings"
    ON public.system_settings FOR DELETE TO authenticated
    USING (public.is_platform_admin());

INSERT INTO public.system_settings (key, value, description) VALUES
    ('allow_ai_generation', 'true', 'Enables the AI Factory content-generation tools across instructor and admin catalog views.'),
    ('enforced_email_suffix', '"@campus.mnsu.edu"', 'Email domain suffix required for new self-registrations. Empty string disables enforcement.'),
    ('require_instructor_verification', 'true', 'Requires super/platform admin approval before an instructor signup can access instructor tooling.');
