import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { orderDetail } from "@/lib/orders";
import { currentCustomer } from "@/lib/session";

// Live status for the customer's tracking page. Owner only.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const cust = await currentCustomer();
  if (!cust) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const detail = await orderDetail(await getDb(), id);
  if (!detail || detail.order.customerId !== cust.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { order } = detail;
  return NextResponse.json({
    state: order.state,
    kitchenState: order.kitchenState,
    total: order.total,
    pending: detail.substitutions.filter((s) => s.status === "pending").length,
    rejectReason: order.rejectReason,
    collectedAt: order.collectedAt,
  });
}
