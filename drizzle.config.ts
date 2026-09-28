import { defineConfig } from "drizzle-kit";

// Generates SQL migrations into ./drizzle. They are applied to the local
// PGlite database on first use and to Supabase with `pnpm db:migrate`.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
