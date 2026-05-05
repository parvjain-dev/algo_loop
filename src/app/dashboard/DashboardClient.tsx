"use client";

import { Problem, Revision } from "@/lib/types";
import { format, isToday, isBefore, startOfDay, differenceInCalendarDays } from "date-fns";
import { Flame, Calendar, CheckCircle2, AlertCircle, CalendarX, Sparkles, ExternalLink } from "lucide-react";
import Link from "next/link";

function calculateStreak(revisions: Revision[]): { daily: number; weekly: number } {
  if (!revisions.length) return { daily: 0, weekly: 0 };
  const dates = [...new Set(revisions.map((r) => format(new Date(r.completed_at), "yyyy-MM-dd")))].sort().reverse();
  let daily = 0;
  const today = format(new Date(), "yyyy-MM-dd");
  const start = dates[0] === today ? 0 : -1;
  if (start === -1 && differenceInCalendarDays(new Date(), new Date(dates[0])) > 1) return { daily: 0, weekly: 0 };
  for (let i = 0; i < dates.length; i++) {
    const expected = format(new Date(Date.now() - (i + (start === -1 ? 1 : 0)) * 86400000), "yyyy-MM-dd");
    if (dates[i] === expected) daily++;
    else break;
  }
  return { daily, weekly: Math.floor(daily / 7) };
}

// Pick a "random" problem of the day that's consistent for the whole day
function getProblemOfTheDay(problems: Problem[]): Problem | null {
  const solved = problems.filter((p) => p.revision_count >= 0 && !p.completed);
  if (!solved.length) return null;
  // Use today's date as seed so it stays the same all day but changes daily
  const todaySeed = new Date().toISOString().split("T")[0];
  let hash = 0;
  for (let i = 0; i < todaySeed.length; i++) {
    hash = ((hash << 5) - hash) + todaySeed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % solved.length;
  return solved[index];
}

export function DashboardClient({ problems, revisions, rescheduledToday }: { problems: Problem[]; revisions: Revision[]; rescheduledToday: number }) {
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const dueToday = problems.filter((p) => !p.completed && isBefore(new Date(p.next_revision), endOfToday));
  const upcoming = problems.filter((p) => !p.completed && !isBefore(new Date(p.next_revision), endOfToday)).slice(0, 10);
  const streak = calculateStreak(revisions);
  const mastered = problems.filter((p) => p.completed).length;
  const potd = getProblemOfTheDay(problems);

  const patternCounts = problems.reduce((acc, p) => {
    acc[p.pattern] = (acc[p.pattern] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard icon={<Flame className="text-orange-400" />} label="Daily Streak" value={`${streak.daily} days`} />
        <StatCard icon={<Flame className="text-purple-400" />} label="Weekly Streak" value={`${streak.weekly} weeks`} />
        <StatCard icon={<AlertCircle className="text-yellow-400" />} label="Due Today" value={String(dueToday.length)} />
        <StatCard icon={<CalendarX className="text-red-400" />} label="Rescheduled Today" value={String(rescheduledToday)} />
        <StatCard icon={<CheckCircle2 className="text-green-400" />} label="Mastered" value={`${mastered}/${problems.length}`} />
      </div>

      {/* Problem of the Day */}
      {potd && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-yellow-400" /> Problem of the Day
          </h2>
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-lg">{potd.name}</p>
                  {potd.link && <a href={potd.link} target="_blank" rel="noopener" className="text-blue-400"><ExternalLink size={14} /></a>}
                </div>
                <p className="text-sm text-gray-400 mt-1">{potd.pattern} · Rev #{potd.revision_count}</p>
                {potd.description && <p className="text-sm text-gray-500 mt-2">{potd.description}</p>}
              </div>
              <span className="text-xs bg-yellow-900/40 text-yellow-400 px-3 py-1 rounded-full">Random Pick</span>
            </div>
          </div>
        </section>
      )}

      {/* Due Today */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Due Today</h2>
          <Link href="/today" className="text-sm text-blue-400 hover:text-blue-300">Go to Today →</Link>
        </div>
        {dueToday.length === 0 ? (
          <p className="text-gray-500 text-sm">All clear! Nothing due today.</p>
        ) : (
          <div className="space-y-2">
            {dueToday.slice(0, 5).map((p) => (
              <ProblemRow key={p.id} problem={p} />
            ))}
            {dueToday.length > 5 && <p className="text-xs text-gray-500">+{dueToday.length - 5} more</p>}
          </div>
        )}
      </section>

      {/* Upcoming */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Upcoming Revisions</h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming revisions.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((p) => (
              <ProblemRow key={p.id} problem={p} />
            ))}
          </div>
        )}
      </section>

      {/* Pattern Breakdown */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Problems by Pattern</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(patternCounts).map(([pattern, count]) => (
            <div key={pattern} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400">{pattern}</p>
              <p className="text-lg font-bold">{count}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function ProblemRow({ problem }: { problem: Problem }) {
  const isOverdue = isBefore(new Date(problem.next_revision), startOfDay(new Date()));
  return (
    <Link
      href="/today"
      className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors"
    >
      <div>
        <p className="font-medium">{problem.name}</p>
        <p className="text-xs text-gray-400">
          {problem.pattern} · {problem.revision_count === -1 ? "First solve" : `Rev #${problem.revision_count}`}
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Calendar size={14} className={isOverdue ? "text-red-400" : "text-gray-400"} />
        <span className={isOverdue ? "text-red-400" : "text-gray-400"}>
          {isToday(new Date(problem.next_revision)) ? "Today" : format(new Date(problem.next_revision), "MMM d")}
        </span>
      </div>
    </Link>
  );
}
