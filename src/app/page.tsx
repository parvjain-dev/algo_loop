import type { Metadata } from "next";
import { BarChart3, Bot, CalendarCheck, Flame, NotebookPen, Trophy } from "lucide-react";
import { SOLVE_METHOD_DAYS } from "@/lib/constants";
import { SignInButton } from "@/components/landing/SignInButton";

/**
 * The public landing page. Rendered on the server so search engines, link
 * previews and AI assistants can read it. Signed-in visitors never see it:
 * the middleware sends them straight to the dashboard.
 */

export const metadata: Metadata = {
  title: "Algo Loop: spaced repetition for DSA and AI-assisted interview practice",
  description:
    "Stop forgetting the DSA problems you've already solved. Algo Loop schedules each revision based on how the last attempt went, and AI Round lets you practise the new AI-assisted coding interviews. Free.",
  openGraph: {
    title: "Algo Loop",
    description: "Spaced repetition for DSA, plus practice for AI-assisted coding interviews. Free.",
    type: "website",
  },
};

const METHODS = [
  { label: "Solved it in under 25 minutes", days: SOLVE_METHOD_DAYS.under_25, dot: "bg-emerald-400" },
  { label: "Solved it, but took over 25 minutes", days: SOLVE_METHOD_DAYS.over_25, dot: "bg-amber-400" },
  { label: "Needed hints", days: SOLVE_METHOD_DAYS.with_hints, dot: "bg-orange-400" },
  { label: "Needed the solution", days: SOLVE_METHOD_DAYS.with_solution, dot: "bg-rose-400" },
];

// One problem's real path through the app's intervals, from first attempt to mastered.
const PATH = (() => {
  const steps = [
    { method: "with_solution", text: "needed the solution", dot: "bg-rose-400" },
    { method: "with_hints", text: "needed hints", dot: "bg-orange-400" },
    { method: "over_25", text: "solved, 31 min", dot: "bg-amber-400" },
    { method: "under_25", text: "solved, 14 min", dot: "bg-emerald-400" },
  ] as const;
  let day = 0;
  const out = steps.map((s) => {
    const row = { day, ...s };
    day += SOLVE_METHOD_DAYS[s.method];
    return row;
  });
  return { rows: out, masteredOn: day };
})();

const EXTRAS = [
  { icon: CalendarCheck, title: "Today", text: "A short list of exactly what to revise today. A busy day spills over to the next one with room." },
  { icon: Flame, title: "Streaks and calendar", text: "Daily and weekly streaks, and a calendar of every day you showed up." },
  { icon: BarChart3, title: "Analytics by pattern", text: "See which patterns, like sliding window or DP, keep sending problems back." },
  { icon: Trophy, title: "Weekly contest", text: "Every Monday, a timed set of four problems picked from your own list. One attempt." },
  { icon: NotebookPen, title: "Journal", text: "Write down the tricks and lessons you'd otherwise forget." },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <span className="text-lg font-semibold text-green-400">Algo Loop</span>
        <SignInButton quiet className="px-4 py-2" />
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.1]">
            Solve it once.
            <br />
            Still remember it in the interview.
          </h1>
          <p className="mt-6 text-lg text-gray-300 max-w-xl leading-relaxed">
            Algo Loop is a revision tracker for DSA. Log a problem and how it went, and it comes back right before
            you&apos;d forget it: sooner if it was hard, later if it was easy.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <SignInButton />
            <span className="text-sm text-gray-400">Free. No card, no setup.</span>
          </div>
        </div>

        <figure className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <figcaption className="text-sm text-gray-400">One problem, start to finish</figcaption>
          <p className="mt-1 font-medium text-white">Longest Substring Without Repeating Characters</p>
          <ol className="mt-5 space-y-0">
            {PATH.rows.map((r, i) => (
              <li key={r.day} className="relative flex gap-4 pb-5">
                {i < PATH.rows.length && <span className="absolute left-[5px] top-4 bottom-0 w-px bg-gray-700" aria-hidden />}
                <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${r.dot}`} aria-hidden />
                <div className="flex-1 flex items-baseline justify-between gap-3">
                  <span className="text-gray-200">{r.text}</span>
                  <span className="text-sm text-gray-400 tabular">
                    Day {r.day}
                    <span className="text-gray-500">, next in {SOLVE_METHOD_DAYS[r.method]}d</span>
                  </span>
                </div>
              </li>
            ))}
            <li className="relative flex gap-4">
              <Trophy size={12} className="mt-1.5 shrink-0 text-green-400" aria-hidden />
              <div className="flex-1 flex items-baseline justify-between gap-3">
                <span className="font-medium text-green-300">Done &amp; Dusted</span>
                <span className="text-sm text-gray-400 tabular">Day {PATH.masteredOn}</span>
              </div>
            </li>
          </ol>
          <p className="mt-5 text-sm text-gray-400">
            Four revisions, spaced by how each one went. Then it leaves your queue for good.
          </p>
        </figure>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-[1fr_1.4fr] gap-10">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">How the loop works</h2>
            <p className="mt-3 text-gray-400 max-w-sm">
              Solving more problems feels productive. Coming back to them at the right time is what makes them stick.
            </p>
          </div>
          <ol className="space-y-8">
            <li className="flex gap-4">
              <span className="text-green-400 font-semibold tabular">1</span>
              <div>
                <h3 className="font-medium text-white">Add a problem and say how it went</h3>
                <p className="mt-1 text-gray-400">Paste the link, pick the pattern, and be honest about the attempt.</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-green-400 font-semibold tabular">2</span>
              <div>
                <h3 className="font-medium text-white">It comes back when it should</h3>
                <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                  {METHODS.map((m) => (
                    <li key={m.label} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <span className={`h-2 w-2 rounded-full ${m.dot}`} aria-hidden />
                      <span className="flex-1">{m.label}</span>
                      <span className="text-gray-400 tabular">
                        {m.days} {m.days === 1 ? "day" : "days"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="text-green-400 font-semibold tabular">3</span>
              <div>
                <h3 className="font-medium text-white">Mark it Done &amp; Dusted</h3>
                <p className="mt-1 text-gray-400">When you can solve it cold, it leaves the revision cycle for good.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* AI Round */}
      <section className="border-t border-gray-800 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-[1fr_1.4fr] gap-10">
          <div>
            <p className="inline-flex items-center gap-2 text-sm text-green-300">
              <Bot size={16} aria-hidden /> New: AI Round
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white tracking-tight">Practise the coding round with an AI beside you</h2>
            <p className="mt-3 text-gray-400 max-w-sm">
              Canva now officially allows AI in its coding interviews, and Meta and Google are reported to be trying
              similar rounds. AI Round lets you practise that format.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            <li>
              <h3 className="font-medium text-white">A real codebase</h3>
              <p className="mt-1 text-gray-400">Several files, not one function. Tests unlock part by part: fix a bug, build a feature, make it fast.</p>
            </li>
            <li>
              <h3 className="font-medium text-white">An AI that reads, not writes</h3>
              <p className="mt-1 text-gray-400">It sees your files and answers in chat. Every change to the code is yours.</p>
            </li>
            <li>
              <h3 className="font-medium text-white">An honest review</h3>
              <p className="mt-1 text-gray-400">How you used the AI, what went well and what to improve, citing only what happened in your session.</p>
            </li>
            <li>
              <h3 className="font-medium text-white">Your own AI key</h3>
              <p className="mt-1 text-gray-400">Gemini&apos;s free tier is enough. Tests run in your browser. Python for now, more languages soon.</p>
            </li>
          </ul>
        </div>
      </section>

      {/* Everything else */}
      <section className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Built for showing up every day</h2>
          <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
            {EXTRAS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <Icon size={18} className="mt-0.5 shrink-0 text-green-400" aria-hidden />
                <div>
                  <h3 className="font-medium text-white">{title}</h3>
                  <p className="mt-1 text-sm text-gray-400 leading-relaxed">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-xl font-semibold text-white">Start your loop today.</p>
            <p className="mt-1 text-gray-400">Free for everyone preparing for software engineering interviews.</p>
          </div>
          <SignInButton />
        </div>
      </footer>
    </main>
  );
}
