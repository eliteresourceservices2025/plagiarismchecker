"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "plagcheck_theme";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Manual light/dark toggle, persisted in LocalStorage — not tied to
 * prefers-color-scheme, since dark mode here is an explicit brand-styled
 * theme (neutral dark surface + purple accents) rather than a system
 * preference passthrough. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let stored: Theme = "light";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "dark" || raw === "light") stored = raw;
    } catch {
      // ignore — default to light
    }
    setThemeState(stored);
    applyTheme(stored);
    setHydrated(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage full/unavailable — theme still applies for this session
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle, hydrated };
}
