import { createClient } from "@supabase/supabase-js";

// Service-role client - bypasses RLS entirely. Server-only code (API routes), for operations
// that must read/write data no authenticated user session should ever see directly, such as an
// exam's answer key. Never import this from a Client Component - the service role key would end
// up in the browser bundle.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
