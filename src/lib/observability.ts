/**
 * Observability & Telemetry Engine — Phase 13
 *
 * Tracks multi-agent execution metrics per spec §32:
 * - Agent latency (durationMs)
 * - Token estimate
 * - Model utilized
 * - Tool calls executed
 * - Handoff events
 * - Cache hit/miss
 */

import { randomUUID } from "crypto";

export type TraceMetrics = {
  id: string;
  requestId: string;
  userId: string;
  mentorId?: string;
  modelUsed: string;
  durationMs: number;
  estimatedTokens: number;
  cacheHit: boolean;
  toolsUsed: string[];
  handoffEvent?: { from: string; to: string; reason: string };
  createdAt: Date;
};

const traceLogStore = new Map<string, TraceMetrics[]>(); // userId -> traces[]

export function startTraceTimer(): number {
  return Date.now();
}

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Heuristic: ~4 chars per token for English + code
  return Math.ceil(text.length / 4);
}

export function recordTrace(metrics: Omit<TraceMetrics, "id" | "createdAt">): TraceMetrics {
  const fullTrace: TraceMetrics = {
    ...metrics,
    id: randomUUID(),
    createdAt: new Date(),
  };

  const userTraces = traceLogStore.get(metrics.userId) ?? [];
  userTraces.unshift(fullTrace);
  traceLogStore.set(metrics.userId, userTraces.slice(0, 50)); // Keep top 50

  console.log(
    `[observability] trace=${fullTrace.id} user=${metrics.userId} mentor=${metrics.mentorId ?? "orchestrator"} model=${metrics.modelUsed} latency=${metrics.durationMs}ms tokens=~${metrics.estimatedTokens} cache=${metrics.cacheHit ? "HIT" : "MISS"}`
  );

  return fullTrace;
}

export function getRecentTraces(userId: string): TraceMetrics[] {
  return traceLogStore.get(userId) ?? [];
}
