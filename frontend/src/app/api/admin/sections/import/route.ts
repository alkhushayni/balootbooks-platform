import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RosterEntry = {
  fullName?: string;
  email?: string;
};

type ImportPayload = {
  classId?: string;
  institutionId?: string;
  roster?: RosterEntry[];
};

type ImportFailure = { email: string; reason: string };

function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to import a roster." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["platform_admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only platform admins can bulk-import student rosters." },
      { status: 403 }
    );
  }

  const payload = (await request.json()) as ImportPayload;
  const classId = payload.classId?.trim();
  const institutionId = payload.institutionId?.trim();
  const roster = payload.roster;

  if (!classId || !institutionId) {
    return NextResponse.json({ error: "classId and institutionId are required." }, { status: 400 });
  }

  if (!Array.isArray(roster) || roster.length === 0) {
    return NextResponse.json({ error: "At least one roster row is required." }, { status: 400 });
  }

  // Every read and write from here on uses the service-role admin client, per the explicit
  // requirement for this route. Authorization was already proven above from the admin's own
  // session - the admin client is only reached once that's established, matching the Step 22
  // exam-grading precedent.
  const admin = createAdminClient();

  const { data: classRow, error: classError } = await admin
    .from("classes")
    .select("id")
    .eq("id", classId)
    .single();

  if (classError || !classRow) {
    return NextResponse.json({ error: "Class section not found." }, { status: 404 });
  }

  const { data: institutionRow, error: institutionError } = await admin
    .from("institutions")
    .select("id")
    .eq("id", institutionId)
    .single();

  if (institutionError || !institutionRow) {
    return NextResponse.json({ error: "Institution not found." }, { status: 404 });
  }

  const { data: domainRows, error: domainsError } = await admin
    .from("tenant_domains")
    .select("domain_string")
    .eq("institution_id", institutionId);

  if (domainsError) {
    return NextResponse.json({ error: domainsError.message }, { status: 500 });
  }

  const allowedDomains = new Set((domainRows ?? []).map((row) => row.domain_string.toLowerCase()));

  const failures: ImportFailure[] = [];
  let importedCount = 0;

  for (const entry of roster) {
    const fullName = entry.fullName?.trim();
    const email = entry.email?.trim().toLowerCase();

    if (!fullName || !email || !email.includes("@")) {
      failures.push({ email: entry.email ?? "(blank)", reason: "Missing or malformed name/email." });
      continue;
    }

    if (!allowedDomains.has(emailDomain(email))) {
      failures.push({ email, reason: "Email domain is not whitelisted for this institution." });
      continue;
    }

    let studentId: string | undefined;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "student" },
    });

    if (created?.user) {
      studentId = created.user.id;
    } else {
      // Re-importing a roster that includes an already-provisioned student is expected (a class
      // often gets a corrected CSV re-uploaded) - look the existing account up by email instead
      // of treating this row as a hard failure.
      const isDuplicateEmail = createError?.message?.toLowerCase().includes("already been registered");

      if (!isDuplicateEmail) {
        failures.push({ email, reason: createError?.message ?? "Could not provision this account." });
        continue;
      }

      // The supabase-js admin SDK's listUsers() only supports page/perPage pagination, with no
      // email filter - paginating through every user to find one by email would be both slow and
      // fragile. The Admin Auth REST endpoint itself does support an `email` query filter, so
      // that's called directly here instead.
      const lookupResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        {
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const lookupBody = await lookupResponse.json();
      const existing = lookupBody?.users?.[0];

      if (!lookupResponse.ok || !existing) {
        failures.push({ email, reason: "Account already exists but could not be resolved." });
        continue;
      }

      studentId = existing.id;
    }

    const { error: enrollError } = await admin
      .from("enrollments")
      .insert({ student_id: studentId, class_id: classId })
      .select("id")
      .single();

    const isDuplicateEnrollment = enrollError?.code === "23505";

    if (enrollError && !isDuplicateEnrollment) {
      failures.push({ email, reason: enrollError.message });
      continue;
    }

    importedCount += 1;
  }

  return NextResponse.json({ importedCount, skippedCount: failures.length, failures });
}
