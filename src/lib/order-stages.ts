// The stages a customer sees for one order, with the time each was reached.
// Pickup:  Placed → Paid (or Accepted at counter) → Preparing → Ready → Collected
// Bulk:    Booked → In the kitchen → Ready → Out for delivery → Delivered
// "Done" comes from the order's state (older orders have no stage times).

import { formatDay, time12, dhakaDate, dhakaTime } from "./time";

type OrderLike = {
  channel: string; state: string; kitchenState: string; paymentMode: string; pickupDate: string; deliverTo: string | null;
  createdAt: Date | string; paidAt: Date | string | null; releasedAt: Date | string | null; startedAt: Date | string | null;
  readyAt: Date | string | null; dispatchedAt: Date | string | null; collectedAt: Date | string | null; deliveredAt: Date | string | null;
};

export type Stage = { key: string; label: string; at: string | null; status: "done" | "current" | "todo"; note?: string };

const STARTED = ["preparing", "ready", "out_for_delivery", "completed"];
const READY = ["ready", "out_for_delivery", "completed"];

function when(v: Date | string | null, today: string): string | null {
  if (!v) return null;
  const ms = new Date(v).getTime();
  const d = dhakaDate(ms);
  const t = time12(dhakaTime(ms));
  return d === today ? t : `${formatDay(d, today).replace(/^Tomorrow · |^Today · /, "")}, ${t}`;
}

export function orderStages(o: OrderLike, today: string, outletName: string): Stage[] {
  const bulk = o.channel === "bulk";
  const counter = o.paymentMode === "counter";
  const kitchenNote =
    o.kitchenState === "not_released" ? `Scheduled — joins the kitchen on ${formatDay(o.pickupDate, today)}` : "In the kitchen queue";

  const steps = bulk
    ? [
        { key: "booked", label: "Booked", done: true, at: o.createdAt, note: "" },
        { key: "kitchen", label: "In the kitchen", done: STARTED.includes(o.kitchenState), at: o.startedAt, note: kitchenNote },
        { key: "ready", label: "Ready", done: READY.includes(o.kitchenState), at: o.readyAt, note: "Being prepared now" },
        { key: "out", label: "Out for delivery", done: ["out_for_delivery", "completed"].includes(o.kitchenState), at: o.dispatchedAt, note: `Ready — being sent to ${o.deliverTo ?? "your room"}` },
        { key: "delivered", label: "Delivered", done: o.state === "collected", at: o.deliveredAt ?? o.collectedAt, note: `On its way to ${o.deliverTo ?? "your room"}` },
      ]
    : [
        { key: "placed", label: "Placed", done: true, at: o.createdAt, note: "" },
        {
          key: "paid",
          label: counter ? "Accepted at counter" : "Paid",
          done: !["awaiting_payment", "awaiting_acceptance"].includes(o.state),
          at: o.paidAt,
          note: counter ? "Waiting for the counter to accept and take payment" : "Waiting for payment",
        },
        { key: "preparing", label: "Preparing", done: STARTED.includes(o.kitchenState), at: o.startedAt, note: kitchenNote },
        { key: "ready", label: "Ready", done: READY.includes(o.kitchenState), at: o.readyAt, note: "Being prepared now" },
        { key: "collected", label: "Collected", done: o.state === "collected", at: o.collectedAt, note: `Show your QR code at the ${outletName} counter` },
      ];

  const firstTodo = steps.findIndex((s) => !s.done);
  return steps.map((s, i) => ({
    key: s.key,
    label: s.label,
    at: s.done ? when(s.at, today) : null,
    status: s.done ? "done" : i === firstTodo ? "current" : "todo",
    note: i === firstTodo ? s.note : undefined,
  }));
}
