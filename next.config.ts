import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hranaLicenseShim = path.resolve(__dirname, "src/lib/shims/hrana-license.ts");

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false,
  },
  // キャッシュ制御のためのヘッダー設定
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  serverExternalPackages: ["@libsql/client", "@libsql/hrana-client"],
  turbopack: {
    resolveAlias: {
      "@libsql/hrana-client/LICENSE": hranaLicenseShim,
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
