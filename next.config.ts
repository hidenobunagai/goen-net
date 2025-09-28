import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false,
  },
  serverExternalPackages: ["@libsql/client", "@libsql/hrana-client"],
  turbopack: {
    resolveAlias: {
      "@libsql/hrana-client/LICENSE": "./src/lib/shims/hrana-license.ts",
    },
  },
};

export default nextConfig;
