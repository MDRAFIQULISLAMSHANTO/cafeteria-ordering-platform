"use client";

import { useCallback, useSyncExternalStore } from "react";

// A tiny localStorage-backed store read through useSyncExternalStore, so the
// server render (empty) and the browser (saved value) never fight.
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch {}
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  if (raw != null) {
    try { value = JSON.parse(raw) as T; } catch {}
  }
  cache.set(key, { raw, value });
  return value;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useLocalState<T>(key: string, fallback: T) {
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const set = useCallback(
    (next: T | ((cur: T) => T)) => {
      const cur = read(key, fallback);
      const v = typeof next === "function" ? (next as (c: T) => T)(cur) : next;
      try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
      listeners.forEach((l) => l());
    },
    [key, fallback],
  );
  return [value, set] as const;
}
