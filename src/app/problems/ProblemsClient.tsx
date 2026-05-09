"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PATTERNS, SolveMethod, getNextRevisionDate, SOLVE_METHOD_LABELS } from "@/lib/constants";
import { Problem } from "@/lib/types";
import { Plus, ExternalLink, Pencil, X, Search } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";

export function ProblemsClient({ problems: initial }: { problems: Problem[] }) {
  const [problems, setProblems] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [filterPattern, setFilterPattern] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [error, setError] = useState("");

  const filtered = problems.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesPattern = !filterPattern || p.pattern === filterPattern;
    const matchesStatus = !filterStatus
      || (filterStatus === "mastered" && p.completed)
      || (filterStatus === "active" && !p.completed && p.revision_count >= 0)
      || (filterStatus === "unsolved" && p.revision_count === -1);
    return matchesSearch && matchesPattern && matchesStatus;
  });

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string).trim();

    // Duplicate check (case-insensitive)
    const isDuplicate = problems.some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      setError(`"${name}" already exists in your problems list.`);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const solveStatus = form.get("status") as string;
    const solveMethod = form.get("solve_method") as SolveMethod | null;

    const nextRevision = solveStatus === "already_solved" && solveMethod
      ? getNextRevisionDate(solveMethod)
      : startOfDay(addDays(new Date(), 1));

    const { data } = await supabase.from("problems").insert({
      user_id: user.id,
      name,
      description: form.get("description"),
      link: form.get("link"),
      pattern: form.get("pattern"),
      effort: solveMethod || "with_solution",
      next_revision: nextRevision.toISOString(),
      revision_count: solveStatus === "already_solved" ? 0 : -1,
      completed: false,
    }).select().single();

    if (data) {
      setProblems([data, ...problems]);
      setShowForm(false);
      setStatus("");

      if (solveStatus === "already_solved") {
        await supabase.from("revisions").insert({
          problem_id: data.id,
          user_id: user.id,
          completed_at: new Date().toISOString(),
        });
      }

      await supabase.from("notifications").insert({
        user_id: user.id,
        title: solveStatus === "already_solved" ? "Problem Added" : "Problem Queued",
        message: solveStatus === "already_solved"
          ? `"${data.name}" revision in ${format(nextRevision, "MMM d")}`
          : `"${data.name}" added to solve tomorrow`,
        problem_id: data.id,
        read: false,
      });
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>, problem: Problem) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    const updates = {
      name: form.get("name") as string,
      description: form.get("description") as string,
      link: form.get("link") as string,
      pattern: form.get("pattern") as string,
    };

    await supabase.from("problems").update(updates).eq("id", problem.id);
    setProblems(problems.map((p) => p.id === problem.id ? { ...p, ...updates } : p));
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Problems</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Add Problem
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="w-full bg-gray-800 border border-gray-700 rounded pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select value={filterPattern} onChange={(e) => setFilterPattern(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
          <option value="">All Patterns</option>
          {PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="active">Active (in revision)</option>
          <option value="unsolved">Not yet solved</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <input name="name" placeholder="Problem Name" required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <textarea name="description" placeholder="Description (optional)" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" rows={2} />
          <input name="link" placeholder="Problem Link (LeetCode, etc.)" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <select name="pattern" required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
            <option value="">Select Pattern</option>
            {PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select name="status" required value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
            <option value="">When are you solving this?</option>
            <option value="already_solved">Already Solved — schedule revision</option>
            <option value="solve_later">Solve Later — add to tomorrow&apos;s queue</option>
          </select>
          {status === "already_solved" && (
            <select name="solve_method" required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
              <option value="">How did you solve it?</option>
              <option value="under_25">⚡ Solved in &lt; 25 min (revision in 14 days)</option>
              <option value="over_25">⏱️ Solved in &gt; 25 min (revision in 7 days)</option>
              <option value="with_hints">💡 Solved with hints (revision in 3 days)</option>
              <option value="with_solution">📖 Solved with solution (revision in 1 day)</option>
            </select>
          )}
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition-colors">
            Save Problem
          </button>
        </form>
      )}

      <p className="text-xs text-gray-500">{filtered.length} problem{filtered.length !== 1 ? "s" : ""}</p>

      <div className="space-y-2">
        {filtered.map((p) => (
          editingId === p.id ? (
            <form key={p.id} onSubmit={(e) => handleEdit(e, p)} className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Editing</span>
                <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white"><X size={16} /></button>
              </div>
              <input name="name" defaultValue={p.name} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
              <textarea name="description" defaultValue={p.description} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" rows={2} />
              <input name="link" defaultValue={p.link} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
              <select name="pattern" defaultValue={p.pattern} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
                {PATTERNS.map((pat) => <option key={pat} value={pat}>{pat}</option>)}
              </select>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm font-medium">Save</button>
            </form>
          ) : (
            <div key={p.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{p.name}</p>
                  {p.link && <a href={p.link} target="_blank" rel="noopener" className="text-blue-400"><ExternalLink size={14} /></a>}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {p.pattern} · {SOLVE_METHOD_LABELS[p.effort as SolveMethod] || p.effort} · {p.revision_count === -1 ? "Not yet solved" : `Rev #${p.revision_count}`} · {p.completed ? "✅ Mastered" : `Next: ${format(new Date(p.next_revision), "MMM d")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.completed && <span className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded">Done & Dusted</span>}
                <button onClick={() => setEditingId(p.id)} className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white">
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
