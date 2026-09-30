import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { CustomerShell } from "@/components/customer-shell";
import { getOutlet, listOutlets } from "@/lib/orders";
import { ACCOUNT_LABEL, RULES, type AccountType } from "@/lib/rules";
import { currentCustomer } from "@/lib/session";
import { CampusForm, ClassForm } from "./profile-forms";

export const metadata: Metadata = { title: "Your profile — S Cafe" };

const row = "flex items-center justify-between gap-4 border-b border-line py-2.5 text-sm last:border-b-0";

// C8 §2: parents and students choose a campus and can change it here;
// employees get their outlet, cost centre and discount from the HR list.
export default async function ProfilePage() {
  const cust = await currentCustomer();
  if (!cust) redirect("/login?next=/profile");
  const db = await getDb();
  const [outlet, outlets] = await Promise.all([getOutlet(db, cust.outletId), listOutlets(db)]);
  const employee = cust.accountType === "employee";

  return (
    <CustomerShell customer={cust} outlet={outlet} active="profile">
      <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 py-6">
        <div className="flex items-center gap-4">
          <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-tag-1 text-lg font-bold text-tag-1-ink">
            {cust.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div>
            <h1 className="text-2xl font-bold">{cust.name}</h1>
            <p className="text-muted">{ACCOUNT_LABEL[cust.accountType as AccountType]} account · {cust.phone}</p>
          </div>
        </div>

        {employee ? (
          <section className="rounded-2xl bg-so-surface p-5 shadow-o-sm">
            <h2 className="mb-1 text-base font-bold">From the HR staff list</h2>
            <p className="mb-3 text-sm text-muted">These details come from STS HR and refresh with the monthly list. Ask HR if something is wrong.</p>
            <div className={row}><span className="text-muted">Employee ID</span><b>{cust.employeeId}</b></div>
            <div className={row}><span className="text-muted">Outlet</span><b>{outlet.name}</b></div>
            <div className={row}><span className="text-muted">Cost centre</span><b>{cust.costCentre ?? "—"}</b></div>
            <div className={row}>
              <span className="text-muted">Staff discount</span>
              <b className="text-right">{cust.discountEligible ? `${RULES.employeeDiscountPercent}% at the Parent Lounge` : "Not eligible"}</b>
            </div>
            <div className={row}><span className="text-muted">VAT</span><b>0% — employee orders are VAT-free</b></div>
            <div className={row}><span className="text-muted">Bulk orders</span><b>{cust.coordinator ? "Authorised coordinator" : "—"}</b></div>
          </section>
        ) : (
          <>
            <section className="rounded-2xl bg-so-surface p-5 shadow-o-sm">
              <h2 className="mb-1 text-base font-bold">Your campus</h2>
              <p className="mb-3 text-sm text-muted">You order from this campus&apos;s cafeteria. Changing it changes your menu and pickup times; existing orders stay where they were placed.</p>
              <CampusForm
                value={cust.outletId}
                outlets={outlets.filter((o) => o.kind !== "corporate").map((o) => ({ id: o.id, label: `${o.campus} — ${o.name}` }))}
              />
            </section>
            {cust.accountType === "student" && (
              <section className="rounded-2xl bg-so-surface p-5 shadow-o-sm">
                <h2 className="mb-1 text-base font-bold">Class and section</h2>
                <p className="mb-3 text-sm text-muted">Printed on your ticket and receipt so the counter can find you.</p>
                <ClassForm classGrade={cust.classGrade ?? ""} section={cust.section ?? ""} />
              </section>
            )}
          </>
        )}

        <section className="rounded-2xl bg-so-surface p-5 shadow-o-sm">
          <h2 className="mb-1 text-base font-bold">Payments and notifications</h2>
          <div className={row}><span className="text-muted">Payment</span><b className="text-right">{employee ? "Online, or cash/card at the counter" : "Online — bKash, Nagad or card"}</b></div>
          <div className={row}><span className="text-muted">Order updates</span><b className="text-right">SMS to {cust.phone} · in-app bell</b></div>
        </section>
      </div>
    </CustomerShell>
  );
}
