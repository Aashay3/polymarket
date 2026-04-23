/**
 * GET /api/stream — Server-Sent Events.
 *
 * One long-lived connection per client. The server pushes:
 *   - public market/trade events to everyone
 *   - user-scoped events (balance, positions, notifications) only to the
 *     signed-in viewer
 *
 * Browsers get automatic reconnection for free via EventSource.
 *
 * Not meant for Vercel's default serverless runtime (function timeout
 * will kill the stream). When hosted on a real Node process (Docker, VPS,
 * etc.) the connection stays open as long as the client wants.
 *
 * Keepalive: we send a comment every 25s so proxies don't close idle
 * connections and browsers detect dead streams quickly.
 */

import { getCurrentUser } from "@/lib/auth-helpers";
import { subscribe, type EventPayload, isVisibleToUser } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEEPALIVE_MS = 25_000;

function sseFrame(event: EventPayload): string {
  // JSON payload, one event per SSE message. The `event:` field lets the
  // browser multiplex client-side via addEventListener("market.updated", ...).
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  const userId = user?.id ?? null;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Initial hello so the client sees "open" immediately.
      controller.enqueue(encoder.encode(`: connected ${new Date().toISOString()}\n\n`));

      unsubscribe = subscribe((event) => {
        if (!isVisibleToUser(event, userId)) return;
        try {
          controller.enqueue(encoder.encode(sseFrame(event)));
        } catch {
          // Controller closed; clean up
          cleanup();
        }
      });

      keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          cleanup();
        }
      }, KEEPALIVE_MS);
    },
    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (keepalive) {
      clearInterval(keepalive);
      keepalive = null;
    }
  }

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Disable Nginx proxy buffering — crucial behind a reverse proxy.
      "x-accel-buffering": "no",
    },
  });
}
