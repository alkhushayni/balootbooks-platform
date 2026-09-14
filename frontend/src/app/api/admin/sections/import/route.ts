import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit-log";

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
  const importedEmails: string[] = [];
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

      // The Admin Auth REST endpoint's `email` query param does not actually filter results (
      // confirmed live - it silently returns page 1 of ALL users regardless of the email
      // requested), so this resolves the existing account via a proper indexed DB lookup instead.
      // Called on the caller's own SSR session (not the admin/service-role client used elsewhere
      // in this route), since find_auth_user_id_by_email() checks is_platform_admin() internally
      // via auth.uid() - that resolves to nothing under the service-role client, which carries no
      // user session at all.
      const { data: existingId, error: lookupError } = await supabase.rpc("find_auth_user_id_by_email", {
        p_email: email,
      });

      if (lookupError || !existingId) {
        failures.push({ email, reason: "Account already exists but could not be resolved." });
        continue;
      }

      studentId = existingId;
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
    importedEmails.push(email);
  }

  await logAuditEvent({
    actorId: user.id,
    actionType: "roster_import",
    description: `Imported ${importedCount} student${importedCount === 1 ? "" : "s"} into class ${classId} (${failures.length} skipped).`,
    metadata: { classId, institutionId, importedEmails, failures },
  });

  return NextResponse.json({ importedCount, skippedCount: failures.length, failures });
}
