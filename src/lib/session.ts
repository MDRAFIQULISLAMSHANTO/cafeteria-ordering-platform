import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { customer } from "@/db/schema";

const COOKIE = "sts_session";
const DEV_SECRET = "local-dev-only-secret-change-me-0123456789";

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return new TextEncoder().encode(value ?? DEV_SECRET);
}

export async function startSession(customerId: string) {
  const token = await new SignJWT({ cid: customerId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

// A verified phone waiting to finish registration (10 minutes).
const PENDING = "sts_pending_phone";

export async function setPendingPhone(phone: string) {
  const token = await new SignJWT({ phone }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(secret());
  (await cookies()).set(PENDING, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
}

export async function getPendingPhone(): Promise<string | null> {
  const token = (await cookies()).get(PENDING)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return String(payload.phone);
  } catch {
    return null;
  }
}

export async function clearPendingPhone() {
  (await cookies()).delete(PENDING);
}

export async function currentCustomer() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const db = await getDb();
    const rows = await db.select().from(customer).where(eq(customer.id, String(payload.cid)));
    const c = rows[0];
    return c && c.active ? c : null;
  } catch {
    return null;
  }
}

export type Customer = NonNullable<Awaited<ReturnType<typeof currentCustomer>>>;
