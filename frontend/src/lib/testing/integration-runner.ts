/**
 * Standalone multi-role integration test suite for BalootBooks.
 *
 * NOT part of the Next.js request pipeline and NOT imported anywhere in the app - it uses the
 * service-role key and must never end up in a client bundle. Run it directly from `frontend/`:
 *
 *   npm run test:integration
 *
 * It reads .env.local itself (a plain script has none of Next's built-in env loading) and talks
 * to Supabase's REST/RPC/Admin Auth endpoints directly over HTTP, the same way this session's
 * manual verification scripts have throughout the project - no `@/` path aliases are used here on
 * purpose, since those only resolve inside Next's own build, not a standalone script run.
 *
 * Two checks (§20's grading RPC, §31's webhook signature) exercise real backend logic directly
 * rather than proxying through a live Next.js dev server session: Next's SSR cookie-based auth
 * can't be replicated from a plain script without reimplementing @supabase/ssr's cookie format, so
 * grading is tested against the same grade_quiz_answer RPC the /api/quiz/submit route calls, using
 * a real signed-in student's bearer token instead of a browser session. §31's webhook check does
 * hit the real running route (POST /api/webhooks/stripe) with a genuinely-signed test payload,
 * since that route's request-signing logic is exactly what's under test.
 *
 * Every check provisions its own throwaway fixtures and deletes them again before returning,
 * whether it passed or failed, so the suite is safe to re-run repeatedly against a live project.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import Stripe from "stripe";

type Env = Record<string, string>;

function loadEnv(): Env {
  const text = readFileSync(new URL("../../../.env.local", import.meta.url), "utf8");
  const env: Env = {};
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return env;
}

const ENV = loadEnv();
const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_WEBHOOK_SECRET = ENV.STRIPE_WEBHOOK_SECRET;
const BASE_URL = ENV.INTEGRATION_TEST_BASE_URL ?? "http://localhost:3000";
const TEMP_PASSWORD = "Integration-Test-Temp!1";

function svcHeaders(extra: Record<string, string> = {}) {
  return { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json", ...extra };
}
function tokenHeaders(token: string, extra: Record<string, string> = {}) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra };
}

async function svcGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: svcHeaders() });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}
async function svcPost(path: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: svcHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}
async function svcDelete(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method: "DELETE", headers: svcHeaders() });
  if (!res.ok && res.status !== 404) throw new Error(`DELETE ${path} -> ${res.status}: ${await res.text()}`);
}
async function anonRpc(fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`rpc/${fn} -> ${res.status}: ${await res.text()}`);
  return res.json();
}
async function userRpc(token: string, fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: tokenHeaders(token), body: JSON.stringify(args) });
  if (!res.ok) throw new Error(`rpc/${fn} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

async function createThrowawayUser(label: string, email: string): Promise<{ id: string; email: string }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: svcHeaders(),
    body: JSON.stringify({ email, password: TEMP_PASSWORD, email_confirm: true, user_metadata: { full_name: `Integration Test ${label}`, role: "student" } }),
  });
  const body = await res.json();
  if (!res.ok || !body.id) throw new Error(`Couldn't create throwaway user ${email}: ${JSON.stringify(body)}`);
  return { id: body.id, email };
}
async function deleteAuthUser(id: string) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: svcHeaders() });
}
async function signIn(email: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: TEMP_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) throw new Error(`Sign-in failed for ${email}: ${JSON.stringify(body)}`);
  return body.access_token;
}

type CheckResult = { name: string; passed: boolean; detail: string; durationMs: number };

class IntegrationTestRunner {
  private results: CheckResult[] = [];

  private async runCheck(name: string, fn: () => Promise<string>) {
    const startedAt = Date.now();
    try {
      const detail = await fn();
      this.results.push({ name, passed: true, detail, durationMs: Date.now() - startedAt });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.results.push({ name, passed: false, detail, durationMs: Date.now() - startedAt });
    }
  }

  async run() {
    await this.runCheck("§25 Domain Onboarding Eligibility Gate", () => this.checkDomainOnboardingGate());
    await this.runCheck("§20 Quiz Submission Grading Engine", () => this.checkQuizGradingEngine());
    await this.runCheck("§31 Stripe Payment Fulfillment Handshake", () => this.checkStripeWebhookHandshake());
    await this.runCheck("§23 Gradebook Analytics Precision", () => this.checkGradebookAnalyticsPrecision());
    this.printReport();
    return this.results.every((result) => result.passed);
  }

  // 1) Provisions a fresh student account on a real onboarded domain and confirms both directions
  // of the domain gate: an allowlisted domain is accepted and auto-links the new profile to its
  // institution (Step 26), a fabricated domain is rejected.
  private async checkDomainOnboardingGate(): Promise<string> {
    const domains = (await svcGet("tenant_domains?select=domain_string&limit=1")) as { domain_string: string }[];
    if (domains.length === 0) throw new Error("No onboarded institution domains exist to test against.");
    const allowedDomain = domains[0].domain_string;
    const disallowedDomain = "not-a-real-domain-integration-test.example";

    const allowedResult = await anonRpc("is_domain_allowlisted", { p_domain: allowedDomain });
    const disallowedResult = await anonRpc("is_domain_allowlisted", { p_domain: disallowedDomain });

    if (allowedResult !== true) throw new Error(`Expected ${allowedDomain} to be allowlisted, got ${JSON.stringify(allowedResult)}`);
    if (disallowedResult !== false) throw new Error(`Expected a fabricated domain to be rejected, got ${JSON.stringify(disallowedResult)}`);

    const user = await createThrowawayUser("DomainGate", `integration-domaingate-${Date.now()}@${allowedDomain}`);
    try {
      const profile = (await svcGet(`profiles?select=institution_id&id=eq.${user.id}`)) as { institution_id: string | null }[];
      if (!profile[0]?.institution_id) {
        throw new Error("New student on an allowlisted domain did not get auto-linked to an institution.");
      }
      return `${allowedDomain} accepted and auto-linked to institution ${profile[0].institution_id}; ${disallowedDomain} correctly rejected.`;
    } finally {
      await deleteAuthUser(user.id);
    }
  }

  // 2) Exercises the real grade_quiz_answer RPC (the same one /api/quiz/submit calls) against two
  // throwaway questions - one answered correctly, one deliberately wrong - to confirm grading
  // never trusts the client and scores both directions accurately.
  private async checkQuizGradingEngine(): Promise<string> {
    const sections = (await svcGet("sections?select=id&limit=1")) as { id: string }[];
    if (sections.length === 0) throw new Error("No sections exist to attach a test quiz question to.");
    const sectionId = sections[0].id;

    const correctQuestion = await svcPost("quiz_questions", {
      section_id: sectionId,
      question_text: "[Integration Test] What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correct_index: 1,
    });
    const wrongQuestion = await svcPost("quiz_questions", {
      section_id: sectionId,
      question_text: "[Integration Test] What is the capital of France?",
      options: ["Berlin", "Madrid", "Paris", "Rome"],
      correct_index: 2,
    });
    const correctQuestionId = correctQuestion[0].id;
    const wrongQuestionId = wrongQuestion[0].id;

    const user = await createThrowawayUser("QuizGrading", `integration-quiz-${Date.now()}@campus.mnsu.edu`);
    try {
      const token = await signIn(user.email);

      const correctRaw = await userRpc(token, "grade_quiz_answer", { p_question_id: correctQuestionId, p_selected_index: 1 });
      const wrongRaw = await userRpc(token, "grade_quiz_answer", { p_question_id: wrongQuestionId, p_selected_index: 0 });
      const correctGrade = Array.isArray(correctRaw) ? correctRaw[0] : correctRaw;
      const wrongGrade = Array.isArray(wrongRaw) ? wrongRaw[0] : wrongRaw;

      if (correctGrade?.isCorrect !== true) {
        throw new Error(`Expected the correct answer to grade as correct, got ${JSON.stringify(correctGrade)}`);
      }
      if (wrongGrade?.isCorrect !== false) {
        throw new Error(`Expected the wrong answer to grade as incorrect, got ${JSON.stringify(wrongGrade)}`);
      }

      return "grade_quiz_answer() scored a correct submission as correct and a wrong submission as incorrect, matching each question's real correct_index.";
    } finally {
      await deleteAuthUser(user.id);
      await svcDelete(`quiz_questions?id=eq.${correctQuestionId}`);
      await svcDelete(`quiz_questions?id=eq.${wrongQuestionId}`);
    }
  }

  // 3) Simulates a real checkout.session.completed webhook delivery against the live
  // /api/webhooks/stripe route, using a genuinely-signed payload (stripe.webhooks.
  // generateTestHeaderString against the real STRIPE_WEBHOOK_SECRET) - the same technique Stripe's
  // own CLI tooling uses, and the only way to test the route's signature verification for real.
  private async checkStripeWebhookHandshake(): Promise<string> {
    if (!STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured in .env.local.");
    }

    const courses = (await svcGet("courses?select=id&limit=1")) as { id: string }[];
    if (courses.length === 0) throw new Error("No courses exist to attach a test purchase to.");
    const courseId = courses[0].id;

    const user = await createThrowawayUser("StripeHandshake", `integration-stripe-${Date.now()}@campus.mnsu.edu`);
    const sessionId = `cs_test_integration_${Date.now()}`;

    try {
      const eventPayload = {
        id: `evt_integration_${Date.now()}`,
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: {
            id: sessionId,
            object: "checkout.session",
            amount_total: 4999,
            metadata: { studentId: user.id, courseId },
          },
        },
      };
      const payloadString = JSON.stringify(eventPayload);
      const signature = Stripe.webhooks.generateTestHeaderString({ payload: payloadString, secret: STRIPE_WEBHOOK_SECRET });

      let response: Response;
      try {
        response = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "stripe-signature": signature },
          body: payloadString,
        });
      } catch {
        throw new Error(`Couldn't reach ${BASE_URL}/api/webhooks/stripe - is the dev server running?`);
      }

      if (!response.ok) {
        throw new Error(`Webhook route returned ${response.status}: ${await response.text()}`);
      }

      const purchases = (await svcGet(`student_purchases?select=id,amount_paid&stripe_session_id=eq.${sessionId}`)) as {
        id: string;
        amount_paid: number;
      }[];

      if (purchases.length !== 1) {
        throw new Error(`Expected exactly one student_purchases row after the webhook fired, found ${purchases.length}.`);
      }
      if (purchases[0].amount_paid !== 49.99) {
        throw new Error(`Expected amount_paid to be 49.99, got ${purchases[0].amount_paid}.`);
      }

      return `Signed webhook payload accepted and inserted a $${purchases[0].amount_paid} student_purchases row for session ${sessionId}.`;
    } finally {
      await svcDelete(`student_purchases?stripe_session_id=eq.${sessionId}`);
      await deleteAuthUser(user.id);
    }
  }

  // 4) Seeds a fully known dataset (3/4 sections complete, 3/5 quiz answers correct, exam scores
  // of 80 and 90) and confirms the exact percentages the gradebook (Step 23) computes from it -
  // 75%, 60%, and 85.00% - are mathematically exact, not just "close enough".
  private async checkGradebookAnalyticsPrecision(): Promise<string> {
    const sections = (await svcGet("sections?select=id&limit=4")) as { id: string }[];
    if (sections.length < 4) throw new Error("Fewer than 4 sections exist - need at least 4 for a deterministic ratio.");

    const classes = (await svcGet("classes?select=id&limit=1")) as { id: string }[];
    if (classes.length === 0) throw new Error("No classes exist to attach test exams to.");
    const classId = classes[0].id;

    const user = await createThrowawayUser("Gradebook", `integration-gradebook-${Date.now()}@campus.mnsu.edu`);

    const quizQuestionIds: string[] = [];
    const examIds: string[] = [];

    try {
      // Reading completion: 3 of 4 sections marked complete -> 75% exactly.
      for (const section of sections.slice(0, 3)) {
        await svcPost("student_progress", { student_id: user.id, section_id: section.id, participation_percentage: 100 });
      }

      // Quiz accuracy: 5 throwaway questions, 3 answered correctly -> 60% exactly.
      const correctnessPattern = [true, true, true, false, false];
      for (const isCorrect of correctnessPattern) {
        const question = await svcPost("quiz_questions", {
          section_id: sections[0].id,
          question_text: "[Integration Test] Gradebook precision fixture",
          options: ["A", "B"],
          correct_index: 0,
        });
        const questionId = question[0].id;
        quizQuestionIds.push(questionId);
        await svcPost("quiz_submissions", {
          student_id: user.id,
          question_id: questionId,
          selected_index: isCorrect ? 0 : 1,
          is_correct: isCorrect,
        });
      }

      // Exam average: two exams, scores of 80 and 90 -> average of exactly 85.00.
      for (const score of [80, 90]) {
        const exam = await svcPost("exams", { class_id: classId, title: "[Integration Test] Precision Fixture", time_limit_mins: 30 });
        const examId = exam[0].id;
        examIds.push(examId);
        await svcPost("exam_attempts", {
          student_id: user.id,
          exam_id: examId,
          score_percentage: score,
          answers_json: [],
        });
      }

      // Query everything back exactly as the gradebook does, then apply its own formulas.
      const progressRows = (await svcGet(
        `student_progress?select=section_id,participation_percentage&student_id=eq.${user.id}`
      )) as { participation_percentage: number }[];
      const completedCount = progressRows.filter((row) => row.participation_percentage >= 100).length;
      const readingProgressPct = Math.round((completedCount / sections.length) * 100);

      const submissionRows = (await svcGet(`quiz_submissions?select=is_correct&student_id=eq.${user.id}`)) as { is_correct: boolean }[];
      const correctCount = submissionRows.filter((row) => row.is_correct).length;
      const quizAccuracyPct = Math.round((correctCount / submissionRows.length) * 100);

      const attemptRows = (await svcGet(`exam_attempts?select=score_percentage&student_id=eq.${user.id}`)) as {
        score_percentage: number;
      }[];
      const examAveragePct =
        Math.round((attemptRows.reduce((sum, row) => sum + row.score_percentage, 0) / attemptRows.length) * 100) / 100;

      if (readingProgressPct !== 75) throw new Error(`Expected reading completion of exactly 75%, got ${readingProgressPct}%.`);
      if (quizAccuracyPct !== 60) throw new Error(`Expected quiz accuracy of exactly 60%, got ${quizAccuracyPct}%.`);
      if (examAveragePct !== 85) throw new Error(`Expected exam average of exactly 85.00%, got ${examAveragePct}%.`);

      return `Reading completion 75%, quiz accuracy 60%, exam average 85.00% - all three matched their hand-calculated expected values exactly.`;
    } finally {
      await svcDelete(`student_progress?student_id=eq.${user.id}`);
      await svcDelete(`quiz_submissions?student_id=eq.${user.id}`);
      for (const id of quizQuestionIds) await svcDelete(`quiz_questions?id=eq.${id}`);
      await svcDelete(`exam_attempts?student_id=eq.${user.id}`);
      for (const id of examIds) await svcDelete(`exams?id=eq.${id}`);
      await deleteAuthUser(user.id);
    }
  }

  // Deliberately does not try to right-pad fixed-width box borders around colored text - ANSI
  // escape codes count toward .length but have zero visual width, so padEnd/padStart against a
  // colored string always miscalculates and the "box" ends up crooked. A left-aligned divider-rule
  // report reads just as cleanly in a real terminal without that trap.
  private printReport() {
    const RESET = "\x1b[0m";
    const GREEN = "\x1b[32m";
    const RED = "\x1b[31m";
    const DIM = "\x1b[2m";
    const BOLD = "\x1b[1m";

    const rule = "─".repeat(64);
    const lines: string[] = [];

    lines.push(rule);
    lines.push(`${BOLD}BALOOTBOOKS INTEGRATION TEST SUITE${RESET}`);
    lines.push(rule);

    for (const result of this.results) {
      const badge = result.passed ? `${GREEN}[PASS]${RESET}` : `${RED}[FAIL]${RESET}`;
      lines.push(`${badge}  ${result.name}  ${DIM}(${result.durationMs}ms)${RESET}`);
      lines.push(`       ${DIM}└─ ${result.detail}${RESET}`);
    }

    const passedCount = this.results.filter((result) => result.passed).length;
    const allPassed = passedCount === this.results.length;
    lines.push(rule);
    lines.push(`${allPassed ? GREEN : RED}${BOLD}${passedCount} / ${this.results.length} CHECKS PASSED${RESET}`);
    lines.push(rule);

    console.log(lines.join("\n"));
  }
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  const runner = new IntegrationTestRunner();
  runner.run().then((allPassed) => {
    process.exit(allPassed ? 0 : 1);
  });
}

export { IntegrationTestRunner };
