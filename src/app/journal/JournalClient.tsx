"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { BookOpen, Save } from "lucide-react";

type RevisionWithProblem = {
  id: string;
  problem_id: string;
  completed_at: string;
  reflection: string | null;
  problems: { name: string; pattern: string } | null;
};

export function JournalClient({ revisions: initial }: { revisions: RevisionWithProblem[] }) {
  const [revisions, setRevisions] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");

  const saveReflection = async (id: string) => {
    const supabase = createClient();
    await supabase.from("revisions").update({ reflection: text }).eq("id", id);
    setRevisions(revisions.map((r) => r.id === id ? { ...r, reflection: text } : r));
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen size={24} /> Reflection Journal</h1>
      <p className="text-gray-400 text-sm">Write reflections after each revision—what helped, what didn&apos;t, key insights.</p>

      {revisions.length === 0 ? (
        <p className="text-gray-500">Complete some revisions to start journaling.</p>
      ) : (
        <div className="space-y-3">
          {revisions.map((r) => (
            <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">{r.problems?.name || "Unknown"}</p>
                  <p className="text-xs text-gray-400">{r.problems?.pattern} · {format(new Date(r.completed_at), "MMM d, yyyy")}</p>
                </div>
                {editing !== r.id && (
                  <button
                    onClick={() => { setEditing(r.id); setText(r.reflection || ""); }}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {r.reflection ? "Edit" : "Add Reflection"}
                  </button>
                )}
              </div>
              {editing === r.id ? (
                <div className="space-y-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What approach worked? What was tricky? Key takeaway..."
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                    rows={3}
                  />
                  <button onClick={() => saveReflection(r.id)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs font-medium">
                    <Save size={12} /> Save
                  </button>
                </div>
              ) : r.reflection ? (
                <p className="text-sm text-gray-300 bg-gray-800/50 rounded p-2 mt-2">{r.reflection}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
