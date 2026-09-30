import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { OpsNav } from "@/components/ops/ops-nav";
import { ToastProvider } from "@/components/toast";
import { HrImport } from "./hr-import";

export const metadata: Metadata = { title: "HR staff list — S Cafe" };

// C8 §8: employees are verified against the HR staff list, refreshed monthly.
// Leavers are deactivated; outlet, cost centre and discount come from here.
export default async function HrPage() {
  const db = await getDb();
  const [staff, customers, runs, outlets] = await Promise.all([
    db.select().from(t.hrStaff).orderBy(asc(t.hrStaff.employeeId)),
    db.select({ employeeId: t.customer.employeeId, active: t.customer.active }).from(t.customer),
    db.select().from(t.hrSyncRun).orderBy(desc(t.hrSyncRun.createdAt)).limit(6),
    db.select({ id: t.outlet.id, name: t.outlet.name }).from(t.outlet),
  ]);
  const account = (id: string) => customers.find((c) => c.employeeId === id);
  const outletName = (id: string) => outlets.find((o) => o.id === id)?.name ?? id;
  const th = "border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold";
  const td = "border-b border-line px-3 py-1.5 text-sm";

  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-ink">
        <OpsNav right={<span className="pill-sandbox">sample list · fictional people</span>} />
        <div className="o-cp">
          <div className="o-cp-titlewrap">
            <div className="o-breadcrumb">Operations</div>
            <h1 className="m-0 text-lg font-semibold leading-tight">HR staff list</h1>
          </div>
        </div>
        <div className="mx-auto grid max-w-[1240px] items-start gap-4 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-md border border-line bg-surface">
            <h2 className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 text-base font-semibold">
              Staff ({staff.filter((s) => s.active).length} active)
              <span className="o-hint">employees sign in with the mobile number listed here</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead><tr><th className={th}>ID</th><th className={th}>Name</th><th className={th}>Outlet</th><th className={th}>Cost centre</th><th className={th}>Discount</th><th className={th}>Status</th></tr></thead>
                <tbody>
                  {staff.map((s) => {
                    const acc = account(s.employeeId);
                    return (
                      <tr key={s.employeeId} className={s.active ? "" : "opacity-55"}>
                        <td className={`${td} tabular-nums`}>{s.employeeId}</td>
                        <td className={td}>{s.name}{s.coordinator && <span className="o-hint"> · coordinator</span>}<small className="block text-muted tabular-nums">{s.phone}</small></td>
                        <td className={td}>{outletName(s.outletId)}</td>
                        <td className={td}>{s.costCentre}</td>
                        <td className={td}>{s.discountEligible ? "Eligible (Parent Lounge 20%)" : "—"}</td>
                        <td className={td}>
                          {s.active ? "Active" : "Left"}
                          <small className="block text-muted">{acc ? (acc.active ? "has an account" : "account deactivated") : "no account yet"}</small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section className="rounded-md border border-line bg-surface p-4">
              <h2 className="mb-1 text-base font-semibold">Monthly import</h2>
              <p className="mb-3 text-sm text-muted">
                Upload this month&apos;s list as CSV (<code className="text-xs">employee_id, name, phone, outlet_id, cost_centre, discount_eligible, coordinator</code>).
                Joiners are added, changes applied to their accounts, and anyone missing is treated as a leaver and deactivated.
              </p>
              <HrImport />
              <p className="mt-3 text-2xs text-muted">Interface, file format and ownership of the HR feed are still to be agreed with STS HR.</p>
            </section>

            <section className="rounded-md border border-line bg-surface p-4">
              <h2 className="mb-2 text-base font-semibold">Sync log</h2>
              {runs.length === 0 && <p className="o-hint">No imports yet.</p>}
              <ul className="flex flex-col gap-2">
                {runs.map((r) => (
                  <li key={r.id} className="rounded-lg border border-line px-3 py-2 text-sm">
                    <b className="block">{r.source}</b>
                    <small className="text-muted">
                      {new Date(r.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {r.added} added · {r.updated} updated · {r.deactivated} left
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
