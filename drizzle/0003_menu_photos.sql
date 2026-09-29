CREATE TABLE "product_photo" (
	"product_id" text PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- server-only access, like every other table (see 0001_lock_down_rls)
ALTER TABLE "product_photo" ENABLE ROW LEVEL SECURITY;
