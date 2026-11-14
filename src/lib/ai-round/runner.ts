"use client";

import { summarize, type RawRun } from "@/lib/ai-round/validate";
import type { Files, RunResult } from "@/lib/ai-round/types";

const BASE = "/ai-round/";
const INIT_TIMEOUT_MS = 120_000;
export const RUN_TIMEOUT_MS = 30_000;

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

/**
 * Runs Python tests in a Web Worker (Pyodide + pytest). A run that doesn't
 * finish in time is treated as a hang: the worker is killed and a new one
 * starts on the next run.
 */
export class PythonRunner {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private initialized: Promise<void> | null = null;

  private spawn() {
    const w = new Worker(BASE + "pyodide-worker.js");
    w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: unknown; error?: string }>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      clearTimeout(p.timer);
      this.pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error || "Runner error"));
    };
    w.onerror = (e) => {
      for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error(e.message || "Runner crashed"));
      }
      this.pending.clear();
      this.reset();
    };
    this.worker = w;
  }

  private send(msg: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    if (!this.worker) this.spawn();
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.reset();
        const err = new Error("timeout");
        err.name = "TimeoutError";
        reject(err);
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.worker!.postMessage({ id, base: BASE, ...msg });
    });
  }

  private reset() {
    this.worker?.terminate();
    this.worker = null;
    this.initialized = null;
  }

  /** Load Python + pytest (first time takes a few seconds). */
  ready(): Promise<void> {
    if (!this.initialized) {
      this.initialized = this.send({ kind: "init" }, INIT_TIMEOUT_MS).then(
        () => undefined,
        (err) => {
          this.initialized = null;
          throw err;
        }
      );
    }
    return this.initialized;
  }

  async run(files: Files, targets: string[], timeoutMs = RUN_TIMEOUT_MS): Promise<RunResult> {
    try {
      await this.ready();
      const raw = (await this.send({ kind: "run", files, targets }, timeoutMs)) as RawRun;
      return summarize(raw);
    } catch (err) {
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      return {
        ok: false,
        passed: 0,
        failed: 0,
        total: 0,
        tests: [],
        output: "",
        timedOut,
        error: timedOut
          ? `Stopped after ${Math.round(timeoutMs / 1000)}s. Is there an infinite loop, or a very slow algorithm?`
          : err instanceof Error
            ? err.message
            : "Runner error",
      };
    }
  }

  /** Stop the worker and settle anything still waiting, so no stale result arrives later. */
  dispose() {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("disposed"));
    }
    this.pending.clear();
    this.reset();
  }
}
