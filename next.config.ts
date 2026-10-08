import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite is the CRM's local-development database (src/lib/crm/db.ts). It
  // ships a WASM Postgres that must be loaded from node_modules, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  async redirects() {
    return [
      {
        source: "/free-course",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
