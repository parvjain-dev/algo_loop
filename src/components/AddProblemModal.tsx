"use client";

import { useEffect } from "react";
import { Link2, X } from "lucide-react";
import { DIFFICULTIES, DIFFICULTY_LABELS, SOLVE_METHOD_DAYS, type SolveMethod } from "@/lib/constants";
import { PatternPicker } from "@/components/PatternPicker";

const INPUT =
  "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 " +
  "focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/30";

// Option card: a real radio (so FormData keeps working) with a styled sibling
const OPTION =
  "block h-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-300 transition-colors " +
  "hover:border-gray-500 peer-checked:border-green-500 peer-checked:bg-green-900/30 peer-checked:text-white " +
  "peer-focus-visible:ring-2 peer-focus-visible:ring-green-500/50";

const DIFFICULTY_CHECKED: Record<(typeof DIFFICULTIES)[number], string> = {
  easy: "peer-checked:border-green-600 peer-checked:bg-green-900/40 peer-checked:text-green-400",
  medium: "peer-checked:border-yellow-600 peer-checked:bg-yellow-900/40 peer-checked:text-yellow-400",
  hard: "peer-checked:border-red-600 peer-checked:bg-red-900/40 peer-checked:text-red-400",
};

const METHODS: { value: SolveMethod; icon: string; label: string }[] = [
  { value: "under_25", icon: "⚡", label: "Under 25 min" },
  { value: "over_25", icon: "⏱️", label: "Over 25 min" },
  { value: "with_hints", icon: "💡", label: "With hints" },
  { value: "with_solution", icon: "📖", label: "With the solution" },
];

export function AddProblemModal({
  open,
  onClose,
  onSubmit,
  error,
  status,
  onStatusChange,
  patterns,
  onPatternsChange,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  error: string;
  status: string;
  onStatusChange: (status: string) => void;
  patterns: string[];
  onPatternsChange: (next: string[]) => void;
}) {
  // Close on Escape and keep the page behind from scrolling while the dialog is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-problem-title"
        className="flex flex-col w-full sm:max-w-2xl max-h-[92vh] bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-800">
          <div>
            <h2 id="add-problem-title" className="text-lg font-semibold">Add a problem</h2>
            <p className="text-sm text-gray-400 mt-0.5">Log it once and Algo Loop schedules the revisions.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -mr-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {/* Basics */}
          <section className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="p-name" className="text-sm font-medium text-gray-200">Name</label>
              <input id="p-name" name="name" required autoFocus placeholder="e.g. Longest Substring Without Repeating Characters" className={INPUT} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="p-link" className="text-sm font-medium text-gray-200">
                Link <span className="font-normal text-gray-500">· optional</span>
              </label>
              <div className="relative">
                <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input id="p-link" name="link" type="text" inputMode="url" placeholder="https://leetcode.com/problems/..." className={`${INPUT} pl-9`} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="p-notes" className="text-sm font-medium text-gray-200">
                Notes <span className="font-normal text-gray-500">· optional</span>
              </label>
              <textarea id="p-notes" name="description" rows={2} placeholder="Key idea, edge cases, what tripped you up" className={INPUT} />
            </div>
          </section>

          {/* Difficulty */}
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-gray-200 mb-1.5">Difficulty</legend>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <label key={d} className="cursor-pointer">
                  <input type="radio" name="difficulty" value={d} required className="peer sr-only" />
                  <span className={`${OPTION} text-center font-medium ${DIFFICULTY_CHECKED[d]}`}>{DIFFICULTY_LABELS[d]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Patterns */}
          <PatternPicker value={patterns} onChange={onPatternsChange} />

          {/* Progress */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-gray-200 mb-1.5">Where are you with it?</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { value: "already_solved", title: "Already solved", hint: "Schedule my first revision" },
                { value: "solve_later", title: "Solve later", hint: "Add it to tomorrow's queue" },
              ].map((o) => (
                <label key={o.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={o.value}
                    required
                    checked={status === o.value}
                    onChange={() => onStatusChange(o.value)}
                    className="peer sr-only"
                  />
                  <span className={OPTION}>
                    <span className="block font-medium">{o.title}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {status === "already_solved" && (
              <div className="space-y-1.5 pt-1">
                <p className="text-sm text-gray-300">How did it go? This sets when you revise it.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {METHODS.map((m) => (
                    <label key={m.value} className="cursor-pointer">
                      <input type="radio" name="solve_method" value={m.value} required className="peer sr-only" />
                      <span className={`${OPTION} flex items-center gap-3`}>
                        <span aria-hidden className="text-lg">{m.icon}</span>
                        <span>
                          <span className="block font-medium">{m.label}</span>
                          <span className="block text-xs text-gray-400">
                            Revise in {SOLVE_METHOD_DAYS[m.value]} {SOLVE_METHOD_DAYS[m.value] === 1 ? "day" : "days"}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-800">
          <p role="alert" className="text-sm text-red-400 min-h-5">{error}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60"
            >
              Save problem
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
