import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SubmitPayload = {
  questionId?: string;
  selectedIndex?: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to submit quiz answers." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "student") {
    return NextResponse.json({ error: "Only student accounts can submit quiz answers." }, { status: 403 });
  }

  const payload = (await request.json()) as SubmitPayload;
  const { questionId, selectedIndex } = payload;

  if (!questionId || typeof selectedIndex !== "number") {
    return NextResponse.json({ error: "questionId and selectedIndex are required." }, { status: 400 });
  }

  // Grading runs through a SECURITY DEFINER RPC, not a direct select, because this route uses
  // the SSR client tied to the student's own session - the same authenticated Postgres role as
  // the browser, which no longer has column-level access to correct_index. The RPC reads it with
  // elevated privileges internally and logs the submission atomically in one statement.
  const { data, error: rpcError } = await supabase.rpc("grade_quiz_answer", {
    p_question_id: questionId,
    p_selected_index: selectedIndex,
  });

  // PostgREST serializes a single-row function result as a bare object, and a set-returning one
  // as an array - handle both rather than assume one shape. The deployed function returns
  // camelCase keys (isCorrect/correctIndex) rather than the migration file's is_correct/
  // correct_index, which happens to already match the shape the frontend expects.
  const gradeResult = Array.isArray(data) ? data[0] : data;

  if (rpcError || !gradeResult || typeof gradeResult.isCorrect !== "boolean") {
    return NextResponse.json({ error: rpcError?.message ?? "Quiz question not found." }, { status: 404 });
  }

  return NextResponse.json({ isCorrect: gradeResult.isCorrect, correctIndex: gradeResult.correctIndex });
}
