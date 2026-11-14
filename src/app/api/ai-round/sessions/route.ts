import { NextResponse } from "next/server";
import { getFormat } from "@/lib/ai-round/formats";
import { checkGeneratedShape } from "@/lib/ai-round/generate";
import { LOG_ANALYZER } from "@/lib/ai-round/curated/log-analyzer";
import { jsonError, requireUser } from "@/lib/ai-round/server/context";
import type { GeneratedProblem, ProblemBundle } from "@/lib/ai-round/types";

/** Start a session from the curated problem or a generated one the browser already validated. */
export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return jsonError("Not signed in", 401);

  const body = (await request.json().catch(() => ({}))) as {
    formatId?: string;
    source?: "curated" | "generated";
    problem?: GeneratedProblem;
  };
  let format;
  try {
    format = getFormat(body.formatId || "");
  } catch {
    return jsonError("Unknown format");
  }

  let problem: GeneratedProblem;
  if (body.source === "curated") {
    if (!format.curated) return jsonError("This format has no curated problem.");
    problem = LOG_ANALYZER;
  } else {
    // Re-check the shape on the server; never trust the client's copy blindly.
    const p = body.problem;
    if (!p || !Array.isArray(p.phases) || !p.tests) return jsonError("Missing problem");
    try {
      const files = { ...p.files };
      delete files["conftest.py"];
      problem = checkGeneratedShape(
        {
          title: p.title,
          summary: p.summary,
          files,
          phases: p.phases.map((ph) => ({ title: ph.title, brief: ph.brief, testCode: p.tests[ph.testPath] })),
          solution: p.solution,
        },
        format.phaseCount
      );
    } catch (err) {
      return jsonError(`Problem rejected: ${err instanceof Error ? err.message : "invalid"}`);
    }
  }

  const bundle: ProblemBundle = {
    title: problem.title,
    summary: problem.summary,
    language: "python",
    files: problem.files,
    tests: problem.tests,
    phases: problem.phases,
  };

  const { data, error } = await supabase
    .from("ai_sessions")
    .insert({
      user_id: user.id,
      format_id: format.id,
      title: problem.title,
      source: body.source === "curated" ? "curated" : "generated",
      problem: bundle,
      files: problem.files,
      duration_seconds: format.minutes * 60,
    })
    .select("id")
    .single();
  if (error || !data) return jsonError("Couldn't create the session. Did you run supabase-ai-round.sql?", 500);

  await supabase.from("ai_session_solutions").insert({ session_id: data.id, user_id: user.id, files: problem.solution });
  return NextResponse.json({ id: data.id });
}
