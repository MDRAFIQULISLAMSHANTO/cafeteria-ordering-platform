import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import * as t from "@/db/schema";
import { RULES } from "./rules";
import { RuleError } from "./orders";

// Mobile-number OTP (sandbox). Codes are "sent" to the demo inbox; the four
// demo test numbers always receive 123456 so a live demo never waits on SMS.
const TEST_NUMBERS = new Set(["01700000001", "01700000002", "01700000003", "01700000004", "01700000005", "01700000006"]);

export function normalisePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = `0${d}`;
  if (!/^01[3-9]\d{8}$/.test(d)) throw new RuleError("Enter a Bangladeshi mobile number, e.g. 01712 345678.", "Mobile number login");
  return d;
}

export async function requestOtp(db: Db, rawPhone: string) {
  const phone = normalisePhone(rawPhone);
  const code = TEST_NUMBERS.has(phone) ? "123456" : String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + RULES.otpTtlSeconds * 1000);
  await db
    .insert(t.otp)
    .values({ phone, code, expiresAt, attempts: 0 })
    .onConflictDoUpdate({ target: t.otp.phone, set: { code, expiresAt, attempts: 0 } });
  await db.insert(t.notification).values({ id: randomUUID(), phone, channel: "sms", text: `STS Café: your login code is ${code}. It expires in 5 minutes.` });
  return phone;
}

export type VerifyResult =
  | { kind: "existing"; customerId: string }
  | { kind: "register"; phone: string; employee: typeof t.hrStaff.$inferSelect | null };

export async function verifyOtp(db: Db, rawPhone: string, code: string): Promise<VerifyResult> {
  const phone = normalisePhone(rawPhone);
  const row = (await db.select().from(t.otp).where(eq(t.otp.phone, phone)))[0];
  if (!row) throw new RuleError("Request a code first.", "OTP login");
  if (row.attempts >= RULES.otpMaxAttempts) throw new RuleError("Too many attempts. Request a new code.", `Max ${RULES.otpMaxAttempts} attempts per code`);
  if (new Date(row.expiresAt).getTime() < Date.now()) throw new RuleError("That code has expired. Request a new one.", "Codes expire after 5 minutes");
  if (row.code !== code.trim()) {
    await db.update(t.otp).set({ attempts: row.attempts + 1 }).where(eq(t.otp.phone, phone));
    throw new RuleError("Wrong code. Check the SMS and try again.", "OTP must match");
  }
  await db.delete(t.otp).where(eq(t.otp.phone, phone));

  const existing = (await db.select().from(t.customer).where(eq(t.customer.phone, phone)))[0];
  if (existing) {
    if (!existing.active) throw new RuleError("This account is inactive.", "Leavers are deactivated from the HR list");
    return { kind: "existing", customerId: existing.id };
  }
  const employee = (await db.select().from(t.hrStaff).where(eq(t.hrStaff.phone, phone)))[0] ?? null;
  if (employee && !employee.active) throw new RuleError("This staff number is no longer active on the HR list.", "Employees must be on the current HR list");
  return { kind: "register", phone, employee };
}

export type RegisterInput = {
  phone: string;
  name: string;
  accountType: "parent" | "student";
  outletId: string;
  classGrade?: string;
  section?: string;
};

export async function registerFamily(db: Db, input: RegisterInput) {
  const name = input.name.trim();
  if (name.length < 2) throw new RuleError("Enter your full name.", "Name is required");
  if (input.accountType === "student" && (!input.classGrade?.trim() || !input.section?.trim())) {
    throw new RuleError("Students need a class and section.", "Students register with class and section");
  }
  const outlet = (await db.select().from(t.outlet).where(eq(t.outlet.id, input.outletId)))[0];
  if (!outlet || outlet.kind === "corporate") throw new RuleError("Choose your campus.", "Parents and students choose a campus at registration");
  const hr = (await db.select().from(t.hrStaff).where(and(eq(t.hrStaff.phone, input.phone), eq(t.hrStaff.active, true))))[0];
  if (hr) throw new RuleError("This number belongs to a staff member — sign in as an employee.", "Employees are verified from the HR list");
  const id = randomUUID();
  await db.insert(t.customer).values({
    id,
    phone: input.phone,
    name,
    accountType: input.accountType,
    outletId: outlet.id,
    classGrade: input.accountType === "student" ? input.classGrade!.trim() : null,
    section: input.accountType === "student" ? input.section!.trim() : null,
  });
  return id;
}

export async function registerEmployee(db: Db, phone: string) {
  const hr = (await db.select().from(t.hrStaff).where(and(eq(t.hrStaff.phone, phone), eq(t.hrStaff.active, true))))[0];
  if (!hr) throw new RuleError("This number is not on the HR staff list.", "Employees are verified from the HR list");
  const id = randomUUID();
  await db.insert(t.customer).values({
    id,
    phone,
    name: hr.name,
    accountType: "employee",
    outletId: hr.outletId,
    employeeId: hr.employeeId,
    costCentre: hr.costCentre,
    discountEligible: hr.discountEligible,
    coordinator: hr.coordinator,
  });
  return id;
}
