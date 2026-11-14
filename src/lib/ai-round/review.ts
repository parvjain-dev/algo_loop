import { SIGNALS, SOURCES, type Format } from "@/lib/ai-round/formats";
import type { Metrics } from "@/lib/ai-round/metrics";
import type { Files, SessionEvent } from "@/lib/ai-round/types";

/**
 * The end-of-session review.
 *
 * Grounding rules, enforced here in code (not just asked of the model):
 *  1. Every claim must cite events that exist in this session's log.
 *  2. A quote must appear word for word in a cited event, or the claim is dropped.
 *  3. A count ("3 times", "5 tests") must appear in a cited event, or the claim is dropped.
 *  4. Tags must come from the fixed, source-backed SIGNALS list.
 *  5. If the session was strong (all phases done, nothing flagged), no
 *     improvement points are shown and no dimension scores below 3.
 *  6. The headline and all numbers come from metrics computed by code.
 */

export type Claim = { text: string; evidence: number[]; quote?: string; signal?: string; signalLabel?: string; signalSource?: string };
export type Improvement = Claim & { better: string };
export type Dimension = { id: string; label: string; score: number | null; reason: string; evidence: number[] };

export type Review = {
  headline: string;
  strengths: Claim[];
  aiUsage: { summary: string; evidence: number[] } | null;
  improvements: Improvement[];
  dimensions: Dimension[];
  strong: boolean;
  droppedClaims: number;
  model: string;
};

export function dimensionsFor(format: Format): { id: string; label: string; hint: string }[] {
  return [
    { id: "understanding", label: "Problem understanding", hint: "read the spec and code, found the real issues" },
    { id: "verification", label: "Verification", hint: "ran tests at the right moments, checked edge cases" },
    ...(format.aiAllowed
      ? [{ id: "ai-judgment", label: "AI judgment", hint: "gave the AI scoped asks, checked and corrected its output" }]
      : []),
    { id: "code-quality", label: "Code quality", hint: "final code is correct, clear and efficient" },
    { id: "explaining", label: "Explaining decisions", hint: "written answers show reasoning and trade-offs" },
  ];
}

const clip = (s: unknown, n: number) => {
  const t = String(s ?? "");
  return t.length > n ? t.slice(0, n) + " …" : t;
};
const mmss = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** One line per event, as the model sees it. Also the text quotes are checked against. */
export function renderEvent(e: SessionEvent): string {
  const d = e.data;
  const head = `[E${e.seq} ${mmss(e.t_ms)} ${e.type}]`;
  switch (e.type) {
    case "test_run": {
      const failing = (d.failing as string[] | undefined)?.slice(0, 6).join(", ");
      return `${head} ran tests for phase ${d.phase}: ${d.passed}/${d.total} passed${failing ? `; failing: ${failing}` : ""}${d.timedOut ? " (timed out)" : ""}${d.linesChanged != null ? `; ${d.linesChanged} lines changed since last run` : ""}`;
    }
    case "ai_user":
      return `${head} student asked AI: ${clip(d.text, 1200)}`;
    case "ai_reply":
      return `${head} AI replied: ${clip(d.text, 700)}`;
    case "paste":
      return `${head} pasted ${d.lines} lines into ${d.file}${d.fromAi ? ` (copied from AI reply E${d.replySeq})` : " (not from the AI)"}`;
    case "think_first":
      return `${head} asked "${d.question}" — student wrote: ${clip(d.answer, 800)}`;
    case "clarify":
      return `${head} clarifying questions and assumptions: ${clip(d.text, 1500)}`;
    case "closing":
      return `${head} asked "${d.question}" — student wrote: ${clip(d.answer, 1200)}`;
    case "phase_start":
      return `${head} phase ${d.phase} started: ${d.title}`;
    case "phase_complete":
      return `${head} phase ${d.phase} completed (all its tests pass)`;
    case "session_start":
      return `${head} session started`;
    case "session_end":
      return `${head} session ended (${d.reason}); ${d.linesChanged} lines changed in total`;
    default:
      return head;
  }
}

export const REVIEW_SYSTEM = `You review a student's practice session for an AI-assisted coding interview.
You are given the problem, the event log (each line starts with an id like E12), computed facts, and the final code.
Your job is an honest, kind, evidence-based debrief. Hard rules:
- Every item MUST cite the ids of the events that show it, as numbers in "evidence" (E12 -> 12). No evidence, no item.
- Describe only what the log or final code shows. Never guess what the student thought or said aloud; there is no audio.
- Do not state counts or durations; the app shows exact numbers itself.
- "quote" is optional; if used it must be copied exactly from one cited event.
- Praise specifically. If something was done well, say what and cite it.
- "improvements" are only for clear, specific moments where a better move existed. If you can't point to such a moment, return an empty list. Never invent problems to seem balanced.
- "signal" (optional on strengths) must be one of: ${Object.keys(SIGNALS).join(", ")}.
Return one JSON object:
{
 "strengths": [{"text": string, "evidence": number[], "quote"?: string, "signal"?: string}],
 "aiUsage": {"summary": string (how the student used the AI, 1-3 sentences), "evidence": number[]} | null,
 "improvements": [{"text": string (what happened), "better": string (what to do instead next time), "evidence": number[]}],
 "dimensions": [{"id": string, "score": 1|2|3|4, "reason": string (one sentence), "evidence": number[]}]
}`;

export function buildReviewPrompt(args: {
  format: Format;
  problemTitle: string;
  phases: { title: string; brief: string }[];
  events: SessionEvent[];
  metrics: Metrics;
  finalFiles: Files;
  starterFiles: Files;
}): string {
  const changed = Object.entries(args.finalFiles)
    .filter(([p, c]) => !p.startsWith("tests/") && p !== "conftest.py" && args.starterFiles[p] !== c)
    .map(([p, c]) => `--- ${p} (final)\n${clip(c, 6000)}`)
    .join("\n\n");
  const dims = dimensionsFor(args.format)
    .map((d) => `- ${d.id}: ${d.label} (${d.hint})`)
    .join("\n");
  return [
    `Format: ${args.format.name}. AI assistant ${args.format.aiAllowed ? "allowed (chat only, cannot edit files)" : "NOT allowed (set aiUsage to null)"}.`,
    `Problem: ${args.problemTitle}`,
    `Phases:\n${args.phases.map((p, i) => `${i + 1}. ${p.title}`).join("\n")}`,
    `Computed facts: ${JSON.stringify({
      phasesCompleted: args.metrics.phasesCompleted,
      phasesTotal: args.metrics.phasesTotal,
      aiCodePastes: args.metrics.aiCodePastes,
      aiPastesTested: args.metrics.aiPastesTested,
      flags: args.metrics.flags.map((f) => f.label),
    })}`,
    `Score these dimensions (1 = not shown, 4 = excellent):\n${dims}`,
    `Event log:\n${args.events.map(renderEvent).join("\n")}`,
    `Final code of changed files:\n${changed || "(no files changed)"}`,
  ].join("\n\n");
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
// A count like "3 times" or "5 tests" (but not "Part 1 tests" / "phase 2 tests", which name a phase).
const COUNT = /(?<!\b(?:part|phase|parts|phases)\s)\b(\d+)\s*(?:x\b|times?|tests?|minutes?|mins?|seconds?|secs?|prompts?|runs?|lines?|attempts?|questions?)\b/gi;

/**
 * A claim about a kind of action must cite at least one event of that kind:
 * "you ran the tests" needs a test run, "you pasted" needs a paste. Stops a
 * claim from borrowing real but unrelated events as evidence.
 */
const ACTION_EVIDENCE: { pattern: RegExp; types: string[] }[] = [
  { pattern: /\b(?:ran|run|running|re-?ran|rerun)\b[^.]*\btests?\b|\btested\b|\btest runs?\b/i, types: ["test_run"] },
  { pattern: /\bpast(?:e|ed|es|ing)\b|\bcopied\b/i, types: ["paste"] },
  { pattern: /\bclarif(?:y|ied|ying|ication)/i, types: ["clarify"] },
];

function validIds(raw: unknown, known: Set<number>): number[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw
    .map((x) => (typeof x === "string" ? Number(x.replace(/^E/i, "")) : Number(x)))
    .filter((n) => Number.isInteger(n) && known.has(n));
  return [...new Set(ids)].slice(0, 6);
}

/** Check one free-text claim against the events it cites. */
function grounded(
  text: string,
  quote: string | undefined,
  ids: number[],
  rendered: Map<number, string>,
  types: Map<number, string>,
  checkActions = true
): boolean {
  if (!ids.length || !text.trim()) return false;
  const cited = norm(ids.map((i) => rendered.get(i) || "").join(" "));
  if (quote && !cited.includes(norm(quote))) return false;
  for (const m of text.matchAll(COUNT)) {
    if (!cited.includes(m[1])) return false;
  }
  const citedTypes = new Set(ids.map((i) => types.get(i)));
  // Only positive claims ("you ran the tests") need an action of that kind;
  // improvements describe what didn't happen or what to do next time.
  for (const rule of checkActions ? ACTION_EVIDENCE : []) {
    if (rule.pattern.test(text) && !rule.types.some((t) => citedTypes.has(t))) return false;
  }
  return true;
}

export function groundReview(raw: unknown, args: { events: SessionEvent[]; metrics: Metrics; format: Format; model: string }): Review {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rendered = new Map(args.events.map((e) => [e.seq, renderEvent(e)]));
  const known = new Set(rendered.keys());
  const types = new Map(args.events.map((e) => [e.seq, e.type as string]));
  let dropped = 0;

  const strengths: Claim[] = [];
  for (const s of Array.isArray(o.strengths) ? o.strengths : []) {
    const text = clip(s?.text, 400);
    const quote = typeof s?.quote === "string" && s.quote.trim() ? s.quote.trim() : undefined;
    const evidence = validIds(s?.evidence, known);
    if (!grounded(text, quote, evidence, rendered, types)) {
      dropped++;
      continue;
    }
    const signal = typeof s?.signal === "string" && SIGNALS[s.signal] ? s.signal : undefined;
    strengths.push({
      text,
      evidence,
      quote,
      signal,
      signalLabel: signal ? SIGNALS[signal].label : undefined,
      signalSource: signal ? SOURCES[SIGNALS[signal].source].url : undefined,
    });
  }

  let aiUsage: Review["aiUsage"] = null;
  if (args.format.aiAllowed && o.aiUsage && typeof o.aiUsage === "object") {
    const a = o.aiUsage as Record<string, unknown>;
    const summary = clip(a.summary, 600);
    const evidence = validIds(a.evidence, known);
    if (grounded(summary, undefined, evidence, rendered, types)) aiUsage = { summary, evidence };
    else dropped++;
  }

  const improvements: Improvement[] = [];
  if (!args.metrics.strong) {
    for (const s of Array.isArray(o.improvements) ? o.improvements : []) {
      const text = clip(s?.text, 400);
      const better = clip(s?.better, 400);
      const evidence = validIds(s?.evidence, known);
      if (!better.trim() || !grounded(`${text} ${better}`, undefined, evidence, rendered, types, false)) {
        dropped++;
        continue;
      }
      improvements.push({ text, better, evidence });
    }
  }

  const given = new Map<string, Record<string, unknown>>();
  for (const d of Array.isArray(o.dimensions) ? o.dimensions : []) {
    if (d && typeof d.id === "string") given.set(d.id, d);
  }
  const dimensions: Dimension[] = dimensionsFor(args.format).map((def) => {
    const d = given.get(def.id);
    const evidence = validIds(d?.evidence, known);
    const reason = clip(d?.reason, 300);
    let score = Number(d?.score);
    if (!d || !Number.isInteger(score) || score < 1 || score > 4 || !grounded(reason, undefined, evidence, rendered, types)) {
      return { ...def, score: null, reason: "Not enough evidence in this session to rate this.", evidence: [] };
    }
    if (args.metrics.strong) score = Math.max(score, 3);
    return { id: def.id, label: def.label, score, reason, evidence };
  });

  return {
    headline: headline(args.metrics, args.format),
    strengths: strengths.slice(0, 6),
    aiUsage,
    improvements: improvements.slice(0, 4),
    dimensions,
    strong: args.metrics.strong,
    droppedClaims: dropped,
    model: args.model,
  };
}

/** Written from computed facts only. */
export function headline(m: Metrics, format: Format): string {
  const done =
    m.phasesCompleted >= m.phasesTotal
      ? `All ${m.phasesTotal} phases done in ${Math.round(m.minutes)} min`
      : `${m.phasesCompleted} of ${m.phasesTotal} phases done in ${Math.round(m.minutes)} min`;
  if (!format.aiAllowed) return `${done}, without AI.`;
  if (m.aiCodePastes === 0) return `${done}. You wrote the code yourself and used the AI ${m.aiPrompts === 0 ? "not at all" : "for help, not for code"}.`;
  if (m.aiPastesTested === m.aiCodePastes) return `${done}, and you tested every piece of AI code before moving on.`;
  return `${done}. ${m.aiPastesTested} of ${m.aiCodePastes} AI code pastes were tested before your next prompt.`;
}
