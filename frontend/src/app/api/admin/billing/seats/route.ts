import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type InstitutionRow = { id: string; name: string; max_license_seats: number | null };
type StudentProfileRow = { institution_id: string | null };

export type SeatLedgerEntry = {
  institutionId: string;
  institutionName: string;
  maxSeats: number | null;
  consumedSeats: number;
  availableSeats: number | null;
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to view billing data." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || !["platform_admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only platform admins can view the license seat ledger." },
      { status: 403 }
    );
  }

  const [institutionsResult, studentsResult] = await Promise.all([
    supabase.from("institutions").select("id, name, max_license_seats").order("name", { ascending: true }),
    supabase.from("profiles").select("institution_id").eq("role", "student"),
  ]);

  if (institutionsResult.error) {
    return NextResponse.json({ error: institutionsResult.error.message }, { status: 500 });
  }
  if (studentsResult.error) {
    return NextResponse.json({ error: studentsResult.error.message }, { status: 500 });
  }

  const consumedByInstitutionId = new Map<string, number>();
  for (const row of (studentsResult.data ?? []) as StudentProfileRow[]) {
    if (!row.institution_id) continue;
    consumedByInstitutionId.set(row.institution_id, (consumedByInstitutionId.get(row.institution_id) ?? 0) + 1);
  }

  const ledger: SeatLedgerEntry[] = ((institutionsResult.data ?? []) as InstitutionRow[]).map((institution) => {
    const consumedSeats = consumedByInstitutionId.get(institution.id) ?? 0;
    const availableSeats =
      institution.max_license_seats === null ? null : Math.max(0, institution.max_license_seats - consumedSeats);

    return {
      institutionId: institution.id,
      institutionName: institution.name,
      maxSeats: institution.max_license_seats,
      consumedSeats,
      availableSeats,
    };
  });

  return NextResponse.json({ ledger });
}
