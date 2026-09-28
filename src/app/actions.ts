"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import * as t from "@/db/schema";
import { resetDemo } from "@/db/seed";
import { registerEmployee, registerFamily, requestOtp, verifyOtp } from "@/lib/auth";
import {
  RuleError,
  acceptAtCounter,
  bump,
  cancelByCustomer,
  collect,
  demoNow,
  findForCollection,
  paySandbox,
  placeOrder,
  recall,
  rejectOrder,
  type PlaceInput,
} from "@/lib/orders";
import { clearPendingPhone, currentCustomer, endSession, getPendingPhone, setPendingPhone, startSession } from "@/lib/session";

// Server Actions are reachable by direct POST, so every one re-checks who is
// calling and what they may do. Staff screens are open in the prototype —
// a demo gates on data, not on the user (see the demo guide).

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string; rule?: string };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof RuleError) return { ok: false, error: err.message, rule: err.rule };
    console.error(err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

async function requireCustomer() {
  const c = await currentCustomer();
  if (!c) throw new RuleError("Please sign in again.", "Registered users only");
  return c;
}

// ---------------------------------------------------------------- login

export async function requestOtpAction(phone: string) {
  return run(async () => requestOtp(await getDb(), phone));
}

export async function verifyOtpAction(phone: string, code: string): Promise<ActionResult<{ next: string }>> {
  return run(async () => {
    const db = await getDb();
    const res = await verifyOtp(db, phone, code);
    if (res.kind === "existing") {
      await startSession(res.customerId);
      return { next: "/order" };
    }
    if (res.employee) {
      const id = await registerEmployee(db, res.phone);
      await startSession(id);
      return { next: "/order?welcome=employee" };
    }
    await setPendingPhone(res.phone);
    return { next: "/register" };
  });
}

export async function registerAction(input: { name: string; accountType: "parent" | "student"; outletId: string; classGrade?: string; section?: string }) {
  return run(async () => {
    const phone = await getPendingPhone();
    if (!phone) throw new RuleError("Your verification expired. Sign in again.", "Verified mobile number required");
    const id = await registerFamily(await getDb(), { ...input, phone });
    await clearPendingPhone();
    await startSession(id);
    return { next: "/order?welcome=1" };
  });
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

export async function changeOutletAction(outletId: string) {
  return run(async () => {
    const c = await requireCustomer();
    if (c.accountType === "employee") throw new RuleError("Your outlet comes from the HR list.", "Employee outlet comes from the HR list");
    const db = await getDb();
    const o = (await db.select().from(t.outlet).where(eq(t.outlet.id, outletId)))[0];
    if (!o || o.kind === "corporate") throw new RuleError("Choose a campus outlet.", "Parents and students choose a campus");
    await db.update(t.customer).set({ outletId }).where(eq(t.customer.id, c.id));
  });
}

// --------------------------------------------------------------- orders

export async function placeOrderAction(input: PlaceInput) {
  return run(async () => {
    const c = await requireCustomer();
    const id = await placeOrder(await getDb(), c, input);
    return { orderId: id, next: input.paymentMode === "online" ? `/pay/${id}` : `/orders/${id}` };
  });
}

export async function payAction(orderId: string, method: "bkash" | "nagad" | "card", outcome: "success" | "fail") {
  return run(async () => {
    const c = await requireCustomer();
    return paySandbox(await getDb(), c, orderId, method, outcome);
  });
}

export async function cancelOrderAction(orderId: string) {
  return run(async () => {
    const c = await requireCustomer();
    await cancelByCustomer(await getDb(), c, orderId);
  });
}

// ---------------------------------------------------------- staff screens

export async function bumpAction(orderId: string) {
  return run(async () => bump(await getDb(), orderId));
}

export async function recallAction(outletId: string) {
  return run(async () => recall(await getDb(), outletId));
}

export async function rejectAction(orderId: string, reason: string, actor: "kitchen" | "counter") {
  return run(async () => rejectOrder(await getDb(), orderId, reason, actor));
}

export async function acceptAction(orderId: string, method: "cash" | "card_terminal") {
  return run(async () => acceptAtCounter(await getDb(), orderId, method));
}

export async function lookupAction(outletId: string, code: string) {
  return run(async () => {
    const r = await findForCollection(await getDb(), outletId, code);
    return {
      via: r.via,
      order: { id: r.order.id, tracking: r.order.tracking, state: r.order.state, kitchenState: r.order.kitchenState, total: r.order.total, collectedAt: r.order.collectedAt ? new Date(r.order.collectedAt).toISOString() : null, pickupDate: r.order.pickupDate },
      customer: { name: r.customer.name, accountType: r.customer.accountType, classGrade: r.customer.classGrade, section: r.customer.section, phoneTail: r.customer.phone.slice(-3) },
      lines: r.lines.map((l) => ({ name: l.name, qty: l.qty })),
    };
  });
}

export async function collectAction(orderId: string, via: "qr" | "lookup", nameConfirmed: boolean) {
  return run(async () => collect(await getDb(), orderId, via, nameConfirmed));
}

export async function toggleAvailabilityAction(outletId: string, productId: string) {
  return run(async () => {
    const db = await getDb();
    const now = await demoNow(db);
    const where = and(eq(t.unavailability.outletId, outletId), eq(t.unavailability.productId, productId), eq(t.unavailability.date, now.date));
    const existing = (await db.select().from(t.unavailability).where(where))[0];
    if (existing) await db.delete(t.unavailability).where(where);
    else await db.insert(t.unavailability).values({ outletId, productId, date: now.date, reason: "Sold out" });
    return { available: Boolean(existing) };
  });
}

// ------------------------------------------------------------------ demo

export async function resetDemoAction() {
  return run(async () => resetDemo(await getDb()));
}

export async function shiftClockAction(minutes: number | "reset") {
  return run(async () => {
    const db = await getDb();
    const cur = (await db.select().from(t.demoState).where(eq(t.demoState.id, 1)))[0];
    const next = minutes === "reset" ? 0 : (cur?.clockOffsetMinutes ?? 0) + minutes;
    await db.update(t.demoState).set({ clockOffsetMinutes: next }).where(eq(t.demoState.id, 1));
    return next;
  });
}
