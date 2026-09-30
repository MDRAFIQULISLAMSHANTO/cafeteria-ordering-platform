// The ordering flow shown on /guide — shared by the page (server) and the
// swimlane diagram (client), so it lives in a plain module.

export const LANES = [
  { id: "customer", label: "Customer", sub: "Parent · Student · Employee" },
  { id: "app", label: "S Cafe ordering app", sub: "Web and phone" },
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
  { n: 10, lane: "counter", stage: 5, text: "Scans the QR code with the camera, checks the customer's name and hands the food over" },
];

export const SUPPORT: Card[] = [
  { lane: "customer", stage: 2, text: "Can edit or cancel until the cut-off" },
  { lane: "payment", stage: 5, text: "Refunds go back to the same method (cancel, reject, sold-out)" },
  { lane: "customer", stage: 3, text: "If an item sells out: pick a substitute or a refund within 15 minutes" },
  { lane: "counter", stage: 2, text: "Accepts staff pay-at-counter orders" },
  { lane: "counter", stage: 4, text: "Bulk orders: Send out for delivery → Delivery complete" },
  { lane: "ops", stage: 1, text: "Switches sold-out items off and adds menu photos" },
  { lane: "ops", stage: 3, text: "Production list for pre-orders and bulk events" },
  { lane: "ops", stage: 5, text: "Daily sales, monthly cost-centre invoices, monthly HR staff list" },
];

// The 10-minute demo script, shown on /guide and in the floating guide panel.
export const DEMO_LOGIN = "01700000001";

export type Step = { do: string; see: string; open?: { href: string; label: string } };
export type Story = { n: number; title: string; who: string; minutes: string; steps: Step[] };

export const STORIES: Story[] = [
  {
    n: 1, title: "A parent orders lunch", who: "Parent — Nusrat", minutes: "3 min",
    steps: [
      { do: `Sign in with ${DEMO_LOGIN}, code 123456.`, see: "No password — mobile number and a one-time code.", open: { href: "/login", label: "Sign in" } },
      { do: "Add a lunch item and pick today's Lunch slot.", see: "Each slot shows its order-by time; full or closed slots can't be picked. VAT 5% is shown as included." },
      { do: "Checkout → pay with bKash.", see: "Order number (e.g. S1), a collection QR code and a stage tracker: Ordered → Paid → Order placed → Preparing → Ready → Collected, each with its time. Payment is a sandbox." },
      { do: "DEMO ▾ → Kitchen. Tap Start, then Ready.", see: "The ticket arrives on its own (customer sees Order placed). Start → Preparing, Ready → Ready.", open: { href: "/kds?outlet=ISD-CAF", label: "Kitchen" } },
      { do: "DEMO ▾ → Pickup TV.", see: "The number moves to Ready — please collect.", open: { href: "/status?outlet=ISD-CAF", label: "Pickup TV" } },
      { do: "DEMO ▾ → Counter. Scan QR (camera) or type the number, tick the name check, hand over.", see: "Collection needs the QR or number plus the customer's name. The customer's tracker turns to Collected.", open: { href: "/counter?outlet=ISD-CAF", label: "Counter" } },
    ],
  },
  {
    n: 2, title: "A student pre-orders for tomorrow", who: "Student — Arif (8B)", minutes: "1 min",
    steps: [
      { do: "DEMO ▾ → Student. Pick tomorrow, a slot, and pay.", see: "Class and section print on the ticket and receipt." },
      { do: "Open Operations.", see: "The order waits in the production list — it joins the kitchen on its day.", open: { href: "/admin?outlet=ISD-CAF", label: "Operations" } },
    ],
  },
  {
    n: 3, title: "An employee at the Parent Lounge", who: "Employee — Farhana", minutes: "2 min",
    steps: [
      { do: "DEMO ▾ → Employee — Farhana. Add an item.", see: "20% staff discount (Parent Lounge only) and VAT 0% — employees are VAT-free." },
      { do: "Choose Pay at counter and place the order.", see: "It waits for the counter — it doesn't reach the kitchen yet." },
      { do: "DEMO ▾ → Counter → Card.", see: "Accepted and sent to the kitchen. The receipt shows the discount line and VAT 0%." },
      { do: "Optional: DEMO ▾ → Employee — Sabbir (Cafeteria).", see: "VAT 0% too, but the discount line explains it's Parent Lounge only." },
    ],
  },
  {
    n: 4, title: "Changes and a sold-out item", who: "Parent — Nusrat", minutes: "2 min",
    steps: [
      { do: "Open the order → Edit order → add an item → Save.", see: "Pay only the difference. Removing an item refunds the difference instead. Edits close at the cut-off or once cooking starts." },
      { do: "On the demo hub, set the substitution timer to 60 seconds.", see: "STS's rule is 15 minutes; 60 s is just for the demo.", open: { href: "/demo", label: "Demo hub" } },
      { do: "Operations → switch that item off (sold out).", see: "The customer is offered up to three similar items or a refund, with a countdown. No answer = automatic refund." },
    ],
  },
  {
    n: 5, title: "A coordinator books a meeting", who: "Coordinator — Tanvir", minutes: "2 min",
    steps: [
      { do: "DEMO ▾ → Coordinator → Bulk order.", see: "Needs 24 hours' notice; times sooner than that are blocked. Delivered to a room, no payment now." },
      { do: "Demo hub → +1 day. Kitchen → Start → Ready.", see: "On its day the order reaches the kitchen with the room to deliver to." },
      { do: "Counter → Send out → Delivery complete.", see: "The coordinator's tracker shows Booked → Order placed → Preparing → Ready → Out for delivery → Delivered." },
      { do: "Operations → Cost-centre invoices.", see: "Bulk orders are billed to the cost centre on a monthly invoice." },
    ],
  },
  {
    n: 6, title: "The back office", who: "Operations", minutes: "1 min",
    steps: [
      { do: "Operations → HR staff list → Import sample list.", see: "Joiners added, a leaver deactivated — their number can no longer sign in.", open: { href: "/admin/hr", label: "HR list" } },
      { do: "Operations → Menu → Upload a photo on any item.", see: "The outlet's own photo replaces the sample photo straight away." },
    ],
  },
];
