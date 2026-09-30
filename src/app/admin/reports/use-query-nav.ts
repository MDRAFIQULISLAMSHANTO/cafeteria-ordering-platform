"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";

// The last URL asked for but not rendered yet, shared by every control on the
// page: a second click while the server is still rendering builds on it, so
// quick changes add up instead of the later one dropping the earlier.
let requested: string | null = null;

/**
 * The report's state lives in the URL (so a view can be bookmarked or sent).
 * go({ key: value | null }) changes some parameters; paging and the opened
 * list group reset unless they are part of the change.
 */
export function useQueryNav() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const current = params.toString();
  useEffect(() => {
    if (requested === current) requested = null;
  }, [current]);

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(requested ?? current);
    if (!("pg" in patch)) next.delete("pg");
    if (!("open" in patch) && !("pg" in patch)) next.delete("open");
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    requested = qs;
    start(() => router.replace(qs ? `${path}?${qs}` : path, { scroll: false }));
  };
  return { go, params, pending };
}
