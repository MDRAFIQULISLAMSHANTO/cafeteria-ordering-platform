import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { getDb } from "@/db/client";
import { orderDetail } from "@/lib/orders";
import { paymentLabel, taxAndDiscountRows } from "@/lib/receipt";
import { money, unitBeforeDiscount } from "@/lib/rules";
import { time12 } from "@/lib/time";
import { currentCustomer } from "@/lib/session";
import { PrintButton } from "./print-button";

// 80 mm receipt with the fields STS listed (C8 §9):
// Parent/Student — outlet name/address, BIN, invoice number, date/time,
// customer name/mobile, items, quantities, prices, subtotal, VAT 5%, total,
// payment method and transaction ID.
// Employee — the same, VAT shown as 0% (user decision), plus employee ID,
// the staff discount line and, for bulk orders, the cost centre.
// Mushak-6.3 compliance still needs STS Finance validation.
export default async function Receipt({ params }: PageProps<"/orders/[id]/receipt">) {
  const { id } = await params;
  const cust = await currentCustomer();
  if (!cust) redirect("/login");
  const d = await orderDetail(await getDb(), id);
  if (!d || d.order.customerId !== cust.id) notFound();
  const { order, outlet, slot, lines, payments, customer } = d;
  const paid = payments.filter((p) => p.kind === "payment" && p.status === "paid");
  const refunds = payments.filter((p) => p.kind === "refund");
  const qr = await QRCode.toDataURL(order.qrToken, { margin: 0, width: 160 });
  const created = new Date(order.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const units = lines.reduce((a, l) => a + l.qty, 0);
  const rows = taxAndDiscountRows(order, outlet, customer);
  const employee = order.accountType === "employee";
  const bulk = order.channel === "bulk";

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-surface-3 px-4 py-6 print:bg-receipt-bg print:p-0">
      <div className="no-print flex items-center gap-2">
        <Link className="o-btn" href={`/orders/${order.id}`}>← Back to order</Link>
        <PrintButton />
      </div>
      <div className="o-receipt shadow-o-md print:shadow-none">
        <div className="o-receipt-logo"><Image src="/branding/scafe-logo.png" alt="S Cafe" width={93} height={48} className="mx-auto" /></div>
        <div className="o-receipt-center">
          {outlet.name}
          <br />
          {outlet.address ?? `${outlet.campus} · address to be confirmed`}
          <br />
          BIN: <i>to be confirmed</i>
        </div>
        <hr className="o-receipt-rule" />
        <div className="o-receipt-center">
          Invoice {order.ref}
          <br />
          {created}
        </div>
        <hr className="o-receipt-rule" />
        <div className="o-receipt-preset">
          {bulk ? `Delivery · ${order.deliverTo ?? "room to be confirmed"}` : `Pickup · ${slot.label} ${time12(slot.startsAt)}`} · {order.pickupDate}
        </div>
        {bulk && order.eventName && <div className="o-receipt-sub"><span>Event</span><span>{order.eventName}</span></div>}
        <hr className="o-receipt-rule" />
        <div className="o-receipt-center" style={{ marginTop: 8 }}>Order number</div>
        <div className="o-receipt-tracking">{order.tracking}</div>

        {/* lines before discount so they add up to the subtotal; the discount has its own row */}
        {lines.map((l) => {
          const unit = unitBeforeDiscount(order.accountType, l.unitPrice);
          const gone = l.state === "refunded";
          return (
            <div key={l.id} className="o-receipt-line">
              <span>{l.qty}</span>
              <span>
                {l.name}
                <small>{money(unit)} / unit{employee ? " excl. VAT" : ""}{l.state !== "ok" ? ` · ${l.state.replace("_", " ")}` : ""}</small>
              </span>
              <span>{money(gone ? 0 : unit * l.qty)}</span>
            </div>
          );
        })}

        <div className="o-receipt-row o-receipt-gap"><span>Subtotal{employee ? " (excl. VAT)" : ""}:</span><span>{money(order.subtotal)}</span></div>
        {rows.discount && (
          <div className="o-receipt-row"><span>{rows.discount.label}</span><span>{rows.discount.amount < 0 ? `−${money(-rows.discount.amount)}` : money(0)}</span></div>
        )}
        <div className="o-receipt-row"><span>{rows.vat.label}</span><span>{money(rows.vat.amount)}</span></div>
        <div className="o-receipt-row o-strong"><span>Total:</span><span>{money(order.total)}</span></div>
        {paid.map((p) => (
          <div key={p.id}>
            <div className="o-receipt-row"><span>{paymentLabel(p.method)}</span><span>{money(p.amount)}</span></div>
            <div className="o-receipt-sub"><span>Transaction ID</span><span>{p.reference}</span></div>
          </div>
        ))}
        {bulk && paid.length === 0 && <div className="o-receipt-row"><span>{paymentLabel("invoice")}</span><span>{money(order.total)}</span></div>}
        {!bulk && paid.length === 0 && order.paymentMode === "counter" && (
          <div className="o-receipt-row"><span>Pay at counter · due</span><span>{money(order.total)}</span></div>
        )}
        {refunds.map((r) => (
          <div key={r.id} className="o-receipt-row"><span>Refund · {paymentLabel(r.method)}</span><span>−{money(r.amount)}</span></div>
        ))}
        <div className="o-receipt-row o-receipt-gap"><span>Total Items</span><b>{units}</b></div>

        <div className="o-receipt-invoice">
          {/* eslint-disable-next-line @next/next/no-img-element -- inline data-URL QR */}
          <img className="o-receipt-qr" src={qr} alt="Collection QR" />
          <div>
            <b>Customer</b>
            <br />
            {customer.name}
            <br />
            Mobile {customer.phone}
            <br />
            {employee ? `Employee ID ${customer.employeeId ?? "—"}` : customer.accountType === "student" ? `Student · Class ${customer.classGrade}${customer.section}` : "Parent"}
            {(bulk || employee) && (order.costCentre ?? customer.costCentre) ? <><br />Cost centre {order.costCentre ?? customer.costCentre}</> : null}
          </div>
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
