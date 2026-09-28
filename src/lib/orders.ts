import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, lte, notInArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as t from "@/db/schema";
import { demoNow, type DemoNow } from "./clock";
import { RULES, money, price, type AccountType } from "./rules";
import { addDays, at, daysBetween, time12, weekdayOf } from "./time";

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
    .where(and(eq(t.foodOrder.outletId, outletId), eq(t.foodOrder.pickupDate, date), inArray(t.foodOrder.state, ACTIVE_STATES)))
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
      .where(and(eq(t.foodOrder.slotId, slot.id), eq(t.foodOrder.pickupDate, input.date), inArray(t.foodOrder.state, ACTIVE_STATES))))[0].n;
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
    const reference = `SBX-${method.toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    if (outcome === "fail") {
      await tx.insert(t.payment).values({ id: randomUUID(), orderId, kind: "payment", method, amount: order.total, status: "failed", reference });
      await audit(tx, `customer:${cust.id}`, "payment_failed", orderId, order.outletId, { method });
      return { ok: false as const };
    }
    await tx.insert(t.payment).values({ id: randomUUID(), orderId, kind: "payment", method, amount: order.total, status: "paid", reference });
    await confirmAndRelease(tx, order, now);
    const slot = (await tx.select().from(t.pickupSlot).where(eq(t.pickupSlot.id, order.slotId)))[0];
    const outlet = (await tx.select().from(t.outlet).where(eq(t.outlet.id, order.outletId)))[0];
    await notify(tx, cust.phone, `STS: Order ${order.tracking} confirmed — ${slot.label} ${time12(slot.startsAt)}, ${order.pickupDate}, ${outlet.name}. Paid ${money(order.total)} (${method}).`, orderId);
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
    const paid = (await tx.select().from(t.payment).where(and(eq(t.payment.orderId, orderId), eq(t.payment.kind, "payment"), eq(t.payment.status, "paid"))))[0];
    const cust = (await tx.select().from(t.customer).where(eq(t.customer.id, order.customerId)))[0];
    let refundText = "";
    if (paid) {
      await tx.insert(t.payment).values({ id: randomUUID(), orderId, kind: "refund", method: paid.method, amount: paid.amount, status: "refunded", reference: `SBX-REFUND-${randomBytes(4).toString("hex").toUpperCase()}` });
      refundText = ` ${money(paid.amount)} refunded to your ${paid.method} (sandbox; real refunds within 7 working days).`;
    }
    await notify(tx, cust.phone, `STS: Sorry, order ${order.tracking} could not be accepted: ${text}.${refundText}`, orderId);
    await audit(tx, actor, "reject", orderId, order.outletId, { reason: text, refunded: Boolean(paid) });
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
    const paid = (await tx.select().from(t.payment).where(and(eq(t.payment.orderId, orderId), eq(t.payment.kind, "payment"), eq(t.payment.status, "paid"))))[0];
    if (paid) {
      await tx.insert(t.payment).values({ id: randomUUID(), orderId, kind: "refund", method: paid.method, amount: paid.amount, status: "refunded", reference: `SBX-REFUND-${randomBytes(4).toString("hex").toUpperCase()}` });
    }
    await notify(tx, cust.phone, `STS: Order ${order.tracking} cancelled.${paid ? ` ${money(paid.amount)} refunded to your ${paid.method} (sandbox).` : ""}`, orderId);
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
  return { ...rows[0], lines, payments };
}

export async function customerOrders(db: Db, customerId: string) {
  const rows = await db
    .select({ order: t.foodOrder, slot: t.pickupSlot, outlet: t.outlet })
    .from(t.foodOrder)
    .innerJoin(t.pickupSlot, eq(t.pickupSlot.id, t.foodOrder.slotId))
    .innerJoin(t.outlet, eq(t.outlet.id, t.foodOrder.outletId))
    .where(eq(t.foodOrder.customerId, customerId))
    .orderBy(desc(t.foodOrder.createdAt));
  return withLines(db, rows.map((r) => ({ id: r.order.id, ...r })));
}

export { demoNow };
