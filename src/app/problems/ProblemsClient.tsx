"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PATTERNS, Effort, getNextRevisionDate } from "@/lib/constants";
import { Problem } from "@/lib/types";
import { Plus, ExternalLink, Check, Clock } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export function ProblemsClient({ problems: initial }: { problems: Problem[] }) {
  const [problems, setProblems] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const effort = form.get("effort") as Effort;
    const nextRevision = getNextRevisionDate(effort, 0);

    const { data, error } = await supabase.from("problems").insert({
      user_id: user.id,
      name: form.get("name"),
      description: form.get("description"),
      link: form.get("link"),
      pattern: form.get("pattern"),
      effort,
      next_revision: nextRevision.toISOString(),
      revision_count: 0,
      completed: false,
    }).select().single();

    if (data) {
      setProblems([data, ...problems]);
      setShowForm(false);
      // Create notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Problem Added",
        message: `"${data.name}" scheduled for revision on ${format(nextRevision, "MMM d")}`,
        problem_id: data.id,
        read: false,
      });
    }
  };

  const markDone = async (problem: Problem) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newCount = problem.revision_count + 1;
    const nextRevision = getNextRevisionDate(problem.effort as Effort, newCount);

    await supabase.from("revisions").insert({
      problem_id: problem.id,
      user_id: user.id,
      completed_at: new Date().toISOString(),
    });

    await supabase.from("problems").update({
      revision_count: newCount,
      next_revision: nextRevision.toISOString(),
    }).eq("id", problem.id);

    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Revision Complete!",
      message: `"${problem.name}" next revision: ${format(nextRevision, "MMM d")}`,
      problem_id: problem.id,
      read: false,
    });

    setProblems(problems.map((p) => p.id === problem.id ? { ...p, revision_count: newCount, next_revision: nextRevision.toISOString() } : p));
  };

  const postpone = async (problem: Problem) => {
    const supabase = createClient();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    await supabase.from("problems").update({ next_revision: tomorrow }).eq("id", problem.id);
    setProblems(problems.map((p) => p.id === problem.id ? { ...p, next_revision: tomorrow } : p));
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
              <p className="text-xs text-gray-400 mt-1">{p.pattern} · {p.effort} · Rev #{p.revision_count} · Next: {format(new Date(p.next_revision), "MMM d")}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => markDone(p)} className="p-2 rounded bg-green-900/30 hover:bg-green-900/60 text-green-400" title="Mark Done">
                <Check size={16} />
              </button>
              <button onClick={() => postpone(p)} className="p-2 rounded bg-yellow-900/30 hover:bg-yellow-900/60 text-yellow-400" title="Postpone">
                <Clock size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
