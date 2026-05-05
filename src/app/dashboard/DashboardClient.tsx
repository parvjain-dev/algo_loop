"use client";

import { Problem, Revision } from "@/lib/types";
import { format, isToday, isBefore, startOfDay, differenceInCalendarDays } from "date-fns";
import { Flame, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

function calculateStreak(revisions: Revision[]): { daily: number; weekly: number } {
  if (!revisions.length) return { daily: 0, weekly: 0 };
  const dates = [...new Set(revisions.map((r) => format(new Date(r.completed_at), "yyyy-MM-dd")))].sort().reverse();
  let daily = 0;
  const today = format(new Date(), "yyyy-MM-dd");
  const start = dates[0] === today ? 0 : -1;
  if (start === -1 && differenceInCalendarDays(new Date(), new Date(dates[0])) > 1) return { daily: 0, weekly: 0 };
  for (let i = start === -1 ? 0 : 0; i < dates.length; i++) {
    const expected = format(new Date(Date.now() - (i + (start === -1 ? 1 : 0)) * 86400000), "yyyy-MM-dd");
    if (dates[i] === expected) daily++;
    else break;
  }
  return { daily, weekly: Math.floor(daily / 7) };
}

export function DashboardClient({ problems, revisions }: { problems: Problem[]; revisions: Revision[] }) {
  const today = startOfDay(new Date());
  const due = problems.filter((p) => !p.completed && isBefore(new Date(p.next_revision), new Date(Date.now() + 86400000)));
  const upcoming = problems.filter((p) => !p.completed && !isBefore(new Date(p.next_revision), today)).slice(0, 10);
  const streak = calculateStreak(revisions);

  const patternCounts = problems.reduce((acc, p) => {
    acc[p.pattern] = (acc[p.pattern] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Flame className="text-orange-400" />} label="Daily Streak" value={`${streak.daily} days`} />
        <StatCard icon={<Flame className="text-purple-400" />} label="Weekly Streak" value={`${streak.weekly} weeks`} />
        <StatCard icon={<AlertCircle className="text-yellow-400" />} label="Due Today" value={String(due.length)} />
        <StatCard icon={<CheckCircle2 className="text-green-400" />} label="Total Problems" value={String(problems.length)} />
      </div>

      {/* Due Today */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Due for Revision</h2>
        {due.length === 0 ? (
          <p className="text-gray-500 text-sm">No problems due today. Great job!</p>
        ) : (
          <div className="space-y-2">
            {due.map((p) => (
              <ProblemRow key={p.id} problem={p} />
            ))}
          </div>
        )}
      </section>

      {/* Timeline */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Upcoming Revisions</h2>
        <div className="space-y-2">
          {upcoming.map((p) => (
            <ProblemRow key={p.id} problem={p} />
          ))}
        </div>
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
      href={`/problems?id=${problem.id}`}
      className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors"
    >
      <div>
        <p className="font-medium">{problem.name}</p>
        <p className="text-xs text-gray-400">{problem.pattern} · {problem.effort} effort</p>
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
