import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notification } from "@/db/schema";

// Sandbox SMS inbox for the demo: OTP codes and order messages.
export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(notification).orderBy(desc(notification.createdAt)).limit(30);
  return NextResponse.json({ messages: rows });
}
