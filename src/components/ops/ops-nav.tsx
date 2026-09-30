"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const REPORTS = [
  { href: "/admin/reports", label: "Sales Analysis", hint: "pivot, graph and list · sales and profit" },
  { href: "/admin/reports/daily", label: "Daily Sales Report", hint: "one day, printable (Z report)" },
  { href: "/admin/reports/upcoming", label: "Upcoming Orders", hint: "pre-orders and production quantities" },
];

/**
 * Odoo-style navbar for the Operations app: the app's menus on the left
 * (Overview · Reporting ▾ · HR staff list), demo tools on the right.
 */
export function OpsNav({ right }: { right?: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(0); // the menu strip scrolls on phones, so the dropdown is placed from the button
  const box = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : ![box.current, pop.current].some((el) => el?.contains(e.target as Node))) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const on = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));
  const menu = (href: string, label: string) => (
    <Link href={href} className={`o-appmenu ${on(href) ? "font-semibold" : ""}`} aria-current={on(href) ? "page" : undefined}>{label}</Link>
  );

  return (
    <nav className="o-navbar print:hidden" aria-label="Operations">
      <Link href="/demo" className="o-appmenu text-lg leading-none" aria-label="Demo hub (all apps)" title="Demo hub">☰</Link>
      <Link href="/admin" className="o-navbar-brand hover:no-underline" aria-label="S Cafe Operations">
        <Image src="/branding/scafe-logo-sm.png" alt="" width={56} height={29} className="h-6 w-auto" />
        <span className="hidden sm:inline">Operations</span>
      </Link>
      <div className="o-appmenus">
        {menu("/admin", "Overview")}
        <div ref={box} className="relative">
          <button type="button" className={`o-appmenu ${path.startsWith("/admin/reports") ? "font-semibold" : ""}`} aria-haspopup="menu" aria-expanded={open} onClick={(e) => { setLeft(e.currentTarget.getBoundingClientRect().left); setOpen((v) => !v); }}>
            Reporting ▾
          </button>
        </div>
        {menu("/admin/hr", "HR staff list")}
      </div>
      {open && (
        <div ref={pop} role="menu" className="o-dropdown" style={{ position: "fixed", top: "calc(var(--o-h-navbar) - 4px)", left: Math.max(8, Math.min(left, (typeof window === "undefined" ? 9999 : window.innerWidth) - 290)) }}>
          {REPORTS.map((r) => (
            <Link key={r.href} role="menuitem" href={r.href} onClick={() => setOpen(false)} className={`o-dd-item flex-col !items-start !gap-0 hover:no-underline ${path === r.href ? "font-semibold" : ""}`}>
              <span className="text-ink">{r.label}</span>
              <span className="text-2xs text-muted">{r.hint}</span>
            </Link>
          ))}
        </div>
      )}
      <div className="o-navbar-right">{right}</div>
    </nav>
  );
}
