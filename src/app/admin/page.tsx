import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { ActorSwitcher } from "@/components/demo/actor-switcher";
import { ToastProvider } from "@/components/toast";
import { currentCustomer } from "@/lib/session";
import { costCentreInvoices, demoNow, listOutlets, menuFor } from "@/lib/orders";
import { ACCOUNT_LABEL, money, type AccountType } from "@/lib/rules";
import { time12 } from "@/lib/time";
import { AvailabilityList, AdminOutletSelect } from "./admin-bits";

export const metadata: Metadata = { title: "Operations — STS Café" };

const STATE_LABEL: Record<string, string> = {
  awaiting_payment: "Unpaid", awaiting_acceptance: "Awaiting acceptance", confirmed: "Confirmed", collected: "Collected", cancelled: "Cancelled", rejected: "Rejected",
};

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const db = await getDb();
  const outlets = await listOutlets(db);
  const q = (await searchParams).outlet;
  const outlet = outlets.find((o) => o.id === q) ?? outlets.find((o) => o.id === "ISD-CAF")!;
  const now = await demoNow(db);
  const menu = await menuFor(db, outlet.id, now.date);
  const invoices = await costCentreInvoices(db);
  const orders = await db
    .select({ order: t.foodOrder, customer: t.customer, slot: t.pickupSlot })
    .from(t.foodOrder)
    .innerJoin(t.customer, eq(t.customer.id, t.foodOrder.customerId))
    .innerJoin(t.pickupSlot, eq(t.pickupSlot.id, t.foodOrder.slotId))
    .where(and(eq(t.foodOrder.outletId, outlet.id), inArray(t.foodOrder.state, Object.keys(STATE_LABEL))))
    .orderBy(asc(t.foodOrder.pickupDate), asc(t.pickupSlot.startsAt));
  const today = orders.filter((o) => o.order.pickupDate === now.date);
  const future = orders.filter((o) => o.order.pickupDate > now.date && o.order.state === "confirmed");
  const revenue = today.filter((o) => ["confirmed", "collected"].includes(o.order.state)).reduce((a, o) => a + o.order.total, 0);

  // future production list: quantity per date, slot and product
  const futureLines = future.length
    ? await db.select().from(t.orderLine).where(inArray(t.orderLine.orderId, future.map((f) => f.order.id)))
    : [];
  const production = new Map<string, { date: string; slot: string; name: string; qty: number }>();
  for (const l of futureLines) {
    const o = future.find((f) => f.order.id === l.orderId)!;
    const key = `${o.order.pickupDate}|${o.slot.startsAt}|${l.name}`;
    const cur = production.get(key) ?? { date: o.order.pickupDate, slot: `${o.slot.label} ${time12(o.slot.startsAt)}`, name: l.name, qty: 0 };
    cur.qty += l.qty;
    production.set(key, cur);
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-page text-ink">
        <div className="flex h-(--o-h-navbar) items-center gap-4 border-b border-line bg-navbar px-4">
          <Link href="/demo">☰</Link>
          <b className="hidden text-sm sm:inline">STS Café · Operations</b>
          <AdminOutletSelect outlets={outlets.map((o) => ({ id: o.id, name: o.name }))} value={outlet.id} />
          <Link href="/admin/hr" className="o-btn o-btn-sm hidden sm:inline-flex">HR staff list</Link>
          <span className="o-hint ml-auto hidden md:inline">Demo clock {now.date} {now.time}</span>
          <ActorSwitcher tone="staff" staffScreen="admin" personaId={(await currentCustomer())?.id ?? null} outletId={outlet.id} staffUnlocked />
        </div>
        <div className="grid items-start gap-4 p-4 lg:grid-cols-2">
          <section className="rounded-md border border-line bg-surface">
            <h2 className="flex items-center justify-between border-b border-line px-4 py-3 text-base font-semibold">Menu availability · today <span className="o-hint">switch off = sold out for {outlet.name}, today only</span></h2>
            <AvailabilityList outletId={outlet.id} items={menu.map((m) => ({ id: m.id, name: m.name, category: m.category, price: m.price, available: m.available, reason: m.reason }))} />
          </section>

          <div className="flex flex-col gap-4">
            <section className="rounded-md border border-line bg-surface">
              <h2 className="flex items-center justify-between border-b border-line px-4 py-3 text-base font-semibold">Today <span className="o-hint tabular-nums">{today.length} orders · {money(revenue)} confirmed</span></h2>
              <table className="w-full">
                <thead><tr><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">No.</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Customer</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Slot</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Status</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Kitchen</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold text-right">Total</th></tr></thead>
                <tbody>
                  {today.length === 0 && <tr><td colSpan={6} className="border-b border-line px-3 py-1.5 o-hint">No orders for today yet.</td></tr>}
                  {today.map(({ order, customer, slot }) => (
                    <tr key={order.id}>
                      <td className="border-b border-line px-3 py-1.5"><b>{order.tracking}</b>{order.channel === "bulk" && <span className="o-hint"> bulk</span>}</td>
                      <td className="border-b border-line px-3 py-1.5">{customer.name} <span className="o-hint">{ACCOUNT_LABEL[customer.accountType as AccountType]}</span></td>
                      <td className="border-b border-line px-3 py-1.5">{time12(slot.startsAt)}</td>
                      <td className="border-b border-line px-3 py-1.5">{STATE_LABEL[order.state]}{order.rejectReason ? ` — ${order.rejectReason}` : ""}</td>
                      <td className="border-b border-line px-3 py-1.5">{order.kitchenState.replace("_", " ")}</td>
                      <td className="border-b border-line px-3 py-1.5 text-right tabular-nums">{money(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="rounded-md border border-line bg-surface">
              <h2 className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 text-base font-semibold">Cost-centre invoices · monthly <span className="o-hint">coordinator bulk orders, all outlets</span></h2>
              {invoices.length === 0 && <p className="px-4 py-3 o-hint">No bulk orders yet. Coordinators book them from “Bulk order”.</p>}
              {invoices.map((g) => (
                <details key={`${g.month}${g.costCentre}`} className="border-b border-line px-4 py-2.5 last:border-b-0">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                    <span><b>{g.costCentre}</b> <span className="o-hint">· {new Date(`${g.month}-01T12:00:00+06:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Dhaka" })} · {g.orders.length} order{g.orders.length === 1 ? "" : "s"}</span></span>
                    <b className="tabular-nums">{money(g.total)}</b>
                  </summary>
                  <table className="mt-2 w-full text-sm">
                    <tbody>
                      {g.orders.map((o) => (
                        <tr key={`${o.date}${o.tracking}`}>
                          <td className="py-1 pr-2 tabular-nums">{o.date}</td>
                          <td className="py-1 pr-2">{o.tracking} · {o.event} <span className="o-hint">by {o.by}</span></td>
                          <td className="py-1 pr-2 o-hint">{o.delivered ? "delivered" : "booked"}</td>
                          <td className="py-1 text-right tabular-nums">{money(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-1 text-2xs text-muted">Invoice raised monthly to the cost centre; VAT-free (employee account). Invoice numbering pending STS Finance.</p>
                </details>
              ))}
            </section>

            <section className="rounded-md border border-line bg-surface">
              <h2 className="flex items-center justify-between border-b border-line px-4 py-3 text-base font-semibold">Production list · pre-orders <span className="o-hint">joins the kitchen on the pickup day</span></h2>
              <table className="w-full">
                <thead><tr><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Date</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Slot</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold">Item</th><th className="border-b border-line bg-surface-2 px-3 py-1.5 text-left text-xs font-semibold text-right">Qty</th></tr></thead>
                <tbody>
                  {production.size === 0 && <tr><td colSpan={4} className="border-b border-line px-3 py-1.5 o-hint">No confirmed pre-orders.</td></tr>}
                  {[...production.values()].map((p) => (
                    <tr key={`${p.date}${p.slot}${p.name}`}><td className="border-b border-line px-3 py-1.5">{p.date}</td><td className="border-b border-line px-3 py-1.5">{p.slot}</td><td className="border-b border-line px-3 py-1.5">{p.name}</td><td className="border-b border-line px-3 py-1.5 text-right tabular-nums"><b>{p.qty}</b></td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
