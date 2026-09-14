import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Serves ONLY the shared master catalog structure (title/description/chapters/sections) - the
// same content for every caller regardless of who's asking, unlike the student reader page itself
// which also layers on personalized enrollment/purchase access, class-scoped instructor overrides,
// and per-student progress. Splitting the two apart is what makes caching safe here: the reader
// page (a Client Component, and inherently per-user/dynamic) can't carry `export const revalidate`
// - that route segment config option only has any effect in a Server Component or Route Handler,
// and Next.js rejects it entirely inside a "use client" file. This route is where that config
// actually belongs.
export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Still requires a real session - every course/chapter/section RLS policy in this schema is
  // scoped TO authenticated, and this endpoint should not become a new way to read gated
  // educational content without ever logging in. What it doesn't require is enrollment or
  // purchase in THIS specific course, since the response never varies by that.
  if (!user) {
    return NextResponse.json({ error: "You must be signed in to view course content." }, { status: 401 });
  }

  const { courseId } = await params;

  // Reads via the service-role key, not the caller's own session token, specifically so the
  // Next.js Data Cache key is identical for every caller requesting the same course - using each
  // user's own JWT here would fragment the cache per-user and defeat the entire point, even though
  // the underlying data (courses/chapters/sections) is already globally readable to any
  // authenticated user under existing RLS, so this isn't a privilege escalation over what every
  // caller could already read directly.
  const restUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/courses?id=eq.${courseId}&select=id,title,description,chapters(id,title,display_order,sections(id,title,content_type,display_order,markdown_content))`;

  const upstream = await fetch(restUrl, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    // Time-based revalidation plus granular tags: a future admin catalog-write action could call
    // revalidateTag(`course-${courseId}`) to invalidate this on demand instead of waiting out the
    // window, without needing to know about every other cached course.
    next: { revalidate: 1800, tags: [`course-${courseId}`, "courses"] },
  });

  if (!upstream.ok) {
    return NextResponse.json({ error: "Couldn't load this course." }, { status: 502 });
  }

  const rows = (await upstream.json()) as unknown[];
  const course = rows[0];

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  // "private" rather than "public": this response requires a session to reach at all, so a
  // shared/misconfigured proxy caching it as a public resource could leak gated content to a
  // party that never authenticated. The content itself doesn't vary by identity, so the caller's
  // own browser (and this route's server-side Data Cache, above) still get real reuse.
  return NextResponse.json(
    { course },
    { headers: { "Cache-Control": "private, max-age=1800, stale-while-revalidate=60" } }
  );
}
