"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import { DAILY_CAP, SolveMethod, getNextRevisionDate } from "@/lib/constants";
import { applyMoves, describeMoves, localDayKey, pickRevisionDay, planToday } from "@/lib/scheduling";
import { Problem } from "@/lib/types";
import { getPatterns } from "@/lib/utils";
import { ExternalLink, Trophy, RotateCcw, CalendarX, Info } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";

const subscribe = () => () => {};

export function TodayClient({ problems: initial }: { problems: Problem[] }) {
  // Wait for the browser: "today" depends on the user's time zone, which the server doesn't know
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [now] = useState(() => new Date());
  const [all, setAll] = useState(initial);
  const [showModal, setShowModal] = useState<Problem | null>(null);
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [rescheduleCount, setRescheduleCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const planned = useRef(false);

  // Today's list: at most DAILY_CAP, hardest/most overdue first. The rest are moved to later days.
  const plan = useMemo(() => planToday(all, now), [all, now]);
  const problems = plan.keep;

  // Save the overflow to later days once, when the page opens
  useEffect(() => {
    if (!mounted || planned.current) return;
    planned.current = true;
    const moves = plan.moves;
    if (!moves.length) return;

    const persist = async () => {
      setMoving(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMoving(false);
        return;
      }
      const results = await Promise.all(
        moves.map((m) => supabase.from("problems").update({ next_revision: m.to.toISOString() }).eq("id", m.id))
      );
      if (results.some((r) => r.error)) {
        // Leave the dates alone; the extras stay hidden today and we try again next visit
        setMoving(false);
        return;
      }
      const summary = describeMoves(moves);
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Moved to later days",
        message: `${moves.length} problem${moves.length === 1 ? "" : "s"} moved to keep today at ${DAILY_CAP}: ${summary}`,
        read: false,
      });
      setAll((cur) => applyMoves(cur, moves));
      setBanner(`${moves.length} problem${moves.length === 1 ? " was" : "s were"} moved to later days: ${summary}`);
      setMoving(false);
    };
    void persist();
  }, [mounted, plan.moves]);

  const handleDoneAndDusted = async (problem: Problem) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("revisions").insert({
      problem_id: problem.id,
      user_id: user.id,
      completed_at: new Date().toISOString(),
    });

    await supabase.from("problems").update({
      completed: true,
      revision_count: Math.max(problem.revision_count, 0) + 1,
    }).eq("id", problem.id);

    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "🎉 Mastered!",
      message: `"${problem.name}" is done and dusted!`,
      problem_id: problem.id,
      read: false,
    });

    setAll(all.filter((p) => p.id !== problem.id));
    setDoneCount((c) => c + 1);
    setShowModal(null);
    setShowMethodPicker(false);
  };

  const handleNeedMoreRevision = async (problem: Problem, method: SolveMethod) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Ideal day from the schedule; if that day already has the max, the next day with room
    const ideal = getNextRevisionDate(method);
    const nextRevision = pickRevisionDay(all, ideal, problem.id);
    const shifted = localDayKey(nextRevision) !== localDayKey(ideal);

    await supabase.from("revisions").insert({
      problem_id: problem.id,
      user_id: user.id,
      completed_at: new Date().toISOString(),
    });

    await supabase.from("problems").update({
      revision_count: Math.max(problem.revision_count, 0) + 1,
      next_revision: nextRevision.toISOString(),
      effort: method,
    }).eq("id", problem.id);

    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Revision Scheduled",
      message: `"${problem.name}" next revision: ${format(nextRevision, "MMM d")}${shifted ? " (nearest day with room)" : ""}`,
      problem_id: problem.id,
      read: false,
    });

    setAll(
      all.map((p) =>
        p.id === problem.id
          ? { ...p, revision_count: Math.max(problem.revision_count, 0) + 1, next_revision: nextRevision.toISOString(), effort: method }
          : p
      )
    );
    setDoneCount((c) => c + 1);
    setShowModal(null);
    setShowMethodPicker(false);
  };

  const handleReschedule = async (problem: Problem) => {
    const supabase = createClient();
    // Tomorrow, or the next day with room if tomorrow is already full
    const day = pickRevisionDay(all, startOfDay(addDays(new Date(), 1)), problem.id);
    await supabase.from("problems").update({ next_revision: day.toISOString() }).eq("id", problem.id);

    const { data: { user } } = await supabase.auth.getUser();
    const label = localDayKey(day) === localDayKey(addDays(new Date(), 1)) ? "tomorrow" : format(day, "EEE d MMM");
    if (user) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Rescheduled",
        message: `"${problem.name}" moved to ${label}`,
        problem_id: problem.id,
        read: false,
      });
    }

    setAll(all.map((p) => (p.id === problem.id ? { ...p, next_revision: day.toISOString() } : p)));
    setRescheduleCount((c) => c + 1);
    setBanner(`"${problem.name}" moved to ${label}`);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 border-2 border-green-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Today&apos;s Queue</h1>
        <div className="flex items-center gap-2">
          {rescheduleCount > 0 && (
            <span className="text-xs bg-yellow-900/40 text-yellow-400 px-3 py-1 rounded-full">
              {rescheduleCount} rescheduled today
            </span>
          )}
          {(problems.length > 0 || doneCount > 0) && (
            <span className="text-xs bg-emerald-900/40 text-emerald-300 px-3 py-1 rounded-full">
              {doneCount > 0 ? `${doneCount} done · ` : ""}
              {problems.length} left (max {DAILY_CAP}/day)
            </span>
          )}
        </div>
      </div>

      {banner && (
        <div className="flex items-start gap-3 bg-sky-500/10 border border-sky-500/25 rounded-lg p-3 text-sm text-sky-100">
          <Info size={16} className="mt-0.5 shrink-0 text-sky-300" />
          <p className="flex-1">{banner}</p>
          <button onClick={() => setBanner(null)} className="text-sky-300 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {problems.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {doneCount > 0 ? (
            <>
              <p className="text-lg">🎉 All done for today!</p>
              <p className="text-sm mt-1">See you tomorrow.</p>
            </>
          ) : (
            <>
              <p className="text-lg">🎉 All clear for today!</p>
              <p className="text-sm mt-1">No problems to solve or revise.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {problems.map((p) => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{p.name}</p>
                    {p.link && <a href={p.link} target="_blank" rel="noopener" className="text-blue-400"><ExternalLink size={14} /></a>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {getPatterns(p).join(", ")} · {p.revision_count === -1 ? "First time solving" : `Revision #${p.revision_count + 1}`}
                    {localDayKey(p.next_revision) < localDayKey(now) && (
                      <span className="text-red-400"> · overdue since {format(new Date(p.next_revision), "MMM d")}</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={moving}
                    onClick={() => { setShowModal(p); setShowMethodPicker(false); }}
                    className="px-3 py-1.5 rounded bg-green-900/30 hover:bg-green-900/60 text-green-400 text-sm font-medium disabled:opacity-50"
                  >
                    ✓ Done
                  </button>
                  <button
                    disabled={moving}
                    onClick={() => handleReschedule(p)}
                    className="p-1.5 rounded bg-yellow-900/30 hover:bg-yellow-900/60 text-yellow-400 disabled:opacity-50"
                    title="Reschedule to the next day with room"
                  >
                    <CalendarX size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setShowModal(null); setShowMethodPicker(false); }}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-center">How did it go?</h3>
            <p className="text-sm text-gray-400 text-center">&quot;{showModal.name}&quot;</p>

            {!showMethodPicker ? (
              <div className="space-y-3">
                <button
                  onClick={() => handleDoneAndDusted(showModal)}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <Trophy size={18} /> Done & Dusted
                </button>
                <button
                  onClick={() => setShowMethodPicker(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <RotateCcw size={18} /> Need More Revision
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-400 text-center">How did you solve it this time?</p>
                <button onClick={() => handleNeedMoreRevision(showModal, "under_25")} className="w-full text-left px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors">
                  ⚡ Solved in &lt; 25 min → revision in <span className="text-green-400 font-medium">14 days</span>
                </button>
                <button onClick={() => handleNeedMoreRevision(showModal, "over_25")} className="w-full text-left px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors">
                  ⏱️ Solved in &gt; 25 min → revision in <span className="text-yellow-400 font-medium">7 days</span>
                </button>
                <button onClick={() => handleNeedMoreRevision(showModal, "with_hints")} className="w-full text-left px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors">
                  💡 Solved with hints → revision in <span className="text-orange-400 font-medium">3 days</span>
                </button>
                <button onClick={() => handleNeedMoreRevision(showModal, "with_solution")} className="w-full text-left px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors">
                  📖 Solved with solution → revision in <span className="text-red-400 font-medium">1 day</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
