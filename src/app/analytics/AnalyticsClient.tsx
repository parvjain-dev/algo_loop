"use client";

import { Problem, Revision } from "@/lib/types";
import { format, subDays } from "date-fns";

export function AnalyticsClient({ problems, revisions }: { problems: Problem[]; revisions: Revision[] }) {
  const patternCounts = problems.reduce((acc, p) => {
    acc[p.pattern] = (acc[p.pattern] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const effortCounts = problems.reduce((acc, p) => {
    acc[p.effort] = (acc[p.effort] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Revisions per day (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const date = format(subDays(new Date(), 13 - i), "yyyy-MM-dd");
    const count = revisions.filter((r) => format(new Date(r.completed_at), "yyyy-MM-dd") === date).length;
    return { date: format(subDays(new Date(), 13 - i), "MMM d"), count };
  });

  const maxCount = Math.max(...last14.map((d) => d.count), 1);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Activity Chart */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Revisions (Last 14 Days)</h2>
        <div className="flex items-end gap-1 h-32 bg-gray-900 border border-gray-800 rounded-lg p-4">
          {last14.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-green-500 rounded-sm min-h-[2px] transition-all"
                style={{ height: `${(d.count / maxCount) * 100}%` }}
              />
              <span className="text-[9px] text-gray-500">{d.date.split(" ")[1]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pattern Distribution */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Problems by Pattern</h2>
        <div className="space-y-2">
          {Object.entries(patternCounts).sort((a, b) => b[1] - a[1]).map(([pattern, count]) => (
            <div key={pattern} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-40 truncate">{pattern}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(count / problems.length) * 100}%` }} />
              </div>
              <span className="text-sm font-medium w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Effort Distribution */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Effort Distribution</h2>
        <div className="grid grid-cols-3 gap-4">
          {(["low", "medium", "high"] as const).map((e) => (
            <div key={e} className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{effortCounts[e] || 0}</p>
              <p className="text-xs text-gray-400 capitalize">{e} effort</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-2xl font-bold">{problems.length}</p>
            <p className="text-xs text-gray-400">Total Problems</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-2xl font-bold">{revisions.length}</p>
            <p className="text-xs text-gray-400">Total Revisions</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-2xl font-bold">{Object.keys(patternCounts).length}</p>
            <p className="text-xs text-gray-400">Patterns Covered</p>
          </div>
        </div>
      </section>
    </div>
  );
}
