"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

export type OutletOpt = { id: string; name: string };

export function OutletSelect({ outlets, value, path }: { outlets: OutletOpt[]; value: string; path: string }) {
  const router = useRouter();
  return (
    <select className="h-12.5 rounded-lg border border-line bg-kds-bar px-3 font-medium text-ink" value={value} aria-label="Outlet" onChange={(e) => router.push(`${path}?outlet=${e.target.value}`)}>
      {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

export function useOutletParam(fallback: string) {
  return useSearchParams().get("outlet") ?? fallback;
}

// The theme lives on <html data-theme>; components read it as an external store.
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const themeSnapshot = () => document.documentElement.dataset.theme === "dark";

/** Light/dark toggle for staff screens (the KDS has its own in Odoo). */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, themeSnapshot, () => false);
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("sts-staff-theme"); } catch {}
    document.documentElement.dataset.theme = saved === "dark" ? "dark" : "light";
  }, []);
  const toggle = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("sts-staff-theme", next); } catch {}
  };
  return <button className="o-kds-iconbtn" title={dark ? "Light mode" : "Dark mode"} onClick={toggle}>{dark ? "☀" : "☾"}</button>;
}

export function Clock({ ms }: { ms?: number }) {
  if (!ms) return null;
  return (
    <span className="whitespace-nowrap text-sm tabular-nums text-muted">
      {new Date(ms).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
