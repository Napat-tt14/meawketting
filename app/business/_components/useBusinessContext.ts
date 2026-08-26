"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  DEMO_BUSINESS_CONTEXTS,
  readActiveBusinessContext,
  writeActiveBusinessContext,
} from "../../_prototype/businessState";

const emptySubscribe = () => () => {};

// Browser-local Business slices render deterministic fixtures on the server,
// then opt into session state after hydration through this shared gate.
export function useBusinessStateReady() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function useBusinessContext() {
  const [context, setContext] = useState(DEMO_BUSINESS_CONTEXTS[0]);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const sync = () => {
      setContext(readActiveBusinessContext());
      setRevision((current) => current + 1);
    };
    const frame = window.requestAnimationFrame(sync);
    window.addEventListener("meawketting:business-state", sync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("meawketting:business-state", sync);
    };
  }, []);

  const selectContext = useCallback((contextKey: string) => {
    const next = writeActiveBusinessContext(contextKey);
    setContext(next);
    setRevision((current) => current + 1);
    return next;
  }, []);

  return { context, selectContext, revision };
}
