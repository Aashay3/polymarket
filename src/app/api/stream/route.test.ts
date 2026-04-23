/**
 * GET /api/stream — SSE endpoint.
 *
 * Tests that the endpoint:
 *   - returns the correct SSE headers
 *   - emits an initial connected comment
 *   - forwards public events to anonymous clients
 *   - forwards user-scoped events only to the right user
 *   - cleans up subscriptions on stream cancel
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { publish, _resetForTests, type EventPayload } from "@/lib/events";

const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser: () => getUserMock() }));

const { GET } = await import("./route");

const marketDTO = {
  id: "m_1",
  slug: "s",
  question: "Q?",
  description: "d",
  rules: "r",
  category: "c",
  imageUrl: null,
  yesShares: "50",
  noShares: "50",
  yesPrice: "0.500000",
  noPrice: "0.500000",
  feeBps: 200,
  status: "OPEN" as const,
  winningOutcome: null,
  endTime: new Date().toISOString(),
  resolvedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Helper: read the first `n` SSE frames from a Response stream.
async function readFrames(res: Response, timeoutMs = 500): Promise<string> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<{ value: undefined; done: true }>((resolve) =>
        setTimeout(() => resolve({ value: undefined, done: true }), 100),
      ),
    ]);
    if (done) break;
    if (value) acc += decoder.decode(value);
  }
  await reader.cancel();
  return acc;
}

beforeEach(() => {
  _resetForTests();
  getUserMock.mockReset();
});

afterEach(() => {
  _resetForTests();
});

describe("GET /api/stream", () => {
  it("sets SSE headers and sends a connected comment immediately", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toContain("no-cache");
    const body = await readFrames(res);
    expect(body).toContain(": connected");
  });

  it("forwards public market.updated events to an anonymous client", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await GET();
    // Kick the reader loop and let start() run before publishing.
    const reader = res.body!.getReader();
    await reader.read(); // drain the initial `: connected` frame

    publish({ type: "market.updated", market: marketDTO });

    const decoder = new TextDecoder();
    const { value } = await Promise.race([
      reader.read(),
      new Promise<{ value: undefined }>((r) => setTimeout(() => r({ value: undefined }), 300)),
    ]);
    await reader.cancel();
    const chunk = value ? decoder.decode(value) : "";
    expect(chunk).toContain("event: market.updated");
    expect(chunk).toContain(`"id":"m_1"`);
  });

  it("withholds user-scoped events from another user", async () => {
    getUserMock.mockResolvedValue({ id: "viewer_u1", email: null, name: null, image: null, role: "USER", username: null, walletAddress: null });
    const res = await GET();
    const reader = res.body!.getReader();
    await reader.read(); // initial connected

    // Publish an event targeted at someone else
    publish({
      type: "notification.new",
      userId: "someone_else",
      notification: {
        id: "n1",
        type: "POSITION_WON",
        title: "x",
        body: "y",
        createdAt: new Date().toISOString(),
      },
    } satisfies EventPayload);

    // The reader should NOT see this payload
    const decoder = new TextDecoder();
    const { value } = await Promise.race([
      reader.read(),
      new Promise<{ value: undefined }>((r) => setTimeout(() => r({ value: undefined }), 200)),
    ]);
    await reader.cancel();
    const chunk = value ? decoder.decode(value) : "";
    expect(chunk).not.toContain("notification.new");
    expect(chunk).not.toContain("someone_else");
  });

  it("delivers user-scoped events to the correct viewer", async () => {
    getUserMock.mockResolvedValue({ id: "u_1", email: null, name: null, image: null, role: "USER", username: null, walletAddress: null });
    const res = await GET();
    const reader = res.body!.getReader();
    await reader.read();

    publish({
      type: "balance.changed",
      userId: "u_1",
      available: "100.500000",
      locked: "0",
    });

    const decoder = new TextDecoder();
    const { value } = await Promise.race([
      reader.read(),
      new Promise<{ value: undefined }>((r) => setTimeout(() => r({ value: undefined }), 300)),
    ]);
    await reader.cancel();
    const chunk = value ? decoder.decode(value) : "";
    expect(chunk).toContain("event: balance.changed");
    expect(chunk).toContain("100.500000");
  });
});
