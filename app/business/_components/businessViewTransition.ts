import { flushSync } from "react-dom";

/** Keep state changes immediate when native transitions or motion are unavailable. */
export function changeBusinessView(update: () => void) {
  if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  const transition = document.startViewTransition(() => flushSync(update));
  void transition.finished.catch(() => { /* A newer transition may replace this one. */ });
}
