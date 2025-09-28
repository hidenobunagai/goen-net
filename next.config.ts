import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hranaLicenseShim = path.resolve(
  __dirname,
  "src/lib/shims/hrana-license.ts"
);

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false,
  },
  serverExternalPackages: ["@libsql/client", "@libsql/hrana-client"],
  turbopack: {
    resolveAlias: {
      "@libsql/hrana-client/LICENSE": hranaLicenseShim,
    },
    rules: {
      "@libsql/hrana-client/LICENSE": {
        loaders: [path.resolve(__dirname, "turbopack/license-loader.cjs")],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@libsql/hrana-client/LICENSE": hranaLicenseShim,
    };

    config.module.rules.push({
      test: /@libsql[\\/]+hrana-client[\\/]+LICENSE$/,
      use: [path.resolve(__dirname, "turbopack/license-loader.cjs")],
    });

    return config;
  },
};

export default nextConfig;
