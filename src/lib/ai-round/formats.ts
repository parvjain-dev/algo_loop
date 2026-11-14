/**
 * Practice formats. Generic on purpose: each one copies a PATTERN that
 * companies use, and its tags say where that pattern was seen and how
 * reliable the source is. Update `SOURCES_CHECKED` when sources are re-read.
 */

export const SOURCES_CHECKED = "2026-11-14";

export type SourceKind = "official" | "reported";

export type Source = {
  id: string;
  label: string;
  url: string;
  kind: SourceKind;
};

export const SOURCES: Record<string, Source> = {
  canvaOfficial: {
    id: "canvaOfficial",
    label: "Canva engineering blog",
    url: "https://canva.dev/blog/engineering/yes-you-can-use-ai-in-our-interviews",
    kind: "official",
  },
  canvaSuccess: {
    id: "canvaSuccess",
    label: "Canva: what success looks like",
    url: "https://www.canva.dev/blog/engineering/ai-interview-success/",
    kind: "official",
  },
  metaReported: {
    id: "metaReported",
    label: "Hello Interview on Meta's round",
    url: "https://www.hellointerview.com/blog/meta-ai-enabled-coding",
    kind: "reported",
  },
  googleReported: {
    id: "googleReported",
    label: "Exponent on Google's pilot",
    url: "https://customcareer.miami.edu/blog/2026/05/14/googles-ai-assisted-coding-interview-2026-guide/",
    kind: "reported",
  },
  anthropicOfficial: {
    id: "anthropicOfficial",
    label: "Anthropic candidate guidance",
    url: "https://www.anthropic.com/candidate-ai-guidance",
    kind: "official",
  },
};

export type Tag = { label: string; source: string };

export type Format = {
  id: string;
  name: string;
  oneLiner: string;
  /** What the student does, in order (shown on the start screen). */
  steps: string[];
  minutes: number;
  aiAllowed: boolean;
  /** Student must write questions + assumptions before the AI unlocks. */
  clarifyStep: boolean;
  /** Questions answered in writing after the last phase. */
  closingQuestions: string[];
  /** Asked when a phase starts; the AI stays locked until the student answers. */
  thinkFirst: string;
  tags: Tag[];
  /** Instructions for the problem generator. */
  generatorBrief: string;
  phaseCount: number;
  /** Can use the built-in curated problem. */
  curated: boolean;
};

export const FORMATS: Format[] = [
  {
    id: "bug-build-scale",
    name: "Bug → Build → Scale",
    oneLiner: "A small multi-file codebase. Fix a bug, build a feature, then make it fast enough for big inputs.",
    steps: ["Fix the bugs", "Build a feature", "Make it fast"],
    minutes: 60,
    aiAllowed: true,
    clarifyStep: false,
    closingQuestions: [],
    thinkFirst: "Before asking the AI: what do you think this phase needs, and where in the code will you start?",
    tags: [{ label: "Pattern reported at Meta", source: "metaReported" }],
    generatorBrief:
      "Three phases on ONE codebase. Phase 1: 3-5 realistic bugs make phase-1 tests fail (off-by-one, wrong comparison, missing validation, wrong exception type); at least one 'obvious' fix must be wrong according to the docstring spec. Phase 2: implement a new function or class (the starter raises NotImplementedError). Phase 3: a performance requirement — a timed test with a large input that a naive phase-2 solution fails and a better algorithm (hashing, heap, sorting, sliding window, prefix sums, etc.) passes.",
    phaseCount: 3,
    curated: true,
  },
  {
    id: "read-repair",
    name: "Read & Repair",
    oneLiner: "An unfamiliar codebase you didn't write. Understand it, debug it, then optimise it.",
    steps: ["Trace and fix bugs", "Handle edge cases", "Speed it up"],
    minutes: 60,
    aiAllowed: true,
    clarifyStep: false,
    closingQuestions: [],
    thinkFirst: "In your own words: what does this code do, and what do you suspect is wrong?",
    tags: [{ label: "Pattern reported in Google's pilot", source: "googleReported" }],
    generatorBrief:
      "Three phases focused on code comprehension. The codebase should feel like real product code someone else wrote (4 modules that call each other). Phase 1: bugs spread across modules, so the student must trace a call path to find them. Phase 2: one more subtle bug that only shows on an edge case (empty input, duplicates, boundaries, ordering) plus a small behaviour change requested in the brief. Phase 3: an existing function is too slow; a timed test with a large input must pass.",
    phaseCount: 3,
    curated: true,
  },
  {
    id: "open-build",
    name: "Open Build",
    oneLiner: "An ambiguous product brief. Clarify first, design, build, then explain your choices.",
    steps: ["Clarify the brief", "Build the core", "Handle edge cases", "Explain your choices"],
    minutes: 60,
    aiAllowed: true,
    clarifyStep: true,
    closingQuestions: [
      "What did you build, and what was the most important design decision?",
      "What would you improve with another hour?",
      "What breaks first if usage grows 100x, and how would you handle it?",
    ],
    thinkFirst: "Sketch your plan in a few lines before using the AI: which pieces will you build first, and why?",
    tags: [{ label: "Pattern from Canva (official)", source: "canvaOfficial" }],
    generatorBrief:
      "An open-ended but realistic product problem (like 'a control system for aircraft takeoffs and landings at a busy airport' — invent a different one). Two phases. Starter files hold only a thin skeleton (class and function signatures that raise NotImplementedError) plus a short README brief that is deliberately a little ambiguous. Phase 1: core behaviour, with acceptance tests that pin down the important rules. Phase 2: edge cases and failure handling (invalid input, conflicts, limits), with tests. Keep tests black-box so many designs can pass.",
    phaseCount: 2,
    curated: false,
  },
  {
    id: "solo",
    name: "Solo (no AI)",
    oneLiner: "The same kind of codebase with the AI switched off. Many loops still run this way.",
    steps: ["Fix the bugs", "Build a feature", "Make it fast"],
    minutes: 60,
    aiAllowed: false,
    clarifyStep: false,
    closingQuestions: [],
    thinkFirst: "",
    tags: [{ label: "No AI in live rounds: Anthropic (official)", source: "anthropicOfficial" }],
    generatorBrief:
      "Same structure as a bug-fix, feature and performance exercise: Phase 1 fix 3-4 bugs, Phase 2 implement a feature, Phase 3 a timed performance test.",
    phaseCount: 3,
    curated: true,
  },
];

export function getFormat(id: string): Format {
  const f = FORMATS.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown format: ${id}`);
  return f;
}

/** Short, source-backed lines about how companies run these rounds. */
export const HOW_COMPANIES_TEST: { company: string; line: string; source: string }[] = [
  {
    company: "Canva",
    line: "Candidates use their own AI tools (Copilot, Cursor, Claude) on ambiguous, realistic product problems that can't be solved with one prompt.",
    source: "canvaOfficial",
  },
  {
    company: "Canva",
    line: "Graded on problem-solving, technical depth and ownership, and AI collaboration. Fail patterns named: AI Showcase, Feature Marathon, Hands-Off.",
    source: "canvaSuccess",
  },
  {
    company: "Meta",
    line: "Reported: about 60 minutes in a three-panel editor; the AI chat can read the files but can't edit them; bug fix, then implementation, then optimisation.",
    source: "metaReported",
  },
  {
    company: "Google",
    line: "Reported pilot for junior and mid-level roles on select US teams: read, debug and optimise an existing codebase with Gemini.",
    source: "googleReported",
  },
  {
    company: "Anthropic",
    line: "Live interviews are done without AI unless the candidate is told otherwise.",
    source: "anthropicOfficial",
  },
];

/**
 * Behaviours sources say interviewers look for. The review can only tag a
 * strength with one of these ids; anything else is dropped.
 */
export const SIGNALS: Record<string, { label: string; source: string }> = {
  "clarify-first": { label: "Asked clarifying questions about requirements", source: "canvaOfficial" },
  "think-before-ai": { label: "Said what they thought before getting help from AI", source: "canvaSuccess" },
  "ai-for-subtasks": { label: "Used AI for well-defined subtasks, kept control of the solution", source: "canvaOfficial" },
  "review-ai-code": { label: "Critically reviewed and improved AI-generated code", source: "canvaOfficial" },
  "debugging": { label: "Debugged issues, including in AI output", source: "canvaOfficial" },
  "verification": { label: "Verified with tests before relying on the result", source: "metaReported" },
  "explain-decisions": { label: "Explained decisions and trade-offs", source: "canvaSuccess" },
};
