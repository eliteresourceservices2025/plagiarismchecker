"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Simple LocalStorage-backed state hook. SSR-safe: starts with the default
 * value on the server, then hydrates from LocalStorage on mount.
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // ignore malformed storage / private-mode errors
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // storage full or unavailable — value still updates in memory
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, update, hydrated] as const;
}
