import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { CustomerShell } from "@/components/customer-shell";
import { dateOptions, demoNow, firstOrderableDate, getOutlet, menuFor, slotsFor } from "@/lib/orders";
import { currentCustomer } from "@/lib/session";
import { OrderScreen, type MenuPayload } from "./order-screen";

export default async function OrderPage({ searchParams }: PageProps<"/order">) {
  const cust = await currentCustomer();
  if (!cust) redirect("/login");
  const db = await getDb();
  const outlet = await getOutlet(db, cust.outletId);
  const now = await demoNow(db);
  const dates = dateOptions(now);
  const date = await firstOrderableDate(db, outlet.id, now);
  const [menu, slots] = await Promise.all([menuFor(db, outlet.id, date), slotsFor(db, outlet.id, date, now)]);
  const welcome = (await searchParams).welcome;

  const initial: MenuPayload = { now, date, dates, menu, slots };
  return (
    <CustomerShell customer={cust} outlet={outlet} active="menu">
      <OrderScreen
        initial={initial}
        customer={{ id: cust.id, name: cust.name, accountType: cust.accountType as "parent" | "student" | "employee", discountEligible: cust.discountEligible }}
        outlet={{ id: outlet.id, name: outlet.name, kind: outlet.kind, menuAssignmentConfirmed: outlet.menuAssignmentConfirmed }}
        welcome={typeof welcome === "string" ? welcome : undefined}
      />
    </CustomerShell>
  );
}
