import { NextResponse } from "next/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notification } from "@/db/schema";
import { currentCustomer } from "@/lib/session";

// The signed-in customer's own order messages for the in-app bell (C8 §11).
// Login codes are left out; they only ever go to the phone.
export async function GET() {
  const cust = await currentCustomer();
  if (!cust) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const rows = await (await getDb())
    .select({ id: notification.id, orderId: notification.orderId, text: notification.text, createdAt: notification.createdAt })
    .from(notification)
    .where(and(eq(notification.phone, cust.phone), isNotNull(notification.orderId)))
    .orderBy(desc(notification.createdAt))
    .limit(15);
  return NextResponse.json({ messages: rows }, { headers: { "cache-control": "no-store" } });
}
