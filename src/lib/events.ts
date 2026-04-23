/**
 * In-process pub/sub for real-time events.
 *
 * Anyone running this process can publish (routes after commit, the
 * lifecycle scheduler, etc.) and anyone can subscribe (the SSE handler
 * opens one subscription per connected client and forwards matching
 * events over the wire).
 *
 * Scale note: this is in-memory and single-instance. When we go
 * multi-instance, swap the backend to Redis pub/sub or a similar broker
 * — the `publish`/`subscribe` surface stays the same.
 */

import type { MarketDTO, PositionDTO, TradeDTO } from "./serialize";

export type EventPayload =
  | { type: "market.updated"; market: MarketDTO }
  | { type: "market.resolved"; market: MarketDTO }
  | { type: "market.created"; market: MarketDTO }
  | { type: "trade.executed"; trade: TradeDTO; market: MarketDTO }
  | { type: "balance.changed"; userId: string; available: string; locked: string }
  | { type: "position.updated"; userId: string; position: PositionDTO }
  | { type: "notification.new"; userId: string; notification: { id: string; type: string; title: string; body: string; createdAt: string } };

export type EventListener = (event: EventPayload) => void;

// Singleton: share one bus across all hot-reload boots in dev and across
// every route handler / background task in prod.
declare global {
  var __eventBus: Set<EventListener> | undefined;
}

const listeners: Set<EventListener> = globalThis.__eventBus ?? new Set();
if (process.env.NODE_ENV !== "production") globalThis.__eventBus = listeners;

export function publish(event: EventPayload): void {
  // Fire-and-forget; a broken listener should not block the publisher.
  for (const fn of listeners) {
    try {
      fn(event);
    } catch (e) {
      console.error("[events] listener threw", e);
    }
  }
}

export function subscribe(listener: EventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Test-only helper so unit tests can reset state between runs.
export function _resetForTests(): void {
  listeners.clear();
}

// Helpers to decide whether an event is visible to a given user. Public
// market events go to everyone; user-scoped events are filtered here so
// the SSE handler can stay simple.
export function isVisibleToUser(event: EventPayload, userId: string | null): boolean {
  switch (event.type) {
    case "market.updated":
    case "market.resolved":
    case "market.created":
    case "trade.executed":
      return true; // public
    case "balance.changed":
    case "position.updated":
    case "notification.new":
      return userId !== null && event.userId === userId;
  }
}
