import "./globals.css";

import Box from "@mui/material/Box";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { ReactNode } from "react";

import { Navbar } from "@/components/navbar";
import { PWAServiceWorker } from "@/components/pwa-service-worker";
import { NextAuthSessionProvider } from "@/components/session-provider";
import TanStackQueryProvider from "@/components/tanstack-query-provider";
import { ThemeRegistry } from "@/components/theme-registry";

export const metadata: Metadata = {
  title: "Goen Net",
  description: "Private alumni dashboard for sharing updates and next-session planning.",
  applicationName: "Goen Net",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/app-icon.svg", type: "image/svg+xml", sizes: "any" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Goen Net",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // userScalable/maximumScale は指定しない（WCAG 1.4.4: ユーザーのピンチズームを妨げない）
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

// Force dynamic rendering to prevent static page caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable}`}>
        <ThemeRegistry>
          <TanStackQueryProvider>
            <NextAuthSessionProvider>
              <Navbar />
              <Box
                component="main"
                sx={{
                  bgcolor: "background.default",
                  minHeight: { xs: "calc(100vh - 64px)", md: "auto" },
                }}
              >
                {children}
              </Box>
              <PWAServiceWorker />
            </NextAuthSessionProvider>
          </TanStackQueryProvider>
        </ThemeRegistry>
        <Analytics />
      </body>
    </html>
  );
}
