import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import { demoContext } from "@/lib/demo-context";
import { ACCOUNT_LABEL, type AccountType } from "@/lib/rules";
import type { Customer } from "@/lib/session";
import { ActorSwitcher } from "./demo/actor-switcher";
import { NotificationBell } from "./notification-bell";
import { ToastProvider } from "./toast";

type OutletLite = { id: string; name: string; campus: string };
type Active = "menu" | "orders" | "bulk" | "profile" | "none";

const navLink = "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-3 hover:no-underline";

/**
 * Header for every signed-in customer screen. `theme="sts"` switches the
 * self-order tokens to the STS palette (used by the menu page only).
 */
export async function CustomerShell({ customer, outlet, active, theme, children }: { customer: Customer; outlet: OutletLite; active: Active; theme?: "sts"; children: ReactNode }) {
  const initials = customer.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const sub =
    customer.accountType === "student" ? `Student · Class ${customer.classGrade}${customer.section}` :
    customer.accountType === "employee" ? `Employee · ${customer.employeeId}` :
    ACCOUNT_LABEL[customer.accountType as AccountType];
  const demo = await demoContext(customer.id);
  const links: { href: string; label: string; id: Active }[] = [
    { href: "/order", label: "Menu", id: "menu" },
    { href: "/orders", label: "My Orders", id: "orders" },
    ...(customer.coordinator ? [{ href: "/order/bulk", label: "Bulk order", id: "bulk" as const }] : []),
  ];
  return (
    <ToastProvider>
      <div className={`flex min-h-dvh flex-col bg-so-bg text-ink ${theme === "sts" ? "sts-theme" : ""}`}>
        <header className="sticky top-0 z-20 border-b border-line bg-so-surface/95 backdrop-blur supports-[backdrop-filter]:bg-so-surface/85">
          <div className="mx-auto flex min-h-15 max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-4 md:flex-nowrap md:gap-4 md:px-5">
            <Link href="/" className="flex flex-none items-center gap-2 text-lg font-bold text-ink hover:no-underline" aria-label="S Cafe home">
              <Image src="/branding/scafe-logo.png" alt="S Cafe" width={140} height={72} className="h-9 w-auto sm:h-10" />
            </Link>
            <div className="flex min-w-0 flex-col border-l border-line pl-3 leading-tight md:pl-4">
              <small className="truncate text-2xs uppercase tracking-wider text-muted">{outlet.campus}</small>
              <b className="truncate text-sm">{outlet.name}</b>
            </div>

            <nav aria-label="Main" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto md:order-none md:mx-0 md:ml-auto md:w-auto">
              {links.map((l) => (
                <Link key={l.href} href={l.href} aria-current={active === l.id ? "page" : undefined} className={`${navLink} ${active === l.id ? "bg-surface-3" : ""}`}>{l.label}</Link>
              ))}
            </nav>

            <div className="ml-auto flex flex-none items-center gap-1 md:ml-0 md:gap-1.5 md:border-l md:border-line md:pl-3">
              <NotificationBell key={customer.id} who={customer.id} />
              {demo.show && <ActorSwitcher personaId={customer.id} outletId={outlet.id} staffUnlocked={demo.staffUnlocked} />}
              <Link href="/profile" aria-label="Your profile" aria-current={active === "profile" ? "page" : undefined} className="flex items-center gap-2 rounded-full p-0.5 pr-1 text-ink hover:bg-surface-3 hover:no-underline md:pr-2">
                <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-tag-1 text-xs font-bold text-tag-1-ink">{initials}</span>
                <span className="hidden leading-tight lg:block">
                  <b className="block text-13">{customer.name}</b>
                  <small className="block text-2xs text-muted">{sub}</small>
                </span>
              </Link>
              <form action={logoutAction}>
                <button className="o-btn o-btn-sm" type="submit" aria-label="Sign out">
                  <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4H4v12h4M13 6l4 4-4 4M17 10H8" /></svg>
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="w-full flex-1">{children}</main>
      </div>
    </ToastProvider>
  );
}
