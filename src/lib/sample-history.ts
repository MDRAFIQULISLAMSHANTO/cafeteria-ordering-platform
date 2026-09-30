import "server-only";
import { randomBytes } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as t from "@/db/schema";
import { demoNow } from "./clock";
import { price, type AccountType } from "./rules";
import { addDays, at, weekdayOf } from "./time";

// Sample sales history for the reports (demo only). Everything created here
// is marked: order refs start with "SIM/", customers' ids with "sim-", and
// the customers are inactive so nobody can sign in as them. "Remove sample
// history" deletes exactly that and nothing else.

const SCHOOL = ["sun", "mon", "tue", "wed", "thu"];
const DAY_FACTOR: Record<string, number> = { sun: 1, mon: 0.95, tue: 1.05, wed: 1.1, thu: 0.85 };
const OUTLET_BASE: Record<string, number> = { "ISD-CAF": 44, "ISD-PL": 22, UCBD: 30, "GIS-SAT": 26, "GIS-UTT": 24, HO: 16 };

const NAMES = [
  "Ayesha Siddiqua", "Rahim Uddin", "Tahmina Akter", "Sajid Hasan", "Nabila Chowdhury", "Fahim Rahman", "Mehjabin Islam", "Tanvir Hossain",
  "Sadia Afrin", "Rafiul Karim", "Nusrat Jahan", "Imtiaz Ahmed", "Farzana Yasmin", "Mahbub Alam", "Tasnim Haque", "Arafat Kabir",
  "Shirin Sultana", "Zubair Hasan", "Lamia Rahman", "Ashik Mahmud", "Priya Das", "Rezaul Karim", "Sumaiya Khan", "Tanjim Ahmed",
  "Moumita Saha", "Fahad Chowdhury", "Nadia Rahman", "Shakil Ahmed", "Ruma Begum", "Joy Sarkar", "Anika Tabassum", "Minhaz Uddin",
];

/** Small seeded PRNG so a given day always generates the same orders. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];
function weighted<T>(r: () => number, xs: [T, number][]): T {
  const total = xs.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [v, w] of xs) { x -= w; if (x <= 0) return v; }
  return xs[xs.length - 1][0];
}

type Customer = typeof t.customer.$inferInsert;

function sampleCustomers(outlets: (typeof t.outlet.$inferSelect)[]): Customer[] {
  const out: Customer[] = [];
  let n = 0;
  for (const o of outlets) {
    const mix: AccountType[] = o.kind === "corporate" ? ["employee", "employee", "employee", "employee"] : o.kind === "parent_lounge" ? ["parent", "parent", "employee", "employee", "employee"] : ["student", "student", "parent", "parent", "employee"];
    for (let i = 0; i < 6; i++) {
      const type = mix[i % mix.length];
      const name = NAMES[n % NAMES.length];
      n++;
      out.push({
        id: `sim-${o.id}-${i}`.toLowerCase(),
        phone: `0199${String(9000000 + n).slice(-7)}`,
        name,
        accountType: type,
        outletId: o.id,
        classGrade: type === "student" ? String(5 + (n % 7)) : null,
        section: type === "student" ? "ABC"[n % 3] : null,
        employeeId: type === "employee" ? `S${1000 + n}` : null,
        costCentre: type === "employee" ? `${o.id}-OPS` : null,
        discountEligible: type === "employee",
        coordinator: o.kind === "corporate" && i === 0,
        active: false,
      });
    }
  }
  return out;
}

/** Remove only what "Load sample history" created. */
export async function clearSampleHistory(db: Db) {
  const orders = await db.select({ id: t.foodOrder.id }).from(t.foodOrder).where(like(t.foodOrder.ref, "SIM/%"));
  const ids = orders.map((o) => o.id);
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    await db.delete(t.payment).where(inArray(t.payment.orderId, chunk));
    await db.delete(t.orderLine).where(inArray(t.orderLine.orderId, chunk));
    await db.delete(t.foodOrder).where(inArray(t.foodOrder.id, chunk));
  }
  await db.delete(t.customer).where(like(t.customer.id, "sim-%"));
  return ids.length;
}

async function insertChunked<T extends Record<string, unknown>>(db: Db, table: Parameters<Db["insert"]>[0], rows: T[]) {
  for (let i = 0; i < rows.length; i += 400) await db.insert(table).values(rows.slice(i, i + 400) as never);
}

/**
 * Fill `days` days of past sales (school days) and the next few days of
 * pre-orders across every outlet, using each outlet's real menu, prices,
 * VAT and discount rules.
 */
export async function loadSampleHistory(db: Db, days = 30) {
  await clearSampleHistory(db);
  const now = await demoNow(db);
  const outlets = await db.select().from(t.outlet);
  const products = await db.select().from(t.product).where(eq(t.product.active, true));
  const slots = await db.select().from(t.pickupSlot);
  const customers = sampleCustomers(outlets);
  await db.insert(t.customer).values(customers);

  const orders: (typeof t.foodOrder.$inferInsert)[] = [];
  const lines: (typeof t.orderLine.$inferInsert)[] = [];
  const payments: (typeof t.payment.$inferInsert)[] = [];
  const dates: { date: string; future: boolean }[] = [];
  for (let d = days; d >= -5; d--) {
    if (d === 0) continue; // today is left to the live demo
    const date = addDays(now.date, -d);
    if (SCHOOL.includes(weekdayOf(date))) dates.push({ date, future: d < 0 });
  }

  for (const o of outlets) {
    const pool = customers.filter((c) => c.outletId === o.id);
    const oslots = slots.filter((s) => s.outletId === o.id);
    const slotWeight = (s: (typeof oslots)[number]) => (s.label === "Lunch" ? 5 : s.label === "Snack break" ? 3 : s.startsAt >= "12:00" && s.startsAt <= "13:30" ? 4 : 2);
    let seq = 0;
    for (const { date, future } of dates) {
      const wd = weekdayOf(date);
      const r = rng(hash(`${o.id}:${date}`));
      const menu = products.filter((p) => p.menuKey === o.menuKey && p.price != null && p.unit === "each" && (!p.weekday || p.weekday === wd));
      if (!menu.length || !oslots.length) continue;
      const pop = menu.map((p) => [p, 1 + (hash(p.id) % 9) + (p.category.includes("Combo") ? 4 : 0) + (p.weekday ? 6 : 0)] as [typeof p, number]);
      const count = Math.round((OUTLET_BASE[o.id] ?? 20) * (DAY_FACTOR[wd] ?? 1) * (0.8 + r() * 0.4) * (future ? 0.35 : 1));
      let tracking = 0;
      for (let k = 0; k < count; k++) {
        const cust = pick(r, pool);
        const type = cust.accountType as AccountType;
        const slot = weighted(r, oslots.map((s) => [s, slotWeight(s)] as [typeof s, number]));
        const n = 1 + Math.floor(r() * r() * 3);
        const chosen = new Map<string, number>();
        for (let i = 0; i < n; i++) {
          const p = weighted(r, pop);
          chosen.set(p.id, (chosen.get(p.id) ?? 0) + (r() < 0.15 ? 2 : 1));
        }
        const items = [...chosen].map(([id, qty]) => ({ p: menu.find((m) => m.id === id)!, qty }));
        const pr = price({ accountType: type, isParentLounge: o.kind === "parent_lounge", discountEligible: Boolean(cust.discountEligible), lines: items.map((x) => ({ unitPrice: x.p.price!, qty: x.qty })) });

        const counter = type === "employee" && r() < 0.4;
        const method = counter ? (r() < 0.7 ? "cash" : "card_terminal") : weighted(r, [["bkash", 50], ["nagad", 25], ["card", 25]] as [string, number][]);
        const outcome = future ? "future" : weighted(r, [["collected", 94], ["cancelled", 3.5], ["rejected", 2.5]] as [string, number][]);

        const slotStart = at(date, slot.startsAt);
        const createdAt = slotStart - (outcome === "future" ? 20 : 1 + r() * 20) * 3_600_000;
        const paidAt = createdAt + 60_000 + r() * 120_000;
        const releasedAt = Math.max(paidAt, at(date, "07:30"));
        const startedAt = slotStart - (25 + r() * 20) * 60_000;
        const readyAt = slotStart - (2 + r() * 10) * 60_000;
        const collectedAt = slotStart + r() * 25 * 60_000;
        const id = crypto.randomUUID();
        seq++;
        tracking++;

        const collected = outcome === "collected";
        orders.push({
          id,
          ref: `SIM/${o.id}/${date.slice(2).replaceAll("-", "")}/${String(seq).padStart(4, "0")}`,
          tracking: `S${tracking}`,
          customerId: cust.id!,
          outletId: o.id,
          pickupDate: date,
          slotId: slot.id,
          paymentMode: counter ? "counter" : "online",
          state: collected ? "collected" : outcome === "future" ? "confirmed" : outcome,
          kitchenState: collected ? "completed" : "not_released",
          accountType: type,
          subtotal: pr.subtotal,
          discount: pr.discount,
          vat: pr.vat,
          total: pr.total,
          vatRule: pr.vatRule,
          discountRule: pr.discountRule,
          qrToken: randomBytes(12).toString("base64url"),
          rejectReason: outcome === "rejected" ? "Item out of stock" : null,
          createdAt: new Date(createdAt),
          paidAt: outcome === "rejected" && counter ? null : new Date(paidAt),
          releasedAt: collected ? new Date(releasedAt) : null,
          startedAt: collected ? new Date(startedAt) : null,
          readyAt: collected ? new Date(readyAt) : null,
          collectedAt: collected ? new Date(collectedAt) : null,
          collectedBy: collected ? (r() < 0.8 ? "qr" : "lookup") : null,
        });
        items.forEach((x, i) => lines.push({ id: crypto.randomUUID(), orderId: id, productId: x.p.id, name: x.p.name, qty: x.qty, unitPrice: x.p.price!, lineTotal: pr.lineTotals[i] }));
        const paid = !(outcome === "rejected" && counter);
        if (paid) payments.push({ id: crypto.randomUUID(), orderId: id, kind: "payment", method, amount: pr.total, status: "paid", reference: `SIM-${method.toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`, createdAt: new Date(paidAt) });
        if (paid && (outcome === "cancelled" || outcome === "rejected")) {
          payments.push({ id: crypto.randomUUID(), orderId: id, kind: "refund", method, amount: pr.total, status: "refunded", reference: `SIM-REFUND-${randomBytes(3).toString("hex").toUpperCase()}`, createdAt: new Date(paidAt + 3_600_000) });
        }
      }

      // corporate: a couple of bulk meeting orders a week, billed to cost centre
      if (o.kind === "corporate" && (wd === "mon" || wd === "wed")) {
        const coord = pool.find((c) => c.coordinator) ?? pool[0];
        const slot = oslots[Math.floor(r() * oslots.length)];
        const items = [pick(r, menu), pick(r, menu)].map((p) => ({ p, qty: 10 + Math.floor(r() * 20) }));
        const pr = price({ accountType: "employee", isParentLounge: false, discountEligible: false, lines: items.map((x) => ({ unitPrice: x.p.price!, qty: x.qty })) });
        const slotStart = at(date, slot.startsAt);
        const id = crypto.randomUUID();
        seq++;
        orders.push({
          id,
          ref: `SIM/${o.id}/${date.slice(2).replaceAll("-", "")}/${String(seq).padStart(4, "0")}`,
          tracking: `B${wd === "mon" ? 1 : 2}`,
          customerId: coord.id!,
          outletId: o.id,
          channel: "bulk",
          pickupDate: date,
          slotId: slot.id,
          paymentMode: "invoice",
          state: future ? "confirmed" : "collected",
          kitchenState: future ? "not_released" : "completed",
          accountType: "employee",
          subtotal: pr.subtotal, discount: pr.discount, vat: pr.vat, total: pr.total, vatRule: pr.vatRule, discountRule: pr.discountRule,
          qrToken: randomBytes(12).toString("base64url"),
          eventName: pick(r, ["Board meeting", "Finance review", "HR training", "Vendor visit", "Staff town hall"]),
          deliverTo: pick(r, ["Room 302, 3rd floor", "Conference room A", "Training hall, 2nd floor"]),
          costCentre: coord.costCentre,
          createdAt: new Date(slotStart - 30 * 3_600_000),
          releasedAt: future ? null : new Date(at(date, "07:30")),
          startedAt: future ? null : new Date(slotStart - 60 * 60_000),
          readyAt: future ? null : new Date(slotStart - 10 * 60_000),
          dispatchedAt: future ? null : new Date(slotStart - 5 * 60_000),
          deliveredAt: future ? null : new Date(slotStart + 5 * 60_000),
          collectedAt: future ? null : new Date(slotStart + 5 * 60_000),
          collectedBy: future ? null : "delivery",
        });
        items.forEach((x, i) => lines.push({ id: crypto.randomUUID(), orderId: id, productId: x.p.id, name: x.p.name, qty: x.qty, unitPrice: x.p.price!, lineTotal: pr.lineTotals[i] }));
      }
    }
  }

  await insertChunked(db, t.foodOrder, orders);
  await insertChunked(db, t.orderLine, lines);
  await insertChunked(db, t.payment, payments);
  const past = orders.filter((o) => o.pickupDate < now.date).length;
  return { orders: orders.length, past, upcoming: orders.length - past, lines: lines.length, customers: customers.length };
}

