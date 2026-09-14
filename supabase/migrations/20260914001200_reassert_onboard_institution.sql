-- Found live during a full-platform walkthrough: /admin/institutions' onboarding form fails with
-- "Could not find the function public.onboard_institution(...) in the schema cache" - confirmed
-- via a direct service-role RPC call too, bypassing the Next.js app entirely, so this is a real
-- database-level issue, not a route bug. is_domain_allowlisted(), created in the exact same
-- original Step 25 migration, works correctly, which rules out a general PostgREST schema-cache
-- staleness explanation - this function specifically appears to be missing from the live database.
-- Reasserting its original definition unchanged, matching the established "CREATE OR REPLACE covers
-- both staleness and genuine deletion" pattern used throughout this project.
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

NOTIFY pgrst, 'reload schema';
