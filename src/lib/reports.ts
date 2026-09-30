import "server-only";
import { and, asc, eq, gte, inArray, like, lte, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as t from "@/db/schema";
import { demoNow } from "./clock";
import {
  ACCOUNT_LABEL, CHANNEL_LABEL, GROUP_LABEL, MEASURES, PAYMENT_LABEL, PERIOD_LABEL, STATE_LABEL,
  type GroupKey, type MeasureKey, type Period, type Query, type Status,
} from "./report-meta";
import { RULES, unitBeforeDiscount } from "./rules";
import { addDays, daysBetween, dhakaTime, weekdayOf } from "./time";

// Odoo-style sales reporting over the prototype's orders. One "fact" per
// order line; every report is a filter + grouping + measures over the facts.
// Money is poisha (BDT × 100) throughout.

// Estimated food cost as a share of net sales, per menu section. SAMPLE
// values until recipe costs (client file C3) are loaded into Odoo.
export const COST_PCT: Record<string, number> = {
  "Daily Combo": 0.42, "A La Carte": 0.38, "Live Counter": 0.32, Beverages: 0.25, "Day Specials": 0.4,
  "Fresh Bake": 0.36, "Special of the Day": 0.4, "Snack Deck": 0.38, Desserts: 0.3, Tea: 0.2, "Shakes and Frappes": 0.28,
};
export const DEFAULT_COST = 0.35;

export type Fact = {
  orderId: string; ref: string; tracking: string; date: string; hour: number; weekday: string;
  outletId: string; outlet: string; category: string; productId: string; product: string;
  customerId: string; customer: string; account: string; channel: string; state: string; payment: string;
  slotStart: string; slotLabel: string; sample: boolean;
  qty: number; revenue: number; vat: number; net: number; discount: number; cost: number;
};

/** Facts for pickup dates in [from, to]: three queries (orders, lines, payments), all filtered by date. */
export async function loadFacts(db: Db, from: string, to: string): Promise<Fact[]> {
  const inRange = and(gte(t.foodOrder.pickupDate, from), lte(t.foodOrder.pickupDate, to));
  const [rows, lines, pays] = await Promise.all([
    db
      .select({
        order: {
          id: t.foodOrder.id, ref: t.foodOrder.ref, tracking: t.foodOrder.tracking, pickupDate: t.foodOrder.pickupDate, createdAt: t.foodOrder.createdAt,
          outletId: t.foodOrder.outletId, accountType: t.foodOrder.accountType, channel: t.foodOrder.channel, state: t.foodOrder.state, paymentMode: t.foodOrder.paymentMode,
        },
        customer: { id: t.customer.id, name: t.customer.name },
        slot: { startsAt: t.pickupSlot.startsAt, label: t.pickupSlot.label },
        outlet: { name: t.outlet.name },
      })
      .from(t.foodOrder)
      .innerJoin(t.customer, eq(t.customer.id, t.foodOrder.customerId))
      .innerJoin(t.pickupSlot, eq(t.pickupSlot.id, t.foodOrder.slotId))
      .innerJoin(t.outlet, eq(t.outlet.id, t.foodOrder.outletId))
      .where(inRange),
    db
      .select({ orderId: t.orderLine.orderId, productId: t.orderLine.productId, name: t.orderLine.name, qty: t.orderLine.qty, unitPrice: t.orderLine.unitPrice, lineTotal: t.orderLine.lineTotal, state: t.orderLine.state })
      .from(t.orderLine)
      .innerJoin(t.foodOrder, eq(t.foodOrder.id, t.orderLine.orderId))
      .where(inRange),
    db
      .select({ orderId: t.payment.orderId, method: t.payment.method })
      .from(t.payment)
      .innerJoin(t.foodOrder, eq(t.foodOrder.id, t.payment.orderId))
      .where(and(inRange, eq(t.payment.kind, "payment"), eq(t.payment.status, "paid")))
      .orderBy(asc(t.payment.createdAt)),
  ]);
  if (!rows.length) return [];
  const cats = new Map((await db.select({ id: t.product.id, category: t.product.category }).from(t.product)).map((p) => [p.id, p.category]));
  const payOf = new Map<string, string>();
  for (const p of pays) if (!payOf.has(p.orderId)) payOf.set(p.orderId, p.method);
  const byOrder = new Map<string, (typeof lines)[number][]>();
  for (const l of lines) (byOrder.get(l.orderId) ?? byOrder.set(l.orderId, []).get(l.orderId)!).push(l);

  const facts: Fact[] = [];
  for (const { order: o, customer: c, slot: s, outlet } of rows) {
    const hour = Number(dhakaTime(new Date(o.createdAt).getTime()).slice(0, 2));
    const payment = o.paymentMode === "invoice" ? "invoice" : payOf.get(o.id) ?? "none";
    const employee = o.accountType === "employee";
    for (const l of byOrder.get(o.id) ?? []) {
      const live = l.state !== "refunded";
      const revenue = live ? l.lineTotal : 0;
      const vat = employee ? 0 : revenue - Math.round((revenue * 100) / (100 + RULES.vatRate));
      const net = revenue - vat;
      const discount = employee && live ? Math.max(0, unitBeforeDiscount(o.accountType, l.unitPrice) * l.qty - revenue) : 0;
      const category = cats.get(l.productId) ?? "Other";
      facts.push({
        orderId: o.id, ref: o.ref, tracking: o.tracking, date: o.pickupDate, hour, weekday: weekdayOf(o.pickupDate),
        outletId: o.outletId, outlet: outlet.name, category, productId: l.productId, product: l.name,
        customerId: c.id, customer: c.name, account: o.accountType, channel: o.channel, state: o.state, payment,
        slotStart: s.startsAt, slotLabel: s.label, sample: o.ref.startsWith("SIM/"),
        qty: live ? l.qty : 0, revenue, vat, net, discount, cost: Math.round(net * (COST_PCT[category] ?? DEFAULT_COST)),
      });
    }
  }
  return facts;
}

// ------------------------------------------------------------------ filters

const WD = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function periodRange(period: Period, today: string, from?: string, to?: string): [string, string] {
  switch (period) {
    case "today": return [today, today];
    case "yesterday": return [addDays(today, -1), addDays(today, -1)];
    case "week": return [addDays(today, -WD.indexOf(weekdayOf(today))), today]; // the school week starts on Sunday
    case "month": return [`${today.slice(0, 8)}01`, today];
    case "last7": return [addDays(today, -6), today];
    case "custom": {
      const f = ISO.test(from ?? "") ? from! : addDays(today, -29);
      const e = ISO.test(to ?? "") ? to! : today;
      return f <= e ? [f, e] : [e, f];
    }
    default: return [addDays(today, -29), today];
  }
}

type Params = Record<string, string | string[] | undefined>;
const list = (v: unknown) => (typeof v === "string" && v ? v.split(",").filter(Boolean) : []);
const one = (v: unknown) => (typeof v === "string" ? v : "");

export function parseQuery(sp: Params, today: string): Query {
  const period = (one(sp.p) in PERIOD_LABEL ? one(sp.p) : "last30") as Period;
  const [from, to] = periodRange(period, today, one(sp.from), one(sp.to));
  // "-" means no row grouping (a single Total row)
  const groups = sp.g === "-" ? [] : list(sp.g).filter((g): g is GroupKey => g in GROUP_LABEL).slice(0, 2);
  const col = one(sp.c) in GROUP_LABEL ? (one(sp.c) as GroupKey) : null;
  const measures = list(sp.m).filter((m): m is MeasureKey => m in MEASURES);
  const status = (["sales", "all", "open", "cancelled", "rejected"].includes(one(sp.st)) ? one(sp.st) : "sales") as Status;
  return {
    period, from, to,
    outlets: list(sp.o), status, accounts: list(sp.a), channels: list(sp.ch), payments: list(sp.pm), tod: list(sp.tod),
    product: one(sp.sp).slice(0, 60), customer: one(sp.sc).slice(0, 60), order: one(sp.so).slice(0, 60), category: one(sp.scat).slice(0, 60),
    groups: sp.g === "-" ? [] : groups.length ? groups : ["day"],
    col: col && !groups.includes(col) ? col : null,
    measures: measures.length ? measures : ["revenue", "orders", "profit"],
    view: (["pivot", "graph", "list"].includes(one(sp.v)) ? one(sp.v) : "pivot") as Query["view"],
    chart: (["bar", "line", "share"].includes(one(sp.gt)) ? one(sp.gt) : "bar") as Query["chart"],
    sample: one(sp.sm) !== "0",
    page: Math.max(1, Number(one(sp.pg)) || 1),
    open: one(sp.open),
  };
}

const TOD: Record<string, [number, number]> = { morning: [0, 11], midday: [11, 14], afternoon: [14, 24] };

export function applyFilters(facts: Fact[], q: Query, range: [string, string] = [q.from, q.to]): Fact[] {
  const like = (a: string, b: string) => a.toLowerCase().includes(b.toLowerCase());
  return facts.filter((f) => {
    if (f.date < range[0] || f.date > range[1]) return false;
    if (!q.sample && f.sample) return false;
    if (q.status === "sales" && f.state !== "confirmed" && f.state !== "collected") return false;
    if (q.status === "cancelled" && f.state !== "cancelled") return false;
    if (q.status === "rejected" && f.state !== "rejected") return false;
    if (q.status === "open" && !["awaiting_payment", "awaiting_acceptance", "confirmed"].includes(f.state)) return false;
    if (q.outlets.length && !q.outlets.includes(f.outletId)) return false;
    if (q.accounts.length && !q.accounts.includes(f.account)) return false;
    if (q.channels.length && !q.channels.includes(f.channel)) return false;
    if (q.payments.length && !q.payments.includes(f.payment)) return false;
    if (q.tod.length) {
      const h = Number(f.slotStart.slice(0, 2));
      if (!q.tod.some((k) => TOD[k] && h >= TOD[k][0] && h < TOD[k][1])) return false;
    }
    if (q.product && !like(f.product, q.product)) return false;
    if (q.customer && !like(f.customer, q.customer)) return false;
    if (q.order && !like(`${f.ref} ${f.tracking}`, q.order)) return false;
    if (q.category && !like(f.category, q.category)) return false;
    return true;
  });
}

// ------------------------------------------------------- groups & measures

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WD_LABEL: Record<string, string> = { sun: "Sunday", mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday" };
const dayLabel = (d: string) => new Date(`${d}T12:00:00+06:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Dhaka" });
const time12 = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };

type GroupDef = { time?: boolean; key: (f: Fact) => string; name: (k: string) => string; order?: (k: string) => number };
export const GROUPS: Record<GroupKey, GroupDef> = {
  day: { time: true, key: (f) => f.date, name: dayLabel },
  week: { time: true, key: (f) => addDays(f.date, -WD.indexOf(f.weekday)), name: (k) => `Week of ${dayLabel(k)}` },
  month: { time: true, key: (f) => f.date.slice(0, 7), name: (k) => `${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}` },
  weekday: { time: true, key: (f) => f.weekday, name: (k) => WD_LABEL[k] ?? k, order: (k) => WD.indexOf(k) },
  slot: { time: true, key: (f) => f.slotStart, name: time12 },
  hour: { time: true, key: (f) => String(f.hour).padStart(2, "0"), name: (k) => `${k}:00–${k}:59` },
  outlet: { key: (f) => f.outlet, name: (k) => k },
  category: { key: (f) => f.category, name: (k) => k },
  product: { key: (f) => f.product, name: (k) => k },
  account: { key: (f) => f.account, name: (k) => ACCOUNT_LABEL[k] ?? k },
  payment: { key: (f) => f.payment, name: (k) => PAYMENT_LABEL[k] ?? k },
  channel: { key: (f) => f.channel, name: (k) => CHANNEL_LABEL[k] ?? k },
  status: { key: (f) => f.state, name: (k) => STATE_LABEL[k] ?? k },
  customer: { key: (f) => f.customer, name: (k) => k },
};

export type Totals = Record<MeasureKey, number>;

export function measure(facts: Fact[]): Totals {
  let revenue = 0, net = 0, vat = 0, discount = 0, qty = 0, cost = 0;
  const orders = new Set<string>();
  for (const f of facts) {
    revenue += f.revenue; net += f.net; vat += f.vat; discount += f.discount; qty += f.qty; cost += f.cost;
    orders.add(f.orderId);
  }
  const profit = net - cost;
  return { revenue, net, vat, discount, qty, orders: orders.size, aov: orders.size ? Math.round(revenue / orders.size) : 0, cost, profit, margin: net ? (profit / net) * 100 : 0 };
}

export type Grouped = { key: string; label: string; facts: Fact[]; totals: Totals };

export function groupFacts(facts: Fact[], key: GroupKey, sortBy: MeasureKey): Grouped[] {
  const def = GROUPS[key];
  const map = new Map<string, Fact[]>();
  for (const f of facts) {
    const k = def.key(f);
    (map.get(k) ?? map.set(k, []).get(k)!).push(f);
  }
  const out = [...map].map(([k, fs]) => ({ key: k, label: def.name(k), facts: fs, totals: measure(fs) }));
  if (def.time) out.sort((a, b) => (def.order ? def.order(a.key) - def.order(b.key) : a.key.localeCompare(b.key)));
  else out.sort((a, b) => b.totals[sortBy] - a.totals[sortBy] || a.label.localeCompare(b.label));
  return out;
}

// ------------------------------------------------------------------ pivot

export type PivotRow = { id: string; label: string; depth: number; values: Totals; cells: Totals[]; hasChildren: boolean; parent: string | null };
export type Pivot = { rows: PivotRow[]; cols: { key: string; label: string }[]; total: Totals; colTotals: Totals[]; colsCut: number };

const MAX_COLS = 12;

export function buildPivot(facts: Fact[], q: Query): Pivot {
  const sortBy = q.measures[0];
  const allCols = q.col ? groupFacts(facts, q.col, sortBy) : [];
  const colGroups = allCols.slice(0, MAX_COLS);
  const colKey = q.col ? GROUPS[q.col].key : null;
  const cells = (fs: Fact[]) => {
    if (!colKey) return [];
    const by = new Map<string, Fact[]>();
    for (const f of fs) { const k = colKey(f); (by.get(k) ?? by.set(k, []).get(k)!).push(f); }
    return colGroups.map((c) => measure(by.get(c.key) ?? []));
  };
  const rows: PivotRow[] = [];
  if (q.groups[0]) {
    for (const g1 of groupFacts(facts, q.groups[0], sortBy)) {
      const id1 = `r:${g1.key}`;
      rows.push({ id: id1, label: g1.label, depth: 0, values: g1.totals, cells: cells(g1.facts), hasChildren: Boolean(q.groups[1]), parent: null });
      if (q.groups[1]) {
        for (const g2 of groupFacts(g1.facts, q.groups[1], sortBy)) {
          rows.push({ id: `${id1}|${g2.key}`, label: g2.label, depth: 1, values: g2.totals, cells: cells(g2.facts), hasChildren: false, parent: id1 });
        }
      }
    }
  }
  return { rows, cols: colGroups.map((c) => ({ key: c.key, label: c.label })), total: measure(facts), colTotals: colGroups.map((c) => c.totals), colsCut: Math.max(0, allCols.length - MAX_COLS) };
}

// ------------------------------------------------------------------ graph

export type Series = { key: string; label: string; values: number[] };
export type Graph = { measure: MeasureKey; x: { key: string; label: string }[]; series: Series[]; seriesBy: GroupKey | null; xBy: GroupKey | null; folded: number };

const MAX_SERIES = 7; // an 8th slot is "Other"
const MAX_X = 24;

/** x = first row group; series = second row group, else the column group (stacked in bar charts). */
export function buildGraph(facts: Fact[], q: Query): Graph {
  const m = q.measures[0];
  const xBy = q.groups[0] ?? null;
  const seriesBy = q.groups[1] ?? q.col ?? null;
  if (!xBy) return { measure: m, x: [{ key: "total", label: "Total" }], series: [{ key: "total", label: MEASURES[m].short, values: [measure(facts)[m]] }], seriesBy: null, xBy: null, folded: 0 };
  let xs = groupFacts(facts, xBy, m);
  let folded = 0;
  if (!GROUPS[xBy].time && xs.length > MAX_X) {
    const rest = xs.slice(MAX_X - 1).flatMap((g) => g.facts);
    folded = xs.length - (MAX_X - 1);
    xs = [...xs.slice(0, MAX_X - 1), { key: "__other", label: `Other (${folded})`, facts: rest, totals: measure(rest) }];
  }
  if (!seriesBy) return { measure: m, x: xs.map((g) => ({ key: g.key, label: g.label })), series: [{ key: "total", label: MEASURES[m].short, values: xs.map((g) => g.totals[m]) }], seriesBy: null, xBy, folded };
  const top = groupFacts(facts, seriesBy, m);
  const keep = top.length > MAX_SERIES + 1 ? top.slice(0, MAX_SERIES) : top;
  const keepKeys = new Set(keep.map((s) => s.key));
  const sKey = GROUPS[seriesBy].key;
  const series: Series[] = keep.map((s) => ({ key: s.key, label: s.label, values: xs.map((g) => measure(g.facts.filter((f) => sKey(f) === s.key))[m]) }));
  if (keep.length < top.length) {
    series.push({ key: "__other", label: `Other (${top.length - keep.length})`, values: xs.map((g) => measure(g.facts.filter((f) => !keepKeys.has(sKey(f))))[m]) });
  }
  return { measure: m, x: xs.map((g) => ({ key: g.key, label: g.label })), series, seriesBy, xBy, folded };
}

// ------------------------------------------------------------------- list

export type ListLine = Pick<Fact, "orderId" | "ref" | "tracking" | "date" | "outlet" | "customer" | "account" | "product" | "category" | "qty" | "revenue" | "net" | "cost" | "state" | "payment" | "slotStart"> & { profit: number };
export const LIST_PAGE = 80;

const toLine = (f: Fact): ListLine => ({
  orderId: f.orderId, ref: f.ref, tracking: f.tracking, date: f.date, outlet: f.outlet, customer: f.customer, account: f.account, product: f.product,
  category: f.category, qty: f.qty, revenue: f.revenue, net: f.net, cost: f.cost, state: f.state, payment: f.payment, slotStart: f.slotStart, profit: f.net - f.cost,
});
const newestFirst = (a: Fact, b: Fact) => b.date.localeCompare(a.date) || b.slotStart.localeCompare(a.slotStart) || b.ref.localeCompare(a.ref);

/** Odoo list: grouped rows (first row group) you open one at a time, else a flat paged list. */
export function buildList(facts: Fact[], q: Query) {
  const by = q.groups[0];
  if (!by) {
    const sorted = [...facts].sort(newestFirst);
    return { grouped: false as const, count: sorted.length, lines: sorted.slice((q.page - 1) * LIST_PAGE, q.page * LIST_PAGE).map(toLine), total: measure(facts) };
  }
  const groups = groupFacts(facts, by, q.measures[0]).map((g) => ({
    key: g.key, label: g.label, count: g.facts.length, totals: g.totals,
    lines: g.key === q.open ? [...g.facts].sort(newestFirst).slice((q.page - 1) * LIST_PAGE, q.page * LIST_PAGE).map(toLine) : null,
  }));
  return { grouped: true as const, by, groups, total: measure(facts), count: facts.length };
}

// ------------------------------------------------------------- comparison

/** Same-length period just before [from, to], for the KPI deltas. */
export function previousRange(from: string, to: string): [string, string] {
  const len = daysBetween(from, to) + 1;
  return [addDays(from, -len), addDays(from, -1)];
}

export async function reportContext(db: Db) {
  const now = await demoNow(db);
  const outlets = await db.select({ id: t.outlet.id, name: t.outlet.name }).from(t.outlet).orderBy(asc(t.outlet.name));
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.foodOrder).where(like(t.foodOrder.ref, "SIM/%"));
  return { now, today: now.date, outlets, sampleOrders: Number(n) };
}

// ----------------------------------------------------------- daily report

export async function dailyReport(db: Db, date: string, outletIds: string[], includeSample: boolean) {
  const facts = (await loadFacts(db, date, date)).filter((f) => (!outletIds.length || outletIds.includes(f.outletId)) && (includeSample || !f.sample));
  const sales = facts.filter((f) => f.state === "confirmed" || f.state === "collected");
  const orderIds = [...new Set(facts.map((f) => f.orderId))];
  const refunds: (typeof t.payment.$inferSelect)[] = [];
  for (let i = 0; i < orderIds.length; i += 800) {
    refunds.push(...(await db.select().from(t.payment).where(and(inArray(t.payment.orderId, orderIds.slice(i, i + 800)), eq(t.payment.kind, "refund")))));
  }
  const lost = new Map<string, { ref: string; tracking: string; customer: string; outlet: string; state: string; total: number }>();
  for (const f of facts.filter((x) => x.state === "cancelled" || x.state === "rejected")) {
    if (!lost.has(f.orderId)) lost.set(f.orderId, { ref: f.ref, tracking: f.tracking, customer: f.customer, outlet: f.outlet, state: f.state, total: 0 });
  }
  // refunded lines carry no revenue, so a lost order's value is what was refunded
  for (const r of refunds) { const l = lost.get(r.orderId); if (l) l.total += r.amount; }
  const vatable = measure(sales.filter((f) => f.account !== "employee"));
  return {
    totals: measure(sales),
    byPayment: groupFacts(sales, "payment", "revenue"),
    byCategory: groupFacts(sales, "category", "revenue"),
    bySlot: groupFacts(sales, "slot", "revenue"),
    byOutlet: groupFacts(sales, "outlet", "revenue"),
    byAccount: groupFacts(sales, "account", "revenue"),
    topProducts: groupFacts(sales, "product", "qty").sort((a, b) => b.totals.qty - a.totals.qty || b.totals.revenue - a.totals.revenue).slice(0, 10),
    vat: { base: vatable.net, amount: vatable.vat, gross: vatable.revenue, exempt: measure(sales.filter((f) => f.account === "employee")).revenue },
    refunds: refunds.reduce((a, r) => a + r.amount, 0),
    refundCount: refunds.length,
    lost: [...lost.values()],
    bulk: groupFacts(sales.filter((f) => f.channel === "bulk"), "customer", "revenue"),
  };
}

// --------------------------------------------------------- upcoming orders

export async function upcomingOrders(db: Db, today: string, daysAhead: number, outletIds: string[], includeSample: boolean) {
  const to = addDays(today, daysAhead);
  const rows = await db
    .select({ order: t.foodOrder, customer: t.customer, slot: t.pickupSlot, outlet: t.outlet })
    .from(t.foodOrder)
    .innerJoin(t.customer, eq(t.customer.id, t.foodOrder.customerId))
    .innerJoin(t.pickupSlot, eq(t.pickupSlot.id, t.foodOrder.slotId))
    .innerJoin(t.outlet, eq(t.outlet.id, t.foodOrder.outletId))
    .where(and(gte(t.foodOrder.pickupDate, today), lte(t.foodOrder.pickupDate, to), inArray(t.foodOrder.state, ["awaiting_payment", "awaiting_acceptance", "confirmed"])))
    .orderBy(asc(t.foodOrder.pickupDate), asc(t.pickupSlot.startsAt), asc(t.foodOrder.createdAt));
  const picked = rows.filter((r) => (!outletIds.length || outletIds.includes(r.order.outletId)) && (includeSample || !r.order.ref.startsWith("SIM/")));
  const ids = picked.map((r) => r.order.id);
  const lines: (typeof t.orderLine.$inferSelect)[] = [];
  for (let i = 0; i < ids.length; i += 800) lines.push(...(await db.select().from(t.orderLine).where(inArray(t.orderLine.orderId, ids.slice(i, i + 800)))));
  const byOrder = new Map<string, typeof lines>();
  for (const l of lines) if (l.state !== "refunded") (byOrder.get(l.orderId) ?? byOrder.set(l.orderId, []).get(l.orderId)!).push(l);
  const orders = picked.map((r) => ({ ...r, lines: byOrder.get(r.order.id) ?? [] }));
  // production quantities per date × product (confirmed orders only: unpaid ones may still lapse)
  const prep = new Map<string, { date: string; product: string; qty: number; orders: number }>();
  for (const o of orders.filter((x) => x.order.state === "confirmed")) {
    for (const l of o.lines) {
      const k = `${o.order.pickupDate}|${l.name}`;
      const cur = prep.get(k) ?? { date: o.order.pickupDate, product: l.name, qty: 0, orders: 0 };
      cur.qty += l.qty;
      cur.orders += 1;
      prep.set(k, cur);
    }
  }
  return { to, orders, prep: [...prep.values()].sort((a, b) => a.date.localeCompare(b.date) || b.qty - a.qty) };
}
