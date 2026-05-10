import { useCallback, useEffect, useState } from "react";

type Theme = "dark" | "light";
const KEY = "theme";

const apply = (t: Theme) => {
  document.documentElement.dataset["theme"] = t;
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  });
  useEffect(() => {
    apply(theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);
  const toggle = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [],
  );
  return { theme, toggle };
};
