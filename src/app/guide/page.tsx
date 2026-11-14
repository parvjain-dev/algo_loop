import type { ReactNode } from "react";
import Link from "next/link";
import {
  PlusCircle,
  CalendarCheck,
  Repeat,
  Trophy,
  Flame,
  BookOpen,
  BarChart3,
  Bell,
  LayoutDashboard,
  MessageSquarePlus,
  Rocket,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronDown,
  Timer,
  Target,
  Sparkles,
  Search,
  Lock,
  Bot,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { CONTEST_MIN_PROBLEMS, CONTEST_MINUTES, CONTEST_POINTS, DAILY_CAP } from "@/lib/constants";
import { FORMATS } from "@/lib/ai-round/formats";
import { SourceBadge } from "@/app/ai-round/AiRoundHome";
import { ScheduleLab } from "./ScheduleLab";

const TOC = [
  { id: "quick-start", label: "Quick start" },
  { id: "adding", label: "Adding problems" },
  { id: "schedule", label: "Revision schedule" },
  { id: "today", label: "Today's queue" },
  { id: "streaks", label: "Streaks & calendar" },
  { id: "contest", label: "Weekly contest" },
  { id: "ai-round", label: "AI Round" },
  { id: "more", label: "Everything else" },
  { id: "tips", label: "Pro tips" },
  { id: "faq", label: "FAQ" },
];

const FAQ = [
  {
    q: "I skipped a few days. Did I lose my problems?",
    a: "No. Anything past its date simply stays in Today's queue (and shows a red date on the dashboard) until you handle it. Your streak resets, but your schedule doesn't.",
  },
  {
    q: "Why didn't my streak go up after I added a problem?",
    a: "A problem counts for the day only if you add it as Already Solved. Problems added as Solve Later count on the day you actually finish them in Today. Rescheduling a problem doesn't count.",
  },
  {
    q: "Why did a problem move to a different day?",
    a: `Each day holds at most ${DAILY_CAP} problems. If more are due, the extra ones are moved to the nearest days that still have room, and Today tells you where they went. The same applies when you add a problem or finish a revision: if its ideal day is full, it takes the next free day. You'll find a summary in Notifications.`,
  },
  {
    q: "I finished my 3. Why isn't there more in Today?",
    a: `That's the daily limit working. ${DAILY_CAP} a day keeps it doable, and the rest are already lined up for the next days. Come back tomorrow, or add new problems as Already Solved if you want to do more.`,
  },
  {
    q: "What does Done & Dusted do?",
    a: "It marks the problem as mastered and takes it out of the revision cycle for good. It stays in your Problems list (filter by Mastered), still counts on the calendar for that day, and can still show up in the weekly contest.",
  },
  {
    q: "Can I change a problem's difficulty or pattern later?",
    a: "Yes. Go to Problems and click the pencil icon on any problem to edit its name, link, pattern or difficulty.",
  },
  {
    q: "How does the contest pick its problems?",
    a: "Randomly, from everything you've added, whether it's mastered, due or still waiting for its first solve. It aims for 1 Easy, 2 Medium and 1 Hard, and fills from what you have if a difficulty runs short.",
  },
  {
    q: "Can I retry this week's contest?",
    a: "No, there's one attempt per week. A fresh contest opens every Monday.",
  },
  {
    q: "What happens if I close the tab mid-contest?",
    a: "The clock keeps running, because it's based on when you pressed Start. Come back to the Contest page and your progress is still there.",
  },
  {
    q: "Is my AI key safe in AI Round?",
    a: "It's checked with your provider, encrypted on the server, and never sent back to your browser. Only the last 4 characters are shown. You can remove it any time with Change key.",
  },
  {
    q: "Does AI Round cost anything?",
    a: "Algo Loop doesn't charge for it. The AI runs on your own key, so any usage is billed by your provider, and Gemini's free tier is enough to practise.",
  },
  {
    q: "Generating a problem failed, or it says the AI is busy.",
    a: "Busy means your provider is overloaded, which is on their side. The app already retries and tries another model on your key. Wait a minute, pick another model, or practise with Log Analyzer, which opens instantly.",
  },
  {
    q: "Can I use the rest of Algo Loop while a problem is being built?",
    a: "Yes. The build keeps running while you move between pages, with a small card in the corner showing progress. When it's ready the card says so, and the session's clock starts only when you open it. Closing or reloading the tab stops the build, and nothing half-built is ever saved.",
  },
  {
    q: "It said the AI took too long. Was half a problem saved?",
    a: "No. A problem is saved only after it passes the check, so a timeout leaves nothing behind. The app tries again once on its own. If it keeps happening, pick a faster model (a Flash or Mini one) in the model menu.",
  },
  {
    q: "Why can't the AI in AI Round edit my code?",
    a: "Because that's how the reported Meta format works: the AI reads your files and answers in chat, and you make every change. Pasting its code is fine, just run the tests afterwards.",
  },
  {
    q: "Does Algo Loop send emails?",
    a: "No. Everything is shown in-app, in Notifications.",
  },
  {
    q: "Can other people see my problems?",
    a: "No. Each account can only read and change its own data.",
  },
];

export default function GuidePage() {
  const standardMinutes = CONTEST_MINUTES.easy + 2 * CONTEST_MINUTES.medium + CONTEST_MINUTES.hard;
  const maxScore = CONTEST_POINTS.reduce((a, b) => a + b, 0);

  return (
    <div className="flex gap-10 max-w-6xl">
      <div className="flex-1 min-w-0 space-y-16">
        {/* ---------- Hero ---------- */}
        <header className="space-y-8">
          <div className="space-y-3">
            <a
              href="#ai-round"
              className="inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 pl-1.5 pr-3 py-1 text-sm text-gray-300 hover:border-gray-600"
            >
              <span className="rounded-full bg-green-900 text-green-300 text-xs font-semibold px-2 py-0.5">New</span>
              Practise AI-assisted interviews in AI Round
              <ArrowRight size={14} className="text-gray-500" />
            </a>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent w-fit">
              Never forget a solved problem again
            </h1>
            <p className="text-gray-300 max-w-2xl leading-relaxed">
              Algo Loop brings each problem back right before you&apos;d forget it. You solve, it schedules the next
              revision, and over time the problems you keep struggling with get seen more often than the ones you&apos;ve
              nailed.
            </p>
          </div>

          {/* The loop */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch">
            {[
              { icon: PlusCircle, title: "Add", text: "Log a problem with its pattern and difficulty.", color: "text-sky-400 bg-sky-500/10" },
              { icon: Target, title: "Solve", text: "Solve it now, or queue it for tomorrow.", color: "text-emerald-400 bg-emerald-500/10" },
              { icon: Repeat, title: "Revise", text: "It returns on a schedule based on how it went.", color: "text-amber-400 bg-amber-500/10" },
              { icon: Trophy, title: "Master", text: "Mark it Done & Dusted when it feels easy.", color: "text-violet-400 bg-violet-500/10" },
            ].map((s, i) => (
              <div key={s.title} className="relative">
                <div className="h-full bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                    <s.icon size={20} />
                  </div>
                  <p className="font-semibold">
                    <span className="text-gray-500 mr-1.5">{i + 1}</span>
                    {s.title}
                  </p>
                  <p className="text-sm text-gray-400">{s.text}</p>
                </div>
                {i < 3 && (
                  <ChevronRight
                    size={20}
                    className="hidden md:block absolute -right-[18px] top-1/2 -translate-y-1/2 text-gray-600 z-10"
                  />
                )}
              </div>
            ))}
          </div>
        </header>

        {/* ---------- Quick start ---------- */}
        <Section id="quick-start" icon={Rocket} title="Quick start" subtitle="Up and running in about a minute.">
          <ol className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                n: 1,
                t: "Add a few problems",
                d: (
                  <>
                    Open <b className="text-white">Problems</b>{" "}and press <b className="text-white">Add Problem</b>.
                    Add at least {CONTEST_MIN_PROBLEMS + 1} to unlock the weekly contest later.
                  </>
                ),
              },
              {
                n: 2,
                t: "Check Today every day",
                d: (
                  <>
                    <b className="text-white">Today</b> lists everything due. Finish an item, tell the app how it went,
                    and the next revision is scheduled for you.
                  </>
                ),
              },
              {
                n: 3,
                t: "Watch it compound",
                d: (
                  <>
                    Your <b className="text-white">Dashboard</b> calendar fills in, your streak grows, and the{" "}
                    <b className="text-white">Contest</b> tests you on your own problems each week.
                  </>
                ),
              },
              {
                n: 4,
                t: "Practise an AI round",
                d: (
                  <>
                    Open <b className="text-white">AI Round</b>, connect a free Gemini key, and try the ready-made Log
                    Analyzer problem with an AI beside you.
                  </>
                ),
              },
            ].map((s) => (
              <li key={s.n} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
                <span className="w-7 h-7 rounded-full bg-green-900 text-green-300 text-sm font-bold flex items-center justify-center tabular">
                  {s.n}
                </span>
                <p className="font-semibold">{s.t}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* ---------- Adding ---------- */}
        <Section
          id="adding"
          icon={PlusCircle}
          title="Adding problems"
          subtitle="Go to Problems → Add Problem. These are the fields:"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <dl className="space-y-3 text-sm">
                {[
                  ["Name", "Must be unique. Duplicates are blocked."],
                  ["Link", "Optional, but handy: it gives you a one-click jump from Today and the contest."],
                  ["Pattern", "Two Pointers, Graphs, DP and so on. Analytics uses this to show your weak spots."],
                  [
                    "Difficulty",
                    `Easy, Medium or Hard. The weekly contest uses it to build the mix and set the time (${CONTEST_MINUTES.easy}, ${CONTEST_MINUTES.medium} and ${CONTEST_MINUTES.hard} minutes).`,
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <dt className="w-20 shrink-0 font-semibold text-white">{k}</dt>
                    <dd className="text-gray-400">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid gap-3">
              <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-xl p-5 space-y-1.5">
                <p className="font-semibold text-emerald-400">Already Solved</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Pick how it went (under 25 min, over 25 min, with hints, or with the solution). That choice sets your
                  first revision date. <b className="text-white">Counts toward today&apos;s streak.</b>
                </p>
              </div>
              <div className="bg-sky-500/5 border border-sky-500/25 rounded-xl p-5 space-y-1.5">
                <p className="font-semibold text-sky-400">Solve Later</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Parks the problem in <b className="text-white">tomorrow&apos;s</b>{" "}queue as a first-time solve. It
                  counts toward your streak on the day you finish it.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ---------- Schedule ---------- */}
        <Section
          id="schedule"
          icon={Repeat}
          title="Revision schedule"
          subtitle="The harder it was, the sooner it comes back. Play it out below: solve a problem, say how it went, and see when it returns."
        >
          <ScheduleLab />
        </Section>

        {/* ---------- Today ---------- */}
        <Section
          id="today"
          icon={CalendarCheck}
          title="Today's queue"
          subtitle="Everything due today, plus anything overdue. This is the page you'll use most."
        >
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium">✓ Done</span>
              <ChevronRight size={16} className="text-gray-600" />
              <span className="text-gray-400">&ldquo;How did it go?&rdquo;</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-1">
                <p className="font-semibold text-emerald-400 flex items-center gap-2">
                  <Trophy size={15} /> Done &amp; Dusted
                </p>
                <p className="text-gray-400">Mastered. It leaves the revision cycle for good.</p>
              </div>
              <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 p-4 space-y-1">
                <p className="font-semibold text-sky-400 flex items-center gap-2">
                  <Repeat size={15} /> Need More Revision
                </p>
                <p className="text-gray-400">Pick how you solved it this time and the next date is set from the schedule above.</p>
              </div>
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 space-y-1">
                <p className="font-semibold text-amber-400 flex items-center gap-2">
                  <CalendarCheck size={15} /> Reschedule
                </p>
                <p className="text-gray-400">Not today? Push it to the next day with room. It doesn&apos;t count toward your streak.</p>
              </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-950/60 p-4 text-sm space-y-1">
              <p className="font-semibold text-white">Never more than {DAILY_CAP} a day</p>
              <p className="text-gray-400 leading-relaxed">
                If more than {DAILY_CAP} problems are due (say you skipped a few days), Today shows the {DAILY_CAP} that
                matter most: <b className="text-white">overdue first</b>, then the ones that were{" "}
                <b className="text-white">hardest last time</b>, then the oldest. The rest are moved to the nearest days
                with room, and you&apos;ll see a note saying where they went. Nothing is deleted, and a day never
                goes over {DAILY_CAP}.
              </p>
            </div>
          </div>
        </Section>

        {/* ---------- Streaks ---------- */}
        <Section
          id="streaks"
          icon={Flame}
          title="Streaks & activity calendar"
          subtitle="Show up every day and the calendar on your Dashboard fills with green."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <p className="font-semibold text-emerald-400">Counts for the day</p>
              <ul className="space-y-2 text-sm text-gray-300">
                {[
                  "Adding a problem as Already Solved",
                  "Finishing a problem in Today (any of the Done options)",
                  "Finishing a revision of an older problem",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <p className="font-semibold text-rose-400">Doesn&apos;t count</p>
              <ul className="space-y-2 text-sm text-gray-300">
                {[
                  "Adding a problem as Solve Later (until you finish it)",
                  "Rescheduling a problem",
                  "Editing a problem or writing a journal note",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-sm text-gray-400 space-y-2 leading-relaxed">
            <p>
              <b className="text-white">Daily streak</b>{" "}is the number of days in a row with at least one count. Miss a
              whole day and it restarts. If you haven&apos;t done anything yet today, yesterday&apos;s streak is still
              alive.
            </p>
            <p>
              <b className="text-white">Weekly streak</b>{" "}is how many full 7-day runs are inside your current daily
              streak.
            </p>
            <p>
              <b className="text-white">The calendar</b>{" "}works like LeetCode&apos;s. Each square is a day and a darker
              green means more problems. Hover for the exact count, and use the dropdown to switch between{" "}
              <b className="text-white">Current</b> (the past year) and any earlier year.
            </p>
          </div>
        </Section>

        {/* ---------- Contest ---------- */}
        <Section
          id="contest"
          icon={Trophy}
          title="Weekly contest"
          subtitle="A timed contest built from your own problems, so you practice recalling them under pressure."
        >
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex gap-3 text-sm items-start">
            <Lock size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-gray-300">
              Unlocks once you have <b className="text-white">more than {CONTEST_MIN_PROBLEMS} problems</b> (so{" "}
              {CONTEST_MIN_PROBLEMS + 1} or more). Until then the Contest page shows a progress bar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <p className="font-semibold">The mix</p>
              <p className="text-sm text-gray-400">4 problems picked at random from everything you&apos;ve added.</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-green-900/40 text-green-400">1 Easy</span>
                <span className="px-2 py-1 rounded bg-yellow-900/40 text-yellow-400">2 Medium</span>
                <span className="px-2 py-1 rounded bg-red-900/40 text-red-400">1 Hard</span>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <p className="font-semibold flex items-center gap-2">
                <Timer size={16} className="text-emerald-400" /> The timer
              </p>
              <p className="text-sm text-gray-400">
                One shared countdown. Time per problem: Easy {CONTEST_MINUTES.easy} min, Medium {CONTEST_MINUTES.medium}{" "}
                min, Hard {CONTEST_MINUTES.hard} min. A usual mix is <b className="text-white">{standardMinutes} min</b>.
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <p className="font-semibold">Scoring</p>
              <p className="text-sm text-gray-400">
                Points rise with each question: {CONTEST_POINTS.join(", ")} (max <b className="text-white">{maxScore}</b>
                ).
              </p>
            </div>
          </div>

          <ol className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3 text-sm text-gray-300">
            {[
              <>
                Press <b className="text-white">Start contest</b>. The clock starts immediately and keeps running even
                if you leave.
              </>,
              <>
                Solve each problem on its own site (use the link icon), then press{" "}
                <b className="text-white">Mark solved</b> in the contest. You mark your own answers.
              </>,
              <>
                Press <b className="text-white">Submit contest</b>{" "}when you&apos;re done. If the timer runs out it
                submits for you.
              </>,
              <>
                You get one attempt per week. A new contest opens every <b className="text-white">Monday</b>.
              </>,
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-800 text-gray-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/25 rounded-xl p-5 flex items-center gap-4">
            <Trophy size={28} className="text-amber-400 shrink-0" />
            <p className="text-sm text-gray-300 leading-relaxed">
              <b className="text-white">Master streak</b>{" "}sits at the top of the Contest page. It counts consecutive
              weeks in which you solved at least one contest problem, so don&apos;t skip a week!
            </p>
          </div>
        </Section>

        {/* ---------- AI Round ---------- */}
        <Section
          id="ai-round"
          icon={Bot}
          title="AI Round"
          subtitle="Practise the coding rounds where an AI assistant sits beside you: a real multi-file codebase, tests that unlock part by part, and an honest review."
        >
          <ol className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {[
              ["Connect your AI", "Paste a Gemini, OpenAI or Claude key. Gemini's free tier works."],
              ["Pick a format", "Four formats, each tagged with the company pattern it copies."],
              ["Watch it build", "Your AI writes a codebase, then the app checks the tests really work."],
              ["Solve it", "60 minutes. Pass the tests to unlock each part, with the AI in a side chat."],
              ["Read your review", "What went well, how you used the AI, and tips only where they're earned."],
            ].map(([t, d], i) => (
              <li key={t} className="relative bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-green-900 text-green-300 text-xs font-bold grid place-items-center tabular">
                  {i + 1}
                </span>
                <p className="font-semibold text-sm">{t}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FORMATS.map((f) => (
              <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-1.5">
                <p className="font-semibold text-sm">{f.name}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{f.oneLiner}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 pt-0.5">
                  {f.tags.map((t) => (
                    <span key={t.label} className="inline-flex items-center gap-1.5">
                      {t.label} <SourceBadge source={t.source} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <p className="font-semibold">Inside a session</p>
              <ul className="space-y-2 text-sm text-gray-300">
                {[
                  "The timer runs for 60 minutes and the session ends on its own, like the real round.",
                  "Press Run tests. When every test is green, the next part unlocks.",
                  "Answer the short think-first question to unlock the AI chat for each part.",
                  "The AI reads your files but can't edit them. You make every change.",
                  "Your work saves as you go, so closing the tab loses nothing.",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <p className="font-semibold flex items-center gap-2">
                <ShieldCheck size={16} className="text-green-400" /> Why the review can be trusted
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                {[
                  "Numbers like test runs and AI prompts are counted by the app, not guessed by the AI.",
                  "Every point links to the real moments from your session it's based on.",
                  "Anything the AI can't back with evidence is removed before you see it.",
                  "Finish every part and test the AI's code before moving on, and you only hear what went well.",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-300 max-w-xl leading-relaxed">
              <b className="text-white">The habit interviewers look for:</b> say your plan first, ask the AI small and specific
              questions, and run the tests after every paste.
            </p>
            <Link
              href="/ai-round"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
            >
              Open AI Round <ArrowRight size={14} />
            </Link>
          </div>
        </Section>

        {/* ---------- More ---------- */}
        <Section id="more" icon={Sparkles} title="Everything else" subtitle="The rest of the sidebar, in a line each.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                icon: LayoutDashboard,
                title: "Dashboard",
                text: "Streaks, what's due, how many you rescheduled, a Problem of the Day to revisit, upcoming revisions and your calendar.",
                href: "/dashboard",
              },
              {
                icon: Search,
                title: "Problems",
                text: "Your full list. Search by name, filter by pattern or status (Active, Not yet solved, Mastered), and edit anything with the pencil.",
                href: "/problems",
              },
              {
                icon: BookOpen,
                title: "Journal",
                text: "Write a short reflection on any revision: what worked, what tripped you up, the key insight. Future-you will read it before the next attempt.",
                href: "/journal",
              },
              {
                icon: BarChart3,
                title: "Analytics",
                text: "Revisions over the last 14 days, problems by pattern (spot the gaps), and your overall totals.",
                href: "/analytics",
              },
              {
                icon: Bell,
                title: "Notifications",
                text: "A log of everything that happened: added, scheduled, mastered, rescheduled. In-app only, no emails.",
                href: "/notifications",
              },
              {
                icon: MessageSquarePlus,
                title: "Feedback",
                text: "Found a bug or want a feature? Send it from here.",
                href: "/feedback",
              },
            ].map((c) => (
              <Link
                key={c.title}
                href={c.href}
                className="group bg-gray-900 border border-gray-800 hover:border-emerald-500/40 rounded-xl p-5 flex gap-4 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-800 group-hover:bg-emerald-500/10 flex items-center justify-center shrink-0 transition-colors">
                  <c.icon size={20} className="text-gray-300 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{c.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </Section>

        {/* ---------- Tips ---------- */}
        <Section id="tips" icon={Lightbulb} title="Pro tips" subtitle="Small habits that make the system work.">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ["Be honest about how it went", "If you needed the solution, say so. A short gap is exactly what you need."],
              ["Clear Today first thing", "A short daily queue beats a huge backlog. Overdue items just pile up."],
              ["Write one line in the Journal", "The key insight in a sentence is worth more than a perfect note you never write."],
              ["Tag the pattern properly", "Analytics only helps if the patterns are right. It shows you what to practice."],
              ["Set the real difficulty", "Honest Easy/Medium/Hard labels make the weekly contest a fair test."],
              ["Use Reschedule sparingly", "It buys you a day, but it doesn't count toward your streak."],
            ].map(([t, d]) => (
              <li key={t} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3">
                <Lightbulb size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">{t}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* ---------- FAQ ---------- */}
        <Section id="faq" icon={Search} title="FAQ" subtitle="Quick answers.">
          <div className="space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group bg-gray-900 border border-gray-800 rounded-xl open:border-gray-700">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none p-4 font-medium text-sm [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown size={16} className="text-gray-500 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-sm text-gray-400 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>

        <p className="text-sm text-gray-500 pb-8">
          Still stuck? Send a note from{" "}
          <Link href="/feedback" className="text-blue-400 hover:text-blue-300">
            Feedback
          </Link>
          .
        </p>
      </div>

      {/* ---------- Sticky table of contents ---------- */}
      <nav aria-label="On this page" className="hidden lg:block w-48 shrink-0">
        <div className="sticky top-8 space-y-1">
          <p className="text-xs font-medium text-gray-500 mb-3">On this page</p>
          {TOC.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="block text-sm text-gray-400 hover:text-white border-l border-gray-800 hover:border-green-400 pl-3 py-1 transition-colors"
            >
              {t.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-green-900/70 flex items-center justify-center">
            <Icon size={20} className="text-green-300" />
          </span>
          {title}
        </h2>
        {subtitle && <p className="text-gray-400 text-sm max-w-2xl">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
