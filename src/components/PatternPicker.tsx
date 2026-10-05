"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { PATTERNS } from "@/lib/constants";

/** Multi-select for DSA patterns: chosen ones on top, searchable list below. */
export function PatternPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const add = (pattern: string) => onChange([...value, pattern]);
  const remove = (pattern: string) => onChange(value.filter((p) => p !== pattern));

  const q = query.trim().toLowerCase();
  const available = PATTERNS.filter((p) => !value.includes(p) && (!q || p.toLowerCase().includes(q)));

  return (
    <div className="space-y-2.5">
      <p className="text-sm font-medium text-gray-200">
        Patterns <span className="font-normal text-gray-500">· pick all that apply</span>
      </p>

      {/* Chosen */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-7">
        {value.length === 0 ? (
          <span className="text-xs text-gray-500">Nothing selected yet</span>
        ) : (
          value.map((pattern) => (
            <button
              key={pattern}
              type="button"
              onClick={() => remove(pattern)}
              aria-label={`Remove ${pattern}`}
              className="flex items-center gap-1 pl-3 pr-2 py-1 rounded-full text-xs border border-green-600 bg-green-900/40 text-green-300 hover:bg-green-900/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50"
            >
              {pattern}
              <X size={12} />
            </button>
          ))
        )}
      </div>

      {/* Search + list */}
      <div className="rounded-lg border border-gray-700 bg-gray-950/40">
        <div className="relative border-b border-gray-700">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault(); // don't submit the surrounding form
              if (available.length === 1) {
                add(available[0]);
                setQuery("");
              }
            }}
            placeholder="Search patterns"
            aria-label="Search patterns"
            className="w-full bg-transparent rounded-t-lg pl-9 pr-8 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:bg-gray-800/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 p-2.5 max-h-36 overflow-y-auto">
          {available.map((pattern) => (
            <button
              key={pattern}
              type="button"
              onClick={() => add(pattern)}
              className="flex items-center gap-1 pl-2.5 pr-3 py-1 rounded-full text-xs border border-gray-700 bg-gray-800 text-gray-300 hover:border-green-600 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50"
            >
              <Plus size={12} className="text-gray-500" />
              {pattern}
            </button>
          ))}
          {available.length === 0 && (
            <p className="text-xs text-gray-500 py-1">
              {q ? `No pattern matches "${query}".` : "Every pattern is selected."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
