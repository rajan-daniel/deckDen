"use client";

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    // Cleanup: if `value` changes again before the timer fires,
    // cancel the pending timeout so it doesn't overwrite with stale data
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}