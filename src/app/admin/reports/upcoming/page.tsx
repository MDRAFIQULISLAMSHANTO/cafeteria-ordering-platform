import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { ActorSwitcher } from "@/components/demo/actor-switcher";
import { OpsNav } from "@/components/ops/ops-nav";
import { ToastProvider } from "@/components/toast";
import { ACCOUNT_LABEL, STATE_LABEL, formatMeasure, niceDate } from "@/lib/report-meta";
import { reportContext, upcomingOrders } from "@/lib/reports";
import { money } from "@/lib/rules";
import { currentCustomer } from "@/lib/session";
import { time12 } from "@/lib/time";
import { UpcomingToolbar } from "../report-toolbar";

export const metadata: Metadata = { title: "Upcoming Orders — S Cafe" };

const PER_DAY = 40;
const dayName = (d: string, today: string) =>
  d === today ? "Today" : new Date(`${d}T12:00:00+06:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "Asia/Dhaka" });
const badge = (s: string) => (s === "confirmed" ? "o-badge-info" : "o-badge-warning");

// Pre-orders still to be made and handed over: what the kitchen must prepare
// per day (confirmed orders only) and every open order by day and pickup time.
export default async function UpcomingPage({ searchParams }: PageProps<"/admin/reports/upcoming">) {
  const sp = await searchParams;
  const db = await getDb();
  const ctx = await reportContext(db);
  const days = [1, 3, 7, 14].includes(Number(sp.days)) ? Number(sp.days) : 7;
  const outlet = typeof sp.o === "string" && ctx.outlets.some((o) => o.id === sp.o) ? sp.o : "";
  const sample = sp.sm !== "0";
  const u = await upcomingOrders(db, ctx.today, days, outlet ? [outlet] : [], sample);
  const persona = (await currentCustomer())?.id ?? null;

  const dates = [...new Set(u.orders.map((o) => o.order.pickupDate))];
  const confirmed = u.orders.filter((o) => o.order.state === "confirmed");
  const waiting = u.orders.length - confirmed.length;
  const items = confirmed.reduce((a, o) => a + o.lines.reduce((b, l) => b + l.qty, 0), 0);
  const value = u.orders.reduce((a, o) => a + o.order.total, 0);
  // production grid: product rows × date columns
  const prepDates = [...new Set(u.prep.map((p) => p.date))];
  const products = [...new Set(u.prep.map((p) => p.product))]
    .map((name) => ({ name, total: u.prep.filter((p) => p.product === name).reduce((a, p) => a + p.qty, 0) }))
    .sort((a, b) => b.total - a.total);
  const qty = (name: string, d: string) => u.prep.find((p) => p.product === name && p.date === d)?.qty ?? 0;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-ink print:bg-surface">
        <OpsNav right={<><span className="o-hint hidden md:inline">Demo clock {ctx.now.date} {ctx.now.time}</span><ActorSwitcher tone="staff" staffScreen="admin" personaId={persona} outletId={outlet || "ISD-CAF"} staffUnlocked /></>} />
        <div className="o-cp flex-wrap !gap-y-2 print:hidden">
          <div className="o-cp-left">
            <div className="o-cp-titlewrap">
              <div className="o-breadcrumb">Reporting</div>
              <h1 className="m-0 text-lg font-semibold leading-tight">Upcoming Orders</h1>
            </div>
          </div>
          <div className="o-cp-right"><UpcomingToolbar days={days} outlets={ctx.outlets} outlet={outlet} sample={sample} hasSample={ctx.sampleOrders > 0} /></div>
        </div>

        <main className="mx-auto flex max-w-[1400px] flex-col gap-6 p-3 sm:p-5">
          <p className="text-sm text-muted">
            {outlet ? ctx.outlets.find((o) => o.id === outlet)!.name : "All outlets"} · {niceDate(ctx.today)} – {niceDate(u.to, true)} · orders not yet collected
          </p>
          <section aria-label="Key figures" className="o-kpis">
            <div className="o-kpi"><div className="o-kpi-label">Open orders</div><div className="o-kpi-value">{u.orders.length.toLocaleString("en-IN")}</div><div className="o-kpi-delta">{dates.length} pickup day{dates.length === 1 ? "" : "s"}</div></div>
            <div className="o-kpi o-kpi-stock"><div className="o-kpi-label">Items to prepare</div><div className="o-kpi-value">{items.toLocaleString("en-IN")}</div><div className="o-kpi-delta">confirmed orders</div></div>
            <div className="o-kpi o-kpi-money"><div className="o-kpi-label">Order value</div><div className="o-kpi-value">{formatMeasure("money", value)}</div><div className="o-kpi-delta">paid or accepted, plus waiting</div></div>
            <div className="o-kpi o-kpi-best"><div className="o-kpi-label">Waiting</div><div className="o-kpi-value">{waiting}</div><div className="o-kpi-delta">{waiting ? <span className="o-down">unpaid or awaiting counter</span> : "none"}</div></div>
          </section>

          <section className="min-w-0">
            <div className="o-dash-head"><h2 className="o-dash-title">Production quantities</h2><span className="o-dash-tools text-xs text-muted">confirmed orders only · unpaid ones may still lapse</span></div>
            {products.length === 0 ? (
              <p className="text-muted">Nothing confirmed to prepare in this window.</p>
            ) : (
              <div className="o-list-scroll overflow-x-auto rounded-md border border-line bg-surface">
                <table className="o-pivot w-max min-w-full">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-[1] bg-surface-2 !text-left">Product</th>
                      {prepDates.map((d) => <th key={d} className="whitespace-nowrap">{dayName(d, ctx.today)}</th>)}
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.name}>
                        <th scope="row" className="sticky left-0 z-[1] max-w-[280px] truncate bg-surface">{p.name}</th>
                        {prepDates.map((d) => <td key={d}>{qty(p.name, d) || ""}</td>)}
                        <td className="font-semibold">{p.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th className="sticky left-0 !text-left">Total</th>
                      {prepDates.map((d) => <td key={d}>{u.prep.filter((p) => p.date === d).reduce((a, p) => a + p.qty, 0)}</td>)}
                      <td>{items}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {dates.map((d) => {
            const day = u.orders.filter((o) => o.order.pickupDate === d);
            return (
              <section key={d} className="min-w-0">
                <div className="o-dash-head">
                  <h2 className="o-dash-title">{dayName(d, ctx.today)}</h2>
                  <span className="o-dash-tools text-sm text-muted tabular-nums">{day.length} orders · {money(day.reduce((a, o) => a + o.order.total, 0))}</span>
                </div>
                <div className="o-list">
                  <div className="o-list-scroll">
                    <table>
                      <thead><tr><th>Pickup</th><th>No.</th><th>Customer</th><th>Outlet</th><th>Items</th><th>Status</th><th className="o-num">Total</th></tr></thead>
                      <tbody>
                        {day.slice(0, PER_DAY).map(({ order, customer, slot, outlet: o, lines }) => (
                          <tr key={order.id}>
                            <td className="tabular-nums">{time12(slot.startsAt)} <span className="text-2xs text-muted">{slot.label}</span></td>
                            <td><Link href={`/orders/${order.id}`} className="o-record-link font-semibold">{order.tracking}</Link>{order.channel === "bulk" && <span className="o-badge o-badge-neutral ml-1">bulk</span>}</td>
                            <td>{customer.name} <span className="text-2xs text-muted">{ACCOUNT_LABEL[order.accountType] ?? order.accountType}</span>{order.deliverTo && <span className="block text-2xs text-muted">deliver to {order.deliverTo}</span>}</td>
                            <td>{o.name}</td>
                            <td className="max-w-[340px] truncate" title={lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}>{lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</td>
                            <td><span className={`o-badge ${badge(order.state)}`}>{STATE_LABEL[order.state] ?? order.state}</span></td>
                            <td className="o-num">{money(order.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {day.length > PER_DAY && (
                  <p className="mt-2 text-sm">
                    {day.length - PER_DAY} more on this day ·{" "}
                    <Link href={`/admin/reports?p=custom&from=${d}&to=${d}&st=open&v=list&g=slot${outlet ? `&o=${outlet}` : ""}${sample ? "" : "&sm=0"}`}>open all in Sales Analysis →</Link>
                  </p>
                )}
              </section>
            );
          })}
          {dates.length === 0 && <p className="rounded-md border border-line bg-surface px-6 py-10 text-center text-muted">No open orders in the next {days} day{days === 1 ? "" : "s"}.</p>}
        </main>
      </div>
    </ToastProvider>
  );
}
