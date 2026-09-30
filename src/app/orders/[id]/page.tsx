import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getDb } from "@/db/client";
import { CustomerShell } from "@/components/customer-shell";
import { OrderStages } from "@/components/order-stages";
import { StateBadge } from "@/components/ui";
import { cutoffMs, demoNow, editBlock, orderDetail } from "@/lib/orders";
import { paymentLabel, taxAndDiscountRows } from "@/lib/receipt";
import { orderStages } from "@/lib/order-stages";
import { money, unitBeforeDiscount } from "@/lib/rules";
import { formatDay, time12 } from "@/lib/time";
import { currentCustomer } from "@/lib/session";
import { CancelButton, LiveRefresh, SubstitutionPrompt } from "./live-bits";

const btn = "o-so-btn inline-grid h-11.5 place-items-center border border-line text-base no-underline";

const LINE_NOTE: Record<string, string> = { waiting: "sold out — choose above", substituted: "substitute", refunded: "refunded" };

export default async function OrderPage({ params, searchParams }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const cust = await currentCustomer();
  if (!cust) redirect("/login");
  const db = await getDb();
  const d = await orderDetail(db, id);
  if (!d || d.order.customerId !== cust.id) notFound();
  const { order, slot, outlet, lines, payments, substitutions, netPaid } = d;
  const now = await demoNow(db);
  const qr = await QRCode.toDataURL(order.qrToken, { margin: 1, width: 480, errorCorrectionLevel: "M" });
  const edited = (await searchParams).edited === "1";

  const bulk = order.channel === "bulk";
  const stages = orderStages(order, now.date, outlet.name);
  const rows = taxAndDiscountRows(order, outlet, d.customer);
  const closed = ["cancelled", "rejected"].includes(order.state);
  const pendingSubs = substitutions.filter((s) => s.status === "pending");
  const resolvedSubs = substitutions.filter((s) => s.status !== "pending" && s.status !== "cancelled");
  const canCancel =
    ["awaiting_payment", "awaiting_acceptance", "confirmed"].includes(order.state) &&
    ["not_released", "to_cook"].includes(order.kitchenState) &&
    now.ms < cutoffMs(order.pickupDate, slot, now).ms;
  const canEdit = !editBlock(order, slot, now, substitutions.length > 0);
  const due = order.total - netPaid;
  const topUp = order.state === "awaiting_payment" && netPaid > 0;

  let heading = "We're preparing your order!";
  let icon = "✓";
  let iconBg = "";
  let sub = `Pick up at ${outlet.name}, ${slot.label} ${time12(slot.startsAt)}.`;
  if (bulk) sub = `Delivery to ${order.deliverTo}, ${formatDay(order.pickupDate, now.date)} ${time12(slot.startsAt)}.`;
  if (topUp) { heading = "Pay the difference to confirm"; icon = "…"; iconBg = "bg-warning"; sub = `You changed the order. Pay ${money(due)} more and it goes back to the kitchen.`; }
  else if (order.state === "awaiting_payment") { heading = "Waiting for payment"; icon = "…"; iconBg = "bg-warning"; sub = "Your order is saved but not yet paid. It goes to the kitchen once payment succeeds."; }
  else if (order.state === "awaiting_acceptance") { heading = "Waiting for the counter to accept"; icon = "…"; iconBg = "bg-warning"; sub = "Pay-at-counter orders reach the kitchen after staff accept them."; }
  else if (order.state === "confirmed" && order.kitchenState === "not_released") { heading = bulk ? `Booked for ${formatDay(order.pickupDate, now.date)}` : `Scheduled for ${formatDay(order.pickupDate, now.date)}`; sub = bulk ? `${order.eventName} · delivery to ${order.deliverTo}. Billed to cost centre ${order.costCentre} monthly.` : "Pre-order confirmed. It joins the kitchen queue on the pickup day."; }
  else if (order.kitchenState === "ready") { heading = bulk ? "Ready — going out soon" : "Ready for pickup!"; sub = bulk ? `It will be sent to ${order.deliverTo} shortly.` : `Show this QR code at the ${outlet.name} counter.`; }
  else if (order.kitchenState === "out_for_delivery") { heading = "Out for delivery"; sub = `On its way to ${order.deliverTo}.`; }
  else if (order.kitchenState === "preparing") { heading = "Being prepared now"; }
  else if (order.state === "collected") { heading = bulk ? "Delivered" : "Collected — enjoy!"; }
  else if (order.state === "cancelled") { heading = "Order cancelled"; icon = "✕"; iconBg = "bg-danger"; sub = "Any payment has been refunded to the original method (sandbox)."; }
  else if (order.state === "rejected") { heading = "Order not accepted"; icon = "✕"; iconBg = "bg-danger"; sub = `Reason: ${order.rejectReason}. Any payment has been refunded (sandbox).`; }

  return (
    <CustomerShell customer={cust} outlet={outlet} active="orders">
      <LiveRefresh orderId={order.id} signature={`${order.state}|${order.kitchenState}|${order.total}|${pendingSubs.length}`} />
      <div className="mx-auto grid max-w-[980px] items-start gap-5 px-4 py-5 md:grid-cols-[minmax(0,1fr)_340px] md:px-4 md:py-6">
        <div className="flex flex-col gap-4">
          {edited && <div role="status" className="rounded-xl bg-success-bg px-4 py-2.5 text-sm font-semibold text-success">✓ Changes saved. The kitchen sees the new version.</div>}
          {pendingSubs.map((s) => {
            const line = lines.find((l) => l.id === s.lineId);
            return (
              <SubstitutionPrompt
                key={s.id}
                id={s.id}
                item={s.lineName}
                originalPrice={line?.unitPrice ?? 0}
                options={s.options}
                remainingMs={new Date(s.deadline).getTime() - now.ms}
              />
            );
          })}

          <div className="flex flex-col items-center gap-2 rounded-2xl bg-so-surface p-6 text-center shadow-o-sm">
            <div className={`o-so-check ${iconBg}`}>{icon}</div>
            <h1 className="text-2xl font-bold">{heading}</h1>
            <span className="kicker">{bulk ? "Bulk order" : "Your order number"}</span>
            <div className="text-5xl font-bold leading-none text-so-price md:text-[3.4rem]">{order.tracking}</div>
            <p className="text-muted">{sub}</p>
            {!closed && (
              <div className="mt-4 w-full border-t border-line pt-4">
                <OrderStages stages={stages} />
              </div>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {order.state === "awaiting_payment" && <Link className={`${btn} o-so-btn-primary`} href={`/pay/${order.id}`}>{topUp ? `Pay ${money(due)} difference` : `Pay ${money(order.total)}`}</Link>}
              {canEdit && <Link className={btn} href={`/order?edit=${order.id}`}>✎ Edit order</Link>}
              <Link className={btn} href={`/orders/${order.id}/receipt`}>⤓ Receipt</Link>
              <Link className={btn} href={bulk ? "/order/bulk" : "/order"}>{bulk ? "New bulk order" : "Order more"}</Link>
              {canCancel && <CancelButton orderId={order.id} />}
            </div>
            {!canEdit && !closed && order.state !== "collected" && !bulk && (
              <p className="text-xs text-muted">Edits close at the cut-off or once the kitchen starts.</p>
            )}
          </div>

          <div className="rounded-2xl bg-so-surface p-4 shadow-o-sm">
            <h2 className="mb-3 text-base font-bold">Order details</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">Reference</dt><dd className="text-right font-medium tabular-nums">{order.ref}</dd>
              <dt className="text-muted">{bulk ? "Delivery" : "Pickup"}</dt><dd className="text-right font-medium">{formatDay(order.pickupDate, now.date)} · {bulk ? "" : `${slot.label} `}{time12(slot.startsAt)}</dd>
              {bulk && <><dt className="text-muted">Event</dt><dd className="text-right font-medium">{order.eventName}</dd></>}
              {bulk && <><dt className="text-muted">Deliver to</dt><dd className="text-right font-medium">{order.deliverTo}</dd></>}
              <dt className="text-muted">Outlet</dt><dd className="text-right font-medium">{outlet.name}</dd>
              <dt className="text-muted">Payment</dt><dd className="text-right font-medium">{order.paymentMode === "online" ? "Online" : order.paymentMode === "invoice" ? `Monthly invoice · ${order.costCentre}` : "At the counter"}</dd>
              {order.accountType === "employee" && <><dt className="text-muted">Employee ID</dt><dd className="text-right font-medium">{d.customer.employeeId ?? "—"}</dd></>}
              {order.accountType === "student" && <><dt className="text-muted">Class</dt><dd className="text-right font-medium">{d.customer.classGrade}{d.customer.section}</dd></>}
              {order.notes && <><dt className="text-muted">Notes</dt><dd className="text-right font-medium">{order.notes}</dd></>}
            </dl>
            <div className="my-4 border-t border-line" />
            {lines.map((l) => {
              const unit = unitBeforeDiscount(order.accountType, l.unitPrice);
              const gone = l.state === "refunded";
              return (
                <div key={l.id} className="o-so-line pt-2">
                  <div>
                    <div className={`o-so-line-name ${gone ? "text-muted line-through" : ""}`}>{l.name}</div>
                    <div className="o-so-line-sub">
                      <b>{l.qty}x</b> {money(unit)}{order.accountType === "employee" ? " excl. VAT" : ""}
                      {LINE_NOTE[l.state] && <span className={`ml-1.5 rounded-full px-2 py-px text-2xs font-semibold ${l.state === "waiting" ? "bg-warning-bg text-warning" : l.state === "refunded" ? "bg-danger-bg text-danger" : "bg-info-bg text-info"}`}>{LINE_NOTE[l.state]}</span>}
                    </div>
                  </div>
                  <div className="o-so-line-amt">{money(gone ? 0 : unit * l.qty)}</div>
                </div>
              );
            })}
            {resolvedSubs.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 rounded-lg bg-so-bg px-3 py-2 text-xs text-muted">
                {resolvedSubs.map((s) => (
                  <li key={s.id}>
                    {s.status === "substituted" ? `Sold out, swapped for ${lines.find((l) => l.id === s.lineId)?.name}` : s.status === "expired" ? "Sold out, no answer in time — refunded automatically" : "Sold out — refunded at your request"}
                  </li>
                ))}
              </ul>
            )}
            <div className="o-so-order-total">
              {rows.discount && <span className={`block ${rows.discount.amount < 0 ? "text-success" : ""}`}>{rows.discount.label}: {rows.discount.amount < 0 ? `−${money(-rows.discount.amount)}` : money(0)}</span>}
              <b>Total: {money(order.total)}</b>
              <span>{rows.vat.label}: {money(rows.vat.amount)}</span>
            </div>
            {payments.length > 0 && (
              <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-3">
                {payments.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-13">
                    <span className="min-w-0 break-all">{p.kind === "refund" ? "Refund" : "Payment"} · {paymentLabel(p.method)} · <span className="text-muted">{p.reference}</span></span>
                    <StateBadge tone={p.status === "failed" ? "bad" : p.kind === "refund" ? "wait" : "paid"}>{p.status} {money(p.amount)}</StateBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl bg-so-surface p-5 text-center shadow-o-sm md:sticky md:top-21">
          {bulk ? (
            <>
              <span className="kicker">Delivery</span>
              <div className="my-4 text-3xl" aria-hidden>🛎</div>
              <p className="font-semibold">{order.deliverTo}</p>
              <p className="mt-2 text-xs text-muted">Bulk orders are delivered by the cafeteria team — no QR needed. Billed to <b>{order.costCentre}</b> on the monthly invoice.</p>
            </>
          ) : (
            <>
              <span className="kicker">Collection QR</span>
              {closed ? (
                <div className="o-empty">No collection for this order.</div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- inline data-URL QR, nothing to optimise
                <img src={qr} alt={`Collection QR for order ${order.tracking}`} className="mx-auto w-full max-w-60 [image-rendering:pixelated]" />
              )}
              <p className="mt-3 text-xs text-muted">Staff scan this and confirm your name. No personal details are stored in the code.</p>
            </>
          )}
          <p className="mt-2 text-2xl font-bold tabular-nums">{order.tracking}</p>
        </aside>
      </div>
    </CustomerShell>
  );
}
