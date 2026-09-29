import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { CustomerShell } from "@/components/customer-shell";
import { orderDetail } from "@/lib/orders";
import { currentCustomer } from "@/lib/session";
import { PayForm } from "./pay-form";

export default async function PayPage({ params }: PageProps<"/pay/[id]">) {
  const { id } = await params;
  const cust = await currentCustomer();
  if (!cust) redirect("/login");
  const d = await orderDetail(await getDb(), id);
  if (!d || d.order.customerId !== cust.id) notFound();
  if (d.order.state !== "awaiting_payment") redirect(`/orders/${id}`);
  return (
    <CustomerShell customer={cust} outlet={d.outlet} active="none">
      <PayForm
        orderId={id}
        total={d.order.total - d.netPaid}
        topUp={d.netPaid > 0}
        tracking={d.order.tracking}
        ref_={d.order.ref}
        failedBefore={d.payments.some((p) => p.status === "failed")}
      />
    </CustomerShell>
  );
}
