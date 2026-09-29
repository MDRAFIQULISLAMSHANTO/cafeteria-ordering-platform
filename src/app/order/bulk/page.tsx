import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { CustomerShell } from "@/components/customer-shell";
import { BULK_MAX_QTY, BULK_NOTICE_HOURS, dateOptions, demoNow, getOutlet, menuFor, slotsFor } from "@/lib/orders";
import { currentCustomer } from "@/lib/session";
import { at } from "@/lib/time";
import { BulkForm } from "./bulk-form";

export const metadata: Metadata = { title: "Bulk order — STS Café" };

// C8 §7: authorised coordinators book meeting/event food with 24–48 hours'
// notice, delivered to a room and billed to their cost centre monthly.
export default async function BulkOrderPage() {
  const cust = await currentCustomer();
  if (!cust) redirect("/login?next=/order/bulk");
  if (cust.accountType !== "employee" || !cust.coordinator) redirect("/order");
  const db = await getDb();
  const outlet = await getOutlet(db, cust.outletId);
  const now = await demoNow(db);
  const dates = dateOptions(now);
  // open on the first day with a delivery time far enough ahead
  let date = dates[dates.length - 1].date;
  for (const d of dates.filter((x) => x.open)) {
    const slots = await slotsFor(db, outlet.id, d.date, now);
    if (slots.some((s) => at(d.date, s.startsAt) - now.ms >= BULK_NOTICE_HOURS * 3_600_000)) { date = d.date; break; }
  }
  const [menu, slots] = await Promise.all([menuFor(db, outlet.id, date), slotsFor(db, outlet.id, date, now)]);
  return (
    <CustomerShell customer={cust} outlet={outlet} active="bulk">
      <BulkForm
        initial={{ now, date, dates, menu, slots }}
        coordinator={{ name: cust.name, costCentre: cust.costCentre ?? "—", discountEligible: cust.discountEligible }}
        outlet={{ name: outlet.name, kind: outlet.kind }}
        noticeHours={BULK_NOTICE_HOURS}
        maxQty={BULK_MAX_QTY}
      />
    </CustomerShell>
  );
}
