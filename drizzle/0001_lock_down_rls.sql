-- The app reaches the database only from its own server (direct Postgres
-- connection). Row-level security with no policies means Supabase's public
-- Data API (anon / authenticated keys) can read or write nothing.
ALTER TABLE "outlet" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "unavailability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pickup_slot" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hr_staff" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "otp" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "food_order" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_line" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "demo_state" ENABLE ROW LEVEL SECURITY;
