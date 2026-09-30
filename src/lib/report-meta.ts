// Labels and URL parameters for the Operations reports. No server imports, so
// the client-side control panel and charts use the same names as the engine
// (lib/reports.ts).

export type Period = "today" | "yesterday" | "week" | "month" | "last7" | "last30" | "custom";
export const PERIOD_LABEL: Record<Period, string> = {
  today: "Today", yesterday: "Yesterday", week: "This week", month: "This month", last7: "Last 7 days", last30: "Last 30 days", custom: "Custom range",
};

export type GroupKey = "day" | "week" | "month" | "weekday" | "hour" | "slot" | "outlet" | "category" | "product" | "account" | "payment" | "channel" | "status" | "customer";
export const GROUP_LABEL: Record<GroupKey, string> = {
  day: "Date: Day", week: "Date: Week", month: "Date: Month", weekday: "Day of week", slot: "Pickup time", hour: "Order hour",
  outlet: "Outlet", category: "Product category", product: "Product", account: "Customer type", payment: "Payment method", channel: "Channel", status: "Order status", customer: "Customer",
};
/** Group-bys shown together in the panel, as Odoo separates date groupings from the rest. */
export const GROUP_SECTIONS: GroupKey[][] = [
  ["day", "week", "month", "weekday", "slot", "hour"],
  ["outlet", "category", "product", "account", "payment", "channel", "status", "customer"],
];

export type MeasureKey = "revenue" | "net" | "vat" | "discount" | "qty" | "orders" | "aov" | "cost" | "profit" | "margin";
export type MeasureDef = { label: string; short: string; kind: "money" | "count" | "pct"; additive: boolean };
export const MEASURES: Record<MeasureKey, MeasureDef> = {
  revenue: { label: "Sales (paid by customer)", short: "Sales", kind: "money", additive: true },
  net: { label: "Net sales (excl. VAT)", short: "Net sales", kind: "money", additive: true },
  vat: { label: "VAT", short: "VAT", kind: "money", additive: true },
  discount: { label: "Staff discount", short: "Discount", kind: "money", additive: true },
  qty: { label: "Items sold", short: "Items", kind: "count", additive: true },
  orders: { label: "Orders", short: "Orders", kind: "count", additive: false }, // an order spans several lines
  aov: { label: "Average order value", short: "Avg order", kind: "money", additive: false },
  cost: { label: "Est. food cost", short: "Est. cost", kind: "money", additive: true },
  profit: { label: "Est. gross profit", short: "Est. profit", kind: "money", additive: true },
  margin: { label: "Est. margin %", short: "Margin %", kind: "pct", additive: false },
};
export const MEASURE_KEYS = Object.keys(MEASURES) as MeasureKey[];

export const STATE_LABEL: Record<string, string> = {
  awaiting_payment: "Unpaid", awaiting_acceptance: "Awaiting acceptance", confirmed: "Confirmed", collected: "Collected / delivered", cancelled: "Cancelled", rejected: "Rejected",
};
export const PAYMENT_LABEL: Record<string, string> = {
  bkash: "bKash", nagad: "Nagad", card: "Card (online)", cash: "Cash at counter", card_terminal: "Card at counter", invoice: "Cost-centre invoice", none: "Not paid",
};
export const ACCOUNT_LABEL: Record<string, string> = { parent: "Parent", student: "Student", employee: "Employee" };
export const CHANNEL_LABEL: Record<string, string> = { online: "Online", bulk: "Bulk (coordinator)" };
export const TOD_LABEL: Record<string, string> = { morning: "Morning pickups (before 11:00)", midday: "Midday pickups (11:00–14:00)", afternoon: "Afternoon pickups (after 14:00)" };

export type Status = "sales" | "all" | "open" | "cancelled" | "rejected";
export const STATUS_LABEL: Record<Status, string> = {
  sales: "Sales (confirmed and collected)", all: "All orders", open: "Open (not collected yet)", cancelled: "Cancelled by customer", rejected: "Rejected by outlet",
};

export type Query = {
  period: Period; from: string; to: string;
  outlets: string[]; status: Status; accounts: string[]; channels: string[]; payments: string[]; tod: string[];
  product: string; customer: string; order: string; category: string;
  groups: GroupKey[]; col: GroupKey | null; measures: MeasureKey[];
  view: "pivot" | "graph" | "list"; chart: "bar" | "line" | "share";
  sample: boolean; page: number; open: string;
};

/** Search text facets, in the order Odoo offers them under the search bar. */
export const SEARCH_FIELDS = [
  { param: "sp", label: "Product" },
  { param: "scat", label: "Product category" },
  { param: "sc", label: "Customer" },
  { param: "so", label: "Order" },
] as const;

export function formatMeasure(kind: MeasureDef["kind"], v: number): string {
  if (kind === "pct") return `${v.toFixed(1)}%`;
  if (kind === "count") return v.toLocaleString("en-IN");
  const taka = v / 100;
  return `৳${taka.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Compact money for chart axes: ৳12.5k, ৳1.2L (lakh), as Bangladeshi finance reads it. */
export function compactMoney(poisha: number): string {
  const t = poisha / 100;
  if (Math.abs(t) >= 100000) return `৳${(t / 100000).toFixed(t >= 1000000 ? 0 : 1)}L`;
  if (Math.abs(t) >= 1000) return `৳${(t / 1000).toFixed(t >= 10000 ? 0 : 1)}k`;
  return `৳${Math.round(t)}`;
}

export const niceDate = (d: string, withYear = false) =>
  new Date(`${d}T12:00:00+06:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "Asia/Dhaka" });
