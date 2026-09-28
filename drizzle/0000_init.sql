CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"order_id" text,
	"outlet_id" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"account_type" text NOT NULL,
	"outlet_id" text NOT NULL,
	"class_grade" text,
	"section" text,
	"employee_id" text,
	"cost_centre" text,
	"discount_eligible" boolean DEFAULT false NOT NULL,
	"coordinator" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"clock_offset_minutes" integer DEFAULT 0 NOT NULL,
	"substitution_timeout_seconds" integer DEFAULT 900 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_order" (
	"id" text PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"tracking" text NOT NULL,
	"customer_id" text NOT NULL,
	"outlet_id" text NOT NULL,
	"channel" text DEFAULT 'online' NOT NULL,
	"pickup_date" text NOT NULL,
	"slot_id" text NOT NULL,
	"payment_mode" text NOT NULL,
	"state" text NOT NULL,
	"kitchen_state" text DEFAULT 'not_released' NOT NULL,
	"account_type" text NOT NULL,
	"subtotal" integer NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"vat" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"vat_rule" text NOT NULL,
	"discount_rule" text,
	"qr_token" text NOT NULL,
	"reject_reason" text,
	"released_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"collected_at" timestamp with time zone,
	"collected_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hr_staff" (
	"employee_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"outlet_id" text NOT NULL,
	"cost_centre" text NOT NULL,
	"discount_eligible" boolean DEFAULT false NOT NULL,
	"coordinator" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"order_id" text,
	"channel" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_line" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"line_total" integer NOT NULL,
	"state" text DEFAULT 'ok' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp" (
	"phone" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outlet" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"campus" text NOT NULL,
	"kind" text NOT NULL,
	"opens_at" text NOT NULL,
	"closes_at" text NOT NULL,
	"hours_confirmed" boolean DEFAULT false NOT NULL,
	"menu_key" text NOT NULL,
	"menu_assignment_confirmed" boolean DEFAULT false NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"kind" text NOT NULL,
	"method" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickup_slot" (
	"id" text PRIMARY KEY NOT NULL,
	"outlet_id" text NOT NULL,
	"label" text NOT NULL,
	"starts_at" text NOT NULL,
	"ends_at" text NOT NULL,
	"capacity" integer NOT NULL,
	"weekdays" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_key" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer,
	"unit" text DEFAULT 'each' NOT NULL,
	"weekday" text,
	"combo_items" jsonb,
	"flags" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unavailability" (
	"outlet_id" text NOT NULL,
	"product_id" text NOT NULL,
	"date" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unavailability_outlet_id_product_id_date_pk" PRIMARY KEY("outlet_id","product_id","date")
);
--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_outlet_id_outlet_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_order" ADD CONSTRAINT "food_order_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_order" ADD CONSTRAINT "food_order_outlet_id_outlet_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_order" ADD CONSTRAINT "food_order_slot_id_pickup_slot_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."pickup_slot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hr_staff" ADD CONSTRAINT "hr_staff_outlet_id_outlet_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_order_id_food_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."food_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_food_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."food_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_slot" ADD CONSTRAINT "pickup_slot_outlet_id_outlet_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unavailability" ADD CONSTRAINT "unavailability_outlet_id_outlet_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unavailability" ADD CONSTRAINT "unavailability_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_phone_idx" ON "customer" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "food_order_qr_idx" ON "food_order" USING btree ("qr_token");--> statement-breakpoint
CREATE INDEX "food_order_outlet_date_idx" ON "food_order" USING btree ("outlet_id","pickup_date");--> statement-breakpoint
CREATE INDEX "food_order_customer_idx" ON "food_order" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "product_menu_idx" ON "product" USING btree ("menu_key");