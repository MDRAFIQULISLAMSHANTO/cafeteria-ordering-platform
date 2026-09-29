import { eq } from "drizzle-orm";
import { type NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { productPhoto } from "@/db/schema";

// Serves an uploaded menu photo. URLs carry ?v=<upload time>, so each version
// can be cached for a year.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = (await (await getDb()).select().from(productPhoto).where(eq(productPhoto.productId, id)))[0];
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(row.data), {
    headers: {
      "content-type": row.mime,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
