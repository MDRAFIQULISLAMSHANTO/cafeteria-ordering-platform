import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { getOutlet, statusBoard } from "@/lib/orders";

// The pickup-area TV. Order numbers only — never customer names.
export async function GET(req: NextRequest) {
  const outletId = req.nextUrl.searchParams.get("outlet") ?? "ISD-CAF";
  const db = await getDb();
  const [outlet, board] = await Promise.all([getOutlet(db, outletId), statusBoard(db, outletId)]);
  return NextResponse.json({ outlet: { id: outlet.id, name: outlet.name }, ...board });
}
