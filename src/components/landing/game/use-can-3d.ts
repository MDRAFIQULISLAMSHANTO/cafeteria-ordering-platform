"use client";

import { useSyncExternalStore } from "react";

// "yes": show the WebGL tray straight away. "tap": capable but small screen —
// offer a "View in 3D" button. "no": reduced motion, data saver or no WebGL2.
type Can3D = "yes" | "tap" | "no";

let cached: Can3D | null = null;

function detect(): Can3D {
  if (cached) return cached;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  let gl = false;
  try { gl = Boolean(document.createElement("canvas").getContext("webgl2")); } catch {}
  const lite = new URLSearchParams(location.search).get("motion") === "lite";
  cached = !gl || lite || conn?.saveData || matchMedia("(prefers-reduced-motion: reduce)").matches ? "no" : innerWidth >= 768 ? "yes" : "tap";
  return cached;
}

const noop = () => () => {};
export function useCan3D(): Can3D {
  return useSyncExternalStore(noop, detect, () => "no");
}
