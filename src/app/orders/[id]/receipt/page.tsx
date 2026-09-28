import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getDb } from "@/db/client";
import { orderDetail } from "@/lib/orders";
import { money } from "@/lib/rules";
import { time12 } from "@/lib/time";
import { currentCustomer } from "@/lib/session";
import { PrintButton } from "./print-button";

// 80 mm receipt. Fields follow the client's list (C8): outlet, BIN, invoice
// number, date/time, customer, items, subtotal, VAT, total, payment method and
// transaction ID. Mushak-6.3 compliance still needs STS Finance validation.
export default async function Receipt({ params }: PageProps<"/orders/[id]/receipt">) {
  const { id } = await params;
  const cust = await currentCustomer();
  if (!cust) redirect("/login");
  const d = await orderDetail(await getDb(), id);
  if (!d || d.order.customerId !== cust.id) notFound();
  const { order, outlet, slot, lines, payments, customer } = d;
  const paid = payments.find((p) => p.kind === "payment" && p.status === "paid");
  const refunds = payments.filter((p) => p.kind === "refund");
  const qr = await QRCode.toDataURL(order.qrToken, { margin: 0, width: 160 });
  const created = new Date(order.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const units = lines.reduce((a, l) => a + l.qty, 0);

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-surface-3 px-4 py-6 print:bg-receipt-bg print:p-0">
      <div className="no-print flex items-center gap-2">
        <Link className="o-btn" href={`/orders/${order.id}`}>← Back to order</Link>
        <PrintButton />
      </div>
      <div className="o-receipt shadow-o-md print:shadow-none">
        <div className="o-receipt-logo">STS Café</div>
        <div className="o-receipt-center">
          {outlet.name}<br />{outlet.campus}<br />BIN: <i>pending</i>
        </div>
        <hr className="o-receipt-rule" />
        <div className="o-receipt-center">Invoice {order.ref}<br />{created}</div>
        <hr className="o-receipt-rule" />
        <div className="o-receipt-preset">Pickup · {slot.label} {time12(slot.startsAt)} · {order.pickupDate}</div>
        <hr className="o-receipt-rule" />
        <div className="o-receipt-center" style={{ marginTop: 8 }}>Order number</div>
        <div className="o-receipt-tracking">{order.tracking}</div>

        {lines.map((l) => (
          <div key={l.id} className="o-receipt-line">
            <span>{l.qty}</span>
            <span>{l.name}<small>{money(l.unitPrice)} / unit</small></span>
            <span>{money(l.lineTotal)}</span>
          </div>
        ))}

        <div className="o-receipt-row o-receipt-gap"><span>Subtotal:</span><span>{money(order.subtotal)}</span></div>
        {order.discount > 0 && <div className="o-receipt-row"><span>{order.discountRule}</span><span>−{money(order.discount)}</span></div>}
        <div className="o-receipt-row"><span>{order.vatRule}</span><span>{money(order.vat)}</span></div>
        <div className="o-receipt-row o-strong"><span>Total:</span><span>{money(order.total)}</span></div>
        {paid && <div className="o-receipt-row"><span>{paid.method}</span><span>{money(paid.amount)}</span></div>}
        {paid && <div className="o-receipt-sub"><span>Txn</span><span>{paid.reference}</span></div>}
        {refunds.map((r) => <div key={r.id} className="o-receipt-row"><span>Refund · {r.method}</span><span>−{money(r.amount)}</span></div>)}
        <div className="o-receipt-row o-receipt-gap"><span>Total Items</span><b>{units}</b></div>

        <div className="o-receipt-invoice">
          {/* eslint-disable-next-line @next/next/no-img-element -- inline data-URL QR */}
          <img className="o-receipt-qr" src={qr} alt="Collection QR" />
          <div><b>Customer</b><br />{customer.name}<br />Mobile ···{customer.phone.slice(-3)}<br />{customer.accountType}</div>
        </div>
        <div className="o-receipt-foot">
          <div>STS Group</div>
          <div>Mushak-6.3 layout<br />pending Finance</div>
        </div>
        <div className="o-receipt-powered">Prototype receipt · sandbox payment</div>
      </div>
    </div>
  );
}
