/**
 * GET /api/status — public lightweight liveness probe.
 *
 * Unlike /api/health, this doesn't touch any dependency. Answers only:
 * "is this server process alive and responding?". Suitable for
 * load-balancer sub-second probes where you don't want a DB roundtrip
 * on every check.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({ status: "up", ts: new Date().toISOString() }),
    {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    },
  );
}
