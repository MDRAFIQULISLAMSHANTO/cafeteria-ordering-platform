"use server";

import { cookies } from "next/headers";
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
  dispatchForDelivery,
  editOrder,
  findForCollection,
  importHrList,
  markDelivered,
  offerSubstitutions,
  paySandbox,
  placeBulkOrder,
  placeOrder,
  removePhoto,
  savePhoto,
  recall,
  rejectOrder,
  resolveSubstitution,
  type BulkInput,
  type EditInput,
  type PlaceInput,
} from "@/lib/orders";
import { HR_SAMPLE_CSV } from "@/db/data/hr-sync-sample";
import { DEMO_COOKIE, DEMO_COOKIE_MAX_AGE, demoKey, demoToken, hasDemoAccess, openWithoutKey, sameToken } from "@/lib/demo-access";
import { isPersonaId, type PersonaId } from "@/lib/demo-personas";
import { clearPendingPhone, currentCustomer, endSession, getPendingPhone, setPendingPhone, startSession } from "@/lib/session";

// Server Actions are reachable by direct POST, so every one re-checks who is
// calling and what they may do. Customer actions need the customer's session;
// staff and demo actions need presenter access (DEMO_KEY cookie). Within the
// staff screens there are no roles — a demo gates on data, not on the user.

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

async function requireDemoAccess() {
  if (!(await hasDemoAccess((await cookies()).get(DEMO_COOKIE)?.value))) {
    throw new RuleError("Presenter access required.", "Staff and demo screens need the demo key");
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

// ------------------------------------------------------------ demo actors

/**
 * Switch the signed-in demo persona without another OTP. Allowed only when
 * the caller is already a demo persona or holds presenter access, and only
 * towards another seeded persona — real customers can never be impersonated.
 */
export async function switchPersonaAction(personaId: PersonaId, fromPath: string) {
  return run(async () => {
    if (!isPersonaId(personaId)) throw new RuleError("Unknown demo actor.", "Only seeded demo personas can be switched to");
    const current = await currentCustomer();
    const presenter = await hasDemoAccess((await cookies()).get(DEMO_COOKIE)?.value);
    if (!presenter && !isPersonaId(current?.id)) throw new RuleError("Switching actors is for demo accounts only.", "Sign in with a demo number first");
    const db = await getDb();
    const target = (await db.select().from(t.customer).where(eq(t.customer.id, personaId)))[0];
    if (!target || !target.active) throw new RuleError("That demo account is not available.", "Demo personas are seeded accounts");
    await startSession(target.id);
    await db.insert(t.auditLog).values({ id: crypto.randomUUID(), actor: `demo:${current?.id ?? "presenter"}`, action: "switch_persona", orderId: null, outletId: target.outletId, detail: { to: target.id } });
    // an order page belongs to the previous actor; go to the matching list instead.
    // Only known customer pages — fromPath comes from the client.
    const next = fromPath.startsWith("/orders/") || fromPath.startsWith("/pay/") ? "/orders" : ["/", "/order", "/orders"].includes(fromPath) ? fromPath : "/order";
    return { next, outletId: target.outletId };
  });
}

/** Presenter key → staff screens cookie (the SMS inbox shows OTPs, so this stays gated). */
export async function unlockStaffAction(key: string) {
  return run(async () => {
    const expected = demoKey();
    if (!expected) {
      if (openWithoutKey()) return { unlocked: true };
      throw new RuleError("Staff screens are disabled on this deployment.", "DEMO_KEY must be configured");
    }
    const ok = sameToken(await demoToken(key.trim()), await demoToken(expected));
    if (!ok) {
      await new Promise((r) => setTimeout(r, 400));
      throw new RuleError("That presenter key is not right.", "Staff and demo screens need the demo key");
    }
    (await cookies()).set(DEMO_COOKIE, await demoToken(expected), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DEMO_COOKIE_MAX_AGE,
    });
    return { unlocked: true };
  });
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

export async function updateClassAction(classGrade: string, section: string) {
  return run(async () => {
    const c = await requireCustomer();
    if (c.accountType !== "student") throw new RuleError("Only students have a class and section.", "Students register with class and section");
    const g = classGrade.trim();
    const sec = section.trim();
    if (!g || !sec || g.length > 4 || sec.length > 4) throw new RuleError("Enter a class and a section, e.g. 8 and B.", "Students register with class and section");
    await (await getDb()).update(t.customer).set({ classGrade: g, section: sec }).where(eq(t.customer.id, c.id));
  });
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

export async function editOrderAction(orderId: string, input: EditInput) {
  return run(async () => {
    const c = await requireCustomer();
    return editOrder(await getDb(), c, orderId, input);
  });
}

export async function resolveSubstitutionAction(substitutionId: string, choice: string) {
  return run(async () => {
    const c = await requireCustomer();
    await resolveSubstitution(await getDb(), c, substitutionId, choice);
  });
}

export async function placeBulkOrderAction(input: BulkInput) {
  return run(async () => {
    const c = await requireCustomer();
    const id = await placeBulkOrder(await getDb(), c, input);
    return { orderId: id, next: `/orders/${id}` };
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
  return run(async () => { await requireDemoAccess(); return bump(await getDb(), orderId); });
}

export async function recallAction(outletId: string) {
  return run(async () => { await requireDemoAccess(); return recall(await getDb(), outletId); });
}

export async function rejectAction(orderId: string, reason: string, actor: "kitchen" | "counter") {
  return run(async () => { await requireDemoAccess(); return rejectOrder(await getDb(), orderId, reason, actor); });
}

export async function acceptAction(orderId: string, method: "cash" | "card_terminal") {
  return run(async () => { await requireDemoAccess(); return acceptAtCounter(await getDb(), orderId, method); });
}

export async function lookupAction(outletId: string, code: string) {
  return run(async () => {
    await requireDemoAccess();
    const r = await findForCollection(await getDb(), outletId, code);
    return {
      via: r.via,
      order: { id: r.order.id, tracking: r.order.tracking, state: r.order.state, kitchenState: r.order.kitchenState, total: r.order.total, collectedAt: r.order.collectedAt ? new Date(r.order.collectedAt).toISOString() : null, pickupDate: r.order.pickupDate, channel: r.order.channel, deliverTo: r.order.deliverTo, eventName: r.order.eventName },
      customer: { name: r.customer.name, accountType: r.customer.accountType, classGrade: r.customer.classGrade, section: r.customer.section, phoneTail: r.customer.phone.slice(-3) },
      lines: r.lines.filter((l) => l.state !== "refunded").map((l) => ({ name: l.name, qty: l.qty })),
    };
  });
}

export async function dispatchAction(orderId: string) {
  return run(async () => { await requireDemoAccess(); return dispatchForDelivery(await getDb(), orderId); });
}

export async function deliverAction(orderId: string) {
  return run(async () => { await requireDemoAccess(); return markDelivered(await getDb(), orderId); });
}

export async function collectAction(orderId: string, via: "qr" | "lookup", nameConfirmed: boolean) {
  return run(async () => { await requireDemoAccess(); return collect(await getDb(), orderId, via, nameConfirmed); });
}

export async function uploadPhotoAction(productId: string, mime: string, base64: string, width: number, height: number) {
  return run(async () => { await requireDemoAccess(); return savePhoto(await getDb(), productId, mime, base64, width, height); });
}

export async function removePhotoAction(productId: string) {
  return run(async () => { await requireDemoAccess(); return removePhoto(await getDb(), productId); });
}

export async function toggleAvailabilityAction(outletId: string, productId: string) {
  return run(async () => {
    await requireDemoAccess();
    const db = await getDb();
    const now = await demoNow(db);
    const where = and(eq(t.unavailability.outletId, outletId), eq(t.unavailability.productId, productId), eq(t.unavailability.date, now.date));
    const existing = (await db.select().from(t.unavailability).where(where))[0];
    if (existing) {
      await db.delete(t.unavailability).where(where);
      return { available: true, offered: 0 };
    }
    await db.insert(t.unavailability).values({ outletId, productId, date: now.date, reason: "Sold out" });
    // customers who already ordered it today choose a substitute or a refund
    const offered = await offerSubstitutions(db, outletId, productId);
    return { available: false, offered };
  });
}

// ------------------------------------------------------------------ demo

export async function resetDemoAction() {
  return run(async () => { await requireDemoAccess(); return resetDemo(await getDb()); });
}

export async function importHrAction(csv: string | null, source: string) {
  return run(async () => {
    await requireDemoAccess();
    return importHrList(await getDb(), csv ?? HR_SAMPLE_CSV, csv ? source.slice(0, 120) : "Sample list (October)");
  });
}

export async function setSubstitutionTimeoutAction(seconds: 60 | 900) {
  return run(async () => {
    await requireDemoAccess();
    if (seconds !== 60 && seconds !== 900) throw new RuleError("Choose 60 seconds or 15 minutes.", "Substitution timeout");
    await (await getDb()).update(t.demoState).set({ substitutionTimeoutSeconds: seconds }).where(eq(t.demoState.id, 1));
    return seconds;
  });
}

export async function shiftClockAction(minutes: number | "reset") {
  return run(async () => {
    await requireDemoAccess();
    const db = await getDb();
    const cur = (await db.select().from(t.demoState).where(eq(t.demoState.id, 1)))[0];
    const next = minutes === "reset" ? 0 : (cur?.clockOffsetMinutes ?? 0) + minutes;
    await db.update(t.demoState).set({ clockOffsetMinutes: next }).where(eq(t.demoState.id, 1));
    return next;
  });
}
