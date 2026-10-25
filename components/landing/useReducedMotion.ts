import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

/**
 * Live `prefers-reduced-motion` flag.
 *
 * Read through useSyncExternalStore so a reveal effect never has to call
 * setState synchronously in its own body (react-hooks/set-state-in-effect):
 * components derive `inView` from this value and the effect only subscribes
 * when motion is allowed. Server snapshot is `false` — CSS already forces the
 * end state under `prefers-reduced-motion`, so SSR HTML stays correct.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
