import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { counterBoard, getOutlet } from "@/lib/orders";

export async function GET(req: NextRequest) {
  const outletId = req.nextUrl.searchParams.get("outlet") ?? "ISD-CAF";
  const db = await getDb();
  const [outlet, board] = await Promise.all([getOutlet(db, outletId), counterBoard(db, outletId)]);
  return NextResponse.json({ outlet, ...board });
}
