import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SubmitPayload = {
  examId?: string;
  answers?: { questionId: string; selectedIndex: number }[];
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in to submit an exam." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "student") {
    return NextResponse.json({ error: "Only student accounts can submit exams." }, { status: 403 });
  }

  const payload = (await request.json()) as SubmitPayload;
  const { examId, answers } = payload;

  if (!examId || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "examId and a non-empty answers array are required." }, { status: 400 });
  }

  // Authorization is proven from the student's own RLS-scoped session, never assumed - even
  // though grading itself runs through the admin client below.
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id, class_id")
    .eq("id", examId)
    .single();

  if (examError || !exam) {
    return NextResponse.json({ error: "Exam not found." }, { status: 404 });
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("class_id", exam.class_id)
    .maybeSingle();

  if (!enrollment) {
    return NextResponse.json(
      { error: "You are not enrolled in the class this exam belongs to." },
      { status: 403 }
    );
  }

  const { data: existingAttempt } = await supabase
    .from("exam_attempts")
    .select("id")
    .eq("student_id", user.id)
    .eq("exam_id", examId)
    .maybeSingle();

  if (existingAttempt) {
    return NextResponse.json({ error: "You have already submitted this exam." }, { status: 409 });
  }

  // Grading runs through the service-role client - exam_questions.correct_index must never be
  // readable by an authenticated student session, and this is the only place in the app allowed
  // to see it.
  const admin = createAdminClient();

  const { data: questions, error: questionsError } = await admin
    .from("exam_questions")
    .select("id, correct_index")
    .eq("exam_id", examId);

  if (questionsError || !questions || questions.length === 0) {
    return NextResponse.json({ error: "This exam has no questions to grade." }, { status: 500 });
  }

  const correctByQuestionId = new Map(questions.map((question) => [question.id, question.correct_index]));

  // Denominator is the exam's total question count, not the number of submitted answers - an
  // unanswered question (including everything left blank on an auto-submit timeout) counts as
  // wrong rather than being excluded, so a partial submission can't inflate the score.
  let correctCount = 0;
  for (const answer of answers) {
    const correctIndex = correctByQuestionId.get(answer.questionId);
    if (correctIndex !== undefined && correctIndex === answer.selectedIndex) {
      correctCount += 1;
    }
  }

  const scorePercentage = Math.round((correctCount / questions.length) * 10000) / 100;

  const { error: insertError } = await admin.from("exam_attempts").insert({
    student_id: user.id,
    exam_id: examId,
    score_percentage: scorePercentage,
    answers_json: answers,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ scorePercentage });
}
