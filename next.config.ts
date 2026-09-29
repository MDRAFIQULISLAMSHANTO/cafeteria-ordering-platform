import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (local embedded Postgres) loads its WASM from disk at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  // menu photos are resized in the browser, then sent to a server action
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default nextConfig;
