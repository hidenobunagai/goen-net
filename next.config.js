const path = require("path");

const __dirname_local = process.cwd();
const hranaLicenseShim = path.resolve(__dirname_local, "src/lib/shims/hrana-license.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: false,
  },
  // キャッシュ制御のためのヘッダー設定
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://lh3.googleusercontent.com data:",
      "font-src 'self'",
      "connect-src 'self' https://*.turso.io https://*.googleapis.com https://*.gstatic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
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
      use: [path.resolve(__dirname_local, "turbopack/license-loader.cjs")],
    });

    return config;
  },
};

module.exports = nextConfig;
