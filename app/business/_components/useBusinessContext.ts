"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  getBusinessConfigurationRevision,
  subscribeBusinessConfiguration,
} from "../../_backend/be1/configurationCache";
import { ensureBusinessSession } from "../../_backend/be1/client";
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
  const [isContextReady, setIsContextReady] = useState(false);
  const configurationRevision = useSyncExternalStore(
    subscribeBusinessConfiguration,
    getBusinessConfigurationRevision,
    () => 0,
  );

  useEffect(() => {
    void ensureBusinessSession().catch(() => {
      // The frozen prototype remains usable with DEV/TEST fixtures when its
      // explicitly local backend is not initialized. No browser write becomes
      // an authorization or Business/Branch source of truth.
    });
  }, []);

  useEffect(() => {
    const sync = () => {
      setContext(readActiveBusinessContext());
      setRevision((current) => current + 1);
      setIsContextReady(true);
    };
    const frame = window.requestAnimationFrame(sync);
    window.addEventListener("meawketting:business-state", sync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("meawketting:business-state", sync);
    };
  }, [configurationRevision]);

  const selectContext = useCallback((contextKey: string) => {
    const next = writeActiveBusinessContext(contextKey);
    setContext(next);
    setRevision((current) => current + 1);
    setIsContextReady(true);
    return next;
  }, []);

  return { context, selectContext, revision, isContextReady };
}
