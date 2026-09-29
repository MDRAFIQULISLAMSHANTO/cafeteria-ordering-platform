// The ordering flow shown on /guide — shared by the page (server) and the
// swimlane diagram (client), so it lives in a plain module.

export const LANES = [
  { id: "customer", label: "Customer", sub: "Parent · Student · Employee" },
  { id: "app", label: "STS ordering app", sub: "Web and phone" },
  { id: "payment", label: "Payment", sub: "bKash · Nagad · Card" },
  { id: "kitchen", label: "Kitchen", sub: "Kitchen display" },
  { id: "counter", label: "Counter & Pickup TV", sub: "Outlet staff" },
  { id: "ops", label: "Operations", sub: "F&B manager" },
] as const;

export const STAGES = ["Sign in", "Order", "Pay", "Prepare", "Ready", "Collect"] as const;

export type Lane = (typeof LANES)[number]["id"];
export type Card = { lane: Lane; stage: number; text: string; n?: number };

export const FLOW: Card[] = [
  { n: 1, lane: "customer", stage: 0, text: "Signs in with a mobile number and a 6-digit SMS code" },
  { n: 2, lane: "app", stage: 0, text: "Knows the account: parent, student or employee, their campus, VAT and discount" },
  { n: 3, lane: "customer", stage: 1, text: "Picks items, the day (up to 7 days ahead) and a break-time pickup slot" },
  { n: 4, lane: "app", stage: 1, text: "Checks the cut-off, slot capacity and sold-out items before accepting" },
  { n: 5, lane: "payment", stage: 2, text: "Pays by bKash, Nagad or card. Staff may pay at the counter instead" },
  { n: 6, lane: "app", stage: 2, text: "Confirms the order and gives it a number, e.g. S12, with a QR code" },
  { n: 7, lane: "kitchen", stage: 3, text: "Today's orders appear at once; pre-orders join on their day. To cook → Preparing → Ready" },
  { n: 8, lane: "counter", stage: 4, text: "The pickup TV shows the order number under Ready" },
  { n: 9, lane: "customer", stage: 4, text: "Gets an SMS and an in-app notification: your order is ready" },
  { n: 10, lane: "counter", stage: 5, text: "Scans the QR code, checks the customer's name and hands the food over" },
];

export const SUPPORT: Card[] = [
  { lane: "customer", stage: 2, text: "Can edit or cancel until the cut-off" },
  { lane: "payment", stage: 5, text: "Refunds go back to the same method (cancel, reject, sold-out)" },
  { lane: "customer", stage: 3, text: "If an item sells out: pick a substitute or a refund within 15 minutes" },
  { lane: "counter", stage: 2, text: "Accepts staff pay-at-counter orders; delivers bulk orders to rooms" },
  { lane: "ops", stage: 1, text: "Switches sold-out items off and adds menu photos" },
  { lane: "ops", stage: 3, text: "Production list for pre-orders and bulk events" },
  { lane: "ops", stage: 5, text: "Daily sales, monthly cost-centre invoices, monthly HR staff list" },
];
