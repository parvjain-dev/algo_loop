"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { endOfMonth, format, getDay, startOfMonth, subMonths, addMonths } from "date-fns";
import { Flame } from "lucide-react";
import { computeStreaks, dayKey } from "@/lib/streak";

type View = "current" | number;

type MonthBlock = {
  key: string;
  label: string;
  offset: number; // weekday of the 1st (Sunday = 0) -> leading blank cells
  days: Date[];
};

function buildMonth(first: Date): MonthBlock {
  const last = endOfMonth(first);
  const days: Date[] = [];
  for (let d = new Date(first); d <= last; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push(d);
  }
  return { key: format(first, "yyyy-MM"), label: format(first, "MMM"), offset: getDay(first), days };
}

function cellColor(count: number): string {
  if (count <= 0) return "bg-gray-800";
  if (count === 1) return "bg-emerald-800";
  if (count === 2) return "bg-emerald-600";
  if (count <= 4) return "bg-emerald-500";
  return "bg-emerald-400";
}

const CELL_GAP = 4; // px between cells
const MONTH_GAP = 16; // px between month blocks

const subscribe = () => () => {};

export function ActivityCalendar({ activity }: { activity: Record<string, number> }) {
  // Render only on the client: "today" and day keys depend on the viewer's timezone
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [view, setView] = useState<View>("current");

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    for (const k of Object.keys(activity)) set.add(Number(k.slice(0, 4)));
    return [...set].sort((a, b) => b - a);
  }, [activity]);

  if (!mounted) {
    return <div className="bg-gray-900 border border-gray-800 rounded-xl h-64 animate-pulse" />;
  }

  const today = new Date();
  const todayKey = dayKey(today);

  const firstMonth = view === "current" ? startOfMonth(subMonths(today, 11)) : new Date(view, 0, 1);
  const months: MonthBlock[] = [];
  for (let i = 0; i < 12; i++) months.push(buildMonth(addMonths(firstMonth, i)));

  const colsOf = months.map((m) => Math.ceil((m.offset + m.days.length) / 7));
  const totalCols = colsOf.reduce((a, b) => a + b, 0);

  const rangeStart = dayKey(months[0].days[0]);
  const rangeEnd = view === "current" ? todayKey : dayKey(months[11].days[months[11].days.length - 1]);

  const inRange: Record<string, number> = {};
  for (const [k, v] of Object.entries(activity)) {
    if (k >= rangeStart && k <= rangeEnd) inRange[k] = v;
  }
  const stats = computeStreaks(inRange);
  const overall = computeStreaks(activity);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-sm text-gray-300">
          <span className="text-2xl font-bold text-white mr-1.5">{stats.total}</span>
          solves &amp; revisions {view === "current" ? "in the past year" : `in ${view}`}
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-400">
          {view === "current" && (
            <span className="flex items-center gap-1.5">
              <Flame size={14} className="text-orange-400" />
              Current streak <b className="text-white">{overall.current}</b>
            </span>
          )}
          <span>
            Total active days <b className="text-white">{stats.activeDays}</b>
          </span>
          <span>
            Max streak <b className="text-white">{stats.longest}</b>
          </span>
          <select
            value={String(view)}
            onChange={(e) => setView(e.target.value === "current" ? "current" : Number(e.target.value))}
            aria-label="Calendar range"
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
          >
            <option value="current">Current</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Heatmap: one block per month. Cell size is derived from the container width so
          every month has identical cells and the grid fills the card (up to a cap). */}
      <div className="overflow-x-auto">
        <div
          className="w-full min-w-[760px] max-w-[1500px] mx-auto"
          style={{ containerType: "inline-size" }}
        >
          <div
            className="flex"
            style={
              {
                gap: MONTH_GAP,
                "--c": `calc((100cqw - ${CELL_GAP * (totalCols - 12) + MONTH_GAP * 11}px) / ${totalCols})`,
              } as React.CSSProperties
            }
          >
            {months.map((m, mi) => {
              const cols = colsOf[mi];
              return (
                <div key={m.key} className="shrink-0">
                  <div
                    className="grid"
                    style={{
                      gridAutoFlow: "column",
                      gridTemplateRows: "repeat(7, var(--c))",
                      gridAutoColumns: "var(--c)",
                      gap: CELL_GAP,
                      width: `calc(${cols} * var(--c) + ${(cols - 1) * CELL_GAP}px)`,
                    }}
                  >
                    {Array.from({ length: m.offset }, (_, i) => (
                      <div key={`b${i}`} />
                    ))}
                    {m.days.map((date) => {
                      const key = dayKey(date);
                      const future = key > todayKey;
                      const count = activity[key] || 0;
                      return (
                        <div
                          key={key}
                          title={
                            future
                              ? format(date, "MMM d, yyyy")
                              : `${count} ${count === 1 ? "problem" : "problems"} · ${format(date, "MMM d, yyyy")}`
                          }
                          className={`rounded-[4px] transition-transform hover:scale-125 hover:ring-1 hover:ring-white/60 ${
                            future ? "bg-gray-800/40" : cellColor(count)
                          } ${key === todayKey ? "ring-1 ring-emerald-300/80" : ""}`}
                        />
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">{m.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-gray-400">
        Less
        {[0, 1, 2, 3, 5].map((n) => (
          <div key={n} className={`w-3 h-3 rounded-[3px] ${cellColor(n)}`} />
        ))}
        More
      </div>
    </div>
  );
}
