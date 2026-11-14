import type { Files, GeneratedProblem, RunResult, TestResult } from "@/lib/ai-round/types";

/** Pure helpers shared by the browser runner and the Node tests. */

export type RawRun = { code: number; tests: TestResult[]; output: string };

export function summarize(raw: RawRun): RunResult {
  const tests = raw.tests;
  const passed = tests.filter((t) => t.outcome === "passed").length;
  const failed = tests.filter((t) => t.outcome === "failed" || t.outcome === "error").length;
  return {
    ok: raw.code === 0 && failed === 0 && passed > 0,
    passed,
    failed,
    total: passed + failed,
    tests,
    output: raw.output,
  };
}

export type RunFn = (files: Files, targets: string[]) => Promise<RunResult>;

/** Test files for phases 1..n (all earlier phases keep running). */
export function testsThrough(problem: { tests: Files; phases: { testPath: string }[] }, phase: number): Files {
  const out: Files = {};
  for (const p of problem.phases.slice(0, phase)) out[p.testPath] = problem.tests[p.testPath];
  return out;
}

/**
 * A problem is usable only if, when actually run:
 *  - each phase's tests FAIL on the starter code with real test failures
 *    (not an import or syntax error that would make the phase meaningless), and
 *  - the reference solution PASSES every phase's tests.
 * Returns null when valid, or a reason the generator can act on.
 */
export type CheckProgress =
  | { kind: "phase-start"; index: number }
  | { kind: "phase-done"; index: number; failing: number; total: number }
  | { kind: "solution-start" }
  | { kind: "solution-done"; passed: number; total: number };

export async function validateByRunning(
  problem: GeneratedProblem,
  run: RunFn,
  onProgress?: (p: CheckProgress) => void
): Promise<string | null> {
  const all = { ...problem.files, ...problem.tests };
  for (const [i, phase] of problem.phases.entries()) {
    onProgress?.({ kind: "phase-start", index: i });
    const r = await run(all, [phase.testPath]);
    if (r.timedOut) return `Part ${i + 1}: the tests timed out on the starter code (an infinite loop or far too slow).`;
    if (r.error) return `Part ${i + 1}: could not run tests (${r.error}).`;
    const callFailures = r.tests.filter((t) => t.outcome === "failed" && t.id.includes("::"));
    if (r.ok || callFailures.length === 0) {
      const collection = r.tests.find((t) => t.outcome === "error");
      return collection
        ? `Part ${i + 1}: the starter code errors before tests run: ${collection.message?.slice(-500)}`
        : `Part ${i + 1}: every test already passes on the starter code, so there is nothing to do.`;
    }
    onProgress?.({ kind: "phase-done", index: i, failing: callFailures.length, total: r.total });
  }
  onProgress?.({ kind: "solution-start" });
  const solved = { ...all, ...problem.solution };
  const r = await run(solved, problem.phases.map((p) => p.testPath));
  if (r.timedOut) return "The reference solution timed out.";
  if (r.error) return `Could not run the reference solution (${r.error}).`;
  if (!r.ok) {
    const failing = r.tests
      .filter((t) => t.outcome !== "passed" && t.outcome !== "skipped")
      .slice(0, 5)
      .map((t) => `${t.id}: ${(t.message || "").slice(-300)}`)
      .join("\n");
    return `The reference solution fails ${r.failed} of ${r.total} tests:\n${failing}`;
  }
  onProgress?.({ kind: "solution-done", passed: r.passed, total: r.total });
  return null;
}
