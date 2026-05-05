"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PATTERNS, Effort, getNextRevisionDate } from "@/lib/constants";
import { Problem } from "@/lib/types";
import { Plus, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export function ProblemsClient({ problems: initial }: { problems: Problem[] }) {
  const [problems, setProblems] = useState(initial);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const effort = form.get("effort") as Effort;
    const status = form.get("status") as string;

    // "already_solved" → schedule first revision based on effort
    // "solve_later" → schedule for tomorrow (user will solve it then)
    const nextRevision = status === "already_solved"
      ? getNextRevisionDate(effort, 0)
      : new Date(Date.now() + 86400000); // tomorrow

    const { data } = await supabase.from("problems").insert({
      user_id: user.id,
      name: form.get("name"),
      description: form.get("description"),
      link: form.get("link"),
      pattern: form.get("pattern"),
      effort,
      next_revision: nextRevision.toISOString(),
      revision_count: status === "already_solved" ? 0 : -1, // -1 means not yet solved first time
      completed: false,
    }).select().single();

    if (data) {
      setProblems([data, ...problems]);
      setShowForm(false);
      const msg = status === "already_solved"
        ? `"${data.name}" revision scheduled for ${format(nextRevision, "MMM d")}`
        : `"${data.name}" added to solve tomorrow`;
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: status === "already_solved" ? "Problem Added" : "Problem Queued",
        message: msg,
        problem_id: data.id,
        read: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Problems</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Problem
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <input name="name" placeholder="Problem Name" required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <textarea name="description" placeholder="Description (optional)" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" rows={2} />
          <input name="link" placeholder="Problem Link (LeetCode, etc.)" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select name="pattern" required className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
              <option value="">Select Pattern</option>
              {PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select name="effort" required className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
              <option value="">Select Effort</option>
              <option value="low">Low (easy, quick recall)</option>
              <option value="medium">Medium (needs practice)</option>
              <option value="high">High (hard, needs repetition)</option>
            </select>
          </div>
          <select name="status" required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
            <option value="">When are you solving this?</option>
            <option value="already_solved">Already Solved — schedule revision</option>
            <option value="solve_later">Solve Later — add to tomorrow&apos;s queue</option>
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition-colors">
            Save Problem
          </button>
        </form>
      )}

      <div className="space-y-2">
        {problems.map((p) => (
          <div key={p.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{p.name}</p>
                {p.link && <a href={p.link} target="_blank" rel="noopener" className="text-blue-400"><ExternalLink size={14} /></a>}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {p.pattern} · {p.effort} · {p.revision_count === -1 ? "Not yet solved" : `Rev #${p.revision_count}`} · {p.completed ? "✅ Mastered" : `Next: ${format(new Date(p.next_revision), "MMM d")}`}
              </p>
            </div>
            {p.completed && <span className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded">Done & Dusted</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
