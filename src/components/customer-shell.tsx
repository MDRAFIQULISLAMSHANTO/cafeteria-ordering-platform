import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import { ACCOUNT_LABEL, type AccountType } from "@/lib/rules";
import type { Customer } from "@/lib/session";
import { ToastProvider } from "./toast";

type OutletLite = { name: string; campus: string };

const navLink = "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-3 hover:no-underline";

export function CustomerShell({ customer, outlet, active, children }: { customer: Customer; outlet: OutletLite; active: "menu" | "orders" | "none"; children: ReactNode }) {
  const initials = customer.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const sub =
    customer.accountType === "student" ? `Student · Class ${customer.classGrade}${customer.section}` :
    customer.accountType === "employee" ? `Employee · ${customer.employeeId}` :
    ACCOUNT_LABEL[customer.accountType as AccountType];
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-so-bg text-ink">
        <header className="sticky top-0 z-20 flex min-h-15 flex-wrap items-center gap-3 border-b border-line bg-so-surface px-4 py-2 md:flex-nowrap md:gap-4 md:px-5">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-ink hover:no-underline" aria-label="STS Café home">
            <Image src="/branding/sts-group-logo.png" alt="STS Group" width={84} height={36} />
            <span>Café</span>
          </Link>
          <div className="flex flex-col border-l border-line pl-3 leading-tight md:pl-4">
            <small className="text-2xs uppercase tracking-wider text-muted">{outlet.campus}</small>
            <b className="text-sm">{outlet.name}</b>
          </div>
          <nav className="flex w-full items-center justify-between gap-1.5 md:ml-auto md:w-auto md:justify-end">
            <Link href="/order" className={`${navLink} ${active === "menu" ? "bg-surface-3" : ""}`}>Menu</Link>
            <Link href="/orders" className={`${navLink} ${active === "orders" ? "bg-surface-3" : ""}`}>My Orders</Link>
            <div className="flex items-center gap-2 border-l border-line pl-3">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-tag-1 text-xs font-bold text-tag-1-ink">{initials}</span>
              <div className="hidden leading-tight md:block">
                <b className="text-13">{customer.name}</b>
                <small className="block text-2xs text-muted">{sub}</small>
              </div>
              <form action={logoutAction}>
                <button className="o-btn o-btn-sm" type="submit">Sign out</button>
              </form>
            </div>
          </nav>
        </header>
        <main className="w-full flex-1">{children}</main>
      </div>
    </ToastProvider>
  );
}
