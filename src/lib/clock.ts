import "server-only";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { demoState } from "@/db/schema";
import { dhakaDate, dhakaTime } from "./time";

// "Now" for every business rule: real time plus the demo-clock offset.
export async function demoNow(db: Db) {
  const rows = await db.select().from(demoState).where(eq(demoState.id, 1));
  const offset = rows[0]?.clockOffsetMinutes ?? 0;
  const ms = Date.now() + offset * 60_000;
  return { ms, date: dhakaDate(ms), time: dhakaTime(ms), offsetMinutes: offset };
}

export type DemoNow = Awaited<ReturnType<typeof demoNow>>;
