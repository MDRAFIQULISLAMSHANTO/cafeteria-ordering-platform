import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { dateOptions, demoNow, firstOrderableDate, menuFor, slotsFor } from "@/lib/orders";
import { currentCustomer } from "@/lib/session";

// Menu, pickup slots and date options for the signed-in customer's outlet.
export async function GET(req: NextRequest) {
  const cust = await currentCustomer();
  if (!cust) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const db = await getDb();
  const now = await demoNow(db);
  const dates = dateOptions(now);
  const requested = req.nextUrl.searchParams.get("date");
  const date = dates.find((d) => d.date === requested && d.open)?.date ?? (await firstOrderableDate(db, cust.outletId, now));
  const [menu, slots] = await Promise.all([menuFor(db, cust.outletId, date), slotsFor(db, cust.outletId, date, now)]);
  return NextResponse.json({ now, date, dates, menu, slots });
}
