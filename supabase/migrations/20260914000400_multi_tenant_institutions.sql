-- Step 25: B2B multi-tenant institution/domain foundation.
CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    max_license_seats INT DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.tenant_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    domain_string TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Additive, nullable normalization column - profiles.institution_name (free text, populated at
-- signup since Step 6) is left in place rather than removed, since existing rows and the
-- Step 11/24 admin consoles both read it and none of those free-text values will match an
-- institutions.name row automatically. New signups can be linked to a real institution going
-- forward without a destructive migration of historical data.
ALTER TABLE public.profiles
    ADD COLUMN institution_id UUID REFERENCES public.institutions(id);

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- Ironclad: every read and write on both tables is platform-admin only. Reuses
-- is_platform_admin() from 20260913000002.
CREATE POLICY "Admins view institutions"
    ON public.institutions FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "Admins insert institutions"
    ON public.institutions FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins update institutions"
    ON public.institutions FOR UPDATE TO authenticated
    USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins delete institutions"
    ON public.institutions FOR DELETE TO authenticated USING (public.is_platform_admin());

CREATE POLICY "Admins view tenant domains"
    ON public.tenant_domains FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE POLICY "Admins insert tenant domains"
    ON public.tenant_domains FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins update tenant domains"
    ON public.tenant_domains FOR UPDATE TO authenticated
    USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Admins delete tenant domains"
    ON public.tenant_domains FOR DELETE TO authenticated USING (public.is_platform_admin());

-- Registration happens as an unauthenticated (anon) request, before any session exists, so the
-- signup gate can't rely on the admin-only RLS above. This narrow SECURITY DEFINER function
-- answers only a yes/no for one domain string - it never exposes the institution/domain list
-- itself to an anonymous caller, keeping the "ironclad" read restriction on the tables intact.
CREATE OR REPLACE FUNCTION public.is_domain_allowlisted(p_domain text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_domains
    WHERE lower(domain_string) = lower(p_domain)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_domain_allowlisted(text) TO anon, authenticated;

-- Atomic institution + domain insert for the onboarding form - a single PL/pgSQL function body
-- is one transaction, so a domain_string UNIQUE violation rolls back the institution row too,
-- rather than leaving an orphaned institution with no domain. SECURITY INVOKER (not DEFINER):
-- the caller already has direct RLS-permitted INSERT access as an admin, so no privilege
-- escalation is needed - same reasoning as is_platform_admin() itself.
CREATE OR REPLACE FUNCTION public.onboard_institution(p_name text, p_domain text, p_max_seats int)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_institution_id uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can onboard institutions.';
  END IF;

  INSERT INTO public.institutions (name, max_license_seats)
  VALUES (p_name, COALESCE(p_max_seats, 1000))
  RETURNING id INTO v_institution_id;

  INSERT INTO public.tenant_domains (institution_id, domain_string)
  VALUES (v_institution_id, lower(p_domain));

  RETURN v_institution_id;
END;
$$;
