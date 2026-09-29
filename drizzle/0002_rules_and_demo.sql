CREATE TABLE "hr_sync_run" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"added" integer NOT NULL,
	"updated" integer NOT NULL,
	"deactivated" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "substitution" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"line_id" text NOT NULL,
	"product_id" text NOT NULL,
	"offered" jsonb NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"chosen_product_id" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "food_order" ADD COLUMN "event_name" text;--> statement-breakpoint
ALTER TABLE "food_order" ADD COLUMN "deliver_to" text;--> statement-breakpoint
ALTER TABLE "food_order" ADD COLUMN "cost_centre" text;--> statement-breakpoint
ALTER TABLE "food_order" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "food_order" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outlet" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "substitution" ADD CONSTRAINT "substitution_order_id_food_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."food_order"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substitution" ADD CONSTRAINT "substitution_line_id_order_line_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."order_line"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "substitution_order_idx" ON "substitution" USING btree ("order_id");--> statement-breakpoint
-- server-only access, like every other table (see 0001_lock_down_rls)
ALTER TABLE "substitution" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hr_sync_run" ENABLE ROW LEVEL SECURITY;
