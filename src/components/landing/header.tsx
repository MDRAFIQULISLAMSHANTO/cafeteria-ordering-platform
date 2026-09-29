"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { href: "#menu", label: "Menu" },
  { href: "#how", label: "How it works" },
  { href: "#outlets", label: "Outlets" },
  { href: "#play", label: "Play" },
  { href: "#help", label: "Help" },
];

export function LandingHeader({ signedIn, orderHref }: { signedIn: boolean; orderHref: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 8);
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  return (
    <header className={`sticky top-0 z-50 transition-[background-color,box-shadow] duration-300 ${scrolled || open ? "bg-sts-white/90 shadow-[0_1px_0_var(--sts-hairline)] backdrop-blur-xl" : "bg-transparent"}`}>
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6 md:h-18">
        <Link href="/" aria-label="STS Group cafeteria home" className="flex-none">
          <Image src="/branding/sts-group-logo.png" alt="STS Group" width={104} height={45} priority className="h-9 w-auto md:h-11" />
        </Link>
        <nav aria-label="Sections" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-sm font-semibold text-sts-purple hover:bg-sts-purple-soft hover:no-underline">{n.label}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link href={signedIn ? "/orders" : "/login"} className="hidden min-h-11 items-center rounded-full px-4 text-sm font-bold text-sts-purple hover:bg-sts-purple-soft hover:no-underline sm:inline-flex">
            {signedIn ? "My orders" : "Sign in"}
          </Link>
          <Link href={orderHref} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sts-action px-4 text-sm font-bold text-sts-ink shadow-[var(--sts-action-shadow)] transition-transform hover:-translate-y-px hover:no-underline sm:px-5">
            Order now <span aria-hidden>→</span>
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-sts-purple hover:bg-sts-purple-soft lg:hidden"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav id="landing-menu" aria-label="Sections" className="border-t border-sts-hairline px-4 pb-4 pt-2 lg:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 font-semibold text-sts-purple hover:bg-sts-purple-soft hover:no-underline">{n.label}</a>
          ))}
          <Link href={signedIn ? "/orders" : "/login"} className="mt-1 block rounded-xl px-3 py-3 font-semibold text-sts-purple hover:bg-sts-purple-soft hover:no-underline sm:hidden">
            {signedIn ? "My orders" : "Sign in"}
          </Link>
        </nav>
      )}
    </header>
  );
}
