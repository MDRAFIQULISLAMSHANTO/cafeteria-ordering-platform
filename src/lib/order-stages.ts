// The stages a customer sees for one order, with the time each was reached.
// Pickup: Ordered → Paid (or Accepted at counter) → Order placed → Preparing → Ready → Collected
// Bulk:   Booked → Order placed → Preparing → Ready → Out for delivery → Delivered
// "Order placed" = the order is in the kitchen's queue; "Preparing" starts
// when the kitchen taps Start. The active stage is where the order is now.
// Reached-or-not comes from the order's state (older orders have no stage times).

import { formatDay, time12, dhakaDate, dhakaTime } from "./time";

type OrderLike = {
  channel: string; state: string; kitchenState: string; paymentMode: string; pickupDate: string; deliverTo: string | null;
  createdAt: Date | string; paidAt: Date | string | null; releasedAt: Date | string | null; startedAt: Date | string | null;
  readyAt: Date | string | null; dispatchedAt: Date | string | null; collectedAt: Date | string | null; deliveredAt: Date | string | null;
};

export type Stage = { key: string; label: string; at: string | null; status: "done" | "active" | "todo"; note?: string };

const IN_KITCHEN = ["to_cook", "preparing", "ready", "out_for_delivery", "completed"];
const STARTED = ["preparing", "ready", "out_for_delivery", "completed"];
const READY = ["ready", "out_for_delivery", "completed"];

function when(v: Date | string | null, today: string): string | null {
  if (!v) return null;
  const ms = new Date(v).getTime();
  const d = dhakaDate(ms);
  const t = time12(dhakaTime(ms));
  return d === today ? t : `${formatDay(d, today).replace(/^Tomorrow · |^Today · /, "")}, ${t}`;
}

type Step = { key: string; label: string; reached: boolean; at: Date | string | null; note: string };

export function orderStages(o: OrderLike, today: string, outletName: string): Stage[] {
  const bulk = o.channel === "bulk";
  const counter = o.paymentMode === "counter";
  const room = o.deliverTo ?? "your room";
  const scheduled = `Scheduled — goes to the kitchen on ${formatDay(o.pickupDate, today)}`;
  const placed: Step = { key: "placed", label: "Order placed", reached: IN_KITCHEN.includes(o.kitchenState), at: o.releasedAt, note: "In the kitchen queue — cooking starts soon" };
  const preparing: Step = { key: "preparing", label: "Preparing", reached: STARTED.includes(o.kitchenState), at: o.startedAt, note: "The kitchen is cooking your order" };

  const steps: Step[] = bulk
    ? [
        { key: "booked", label: "Booked", reached: true, at: o.createdAt, note: scheduled },
        placed,
        preparing,
        { key: "ready", label: "Ready", reached: READY.includes(o.kitchenState), at: o.readyAt, note: `Ready — going out to ${room} shortly` },
        { key: "out", label: "Out for delivery", reached: ["out_for_delivery", "completed"].includes(o.kitchenState), at: o.dispatchedAt, note: `On its way to ${room}` },
        { key: "delivered", label: "Delivered", reached: o.state === "collected", at: o.deliveredAt ?? o.collectedAt, note: "" },
      ]
    : [
        { key: "ordered", label: "Ordered", reached: true, at: o.createdAt, note: counter ? "Waiting for the counter to accept and take payment" : "Waiting for payment" },
        { key: "paid", label: counter ? "Accepted at counter" : "Paid", reached: !["awaiting_payment", "awaiting_acceptance"].includes(o.state), at: o.paidAt, note: scheduled },
        placed,
        preparing,
        { key: "ready", label: "Ready", reached: READY.includes(o.kitchenState), at: o.readyAt, note: `Show your QR code at the ${outletName} counter` },
        { key: "collected", label: "Collected", reached: o.state === "collected", at: o.collectedAt, note: "" },
      ];

  const lastReached = steps.map((s) => s.reached).lastIndexOf(true);
  const finished = lastReached === steps.length - 1;
  return steps.map((s, i) => {
    const active = !finished && i === lastReached;
    return {
      key: s.key,
      label: s.label,
      at: s.reached ? when(s.at, today) : null,
      status: active ? "active" : s.reached ? "done" : "todo",
      note: active ? s.note : undefined,
    };
  });
}
