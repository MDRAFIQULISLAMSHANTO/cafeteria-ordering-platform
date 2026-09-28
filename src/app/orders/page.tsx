import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { CustomerShell } from "@/components/customer-shell";
import { StateBadge, type stateBadge } from "@/components/ui";
import { customerOrders, demoNow, getOutlet } from "@/lib/orders";
import { money } from "@/lib/rules";
import { formatDay, time12 } from "@/lib/time";
import { currentCustomer } from "@/lib/session";

function badge(state: string, kitchen: string): [string, keyof typeof stateBadge] {
  if (state === "awaiting_payment") return ["Unpaid", "wait"];
  if (state === "awaiting_acceptance") return ["Awaiting counter", "wait"];
  if (state === "cancelled") return ["Cancelled", "bad"];
  if (state === "rejected") return ["Not accepted", "bad"];
  if (state === "collected") return ["Collected", "done"];
  if (kitchen === "ready") return ["Ready", "ready"];
  if (kitchen === "not_released") return ["Scheduled", "paid"];
  return ["Preparing", "paid"];
}

export default async function MyOrders() {
  const cust = await currentCustomer();
  if (!cust) redirect("/login?next=/orders");
  const db = await getDb();
  const [orders, outlet, now] = await Promise.all([customerOrders(db, cust.id), getOutlet(db, cust.outletId), demoNow(db)]);
  return (
    <CustomerShell customer={cust} outlet={outlet} active="orders">
      <div className="mx-auto max-w-[880px] px-4 py-6">
        <h1 className="o-so-title">My Orders</h1>
        {orders.length === 0 && (
          <div className="o-so-order o-empty">
            No orders yet. <Link href="/order">Start an order</Link>
          </div>
        )}
        {orders.map((o) => {
          const [label, tone] = badge(o.order.state, o.order.kitchenState);
          return (
            <Link key={o.id} href={`/orders/${o.id}`} className="o-so-order block text-ink hover:no-underline hover:shadow-o-md">
              <div className="o-so-order-head">
                <div>
                  <div className="o-so-order-ref">{o.order.ref}</div>
                  <div className="o-so-order-meta">#{o.order.tracking} · {formatDay(o.order.pickupDate, now.date)} · {o.slot.label} {time12(o.slot.startsAt)} · {o.outlet.name}</div>
                </div>
                <span className="o-so-spacer" />
                <StateBadge tone={tone}>{label}</StateBadge>
              </div>
              {o.lines.map((l) => (
                <div key={l.id} className="o-so-line">
                  <div><div className="o-so-line-name">{l.name}</div><div className="o-so-line-sub"><b>{l.qty}x</b> {money(l.unitPrice)}</div></div>
                  <div className="o-so-line-amt">{money(l.lineTotal)}</div>
                </div>
              ))}
              <div className="o-so-order-total"><b>Total: {money(o.order.total)}</b><span>{o.order.vatRule}{o.order.vat ? `: ${money(o.order.vat)}` : ""}</span></div>
            </Link>
          );
        })}
      </div>
    </CustomerShell>
  );
}
