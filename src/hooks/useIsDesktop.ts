import { useEffect, useState } from "react";

const QUERY = "(min-width: 1024px)";

const matches = (): boolean =>
  typeof globalThis.matchMedia === "function" && globalThis.matchMedia(QUERY).matches;

/**
 * Tracks whether the viewport is at the `lg` breakpoint or wider (≥1024 px).
 * Used by RootLayout to render the sidebar XOR the mobile chrome — not both
 * with CSS visibility — so InstallButton's `beforeinstallprompt` listener
 * and other side-effecting components only mount once.
 */
export const useIsDesktop = (): boolean => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => matches());

  useEffect(() => {
    if (typeof globalThis.matchMedia !== "function") return undefined;
    const mq = globalThis.matchMedia(QUERY);
    const onChange = () => {
      setIsDesktop(mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, []);

  return isDesktop;
};
