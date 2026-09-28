import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (local embedded Postgres) loads its WASM from disk at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
