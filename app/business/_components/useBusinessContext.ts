"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  getBusinessConfigurationRevision,
  subscribeBusinessConfiguration,
} from "../../_backend/be1/configurationCache";
import { ensureBusinessSession } from "../../_backend/be1/client";
import {
  getDemoBusinessContext,
  readActiveBusinessContext,
  writeActiveBusinessContext,
} from "../../_prototype/businessState";

const emptySubscribe = () => () => {};

// Hydration gate only. Fixtures are available exclusively to the test harness.
export function useBusinessStateReady() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export function useBusinessContext() {
  const [context, setContext] = useState(() => getDemoBusinessContext(null));
  const [revision, setRevision] = useState(0);
  const [isContextReady, setIsContextReady] = useState(false);
  const configurationRevision = useSyncExternalStore(
    subscribeBusinessConfiguration,
    getBusinessConfigurationRevision,
    () => 0,
  );

  useEffect(() => {
    void ensureBusinessSession().catch(() => {
      // The portal frame owns loading/error feedback; no fixture fallback.
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
