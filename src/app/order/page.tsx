import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { CustomerShell } from "@/components/customer-shell";
import { dateOptions, demoNow, editBlock, firstOrderableDate, getOutlet, menuFor, orderDetail, slotsFor } from "@/lib/orders";
import { currentCustomer } from "@/lib/session";
import { OrderScreen, type Editing, type MenuPayload } from "./order-screen";

export default async function OrderPage({ searchParams }: PageProps<"/order">) {
  const cust = await currentCustomer();
  if (!cust) redirect("/login");
  const db = await getDb();
  const outlet = await getOutlet(db, cust.outletId);
  const now = await demoNow(db);
  const sp = await searchParams;
  const welcome = sp.welcome;

  // ?edit=<order id>: the same screen, opened on that order (C8 §10: edit until cut-off)
  let editing: Editing | undefined;
  let date: string;
  let dates = dateOptions(now);
  if (typeof sp.edit === "string") {
    const d = await orderDetail(db, sp.edit);
    if (!d || d.order.customerId !== cust.id) redirect("/orders");
    if (editBlock(d.order, d.slot, now, d.substitutions.length > 0)) redirect(`/orders/${d.order.id}`);
    date = d.order.pickupDate;
    dates = dates.filter((x) => x.date === date);
    editing = {
      id: d.order.id,
      tracking: d.order.tracking,
      slotId: d.order.slotId,
      lines: Object.fromEntries(d.lines.map((l) => [l.productId, l.qty])),
      held: d.netPaid,
      paid: d.order.state === "confirmed" && d.order.paymentMode === "online",
    };
  } else {
    date = await firstOrderableDate(db, outlet.id, now);
  }
  const [menu, slots] = await Promise.all([menuFor(db, outlet.id, date), slotsFor(db, outlet.id, date, now)]);

  const initial: MenuPayload = { now, date, dates, menu, slots };
  return (
    <CustomerShell customer={cust} outlet={outlet} active="menu" theme="sts">
      {/* keyed so the demo actor switch (same route, new account) or an edit starts a fresh menu and cart */}
      <OrderScreen
        key={`${cust.id}:${outlet.id}:${editing?.id ?? "new"}`}
        initial={initial}
        customer={{ id: cust.id, name: cust.name, accountType: cust.accountType as "parent" | "student" | "employee", discountEligible: cust.discountEligible }}
        outlet={{ id: outlet.id, name: outlet.name, kind: outlet.kind, menuAssignmentConfirmed: outlet.menuAssignmentConfirmed }}
        welcome={typeof welcome === "string" ? welcome : undefined}
        editing={editing}
      />
    </CustomerShell>
  );
}
