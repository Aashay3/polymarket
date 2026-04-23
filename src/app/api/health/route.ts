/**
 * GET /api/health — deep health check. Touches every external dependency.
 *
 * Intended for uptime pingers (BetterUptime, UptimeRobot, statuscake) and
 * load-balancer health probes. Returns 200 if *everything* is green, 503
 * if any hard dependency is unreachable, and a structured JSON body
 * either way so dashboards can show per-component status.
 *
 * No auth: the status of our infrastructure is not a secret, and putting
 * auth on health would defeat the whole point for external monitors.
 *
 * Cheap — a single DB query and a single RPC call. Safe to poll every 30s.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Check {
  name: string;
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}

async function checkDb(): Promise<Check> {
  const t0 = Date.now();
  try {
    // Cheapest possible query that still proves the connection works and
    // a session exists. SELECT 1 avoids any table/index dependency.
    await prisma.$queryRaw`SELECT 1`;
    return { name: "database", status: "up", latencyMs: Date.now() - t0 };
  } catch (e) {
    return {
      name: "database",
      status: "down",
      latencyMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkChain(): Promise<Check> {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpc) return { name: "chain", status: "up" }; // chain features optional until configured

  const t0 = Date.now();
  try {
    // Minimal JSON-RPC call — no third-party SDK overhead so this is
    // resilient to viem version churn.
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
      // Short timeout so a flaky RPC doesn't freeze our health endpoint.
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`RPC returned ${res.status}`);
    const json = (await res.json()) as { result?: string; error?: unknown };
    if (!json.result) throw new Error("RPC returned no result");
    return { name: "chain", status: "up", latencyMs: Date.now() - t0 };
  } catch (e) {
    return {
      name: "chain",
      status: "down",
      latencyMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function GET(): Promise<Response> {
  const [db, chain] = await Promise.all([checkDb(), checkChain()]);
  const overall = db.status === "up" && chain.status !== "down" ? "up" : "down";

  if (overall === "down") {
    logger.error("health check failed", { db, chain });
  }

  const body = {
    status: overall,
    version: process.env.APP_VERSION ?? "dev",
    ts: new Date().toISOString(),
    checks: { db, chain },
  };

  return new Response(JSON.stringify(body), {
    status: overall === "up" ? 200 : 503,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
