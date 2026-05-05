"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Effort, getNextRevisionDate } from "@/lib/constants";
import { Problem } from "@/lib/types";
import { ExternalLink, Trophy, RotateCcw, CalendarX } from "lucide-react";
import { format } from "date-fns";

export function TodayClient({ problems: initial }: { problems: Problem[] }) {
  const [problems, setProblems] = useState(initial);
  const [showModal, setShowModal] = useState<Problem | null>(null);
  const [rescheduleCount, setRescheduleCount] = useState(0);

  // After user solves/revises → ask: Done & Dusted or Need More Revision
  const handleDoneAndDusted = async (problem: Problem) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Record revision
    await supabase.from("revisions").insert({
      problem_id: problem.id,
      user_id: user.id,
      completed_at: new Date().toISOString(),
    });

    // Mark as mastered
    await supabase.from("problems").update({
      completed: true,
      revision_count: Math.max(problem.revision_count, 0) + 1,
    }).eq("id", problem.id);

    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "🎉 Mastered!",
      message: `"${problem.name}" is done and dusted. No more revisions!`,
      problem_id: problem.id,
      read: false,
    });

    setProblems(problems.filter((p) => p.id !== problem.id));
    setShowModal(null);
  };

  const handleNeedMoreRevision = async (problem: Problem) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newCount = Math.max(problem.revision_count, 0) + 1;
    const nextRevision = getNextRevisionDate(problem.effort as Effort, newCount);

    // Record revision
    await supabase.from("revisions").insert({
      problem_id: problem.id,
      user_id: user.id,
      completed_at: new Date().toISOString(),
    });

    // Schedule next revision
    await supabase.from("problems").update({
      revision_count: newCount,
      next_revision: nextRevision.toISOString(),
    }).eq("id", problem.id);

    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Revision Scheduled",
      message: `"${problem.name}" next revision: ${format(nextRevision, "MMM d")}`,
      problem_id: problem.id,
      read: false,
    });

    setProblems(problems.filter((p) => p.id !== problem.id));
    setShowModal(null);
  };

  const handleReschedule = async (problem: Problem) => {
    const supabase = createClient();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    await supabase.from("problems").update({ next_revision: tomorrow }).eq("id", problem.id);

    await supabase.from("notifications").insert({
      user_id: (await supabase.auth.getUser()).data.user!.id,
      title: "Rescheduled",
      message: `"${problem.name}" moved to tomorrow`,
      problem_id: problem.id,
      read: false,
    });

    setProblems(problems.filter((p) => p.id !== problem.id));
    setRescheduleCount((c) => c + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Today&apos;s Queue</h1>
        {rescheduleCount > 0 && (
          <span className="text-xs bg-yellow-900/40 text-yellow-400 px-3 py-1 rounded-full">
            {rescheduleCount} rescheduled today
          </span>
        )}
      </div>

      {problems.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">🎉 All clear for today!</p>
          <p className="text-sm mt-1">No problems to solve or revise.</p>
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
                    {p.pattern} · {p.effort} · {p.revision_count === -1 ? "First time solving" : `Revision #${p.revision_count + 1}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowModal(p)}
                    className="px-3 py-1.5 rounded bg-green-900/30 hover:bg-green-900/60 text-green-400 text-sm font-medium"
                  >
                    ✓ Done
                  </button>
                  <button
                    onClick={() => handleReschedule(p)}
                    className="p-1.5 rounded bg-yellow-900/30 hover:bg-yellow-900/60 text-yellow-400"
                    title="Reschedule to tomorrow"
                  >
                    <CalendarX size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Done & Dusted or Need More Revision */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-center">How did it go?</h3>
            <p className="text-sm text-gray-400 text-center">&quot;{showModal.name}&quot;</p>
            <div className="space-y-3">
              <button
                onClick={() => handleDoneAndDusted(showModal)}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-medium transition-colors"
              >
                <Trophy size={18} /> Done & Dusted — I&apos;ve mastered this
              </button>
              <button
                onClick={() => handleNeedMoreRevision(showModal)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-medium transition-colors"
              >
                <RotateCcw size={18} /> Need More Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
