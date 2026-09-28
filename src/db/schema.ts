// Data model for the STS online-ordering prototype.
// Shaped after Odoo so the same flow can later point at real Odoo:
//   outlet ≈ pos.config · product ≈ product.template · food_order ≈ pos.order
//   order_line ≈ pos.order.line · payment ≈ pos.payment / payment.transaction
// Money is stored in poisha (BDT × 100) as integers.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const outlet = pgTable("outlet", {
  id: text("id").primaryKey(), // short code, e.g. "ISD-CAF"
  name: text("name").notNull(),
  campus: text("campus").notNull(),
  kind: text("kind").notNull(), // cafeteria | parent_lounge | corporate
  opensAt: text("opens_at").notNull(), // "07:30", Asia/Dhaka
  closesAt: text("closes_at").notNull(),
  hoursConfirmed: boolean("hours_confirmed").notNull().default(false),
  menuKey: text("menu_key").notNull(), // which supplied menu this outlet sells
  menuAssignmentConfirmed: boolean("menu_assignment_confirmed").notNull().default(false),
  sequence: integer("sequence").notNull().default(0),
});

export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey(),
    menuKey: text("menu_key").notNull(),
    category: text("category").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    price: integer("price"), // poisha, VAT-inclusive as printed; null = not priced
    unit: text("unit").notNull().default("each"),
    weekday: text("weekday"), // "sun".."sat" for day specials
    comboItems: jsonb("combo_items").$type<string[]>(),
    flags: jsonb("flags").$type<string[]>(),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("product_menu_idx").on(t.menuKey)],
);

// A row switches one product off at one outlet for one date.
export const unavailability = pgTable(
  "unavailability",
  {
    outletId: text("outlet_id").notNull().references(() => outlet.id),
    productId: text("product_id").notNull().references(() => product.id),
    date: text("date").notNull(), // YYYY-MM-DD, Asia/Dhaka
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.outletId, t.productId, t.date] })],
);

export const pickupSlot = pgTable("pickup_slot", {
  id: text("id").primaryKey(),
  outletId: text("outlet_id").notNull().references(() => outlet.id),
  label: text("label").notNull(),
  startsAt: text("starts_at").notNull(), // "12:00"
  endsAt: text("ends_at").notNull(),
  capacity: integer("capacity").notNull(),
  weekdays: jsonb("weekdays").$type<string[]>().notNull(),
});

export const hrStaff = pgTable("hr_staff", {
  employeeId: text("employee_id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  outletId: text("outlet_id").notNull().references(() => outlet.id),
  costCentre: text("cost_centre").notNull(),
  discountEligible: boolean("discount_eligible").notNull().default(false),
  coordinator: boolean("coordinator").notNull().default(false),
  active: boolean("active").notNull().default(true),
});

export const customer = pgTable(
  "customer",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    accountType: text("account_type").notNull(), // parent | student | employee
    outletId: text("outlet_id").notNull().references(() => outlet.id),
    classGrade: text("class_grade"),
    section: text("section"),
    employeeId: text("employee_id"),
    costCentre: text("cost_centre"),
    discountEligible: boolean("discount_eligible").notNull().default(false),
    coordinator: boolean("coordinator").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customer_phone_idx").on(t.phone)],
);

export const otp = pgTable("otp", {
  phone: text("phone").primaryKey(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
});

export const foodOrder = pgTable(
  "food_order",
  {
    id: text("id").primaryKey(),
    ref: text("ref").notNull(), // STS/ISD-CAF/260928/012
    tracking: text("tracking").notNull(), // S12
    customerId: text("customer_id").notNull().references(() => customer.id),
    outletId: text("outlet_id").notNull().references(() => outlet.id),
    channel: text("channel").notNull().default("online"), // online | bulk
    pickupDate: text("pickup_date").notNull(),
    slotId: text("slot_id").notNull().references(() => pickupSlot.id),
    paymentMode: text("payment_mode").notNull(), // online | counter | invoice
    // draft → awaiting_payment | awaiting_acceptance → confirmed → collected
    // plus cancelled, rejected
    state: text("state").notNull(),
    // not_released → to_cook → preparing → ready → completed
    kitchenState: text("kitchen_state").notNull().default("not_released"),
    accountType: text("account_type").notNull(),
    subtotal: integer("subtotal").notNull(), // before discount, net of VAT
    discount: integer("discount").notNull().default(0),
    vat: integer("vat").notNull().default(0),
    total: integer("total").notNull(),
    vatRule: text("vat_rule").notNull(), // "5% inclusive" | "VAT-free (employee)"
    discountRule: text("discount_rule"),
    qrToken: text("qr_token").notNull(),
    rejectReason: text("reject_reason"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    collectedAt: timestamp("collected_at", { withTimezone: true }),
    collectedBy: text("collected_by"), // qr | lookup
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("food_order_qr_idx").on(t.qrToken),
    index("food_order_outlet_date_idx").on(t.outletId, t.pickupDate),
    index("food_order_customer_idx").on(t.customerId),
  ],
);

export const orderLine = pgTable("order_line", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => foodOrder.id),
  productId: text("product_id").notNull().references(() => product.id),
  name: text("name").notNull(),
  qty: integer("qty").notNull(),
  unitPrice: integer("unit_price").notNull(), // printed price, poisha
  lineTotal: integer("line_total").notNull(), // after account rules
  state: text("state").notNull().default("ok"),
});

export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => foodOrder.id),
  kind: text("kind").notNull(), // payment | refund
  method: text("method").notNull(), // bkash | nagad | card | cash | card_terminal | invoice
  amount: integer("amount").notNull(),
  status: text("status").notNull(), // pending | paid | failed | refunded
  reference: text("reference").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Sandbox outbox: SMS and OTP messages shown in the demo inbox.
export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  orderId: text("order_id"),
  channel: text("channel").notNull(), // sms
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  orderId: text("order_id"),
  outletId: text("outlet_id"),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const demoState = pgTable("demo_state", {
  id: integer("id").primaryKey(),
  clockOffsetMinutes: integer("clock_offset_minutes").notNull().default(0),
  substitutionTimeoutSeconds: integer("substitution_timeout_seconds").notNull().default(900),
});
