"use client";

import { useSyncExternalStore } from "react";

// Returns false during SSR / hydration, true after client mount. Lets us guard
// browser-only rendering (locale formatting, window APIs) without the
// setState-in-effect pattern that React 19 lints against.
const subscribe = () => () => {};

export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
