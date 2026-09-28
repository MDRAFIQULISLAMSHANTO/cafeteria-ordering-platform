import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getDb } from "@/db/client";
import { CustomerShell } from "@/components/customer-shell";
import { StateBadge } from "@/components/ui";
import { cutoffMs, demoNow, orderDetail } from "@/lib/orders";
import { money } from "@/lib/rules";
import { formatDay, time12 } from "@/lib/time";
import { currentCustomer } from "@/lib/session";
import { CancelButton, LiveRefresh } from "./live-bits";

const STEPS = ["Placed", "Paid", "In the kitchen", "Ready", "Collected"];

function progress(state: string, kitchen: string) {
  if (state === "collected") return 5;
  if (kitchen === "ready") return 4;
  if (kitchen === "to_cook" || kitchen === "preparing") return 3;
  if (state === "confirmed") return 2;
  return 1;
}

const btn = "o-so-btn inline-grid h-11.5 place-items-center border border-line text-base no-underline";

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const cust = await currentCustomer();
  if (!cust) redirect("/login");
  const db = await getDb();
  const d = await orderDetail(db, id);
  if (!d || d.order.customerId !== cust.id) notFound();
  const { order, slot, outlet, lines, payments } = d;
  const now = await demoNow(db);
  const qr = await QRCode.toDataURL(order.qrToken, { margin: 1, width: 480, errorCorrectionLevel: "M" });

  const step = progress(order.state, order.kitchenState);
  const closed = ["cancelled", "rejected"].includes(order.state);
  const canCancel =
    ["awaiting_payment", "awaiting_acceptance", "confirmed"].includes(order.state) &&
    ["not_released", "to_cook"].includes(order.kitchenState) &&
    now.ms < cutoffMs(order.pickupDate, slot, now).ms;

  let heading = "We're preparing your order!";
  let icon = "✓";
  let iconBg = "";
  let sub = `Pick up at ${outlet.name}, ${slot.label} ${time12(slot.startsAt)}.`;
  if (order.state === "awaiting_payment") { heading = "Waiting for payment"; icon = "…"; iconBg = "bg-warning"; sub = "Your order is saved but not yet paid. It goes to the kitchen once payment succeeds."; }
  else if (order.state === "awaiting_acceptance") { heading = "Waiting for the counter to accept"; icon = "…"; iconBg = "bg-warning"; sub = "Pay-at-counter orders reach the kitchen after staff accept them."; }
  else if (order.state === "confirmed" && order.kitchenState === "not_released") { heading = `Scheduled for ${formatDay(order.pickupDate, now.date)}`; sub = "Pre-order confirmed. It joins the kitchen queue on the pickup day."; }
  else if (order.kitchenState === "ready") { heading = "Ready for pickup!"; sub = `Show this QR code at the ${outlet.name} counter.`; }
  else if (order.state === "collected") { heading = "Collected — enjoy!"; }
  else if (order.state === "cancelled") { heading = "Order cancelled"; icon = "✕"; iconBg = "bg-danger"; sub = "Any payment has been refunded to the original method (sandbox)."; }
  else if (order.state === "rejected") { heading = "Order not accepted"; icon = "✕"; iconBg = "bg-danger"; sub = `Reason: ${order.rejectReason}. Any payment has been refunded (sandbox).`; }

  return (
    <CustomerShell customer={cust} outlet={outlet} active="orders">
      <LiveRefresh orderId={order.id} signature={`${order.state}|${order.kitchenState}`} />
      <div className="mx-auto grid max-w-[980px] items-start gap-5 px-4 py-5 md:grid-cols-[minmax(0,1fr)_340px] md:px-4 md:py-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-so-surface p-6 text-center shadow-o-sm">
            <div className={`o-so-check ${iconBg}`}>{icon}</div>
            <h1 className="text-2xl font-bold">{heading}</h1>
            <span className="kicker">Your order number</span>
            <div className="text-5xl font-bold leading-none text-so-price md:text-[3.4rem]">{order.tracking}</div>
            <p className="text-muted">{sub}</p>
            {!closed && (
              <div className="mt-3 grid w-full grid-cols-5 gap-1" aria-label="Order progress">
                {STEPS.map((s, i) => {
                  const done = i + 1 <= step;
                  const now_ = i + 1 === step && order.state !== "collected";
                  return (
                    <div key={s} className={`text-center text-2xs ${done ? "font-semibold text-ink" : "text-faint"}`}>
                      <div className={`mb-1.5 h-1.5 rounded-full ${done ? "bg-so-price" : "bg-surface-3"} ${now_ ? "animate-pulse" : ""}`} />
                      {s}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {order.state === "awaiting_payment" && <Link className={`${btn} o-so-btn-primary`} href={`/pay/${order.id}`}>Pay {money(order.total)}</Link>}
              <Link className={btn} href={`/orders/${order.id}/receipt`}>⤓ Receipt</Link>
              <Link className={btn} href="/order">Order more</Link>
              {canCancel && <CancelButton orderId={order.id} />}
            </div>
          </div>

          <div className="rounded-2xl bg-so-surface p-4 shadow-o-sm">
            <h2 className="mb-3 text-base font-bold">Order details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">Reference</dt><dd className="text-right font-medium tabular-nums">{order.ref}</dd>
              <dt className="text-muted">Pickup</dt><dd className="text-right font-medium">{formatDay(order.pickupDate, now.date)} · {slot.label} {time12(slot.startsAt)}</dd>
              <dt className="text-muted">Outlet</dt><dd className="text-right font-medium">{outlet.name}</dd>
              <dt className="text-muted">Payment</dt><dd className="text-right font-medium">{order.paymentMode === "online" ? "Online" : "At the counter"}</dd>
            </dl>
            <div className="my-4 border-t border-line" />
            {lines.map((l) => (
              <div key={l.id} className="o-so-line pt-2">
                <div><div className="o-so-line-name">{l.name}</div><div className="o-so-line-sub"><b>{l.qty}x</b> {money(l.unitPrice)}</div></div>
                <div className="o-so-line-amt">{money(l.lineTotal)}</div>
              </div>
            ))}
            <div className="o-so-order-total">
              {order.discount > 0 && <span className="block text-success">{order.discountRule}: −{money(order.discount)}</span>}
              <b>Total: {money(order.total)}</b>
              <span>{order.vatRule}{order.vat > 0 ? `: ${money(order.vat)}` : ""}</span>
            </div>
            {payments.length > 0 && (
              <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-13">
                    <span>{p.kind === "refund" ? "Refund" : "Payment"} · {p.method} · <span className="text-muted">{p.reference}</span></span>
                    <StateBadge tone={p.status === "failed" ? "bad" : p.kind === "refund" ? "wait" : "paid"}>{p.status} {money(p.amount)}</StateBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl bg-so-surface p-5 text-center shadow-o-sm md:sticky md:top-21">
          <span className="kicker">Collection QR</span>
          {closed ? (
            <div className="o-empty">No collection for this order.</div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- inline data-URL QR, nothing to optimise
            <img src={qr} alt={`Collection QR for order ${order.tracking}`} className="mx-auto w-full max-w-60 [image-rendering:pixelated]" />
          )}
          <p className="mt-3 text-xs text-muted">Staff scan this and confirm your name. No personal details are stored in the code.</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">{order.tracking}</p>
        </aside>
      </div>
    </CustomerShell>
  );
}
