/**
 * Next.js instrumentation — runs once at server boot.
 *
 * We use this entry point to kick off the in-process market lifecycle
 * scheduler: every 60 seconds, any OPEN market whose endTime has passed
 * is transitioned to CLOSED and a market.updated event is broadcast to
 * SSE subscribers.
 *
 * Edge runtime and build-time bundling are skipped — this logic only
 * makes sense in the long-lived Node server process.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Skip during `next build`: NEXT_PHASE=phase-production-build.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { startLifecycleScheduler } = await import("./lib/lifecycle");
  startLifecycleScheduler();
}
