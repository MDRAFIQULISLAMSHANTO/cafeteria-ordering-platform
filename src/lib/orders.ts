import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, lte, ne, notInArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as t from "@/db/schema";
import { demoNow, type DemoNow } from "./clock";
import { RULES, money, price, type AccountType } from "./rules";
import { addDays, at, daysBetween, time12, weekdayOf } from "./time";

type FoodOrder = typeof t.foodOrder.$inferSelect;
type Payment = typeof t.payment.$inferSelect;

// Every write in the prototype goes through this file. Screens never touch
// tables directly — this is the seam where Odoo replaces the database later.

export class RuleError extends Error {
  constructor(message: string, public rule: string) {
    super(message);
  }
}

type Customer = typeof t.customer.$inferSelect;
type Outlet = typeof t.outlet.$inferSelect;
type Slot = typeof t.pickupSlot.$inferSelect;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const ACTIVE_STATES = ["awaiting_payment", "awaiting_acceptance", "confirmed", "collected"];

async function audit(db: Db | Tx, actor: string, action: string, orderId: string | null, outletId: string | null, detail?: unknown) {
  await db.insert(t.auditLog).values({ id: randomUUID(), actor, action, orderId, outletId, detail: detail ?? null });
}

async function notify(db: Db | Tx, phone: string, text: string, orderId?: string) {
  await db.insert(t.notification).values({ id: randomUUID(), phone, orderId: orderId ?? null, channel: "sms", text });
}

// ---------------------------------------------------------------- lookups

export async function getOutlet(db: Db, id: string) {
  const rows = await db.select().from(t.outlet).where(eq(t.outlet.id, id));
  if (!rows[0]) throw new RuleError("Unknown outlet", "Outlet must exist");
  return rows[0];
}

export async function listOutlets(db: Db) {
  return db.select().from(t.outlet).orderBy(asc(t.outlet.name));
}

// ------------------------------------------------------ cut-offs and dates

/** When ordering/editing closes for a pickup at `date` in `slot`. */
export function cutoffMs(date: string, slot: Pick<Slot, "startsAt">, now: DemoNow): { ms: number; rule: string } {
  if (date === now.date) {
    return { ms: at(date, slot.startsAt) - RULES.sameDayCutoffMinutes * 60_000, rule: `Same-day orders close ${RULES.sameDayCutoffMinutes} min before the slot` };
  }
  return { ms: at(addDays(date, -1), RULES.nextDayCutoff), rule: `Orders for a later day close at ${time12(RULES.nextDayCutoff)} the day before` };
}

export function dateOptions(now: DemoNow) {
  return Array.from({ length: RULES.maxDaysAhead + 1 }, (_, i) => {
    const date = addDays(now.date, i);
    const wd = weekdayOf(date);
    const open = !["fri", "sat"].includes(wd);
    return { date, weekday: wd, open, reason: open ? null : "Closed (weekend)" };
  });
}

function checkDate(date: string, now: DemoNow) {
  const d = daysBetween(now.date, date);
  if (d < 0) throw new RuleError("That date has passed.", "Pickup date must be today or later");
  if (d > RULES.maxDaysAhead) throw new RuleError(`You can order up to ${RULES.maxDaysAhead} days ahead.`, `Orders are allowed up to ${RULES.maxDaysAhead} days ahead`);
  if (["fri", "sat"].includes(weekdayOf(date))) throw new RuleError("The outlet is closed that day.", "Outlet calendar");
}

// ----------------------------------------------------------------- menu

export async function menuFor(db: Db, outletId: string, date: string) {
  const outlet = await getOutlet(db, outletId);
  const wd = weekdayOf(date);
  const products = await db.select().from(t.product).where(eq(t.product.menuKey, outlet.menuKey)).orderBy(asc(t.product.sort));
  const off = await db.select().from(t.unavailability).where(and(eq(t.unavailability.outletId, outletId), eq(t.unavailability.date, date)));
  const offIds = new Set(off.map((o) => o.productId));
  return products
    .filter((p) => !p.weekday || p.weekday === wd)
    .map((p) => ({
      ...p,
      available: p.active && p.price != null && !offIds.has(p.id),
      reason: !p.active || p.price == null ? "Not priced yet" : offIds.has(p.id) ? "Sold out today" : null,
    }));
}

export async function slotsFor(db: Db, outletId: string, date: string, now: DemoNow) {
  const wd = weekdayOf(date);
  const slots = (await db.select().from(t.pickupSlot).where(eq(t.pickupSlot.outletId, outletId)).orderBy(asc(t.pickupSlot.startsAt)))
    .filter((s) => s.weekdays.includes(wd));
  const counts = await db
    .select({ slotId: t.foodOrder.slotId, n: sql<number>`count(*)::int` })
    .from(t.foodOrder)
    .where(and(eq(t.foodOrder.outletId, outletId), eq(t.foodOrder.pickupDate, date), inArray(t.foodOrder.state, ACTIVE_STATES), ne(t.foodOrder.channel, "bulk")))
    .groupBy(t.foodOrder.slotId);
  const used = new Map(counts.map((c) => [c.slotId, c.n]));
  return slots.map((s) => {
    const booked = used.get(s.id) ?? 0;
    const cut = cutoffMs(date, s, now);
    const closed = now.ms >= cut.ms;
    const full = booked >= s.capacity;
    return {
      ...s,
      booked,
      remaining: Math.max(0, s.capacity - booked),
      open: !closed && !full,
      reason: closed ? "Ordering closed" : full ? "Full" : null,
      cutoffMs: cut.ms,
      cutoffRule: cut.rule,
    };
  });
}

/** First pickup day that still has an open slot — the menu opens on it. */
export async function firstOrderableDate(db: Db, outletId: string, now: DemoNow) {
  for (const d of dateOptions(now).filter((x) => x.open)) {
    if ((await slotsFor(db, outletId, d.date, now)).some((s) => s.open)) return d.date;
  }
  return now.date;
}

// ---------------------------------------------------------- place order

export type PlaceInput = {
  outletId: string;
  date: string;
  slotId: string;
  paymentMode: "online" | "counter";
  lines: { productId: string; qty: number }[];
};

export async function placeOrder(db: Db, cust: Customer, input: PlaceInput) {
  const now = await demoNow(db);
  if (!cust.active) throw new RuleError("This account is not active.", "Registered, active accounts only");
  if (input.outletId !== cust.outletId) {
    throw new RuleError("You can only order from your own outlet.", cust.accountType === "employee" ? "Employee outlet comes from the HR list" : "Campus chosen at registration (change it in your profile)");
  }
  if (input.paymentMode === "counter" && cust.accountType !== "employee") {
    throw new RuleError("Parents and students pay online.", "Parent/Student payment is online only");
  }
  const lines = input.lines.filter((l) => l.qty > 0);
  if (lines.length === 0) throw new RuleError("Your cart is empty.", "An order needs at least one item");
  if (lines.some((l) => !Number.isInteger(l.qty) || l.qty > 50)) throw new RuleError("Check the quantities.", "Quantity 1–50 per line");
  checkDate(input.date, now);

  return db.transaction(async (tx) => {
    // Serialise orders per outlet so slot capacity and numbering are exact.
    await tx.execute(sql`select id from outlet where id = ${input.outletId} for update`);
    const outlet = (await tx.select().from(t.outlet).where(eq(t.outlet.id, input.outletId)))[0] as Outlet;

    const slot = (await tx.select().from(t.pickupSlot).where(and(eq(t.pickupSlot.id, input.slotId), eq(t.pickupSlot.outletId, outlet.id))))[0];
    if (!slot || !slot.weekdays.includes(weekdayOf(input.date))) throw new RuleError("Choose a pickup slot for that day.", "Slot must belong to the outlet and day");
    const cut = cutoffMs(input.date, slot, now);
    if (now.ms >= cut.ms) throw new RuleError("Ordering for this slot has closed.", cut.rule);
    const booked = (await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(t.foodOrder)
      .where(and(eq(t.foodOrder.slotId, slot.id), eq(t.foodOrder.pickupDate, input.date), inArray(t.foodOrder.state, ACTIVE_STATES), ne(t.foodOrder.channel, "bulk"))))[0].n;
    if (booked >= slot.capacity) throw new RuleError("That slot is full. Pick another time.", "Slot capacity");

    // Availability is re-checked here, not trusted from the browser.
    const menu = await menuFor(tx as unknown as Db, outlet.id, input.date);
    const byId = new Map(menu.map((m) => [m.id, m]));
    const priced = lines.map((l) => {
      const p = byId.get(l.productId);
      if (!p) throw new RuleError("An item in your cart is not on this outlet's menu that day.", "Menu by outlet and day");
      if (!p.available) throw new RuleError(`${p.name} is not available (${p.reason}).`, "Availability by outlet and day");
      return { p, qty: l.qty };
    });

    const pr = price({
      accountType: cust.accountType as AccountType,
      isParentLounge: outlet.kind === "parent_lounge",
      discountEligible: cust.discountEligible,
      lines: priced.map(({ p, qty }) => ({ unitPrice: p.price!, qty })),
    });

    const seq = outlet.sequence + 1;
    await tx.update(t.outlet).set({ sequence: seq }).where(eq(t.outlet.id, outlet.id));
    const dayCount = (await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(t.foodOrder)
      .where(and(eq(t.foodOrder.outletId, outlet.id), eq(t.foodOrder.pickupDate, input.date))))[0].n;

    const id = randomUUID();
    const state = input.paymentMode === "online" ? "awaiting_payment" : "awaiting_acceptance";
    await tx.insert(t.foodOrder).values({
      id,
      ref: `STS/${outlet.id}/${input.date.slice(2).replaceAll("-", "")}/${String(seq).padStart(4, "0")}`,
      tracking: `S${dayCount + 1}`,
      customerId: cust.id,
      outletId: outlet.id,
      pickupDate: input.date,
      slotId: slot.id,
      paymentMode: input.paymentMode,
      state,
      accountType: cust.accountType,
      subtotal: pr.subtotal,
      discount: pr.discount,
      vat: pr.vat,
      total: pr.total,
      vatRule: pr.vatRule,
      discountRule: pr.discountRule,
      qrToken: randomBytes(12).toString("base64url"),
    });
    await tx.insert(t.orderLine).values(
      priced.map(({ p, qty }, i) => ({ id: randomUUID(), orderId: id, productId: p.id, name: p.name, qty, unitPrice: p.price!, lineTotal: pr.lineTotals[i] })),
    );
    await audit(tx, `customer:${cust.id}`, "place", id, outlet.id, { state, total: pr.total });
    return id;
  });
}

// ------------------------------------------------------------- payments

async function loadOrder(db: Db | Tx, id: string) {
  const o = (await db.select().from(t.foodOrder).where(eq(t.foodOrder.id, id)))[0];
  if (!o) throw new RuleError("Order not found.", "Order must exist");
  return o;
}

async function confirmAndRelease(tx: Tx, order: typeof t.foodOrder.$inferSelect, now: DemoNow) {
  const releaseNow = order.pickupDate <= now.date;
  await tx
    .update(t.foodOrder)
    .set({ state: "confirmed", kitchenState: releaseNow ? "to_cook" : "not_released", releasedAt: releaseNow ? new Date(now.ms) : null })
    .where(eq(t.foodOrder.id, order.id));
}

export async function paySandbox(db: Db, cust: Customer, orderId: string, method: "bkash" | "nagad" | "card", outcome: "success" | "fail") {
  const now = await demoNow(db);
  return db.transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (order.customerId !== cust.id) throw new RuleError("Not your order.", "Customers see only their own orders");
    if (order.state !== "awaiting_payment") throw new RuleError("This order is not waiting for payment.", "Pay once per order");
    const due = order.total - netPaidOf(await paymentsOf(tx, orderId));
    if (due <= 0) throw new RuleError("Nothing is due on this order.", "Pay once per order");
    const reference = `SBX-${method.toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    if (outcome === "fail") {
      await tx.insert(t.payment).values({ id: randomUUID(), orderId, kind: "payment", method, amount: due, status: "failed", reference });
      await audit(tx, `customer:${cust.id}`, "payment_failed", orderId, order.outletId, { method });
      return { ok: false as const };
    }
    await tx.insert(t.payment).values({ id: randomUUID(), orderId, kind: "payment", method, amount: due, status: "paid", reference });
    await confirmAndRelease(tx, order, now);
    const slot = (await tx.select().from(t.pickupSlot).where(eq(t.pickupSlot.id, order.slotId)))[0];
    const outlet = (await tx.select().from(t.outlet).where(eq(t.outlet.id, order.outletId)))[0];
    await notify(tx, cust.phone, `STS: Order ${order.tracking} confirmed — ${slot.label} ${time12(slot.startsAt)}, ${order.pickupDate}, ${outlet.name}. Paid ${money(due)} (${method}).`, orderId);
    await audit(tx, `customer:${cust.id}`, "paid", orderId, order.outletId, { method, reference });
    return { ok: true as const };
  });
}

export async function acceptAtCounter(db: Db, orderId: string, method: "cash" | "card_terminal") {
  const now = await demoNow(db);
  await db.transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (order.state !== "awaiting_acceptance") throw new RuleError("This order is not waiting for acceptance.", "Pay-at-counter orders are accepted once");
    await tx.insert(t.payment).values({ id: randomUUID(), orderId, kind: "payment", method, amount: order.total, status: "paid", reference: `COUNTER-${randomBytes(3).toString("hex").toUpperCase()}` });
    await confirmAndRelease(tx, order, now);
    const cust = (await tx.select().from(t.customer).where(eq(t.customer.id, order.customerId)))[0];
    await notify(tx, cust.phone, `STS: Order ${order.tracking} accepted and sent to the kitchen. Paid ${money(order.total)} at the counter.`, orderId);
    await audit(tx, "counter", "accept", orderId, order.outletId, { method });
  });
}

export async function rejectOrder(db: Db, orderId: string, reason: string, actor: string) {
  const text = reason.trim();
  if (text.length < 3) throw new RuleError("Give the customer a reason.", "Rejection requires a reason");
  await db.transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (!["awaiting_acceptance", "confirmed"].includes(order.state) || ["ready", "completed"].includes(order.kitchenState)) {
      throw new RuleError("This order can no longer be rejected.", "Only open orders can be rejected");
    }
    await tx.update(t.foodOrder).set({ state: "rejected", kitchenState: "not_released", rejectReason: text }).where(eq(t.foodOrder.id, orderId));
    await tx.update(t.substitution).set({ status: "cancelled" }).where(and(eq(t.substitution.orderId, orderId), eq(t.substitution.status, "pending")));
    const refund = await refundAbove(tx, orderId, 0);
    const cust = (await tx.select().from(t.customer).where(eq(t.customer.id, order.customerId)))[0];
    const refundText = refund ? ` ${money(refund.amount)} refunded to your ${refund.method} (sandbox; real refunds within 7 working days).` : "";
    await notify(tx, cust.phone, `STS: Sorry, order ${order.tracking} could not be accepted: ${text}.${refundText}`, orderId);
    await audit(tx, actor, "reject", orderId, order.outletId, { reason: text, refunded: refund?.amount ?? 0 });
  });
}

export async function cancelByCustomer(db: Db, cust: Customer, orderId: string) {
  const now = await demoNow(db);
  await db.transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (order.customerId !== cust.id) throw new RuleError("Not your order.", "Customers see only their own orders");
    if (!["awaiting_payment", "awaiting_acceptance", "confirmed"].includes(order.state)) throw new RuleError("This order can't be cancelled.", "Only open orders can be cancelled");
    if (!["not_released", "to_cook"].includes(order.kitchenState)) throw new RuleError("The kitchen has started this order.", "Orders lock once preparation starts");
    const slot = (await tx.select().from(t.pickupSlot).where(eq(t.pickupSlot.id, order.slotId)))[0];
    const cut = cutoffMs(order.pickupDate, slot, now);
    if (now.ms >= cut.ms) throw new RuleError("The cut-off for this order has passed.", cut.rule);
    await tx.update(t.foodOrder).set({ state: "cancelled", kitchenState: "not_released" }).where(eq(t.foodOrder.id, orderId));
    await tx.update(t.substitution).set({ status: "cancelled" }).where(and(eq(t.substitution.orderId, orderId), eq(t.substitution.status, "pending")));
    const refund = await refundAbove(tx, orderId, 0);
    await notify(tx, cust.phone, `STS: Order ${order.tracking} cancelled.${refund ? ` ${money(refund.amount)} refunded to your ${refund.method} (sandbox).` : ""}`, orderId);
    await audit(tx, `customer:${cust.id}`, "cancel", orderId, order.outletId);
  });
}

// --------------------------------------------------------------- kitchen

/** Future orders join the kitchen queue on their pickup day. */
export async function releaseDue(db: Db, outletId: string, now: DemoNow) {
  const due = await db
    .select({ id: t.foodOrder.id })
    .from(t.foodOrder)
    .where(and(eq(t.foodOrder.outletId, outletId), eq(t.foodOrder.state, "confirmed"), eq(t.foodOrder.kitchenState, "not_released"), lte(t.foodOrder.pickupDate, now.date)));
  for (const d of due) {
    await db.update(t.foodOrder).set({ kitchenState: "to_cook", releasedAt: new Date(now.ms) }).where(eq(t.foodOrder.id, d.id));
    await audit(db, "system", "release", d.id, outletId, { at: now.ms });
  }
}

const NEXT_STAGE: Record<string, string> = { to_cook: "preparing", preparing: "ready" };

export async function bump(db: Db, orderId: string) {
  const now = await demoNow(db);
  await db.transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    const next = NEXT_STAGE[order.kitchenState];
    if (order.state !== "confirmed" || !next) throw new RuleError("This ticket can't move forward here.", "To cook → Preparing → Ready; collection completes it");
    await tx.update(t.foodOrder).set({ kitchenState: next, readyAt: next === "ready" ? new Date(now.ms) : order.readyAt }).where(eq(t.foodOrder.id, orderId));
    if (next === "ready") {
      const cust = (await tx.select().from(t.customer).where(eq(t.customer.id, order.customerId)))[0];
      const outlet = (await tx.select().from(t.outlet).where(eq(t.outlet.id, order.outletId)))[0];
      await notify(tx, cust.phone, `STS: Order ${order.tracking} is ready at ${outlet.name}. Show your QR code at the counter.`, orderId);
    }
    await audit(tx, "kitchen", "bump", orderId, order.outletId, { from: order.kitchenState, to: next });
  });
}

export async function recall(db: Db, outletId: string) {
  const last = (await db
    .select()
    .from(t.auditLog)
    .where(and(eq(t.auditLog.outletId, outletId), eq(t.auditLog.action, "bump")))
    .orderBy(desc(t.auditLog.createdAt))
    .limit(1))[0];
  if (!last?.orderId) throw new RuleError("Nothing to recall.", "Recall undoes the last kitchen move");
  const detail = last.detail as { from: string; to: string };
  const order = await loadOrder(db, last.orderId);
  if (order.kitchenState !== detail.to || order.state !== "confirmed") throw new RuleError("That ticket has moved on since.", "Recall undoes the last kitchen move");
  await db.update(t.foodOrder).set({ kitchenState: detail.from, readyAt: detail.from === "ready" ? order.readyAt : null }).where(eq(t.foodOrder.id, order.id));
  await db.update(t.auditLog).set({ action: "bump_recalled" }).where(eq(t.auditLog.id, last.id));
  await audit(db, "kitchen", "recall", order.id, outletId, detail);
}

// ------------------------------------------------------------ collection

export async function findForCollection(db: Db, outletId: string, code: string) {
  const now = await demoNow(db);
  const value = code.trim();
  if (!value) throw new RuleError("Scan a QR code or type an order number.", "Collection needs a QR code or order number");
  const byToken = await db.select().from(t.foodOrder).where(and(eq(t.foodOrder.qrToken, value), eq(t.foodOrder.outletId, outletId)));
  let order = byToken[0];
  let via: "qr" | "lookup" = "qr";
  if (!order) {
    const tracking = value.toUpperCase().startsWith("S") ? value.toUpperCase() : `S${value}`;
    order = (await db.select().from(t.foodOrder).where(and(eq(t.foodOrder.tracking, tracking), eq(t.foodOrder.outletId, outletId), eq(t.foodOrder.pickupDate, now.date))))[0];
    via = "lookup";
  }
  if (!order) throw new RuleError("No order found for that code at this outlet today.", "QR or today's order number at this outlet");
  const cust = (await db.select().from(t.customer).where(eq(t.customer.id, order.customerId)))[0];
  const lines = await db.select().from(t.orderLine).where(eq(t.orderLine.orderId, order.id));
  return { order, customer: cust, lines, via };
}

export async function collect(db: Db, orderId: string, via: "qr" | "lookup", nameConfirmed: boolean) {
  if (!nameConfirmed) throw new RuleError("Confirm the customer's name first.", "Collection needs QR or order number plus the customer's name");
  const now = await demoNow(db);
  await db.transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (order.state === "collected") throw new RuleError(`Already collected at ${new Date(order.collectedAt!).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" })}.`, "An order is collected once");
    if (order.channel === "bulk") throw new RuleError("Bulk orders are delivered to the room, not collected.", "Coordinator bulk orders are delivered");
    if (order.kitchenState !== "ready") throw new RuleError("This order is not ready yet.", "Only Ready orders can be handed over");
    await tx.update(t.foodOrder).set({ state: "collected", kitchenState: "completed", collectedAt: new Date(now.ms), collectedBy: via }).where(eq(t.foodOrder.id, orderId));
    await audit(tx, "counter", "collect", orderId, order.outletId, { via });
  });
}

// ------------------------------------------------------------ read models

async function withLines<T extends { id: string }>(db: Db, orders: T[]) {
  if (orders.length === 0) return [] as (T & { lines: (typeof t.orderLine.$inferSelect)[] })[];
  const lines = await db.select().from(t.orderLine).where(inArray(t.orderLine.orderId, orders.map((o) => o.id)));
  return orders.map((o) => ({ ...o, lines: lines.filter((l) => l.orderId === o.id) }));
}

export async function kitchenBoard(db: Db, outletId: string) {
  const now = await demoNow(db);
  await releaseDue(db, outletId, now);
  await expireSubstitutions(db, now);
  const rows = await db
    .select({ order: t.foodOrder, customer: t.customer, slot: t.pickupSlot })
    .from(t.foodOrder)
    .innerJoin(t.customer, eq(t.customer.id, t.foodOrder.customerId))
    .innerJoin(t.pickupSlot, eq(t.pickupSlot.id, t.foodOrder.slotId))
    .where(and(eq(t.foodOrder.outletId, outletId), notInArray(t.foodOrder.kitchenState, ["not_released"]), eq(t.foodOrder.pickupDate, now.date)))
    .orderBy(asc(t.pickupSlot.startsAt), asc(t.foodOrder.releasedAt));
  const tickets = await withLines(db, rows.map((r) => ({ id: r.order.id, ...r })));
  return {
    now,
    tickets: tickets.map((tk) => {
      const minutes = tk.order.releasedAt ? Math.max(0, Math.floor((now.ms - new Date(tk.order.releasedAt).getTime()) / 60_000)) : 0;
      const slotStart = at(tk.order.pickupDate, tk.slot.startsAt);
      const late = ["to_cook", "preparing"].includes(tk.order.kitchenState) && (minutes >= RULES.lateAfterMinutes || now.ms > slotStart);
      return { ...tk, minutes, late };
    }),
  };
}

export async function counterBoard(db: Db, outletId: string) {
  const now = await demoNow(db);
  await releaseDue(db, outletId, now);
  await expireSubstitutions(db, now);
  const rows = await db
    .select({ order: t.foodOrder, customer: t.customer, slot: t.pickupSlot })
    .from(t.foodOrder)
    .innerJoin(t.customer, eq(t.customer.id, t.foodOrder.customerId))
    .innerJoin(t.pickupSlot, eq(t.pickupSlot.id, t.foodOrder.slotId))
    .where(and(eq(t.foodOrder.outletId, outletId), inArray(t.foodOrder.state, ["awaiting_acceptance", "confirmed", "collected"])))
    .orderBy(asc(t.foodOrder.pickupDate), asc(t.pickupSlot.startsAt), asc(t.foodOrder.createdAt));
  const all = await withLines(db, rows.map((r) => ({ id: r.order.id, ...r })));
  return {
    now,
    awaiting: all.filter((r) => r.order.state === "awaiting_acceptance"),
    ready: all.filter((r) => r.order.state === "confirmed" && r.order.kitchenState === "ready"),
    collected: all.filter((r) => r.order.state === "collected" && r.order.pickupDate === now.date).slice(-10).reverse(),
  };
}

export async function statusBoard(db: Db, outletId: string) {
  const now = await demoNow(db);
  await releaseDue(db, outletId, now);
  const rows = await db
    .select({ tracking: t.foodOrder.tracking, kitchenState: t.foodOrder.kitchenState, readyAt: t.foodOrder.readyAt })
    .from(t.foodOrder)
    .where(and(eq(t.foodOrder.outletId, outletId), eq(t.foodOrder.pickupDate, now.date), eq(t.foodOrder.state, "confirmed"), inArray(t.foodOrder.kitchenState, ["to_cook", "preparing", "ready"])))
    .orderBy(asc(t.foodOrder.releasedAt));
  return {
    now,
    preparing: rows.filter((r) => r.kitchenState !== "ready").map((r) => r.tracking),
    ready: rows.filter((r) => r.kitchenState === "ready").map((r) => r.tracking),
  };
}

export async function orderDetail(db: Db, orderId: string) {
  await expireSubstitutions(db, await demoNow(db));
  const rows = await db
    .select({ order: t.foodOrder, customer: t.customer, slot: t.pickupSlot, outlet: t.outlet })
    .from(t.foodOrder)
    .innerJoin(t.customer, eq(t.customer.id, t.foodOrder.customerId))
    .innerJoin(t.pickupSlot, eq(t.pickupSlot.id, t.foodOrder.slotId))
    .innerJoin(t.outlet, eq(t.outlet.id, t.foodOrder.outletId))
    .where(eq(t.foodOrder.id, orderId));
  if (!rows[0]) return null;
  const lines = await db.select().from(t.orderLine).where(eq(t.orderLine.orderId, orderId));
  const payments = await db.select().from(t.payment).where(eq(t.payment.orderId, orderId)).orderBy(asc(t.payment.createdAt));
  const subs = await db.select().from(t.substitution).where(eq(t.substitution.orderId, orderId)).orderBy(asc(t.substitution.createdAt));
  const offeredIds = [...new Set(subs.flatMap((s) => s.offered))];
  const offeredProducts = offeredIds.length ? await db.select().from(t.product).where(inArray(t.product.id, offeredIds)) : [];
  const substitutions = subs.map((s) => ({
    ...s,
    lineName: lines.find((l) => l.id === s.lineId)?.name ?? "",
    options: s.offered.flatMap((id) => {
      const p = offeredProducts.find((x) => x.id === id);
      return p && p.price != null ? [{ id: p.id, name: p.name, price: p.price }] : [];
    }),
  }));
  return { ...rows[0], lines, payments, substitutions, netPaid: netPaidOf(payments) };
}

export async function customerOrders(db: Db, customerId: string) {
  await expireSubstitutions(db, await demoNow(db));
  const rows = await db
    .select({ order: t.foodOrder, slot: t.pickupSlot, outlet: t.outlet })
    .from(t.foodOrder)
    .innerJoin(t.pickupSlot, eq(t.pickupSlot.id, t.foodOrder.slotId))
    .innerJoin(t.outlet, eq(t.outlet.id, t.foodOrder.outletId))
    .where(eq(t.foodOrder.customerId, customerId))
    .orderBy(desc(t.foodOrder.createdAt));
  const ids = rows.map((r) => r.order.id);
  const pending = ids.length
    ? await db.select({ orderId: t.substitution.orderId }).from(t.substitution).where(and(inArray(t.substitution.orderId, ids), eq(t.substitution.status, "pending")))
    : [];
  const orders = await withLines(db, rows.map((r) => ({ id: r.order.id, ...r })));
  return orders.map((o) => ({ ...o, actionNeeded: pending.some((p) => p.orderId === o.id) }));
}

// ---------------------------------------------------- money held on an order

async function paymentsOf(db: Db | Tx, orderId: string) {
  return db.select().from(t.payment).where(eq(t.payment.orderId, orderId)).orderBy(asc(t.payment.createdAt));
}

/** Money actually held for an order: paid payments minus refunds. */
export function netPaidOf(payments: Payment[]) {
  const paid = payments.filter((p) => p.kind === "payment" && p.status === "paid").reduce((a, p) => a + p.amount, 0);
  const refunded = payments.filter((p) => p.kind === "refund").reduce((a, p) => a + p.amount, 0);
  return paid - refunded;
}

/** Refund whatever is held above `keep`, to the original method (sandbox). */
async function refundAbove(tx: Tx, orderId: string, keep: number) {
  const pays = await paymentsOf(tx, orderId);
  const extra = netPaidOf(pays) - keep;
  if (extra <= 0) return null;
  const first = pays.find((p) => p.kind === "payment" && p.status === "paid")!;
  await tx.insert(t.payment).values({ id: randomUUID(), orderId, kind: "refund", method: first.method, amount: extra, status: "refunded", reference: `SBX-REFUND-${randomBytes(4).toString("hex").toUpperCase()}` });
  return { amount: extra, method: first.method };
}

const LIVE_LINES = ["ok", "substituted", "waiting"];

/** Re-price an order from its live lines (after an edit or a substitution). */
async function reprice(tx: Tx, order: FoodOrder) {
  const cust = (await tx.select().from(t.customer).where(eq(t.customer.id, order.customerId)))[0];
  const outlet = (await tx.select().from(t.outlet).where(eq(t.outlet.id, order.outletId)))[0];
  const lines = await tx.select().from(t.orderLine).where(eq(t.orderLine.orderId, order.id));
  const live = lines.filter((l) => LIVE_LINES.includes(l.state));
  const pr = price({
    accountType: order.accountType as AccountType,
    isParentLounge: outlet.kind === "parent_lounge",
    discountEligible: cust.discountEligible,
    lines: live.map((l) => ({ unitPrice: l.unitPrice, qty: l.qty })),
  });
  for (const [i, l] of live.entries()) await tx.update(t.orderLine).set({ lineTotal: pr.lineTotals[i] }).where(eq(t.orderLine.id, l.id));
  for (const l of lines) if (!LIVE_LINES.includes(l.state) && l.lineTotal !== 0) await tx.update(t.orderLine).set({ lineTotal: 0 }).where(eq(t.orderLine.id, l.id));
  await tx
    .update(t.foodOrder)
    .set({ subtotal: pr.subtotal, discount: pr.discount, vat: pr.vat, total: pr.total, vatRule: pr.vatRule, discountRule: pr.discountRule })
    .where(eq(t.foodOrder.id, order.id));
  return { total: pr.total, liveCount: live.length };
}

// ------------------------------------------------------------- edit order

export type EditInput = { slotId: string; lines: { productId: string; qty: number }[] };

/** Why an order can't be edited right now, or null when it can (C8 §10). */
export function editBlock(order: FoodOrder, slot: Pick<Slot, "startsAt">, now: DemoNow, hasSubstitution: boolean): { msg: string; rule: string } | null {
  if (order.channel === "bulk") return { msg: "Bulk orders are changed through the F&B team.", rule: "Coordinator bulk orders can be cancelled until cut-off" };
  if (!["awaiting_payment", "awaiting_acceptance", "confirmed"].includes(order.state)) return { msg: "This order can't be changed.", rule: "Only open orders can be edited" };
  if (!["not_released", "to_cook"].includes(order.kitchenState)) return { msg: "The kitchen has started this order.", rule: "Orders lock once preparation starts" };
  if (order.paymentMode === "counter" && order.state === "confirmed") return { msg: "This order was paid at the counter — ask the counter to change it.", rule: "Pay-at-counter orders can be edited until staff accept them" };
  if (hasSubstitution) return { msg: "An item in this order was sold out and replaced or refunded.", rule: "Orders with a substitution can no longer be edited" };
  const cut = cutoffMs(order.pickupDate, slot, now);
  if (now.ms >= cut.ms) return { msg: "The cut-off for this order has passed.", rule: cut.rule };
  return null;
}

export async function editOrder(db: Db, cust: Customer, orderId: string, input: EditInput) {
  const now = await demoNow(db);
  const lines = input.lines.filter((l) => l.qty > 0);
  if (lines.length === 0) throw new RuleError("An order needs at least one item — cancel it instead.", "An order needs at least one item");
  if (lines.some((l) => !Number.isInteger(l.qty) || l.qty > 50)) throw new RuleError("Check the quantities.", "Quantity 1–50 per line");

  return db.transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (order.customerId !== cust.id) throw new RuleError("Not your order.", "Customers see only their own orders");
    // same lock as placing an order, so slot capacity stays exact
    await tx.execute(sql`select id from outlet where id = ${order.outletId} for update`);
    const oldSlot = (await tx.select().from(t.pickupSlot).where(eq(t.pickupSlot.id, order.slotId)))[0];
    const subs = await tx.select({ id: t.substitution.id }).from(t.substitution).where(eq(t.substitution.orderId, orderId));
    const block = editBlock(order, oldSlot, now, subs.length > 0);
    if (block) throw new RuleError(block.msg, block.rule);

    let slot = oldSlot;
    if (input.slotId !== order.slotId) {
      const next = (await tx.select().from(t.pickupSlot).where(and(eq(t.pickupSlot.id, input.slotId), eq(t.pickupSlot.outletId, order.outletId))))[0];
      if (!next || !next.weekdays.includes(weekdayOf(order.pickupDate))) throw new RuleError("Choose a pickup slot for that day.", "Slot must belong to the outlet and day");
      const cut = cutoffMs(order.pickupDate, next, now);
      if (now.ms >= cut.ms) throw new RuleError("Ordering for that slot has closed.", cut.rule);
      const booked = (await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(t.foodOrder)
        .where(and(eq(t.foodOrder.slotId, next.id), eq(t.foodOrder.pickupDate, order.pickupDate), inArray(t.foodOrder.state, ACTIVE_STATES), ne(t.foodOrder.channel, "bulk"))))[0].n;
      if (booked >= next.capacity) throw new RuleError("That slot is full. Pick another time.", "Slot capacity");
      slot = next;
    }

    const menu = await menuFor(tx as unknown as Db, order.outletId, order.pickupDate);
    const byId = new Map(menu.map((m) => [m.id, m]));
    const priced = lines.map((l) => {
      const p = byId.get(l.productId);
      if (!p) throw new RuleError("An item is not on this outlet's menu that day.", "Menu by outlet and day");
      if (!p.available) throw new RuleError(`${p.name} is not available (${p.reason}).`, "Availability by outlet and day");
      return { p, qty: l.qty };
    });

    await tx.delete(t.orderLine).where(eq(t.orderLine.orderId, orderId));
    await tx.insert(t.orderLine).values(priced.map(({ p, qty }) => ({ id: randomUUID(), orderId, productId: p.id, name: p.name, qty, unitPrice: p.price!, lineTotal: 0 })));
    await tx.update(t.foodOrder).set({ slotId: slot.id }).where(eq(t.foodOrder.id, orderId));
    const { total } = await reprice(tx, order);

    const held = netPaidOf(await paymentsOf(tx, orderId));
    let topUp = 0;
    let refund: { amount: number; method: string } | null = null;
    if (order.paymentMode === "online" && order.state === "confirmed") {
      if (total > held) {
        // the difference must be paid before the changed order reaches the kitchen
        topUp = total - held;
        await tx.update(t.foodOrder).set({ state: "awaiting_payment", kitchenState: "not_released", releasedAt: null }).where(eq(t.foodOrder.id, orderId));
      } else if (total < held) {
        refund = await refundAbove(tx, orderId, total);
      }
    }
    const extra = topUp ? ` Pay the ${money(topUp)} difference to confirm the change.` : refund ? ` ${money(refund.amount)} refunded to your ${refund.method} (sandbox).` : "";
    await notify(tx, cust.phone, `STS: Order ${order.tracking} updated — ${slot.label} ${time12(slot.startsAt)}, new total ${money(total)}.${extra}`, orderId);
    await audit(tx, `customer:${cust.id}`, "edit", orderId, order.outletId, { from: order.total, to: total, topUp, refunded: refund?.amount ?? 0 });
    return { next: topUp ? `/pay/${orderId}` : `/orders/${orderId}?edited=1`, total, topUp, refunded: refund?.amount ?? 0 };
  });
}

// ------------------------------------------------ substitute or refund (C8 §6)

async function substitutionTimeout(db: Db | Tx) {
  return (await db.select().from(t.demoState).where(eq(t.demoState.id, 1)))[0]?.substitutionTimeoutSeconds ?? 900;
}

const minutesLabel = (seconds: number) => (seconds >= 120 ? `${Math.round(seconds / 60)} minutes` : `${seconds} seconds`);

/**
 * An item was switched off after customers ordered it: offer each affected
 * order (today, kitchen not started) up to three substitutes at the same or
 * lower price, same section first. No answer before the deadline refunds it.
 */
export async function offerSubstitutions(db: Db, outletId: string, productId: string) {
  const now = await demoNow(db);
  const affected = await db
    .select({ line: t.orderLine, order: t.foodOrder })
    .from(t.orderLine)
    .innerJoin(t.foodOrder, eq(t.foodOrder.id, t.orderLine.orderId))
    .where(and(
      eq(t.foodOrder.outletId, outletId),
      eq(t.foodOrder.pickupDate, now.date),
      eq(t.orderLine.productId, productId),
      eq(t.orderLine.state, "ok"),
      inArray(t.foodOrder.state, ["awaiting_acceptance", "confirmed"]),
      inArray(t.foodOrder.kitchenState, ["not_released", "to_cook"]),
    ));
  if (affected.length === 0) return 0;
  const menu = await menuFor(db, outletId, now.date);
  const gone = menu.find((m) => m.id === productId);
  const seconds = await substitutionTimeout(db);
  for (const { line, order } of affected) {
    const pool = menu
      .filter((m) => m.available && m.id !== productId && m.price != null && m.price <= line.unitPrice)
      .sort((a, b) => Number(b.category === gone?.category) - Number(a.category === gone?.category) || b.price! - a.price!);
    const offered = pool.slice(0, 3).map((m) => m.id);
    await db.transaction(async (tx) => {
      await tx.update(t.orderLine).set({ state: "waiting" }).where(eq(t.orderLine.id, line.id));
      await tx.insert(t.substitution).values({ id: randomUUID(), orderId: order.id, lineId: line.id, productId, offered, deadline: new Date(now.ms + seconds * 1000) });
      const cust = (await tx.select().from(t.customer).where(eq(t.customer.id, order.customerId)))[0];
      await notify(tx, cust.phone, `STS: Sorry — ${line.name} in order ${order.tracking} has just sold out. Open the app within ${minutesLabel(seconds)} to pick a substitute or a refund; no answer means an automatic refund.`, order.id);
      await audit(tx, "system", "substitution_offered", order.id, outletId, { line: line.id, offered });
    });
  }
  return affected.length;
}

/** Take a pending substitution for resolving; null if someone got there first. */
async function claim(tx: Tx, subId: string, status: "substituted" | "refunded" | "expired", now: DemoNow, chosen?: string) {
  const rows = await tx
    .update(t.substitution)
    .set({ status, resolvedAt: new Date(now.ms), chosenProductId: chosen ?? null })
    .where(and(eq(t.substitution.id, subId), eq(t.substitution.status, "pending")))
    .returning();
  return rows[0] ?? null;
}

async function refundLine(tx: Tx, sub: typeof t.substitution.$inferSelect, order: FoodOrder, expired: boolean, actor: string) {
  const line = (await tx.select().from(t.orderLine).where(eq(t.orderLine.id, sub.lineId)))[0];
  await tx.update(t.orderLine).set({ state: "refunded" }).where(eq(t.orderLine.id, sub.lineId));
  const { total, liveCount } = await reprice(tx, order);
  const refund = await refundAbove(tx, order.id, total);
  if (liveCount === 0) await tx.update(t.foodOrder).set({ state: "cancelled", kitchenState: "not_released" }).where(eq(t.foodOrder.id, order.id));
  const cust = (await tx.select().from(t.customer).where(eq(t.customer.id, order.customerId)))[0];
  const money_ = refund ? ` ${money(refund.amount)} refunded to your ${refund.method} (sandbox).` : "";
  const text = expired
    ? `STS: No answer in time — ${line.name} was removed from order ${order.tracking}.${money_}`
    : `STS: ${line.name} removed from order ${order.tracking}.${money_}`;
  await notify(tx, cust.phone, `${text}${liveCount === 0 ? " Nothing is left on the order, so it is cancelled." : ""}`, order.id);
  await audit(tx, actor, expired ? "substitution_expired" : "substitution_refunded", order.id, order.outletId, { line: line.id, refunded: refund?.amount ?? 0 });
}

export async function resolveSubstitution(db: Db, cust: Customer, subId: string, choice: string) {
  const now = await demoNow(db);
  await expireSubstitutions(db, now);
  const seconds = await substitutionTimeout(db);
  await db.transaction(async (tx) => {
    const sub = (await tx.select().from(t.substitution).where(eq(t.substitution.id, subId)))[0];
    if (!sub) throw new RuleError("That choice is no longer open.", "Substitute or refund");
    const order = await loadOrder(tx, sub.orderId);
    if (order.customerId !== cust.id) throw new RuleError("Not your order.", "Customers see only their own orders");
    const rule = `No answer within ${minutesLabel(seconds)} means an automatic refund`;
    if (sub.status === "expired") throw new RuleError("Time ran out — that item was refunded automatically.", rule);
    if (sub.status !== "pending") throw new RuleError("You have already answered this one.", rule);

    if (choice === "refund") {
      if (!(await claim(tx, sub.id, "refunded", now))) throw new RuleError("You have already answered this one.", rule);
      await refundLine(tx, sub, order, false, `customer:${cust.id}`);
      return;
    }
    if (!sub.offered.includes(choice)) throw new RuleError("Pick one of the offered items.", "Substitutes are offered by the outlet");
    const p = (await menuFor(tx as unknown as Db, order.outletId, order.pickupDate)).find((m) => m.id === choice);
    if (!p?.available) throw new RuleError(`${p?.name ?? "That item"} has just sold out too — choose another or a refund.`, "Availability by outlet and day");
    if (!(await claim(tx, sub.id, "substituted", now, p.id))) throw new RuleError("You have already answered this one.", rule);
    const old = (await tx.select().from(t.orderLine).where(eq(t.orderLine.id, sub.lineId)))[0];
    await tx.update(t.orderLine).set({ productId: p.id, name: p.name, unitPrice: p.price!, state: "substituted" }).where(eq(t.orderLine.id, sub.lineId));
    const { total } = await reprice(tx, order);
    const refund = await refundAbove(tx, order.id, total);
    await notify(tx, cust.phone, `STS: ${old.name} swapped for ${p.name} in order ${order.tracking}.${refund ? ` ${money(refund.amount)} difference refunded (sandbox).` : ""}`, order.id);
    await audit(tx, `customer:${cust.id}`, "substituted", order.id, order.outletId, { line: old.id, from: old.productId, to: p.id, refunded: refund?.amount ?? 0 });
  });
}

/** Refund every substitution whose deadline has passed (runs on each read). */
export async function expireSubstitutions(db: Db, now: DemoNow) {
  const due = await db.select().from(t.substitution).where(and(eq(t.substitution.status, "pending"), lte(t.substitution.deadline, new Date(now.ms))));
  for (const sub of due) {
    await db.transaction(async (tx) => {
      const claimed = await claim(tx, sub.id, "expired", now);
      if (!claimed) return;
      await refundLine(tx, claimed, await loadOrder(tx, sub.orderId), true, "system");
    });
  }
}

// ------------------------------------------------ coordinator bulk orders (C8 §7)

export const BULK_NOTICE_HOURS = 24;
export const BULK_MAX_QTY = 200;

export type BulkInput = { eventName: string; date: string; slotId: string; deliverTo: string; notes?: string; lines: { productId: string; qty: number }[] };

export async function placeBulkOrder(db: Db, cust: Customer, input: BulkInput) {
  const now = await demoNow(db);
  if (!cust.active) throw new RuleError("This account is not active.", "Registered, active accounts only");
  if (cust.accountType !== "employee" || !cust.coordinator) throw new RuleError("Bulk orders are for authorised coordinators.", "Only coordinators on the HR list place bulk orders");
  const eventName = input.eventName.trim();
  const deliverTo = input.deliverTo.trim();
  if (eventName.length < 3) throw new RuleError("Name the meeting or event.", "Bulk orders name the event");
  if (deliverTo.length < 3) throw new RuleError("Say where to deliver (room and floor).", "Bulk orders are delivered to a room or floor");
  const lines = input.lines.filter((l) => l.qty > 0);
  if (lines.length === 0) throw new RuleError("Add at least one item.", "An order needs at least one item");
  if (lines.some((l) => !Number.isInteger(l.qty) || l.qty > BULK_MAX_QTY)) throw new RuleError(`Quantities are 1–${BULK_MAX_QTY} per item.`, `Bulk quantity 1–${BULK_MAX_QTY} per line`);
  checkDate(input.date, now);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from outlet where id = ${cust.outletId} for update`);
    const outlet = (await tx.select().from(t.outlet).where(eq(t.outlet.id, cust.outletId)))[0] as Outlet;
    const slot = (await tx.select().from(t.pickupSlot).where(and(eq(t.pickupSlot.id, input.slotId), eq(t.pickupSlot.outletId, outlet.id))))[0];
    if (!slot || !slot.weekdays.includes(weekdayOf(input.date))) throw new RuleError("Choose a delivery time for that day.", "Slot must belong to the outlet and day");
    const hours = (at(input.date, slot.startsAt) - now.ms) / 3_600_000;
    if (hours < BULK_NOTICE_HOURS) throw new RuleError(`Bulk orders need at least ${BULK_NOTICE_HOURS} hours' notice.`, "Bulk event orders need 24–48 hours' notice (C8 §7)");

    const menu = await menuFor(tx as unknown as Db, outlet.id, input.date);
    const byId = new Map(menu.map((m) => [m.id, m]));
    const priced = lines.map((l) => {
      const p = byId.get(l.productId);
      if (!p) throw new RuleError("An item is not on this outlet's menu that day.", "Menu by outlet and day");
      if (!p.available) throw new RuleError(`${p.name} is not available (${p.reason}).`, "Availability by outlet and day");
      return { p, qty: l.qty };
    });
    const pr = price({
      accountType: cust.accountType as AccountType,
      isParentLounge: outlet.kind === "parent_lounge",
      discountEligible: cust.discountEligible,
      lines: priced.map(({ p, qty }) => ({ unitPrice: p.price!, qty })),
    });

    const seq = outlet.sequence + 1;
    await tx.update(t.outlet).set({ sequence: seq }).where(eq(t.outlet.id, outlet.id));
    const bulkCount = (await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(t.foodOrder)
      .where(and(eq(t.foodOrder.outletId, outlet.id), eq(t.foodOrder.pickupDate, input.date), eq(t.foodOrder.channel, "bulk"))))[0].n;
    const id = randomUUID();
    const tracking = `B${bulkCount + 1}`;
    await tx.insert(t.foodOrder).values({
      id,
      ref: `STS/${outlet.id}/${input.date.slice(2).replaceAll("-", "")}/${String(seq).padStart(4, "0")}`,
      tracking,
      customerId: cust.id,
      outletId: outlet.id,
      channel: "bulk",
      pickupDate: input.date,
      slotId: slot.id,
      paymentMode: "invoice",
      state: "confirmed",
      kitchenState: "not_released",
      accountType: cust.accountType,
      subtotal: pr.subtotal,
      discount: pr.discount,
      vat: pr.vat,
      total: pr.total,
      vatRule: pr.vatRule,
      discountRule: pr.discountRule,
      qrToken: randomBytes(12).toString("base64url"),
      eventName,
      deliverTo,
      costCentre: cust.costCentre,
      notes: input.notes?.trim() || null,
    });
    await tx.insert(t.orderLine).values(
      priced.map(({ p, qty }, i) => ({ id: randomUUID(), orderId: id, productId: p.id, name: p.name, qty, unitPrice: p.price!, lineTotal: pr.lineTotals[i] })),
    );
    await notify(tx, cust.phone, `STS: Bulk order ${tracking} for "${eventName}" confirmed — ${input.date} ${time12(slot.startsAt)}, deliver to ${deliverTo}. ${money(pr.total)} goes on cost centre ${cust.costCentre}'s monthly invoice.`, id);
    await audit(tx, `customer:${cust.id}`, "place_bulk", id, outlet.id, { total: pr.total, costCentre: cust.costCentre });
    return id;
  });
}

export async function markDelivered(db: Db, orderId: string) {
  const now = await demoNow(db);
  await db.transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (order.channel !== "bulk") throw new RuleError("Only bulk orders are delivered.", "Individual orders are collected at the counter");
    if (order.state === "collected") throw new RuleError("Already delivered.", "An order is delivered once");
    if (order.kitchenState !== "ready") throw new RuleError("This order is not ready yet.", "Bulk orders go out once the kitchen marks them Ready");
    await tx.update(t.foodOrder).set({ state: "collected", kitchenState: "completed", deliveredAt: new Date(now.ms), collectedAt: new Date(now.ms), collectedBy: "delivery" }).where(eq(t.foodOrder.id, orderId));
    const cust = (await tx.select().from(t.customer).where(eq(t.customer.id, order.customerId)))[0];
    await notify(tx, cust.phone, `STS: Bulk order ${order.tracking} delivered to ${order.deliverTo}.`, orderId);
    await audit(tx, "counter", "deliver", orderId, order.outletId);
  });
}

/** Monthly cost-centre invoice view: bulk orders by month and cost centre. */
export async function costCentreInvoices(db: Db) {
  const rows = await db
    .select({ order: t.foodOrder, customer: t.customer })
    .from(t.foodOrder)
    .innerJoin(t.customer, eq(t.customer.id, t.foodOrder.customerId))
    .where(and(eq(t.foodOrder.channel, "bulk"), inArray(t.foodOrder.state, ["confirmed", "collected"])))
    .orderBy(asc(t.foodOrder.pickupDate));
  const groups = new Map<string, { month: string; costCentre: string; orders: { tracking: string; date: string; event: string | null; by: string; total: number; delivered: boolean }[]; total: number }>();
  for (const { order, customer } of rows) {
    const month = order.pickupDate.slice(0, 7);
    const cc = order.costCentre ?? "—";
    const key = `${month}|${cc}`;
    const g = groups.get(key) ?? { month, costCentre: cc, orders: [], total: 0 };
    g.orders.push({ tracking: order.tracking, date: order.pickupDate, event: order.eventName, by: customer.name, total: order.total, delivered: order.state === "collected" });
    g.total += order.total;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.month.localeCompare(a.month) || a.costCentre.localeCompare(b.costCentre));
}

// ---------------------------------------------------- monthly HR list (C8 §8)

const HR_COLUMNS = ["employee_id", "name", "phone", "outlet_id", "cost_centre", "discount_eligible", "coordinator"] as const;

function parseCsv(text: string) {
  const rows = text.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const head = rows.shift()?.split(",").map((h) => h.trim().toLowerCase()) ?? [];
  const missing = HR_COLUMNS.filter((c) => !head.includes(c));
  if (missing.length) throw new RuleError(`The file is missing columns: ${missing.join(", ")}.`, `HR list columns: ${HR_COLUMNS.join(", ")}`);
  return rows.map((line, i) => {
    const cells = line.split(",").map((c) => c.trim());
    const get = (c: (typeof HR_COLUMNS)[number]) => cells[head.indexOf(c)] ?? "";
    return { row: i + 2, get };
  });
}

const yes = (v: string) => ["yes", "y", "true", "1"].includes(v.toLowerCase());

/**
 * Import the monthly HR staff list: adds joiners, refreshes outlet, cost
 * centre, discount eligibility and coordinator rights, and deactivates
 * leavers (their accounts can no longer sign in or order).
 */
export async function importHrList(db: Db, csv: string, source: string) {
  if (csv.length > 200_000) throw new RuleError("That file is too large.", "HR list up to 200 KB");
  const outlets = new Set((await db.select({ id: t.outlet.id }).from(t.outlet)).map((o) => o.id));
  const parsed = parseCsv(csv).map(({ row, get }) => {
    const employeeId = get("employee_id");
    const phone = get("phone").replace(/\D/g, "").replace(/^880/, "0");
    if (!employeeId) throw new RuleError(`Row ${row}: employee ID is empty.`, "Every staff row needs an employee ID");
    if (!/^01[3-9]\d{8}$/.test(phone)) throw new RuleError(`Row ${row}: ${get("phone")} is not a Bangladeshi mobile number.`, "Employees sign in with their mobile number");
    if (!outlets.has(get("outlet_id"))) throw new RuleError(`Row ${row}: unknown outlet ${get("outlet_id")}.`, "Outlet must exist");
    return {
      employeeId,
      name: get("name") || employeeId,
      phone,
      outletId: get("outlet_id"),
      costCentre: get("cost_centre") || "—",
      discountEligible: yes(get("discount_eligible")),
      coordinator: yes(get("coordinator")),
    };
  });
  if (parsed.length === 0) throw new RuleError("The file has no staff rows.", "HR list must list current staff");
  const dup = parsed.find((p, i) => parsed.findIndex((q) => q.employeeId === p.employeeId) !== i);
  if (dup) throw new RuleError(`${dup.employeeId} appears twice.`, "One row per employee");

  return db.transaction(async (tx) => {
    const existing = await tx.select().from(t.hrStaff);
    let added = 0;
    let updated = 0;
    for (const r of parsed) {
      const cur = existing.find((e) => e.employeeId === r.employeeId);
      if (!cur) {
        await tx.insert(t.hrStaff).values({ ...r, active: true });
        added++;
      } else if (!cur.active || cur.name !== r.name || cur.phone !== r.phone || cur.outletId !== r.outletId || cur.costCentre !== r.costCentre || cur.discountEligible !== r.discountEligible || cur.coordinator !== r.coordinator) {
        await tx.update(t.hrStaff).set({ ...r, active: true }).where(eq(t.hrStaff.employeeId, r.employeeId));
        updated++;
      }
      await tx
        .update(t.customer)
        .set({ outletId: r.outletId, costCentre: r.costCentre, discountEligible: r.discountEligible, coordinator: r.coordinator, active: true })
        .where(and(eq(t.customer.employeeId, r.employeeId), eq(t.customer.accountType, "employee")));
    }
    const listed = new Set(parsed.map((p) => p.employeeId));
    const leavers = existing.filter((e) => e.active && !listed.has(e.employeeId));
    for (const l of leavers) {
      await tx.update(t.hrStaff).set({ active: false }).where(eq(t.hrStaff.employeeId, l.employeeId));
      await tx.update(t.customer).set({ active: false }).where(and(eq(t.customer.employeeId, l.employeeId), eq(t.customer.accountType, "employee")));
    }
    await tx.insert(t.hrSyncRun).values({ id: randomUUID(), source, added, updated, deactivated: leavers.length });
    await audit(tx, "hr_sync", "import", null, null, { source, added, updated, deactivated: leavers.map((l) => l.employeeId) });
    return { added, updated, deactivated: leavers.length, leavers: leavers.map((l) => `${l.name} (${l.employeeId})`), rows: parsed.length };
  });
}

export { demoNow };
