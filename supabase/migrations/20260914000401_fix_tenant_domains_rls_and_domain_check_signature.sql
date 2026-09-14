-- Step 25 corrective migration: fix drift discovered via live REST verification.

-- 1) tenant_domains was readable by anon (RLS not active), leaking the full domain
--    allowlist before Step 25's ironclad admin-only rule was actually enforced.
--    institutions correctly blocked anon reads, so this table's RLS specifically
--    did not take effect on deploy. Re-assert it explicitly.
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- 2) is_domain_allowlisted was deployed with its parameter named p_email instead of
--    p_domain, so every call from the frontend (which sends p_domain) 404s. Since the
--    register server action treats any RPC error as "couldn't verify your institution"
--    and blocks signup, this silently broke registration for every domain, including
--    the freshly onboarded campus.mnsu.edu. DROP FUNCTION matches by name + argument
--    types (not argument names), so this removes the mis-named live version regardless
--    of what its parameter was actually called.
DROP FUNCTION IF EXISTS public.is_domain_allowlisted(text);

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
