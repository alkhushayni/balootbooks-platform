import { createClient } from "@/lib/supabase/server";

const COVER_GRADIENTS = [
  "from-brand-400 to-brand-700",
  "from-indigo-400 to-brand-800",
  "from-sky-400 to-brand-700",
  "from-violet-400 to-brand-800",
  "from-blue-400 to-brand-700",
  "from-cyan-400 to-brand-800",
];

async function getFeaturedCourses() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("courses")
      .select("id, title")
      .eq("is_published", true)
      .limit(6);
    return data ?? [];
  } catch {
    // Supabase isn't reachable/configured yet — the hero panel just falls back to its empty state.
    return [];
  }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const courses = await getFeaturedCourses();

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-10 text-white lg:flex lg:w-1/2 xl:p-14">
        <div>
          <span className="text-lg font-semibold tracking-tight">BalootBooks</span>
          <h1 className="mt-10 max-w-md text-3xl font-bold leading-tight xl:text-4xl">
            Interactive courseware for the classroom, and for yourself.
          </h1>
          <p className="mt-4 max-w-md text-sm text-brand-100 xl:text-base">
            Institutions get isolated class workspaces, live gradebooks, and zero-cost virtual labs.
            Independent learners get instant access to the same interactive content — no classroom required.
          </p>
        </div>

        {courses && courses.length > 0 ? (
          <div className="mt-10 grid grid-cols-3 gap-3">
            {courses.map((course, index) => (
              <div
                key={course.id}
                className={`flex aspect-[3/4] items-end rounded-lg bg-gradient-to-br p-3 shadow-lg ${
                  COVER_GRADIENTS[index % COVER_GRADIENTS.length]
                }`}
              >
                <span className="text-xs font-medium leading-snug text-white/90">{course.title}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-xs text-brand-200">
            New courses appear here as soon as they&apos;re published to the catalog.
          </p>
        )}
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-slate-50 px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <span className="text-lg font-semibold tracking-tight text-brand-700">BalootBooks</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
