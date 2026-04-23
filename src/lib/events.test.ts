import { describe, it, expect, beforeEach, vi } from "vitest";
import { publish, subscribe, isVisibleToUser, _resetForTests, type EventPayload } from "./events";

beforeEach(() => {
  _resetForTests();
});

// Minimal DTO stubs — we only care about the event envelope for these tests.
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

const tradeDTO = {
  id: "t_1",
  userId: "u_1",
  marketId: "m_1",
  outcome: "YES" as const,
  side: "BUY" as const,
  shares: "10",
  pricePerShare: "0.5",
  amount: "5",
  fee: "0.1",
  netAmount: "4.9",
  createdAt: new Date().toISOString(),
};

describe("publish / subscribe", () => {
  it("delivers an event to every active subscriber", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribe(a);
    subscribe(b);

    publish({ type: "market.updated", market: marketDTO });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a.mock.calls[0][0]).toMatchObject({ type: "market.updated", market: { id: "m_1" } });
  });

  it("stops delivering after unsubscribe()", () => {
    const a = vi.fn();
    const unsub = subscribe(a);
    publish({ type: "market.updated", market: marketDTO });
    unsub();
    publish({ type: "market.updated", market: marketDTO });
    expect(a).toHaveBeenCalledTimes(1);
  });

  it("survives a listener throwing (others still fire; publisher does not crash)", () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    subscribe(bad);
    subscribe(good);

    // Silence the error log so the test output stays clean.
    const origErr = console.error;
    console.error = () => {};
    try {
      expect(() => publish({ type: "market.updated", market: marketDTO })).not.toThrow();
    } finally {
      console.error = origErr;
    }

    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
  });

  it("delivers in subscription order", () => {
    const order: number[] = [];
    subscribe(() => order.push(1));
    subscribe(() => order.push(2));
    subscribe(() => order.push(3));
    publish({ type: "market.updated", market: marketDTO });
    expect(order).toEqual([1, 2, 3]);
  });
});

describe("isVisibleToUser()", () => {
  const userEvents: EventPayload[] = [
    { type: "balance.changed", userId: "u_1", available: "100", locked: "0" },
    { type: "position.updated", userId: "u_1", position: {
        id: "p_1",
        marketId: "m_1",
        outcome: "YES",
        shares: "10",
        avgPrice: "0.5",
        costBasis: "5",
        settled: false,
      } },
    { type: "notification.new", userId: "u_1", notification: {
        id: "n_1",
        type: "POSITION_WON",
        title: "x",
        body: "y",
        createdAt: new Date().toISOString(),
      } },
  ];

  const publicEvents: EventPayload[] = [
    { type: "market.updated", market: marketDTO },
    { type: "market.resolved", market: marketDTO },
    { type: "market.created", market: marketDTO },
    { type: "trade.executed", trade: tradeDTO, market: marketDTO },
  ];

  it("lets everyone see public market + trade events", () => {
    for (const e of publicEvents) {
      expect(isVisibleToUser(e, null)).toBe(true);
      expect(isVisibleToUser(e, "anyone")).toBe(true);
    }
  });

  it("hides user-scoped events from anonymous visitors", () => {
    for (const e of userEvents) {
      expect(isVisibleToUser(e, null)).toBe(false);
    }
  });

  it("hides user-scoped events from other users", () => {
    for (const e of userEvents) {
      expect(isVisibleToUser(e, "someone_else")).toBe(false);
    }
  });

  it("delivers user-scoped events to the right user", () => {
    for (const e of userEvents) {
      expect(isVisibleToUser(e, "u_1")).toBe(true);
    }
  });
});
