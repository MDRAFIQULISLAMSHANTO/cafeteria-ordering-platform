import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";

// One API, two backends:
// - DATABASE_URL set (Supabase, via its transaction pooler) → postgres-js;
//   schema applied with `pnpm db:migrate`
// - not set (local dev) → PGlite, a real Postgres compiled to WASM, stored in
//   ./.data/pglite, migrated and seeded automatically on first use.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

type Cache = { db?: Promise<Db> };
const cache = globalThis as unknown as { __stsDb?: Cache };
cache.__stsDb ??= {};

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    // prepare:false is required by Supabase's transaction pooler (port 6543)
    const client = postgres(url, { prepare: false, max: 5 });
    const db = drizzle(client, { schema }) as unknown as Db;
    // Schema is migrated ahead of time (pnpm db:migrate); demo data is
    // loaded on first use so a fresh Supabase project works immediately.
    const { seedIfEmpty } = await import("./seed");
    await seedIfEmpty(db);
    return db;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(path.dirname(dir), { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const typed = db as unknown as Db;
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(typed);
  return typed;
}

export function getDb(): Promise<Db> {
  cache.__stsDb!.db ??= create().catch((err) => {
    cache.__stsDb!.db = undefined;
    throw err;
  });
  return cache.__stsDb!.db;
}
