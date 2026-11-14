import type { Format } from "@/lib/ai-round/formats";
import type { Files, GeneratedProblem, Phase } from "@/lib/ai-round/types";

/**
 * Prompt + strict shape check for generated problems. Whether the problem
 * actually WORKS (starter fails, solution passes) is checked by running it in
 * the browser — see validateByRunning in runner.ts.
 */

export const ROOT_CONFTEST = `import contextlib
import os
import sys
import time

import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture
def time_limit():
    """with time_limit(2.0): ...  -- the block must finish within the limit."""

    @contextlib.contextmanager
    def limit(seconds):
        start = time.perf_counter()
        yield
        elapsed = time.perf_counter() - start
        assert elapsed < seconds, f"too slow: {elapsed:.2f}s (limit {seconds}s)"

    return limit
`;

export const GENERATOR_SYSTEM = `You write practice problems for AI-assisted coding interviews.
The student works in a browser: Python 3.12 (Pyodide, standard library only, no numpy/pandas, no network, no threads), pytest 8.
Return ONE JSON object, no prose, with exactly these keys:
{
  "title": string (3-6 words),
  "summary": string (one or two sentences, the product context),
  "files": { "<path>.py" | "README.md": "<full file content>" },   // starter code, NO tests
  "phases": [ { "title": string, "brief": string (markdown, 60-180 words), "testPath": "tests/test_partN.py", "testCode": string } ],
  "solution": { "<path>.py": "<full file content after ALL phases are solved>" }
}
Rules:
- A realistic product domain. 2-4 Python modules inside one package folder (e.g. "billing/ledger.py"), 120-300 lines of starter code in total, with docstrings that state the spec.
- Tests import the package from the project root (e.g. "from billing.ledger import Ledger"). A root conftest.py already exists: it puts the root on sys.path and provides a "time_limit" fixture used as "with time_limit(2.0): ...". Do not write conftest.py or __init__.py contents beyond what imports need (include "<pkg>/__init__.py" in files, it may be empty).
- Tests must be deterministic (seeded random only), self-contained, and use only pytest + standard library. Every phase has 6-14 tests. A timed test must finish in under 0.5s for a good solution on CPython; give it a 2.0s limit (Pyodide is slower) and make the naive solution clearly too slow (at least 20x).
- Phase N's tests must FAIL on the starter code and PASS on the solution. Earlier phases' tests must still pass on the solution.
- "solution" must contain every file that changes, complete, not diffs. Never put the solution or hints about planted bugs in starter files, briefs or tests.
- Phase briefs speak to the student ("You've joined the team that owns..."), say what to achieve, not how. Do not mention bugs' exact locations.
- Keep code idiomatic and readable; no placeholder comments like "TODO: bug here".`;

export function generatorPrompt(format: Format, topic: string, feedback?: string): string {
  return [
    `Format: ${format.name}. ${format.generatorBrief}`,
    `Number of phases: exactly ${format.phaseCount}.`,
    topic ? `Domain to use: ${topic}.` : "Pick any realistic product domain (e.g. ride-sharing, ticketing, inventory, payments, chat, logistics).",
    feedback
      ? `Your previous attempt failed validation when the tests were actually run:\n${feedback}\nWrite a NEW, corrected problem.`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const SAFE_PATH = /^(?:[a-z_][a-z0-9_]*\/)*(?:[a-z_][a-z0-9_]*\.py|README\.md)$/;
const MAX_TOTAL_BYTES = 120_000;

function asFiles(value: unknown, what: string): Files {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${what} must be an object`);
  const out: Files = {};
  for (const [path, content] of Object.entries(value as Record<string, unknown>)) {
    if (!SAFE_PATH.test(path)) throw new Error(`${what}: unsafe or unsupported path "${path}"`);
    if (typeof content !== "string") throw new Error(`${what}: "${path}" is not text`);
    out[path] = content;
  }
  return out;
}

/** Throws with a readable reason if the generator's JSON isn't a usable problem. */
export function checkGeneratedShape(raw: unknown, expectedPhases: number): GeneratedProblem {
  const o = raw as Record<string, unknown>;
  if (!o || typeof o !== "object") throw new Error("not an object");
  const title = typeof o.title === "string" ? o.title.trim().slice(0, 80) : "";
  const summary = typeof o.summary === "string" ? o.summary.trim().slice(0, 400) : "";
  if (!title) throw new Error("missing title");

  const files = asFiles(o.files, "files");
  for (const p of Object.keys(files)) {
    if (p.startsWith("tests/") || p.endsWith("conftest.py")) throw new Error(`files must not contain tests (${p})`);
  }
  if (!Object.keys(files).some((p) => p.endsWith(".py"))) throw new Error("no Python files");

  if (!Array.isArray(o.phases) || o.phases.length !== expectedPhases)
    throw new Error(`expected ${expectedPhases} phases, got ${Array.isArray(o.phases) ? o.phases.length : 0}`);
  const tests: Files = {};
  const phases: Phase[] = o.phases.map((ph: Record<string, unknown>, i: number) => {
    const testPath = `tests/test_part${i + 1}.py`;
    if (typeof ph?.testCode !== "string" || !/def test_/.test(ph.testCode)) throw new Error(`phase ${i + 1} has no tests`);
    if (typeof ph.brief !== "string" || !ph.brief.trim()) throw new Error(`phase ${i + 1} has no brief`);
    tests[testPath] = ph.testCode;
    return {
      title: typeof ph.title === "string" && ph.title.trim() ? ph.title.trim().slice(0, 80) : `Part ${i + 1}`,
      brief: ph.brief.trim(),
      testPath,
    };
  });

  const solution = asFiles(o.solution, "solution");
  if (!Object.keys(solution).length) throw new Error("empty solution");
  for (const p of Object.keys(solution)) {
    if (p.startsWith("tests/")) throw new Error("solution must not change tests");
  }

  const allFiles = { ...files, ...tests, ...solution };
  const bytes = Object.values(allFiles).reduce((n, s) => n + s.length, 0);
  if (bytes > MAX_TOTAL_BYTES) throw new Error("problem is too large");

  return {
    title,
    summary,
    language: "python",
    files: { "conftest.py": ROOT_CONFTEST, ...files },
    tests,
    phases,
    solution,
  };
}
