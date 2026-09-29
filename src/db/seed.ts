import "server-only";
import { sql } from "drizzle-orm";
import type { Db } from "./client";
import * as t from "./schema";
import catalog from "./data/menu-catalog.json";
import { PERSONAS } from "@/lib/demo-personas";

// Demo data. Outlets come from the client's online-ordering answers (C8);
// hours from the original checklist where known. Products are the two
// supplied menus, transcribed as printed. Which outlet sells which menu is a
// SAMPLE assignment (menuAssignmentConfirmed = false) until Invento maps it.

const SCHOOL_DAYS = ["sun", "mon", "tue", "wed", "thu"];

const OUTLETS: (typeof t.outlet.$inferInsert)[] = [
  { id: "ISD-CAF", name: "ISD Cafeteria", campus: "ISD Bashundhara", kind: "cafeteria", opensAt: "07:30", closesAt: "15:30", hoursConfirmed: true, menuKey: "menu-a" },
  { id: "ISD-PL", name: "ISD Parent Lounge", campus: "ISD Bashundhara", kind: "parent_lounge", opensAt: "07:30", closesAt: "16:30", hoursConfirmed: true, menuKey: "menu-b" },
  { id: "UCBD", name: "UCBD Cafeteria", campus: "UCBD", kind: "cafeteria", opensAt: "08:30", closesAt: "17:30", hoursConfirmed: true, menuKey: "menu-a" },
  { id: "GIS-SAT", name: "GIS Satarkul Cafeteria", campus: "GIS Satarkul", kind: "cafeteria", opensAt: "07:30", closesAt: "15:30", hoursConfirmed: false, menuKey: "menu-a" },
  { id: "GIS-UTT", name: "GIS Uttara Cafeteria", campus: "GIS Uttara", kind: "cafeteria", opensAt: "07:30", closesAt: "15:30", hoursConfirmed: false, menuKey: "menu-a" },
  { id: "HO", name: "Corporate Office Cafeteria", campus: "STS Head Office", kind: "corporate", opensAt: "09:00", closesAt: "17:00", hoursConfirmed: false, menuKey: "menu-b" },
];

function slotsFor(o: typeof t.outlet.$inferInsert): (typeof t.pickupSlot.$inferInsert)[] {
  if (o.kind === "cafeteria") {
    return [
      { id: `${o.id}-SNACK`, outletId: o.id, label: "Snack break", startsAt: "10:00", endsAt: "10:20", capacity: 60, weekdays: SCHOOL_DAYS },
      { id: `${o.id}-LUNCH`, outletId: o.id, label: "Lunch", startsAt: "12:00", endsAt: "12:40", capacity: 80, weekdays: SCHOOL_DAYS },
      { id: `${o.id}-AFTER`, outletId: o.id, label: "After school", startsAt: "15:00", endsAt: "15:20", capacity: 40, weekdays: SCHOOL_DAYS },
    ];
  }
  const hours = o.kind === "parent_lounge" ? ["08:30", "10:00", "11:30", "13:00", "14:30", "16:00"] : ["09:30", "11:00", "12:30", "13:30", "15:00", "16:30"];
  return hours.map((h) => {
    const [hh, mm] = h.split(":").map(Number);
    const end = `${String(hh).padStart(2, "0")}:${String(mm + 20).padStart(2, "0")}`;
    return { id: `${o.id}-${h.replace(":", "")}`, outletId: o.id, label: "Pickup", startsAt: h, endsAt: end, capacity: 15, weekdays: SCHOOL_DAYS };
  });
}

type CatalogItem = {
  id: string; menu: string; section: string; name: string; description?: string;
  price_bdt: number | null; unit: string; available_weekday?: string; combo_items?: string[]; flags?: string[];
};

const PRODUCTS: (typeof t.product.$inferInsert)[] = (catalog.products as CatalogItem[]).map((p, i) => ({
  id: p.id,
  menuKey: p.menu,
  category: p.section,
  name: p.name,
  description: p.description ?? null,
  price: p.price_bdt == null ? null : Math.round(p.price_bdt * 100),
  unit: p.unit,
  weekday: p.available_weekday ?? null,
  comboItems: p.combo_items ?? null,
  flags: p.flags ?? null,
  active: p.price_bdt != null,
  sort: i,
}));

// Sample HR staff list (fictional people). Employees can only register if
// their phone is on this list; outlet and cost centre come from here.
const HR: (typeof t.hrStaff.$inferInsert)[] = [
  { employeeId: "E1023", name: "Farhana Akter", phone: "01700000003", outletId: "ISD-PL", costCentre: "ISD-ADMIN", discountEligible: true },
  { employeeId: "E2001", name: "Tanvir Ahmed", phone: "01700000004", outletId: "HO", costCentre: "HO-FIN", coordinator: true },
  { employeeId: "E1044", name: "Sabbir Hasan", phone: "01700000005", outletId: "ISD-CAF", costCentre: "ISD-ACAD", discountEligible: true },
  { employeeId: "E1107", name: "Nadia Islam", phone: "01700000006", outletId: "ISD-PL", costCentre: "ISD-ACAD", discountEligible: true },
  { employeeId: "E3010", name: "Rakib Chowdhury", phone: "01700000007", outletId: "UCBD", costCentre: "UCBD-OPS" },
  { employeeId: "E2015", name: "Mitu Sultana", phone: "01700000008", outletId: "HO", costCentre: "HO-HR" },
  { employeeId: "E1090", name: "Imran Kabir (left)", phone: "01700000009", outletId: "ISD-CAF", costCentre: "ISD-ACAD", active: false },
];

// The demo personas (see src/lib/demo-personas.ts). Test numbers always
// receive OTP 123456; the presenter switches between them after one login.
const CUSTOMERS: (typeof t.customer.$inferInsert)[] = PERSONAS.map((p) => ({ ...p.customer }));

export const TEST_PHONES = PERSONAS.map((p) => ({ phone: p.customer.phone, name: p.customer.name, type: p.customer.accountType, actor: p.actor, who: p.who }));

async function insertAll(db: Db) {
  await db.insert(t.outlet).values(OUTLETS);
  await db.insert(t.product).values(PRODUCTS);
  await db.insert(t.pickupSlot).values(OUTLETS.flatMap(slotsFor));
  await db.insert(t.hrStaff).values(HR);
  await db.insert(t.customer).values(CUSTOMERS);
  await db.insert(t.demoState).values({ id: 1, clockOffsetMinutes: 0, substitutionTimeoutSeconds: 900 });
}

export async function seedIfEmpty(db: Db) {
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(t.outlet);
  if (rows[0].n === 0) await insertAll(db);
  else await ensureDemoPersonas(db);
}

/** Adds any demo persona missing from an existing database (no wipe). */
export async function ensureDemoPersonas(db: Db) {
  await db.insert(t.customer).values(CUSTOMERS).onConflictDoNothing();
}

export async function resetDemo(db: Db) {
  await db.execute(sql`TRUNCATE TABLE substitution, hr_sync_run, audit_log, notification, payment, order_line, food_order, otp, customer, hr_staff, unavailability, pickup_slot, product, outlet, demo_state CASCADE`);
  await insertAll(db);
}
