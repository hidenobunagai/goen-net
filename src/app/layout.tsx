import { Navbar } from "@/components/navbar";
import { PWAServiceWorker } from "@/components/pwa-service-worker";
import { NextAuthSessionProvider } from "@/components/session-provider";
import TanStackQueryProvider from "@/components/tanstack-query-provider";
import { ThemeRegistry } from "@/components/theme-registry";
import Box from "@mui/material/Box";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goen Net",
  description:
    "Private alumni dashboard for sharing updates and next-session planning.",
  applicationName: "Goen Net",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/app-icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
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
  minimumScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  userScalable: false,
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeRegistry>
          <TanStackQueryProvider>
            <NextAuthSessionProvider>
              <Navbar />
              <Box component="main" sx={{ bgcolor: "background.default" }}>
                {children}
              </Box>
              <PWAServiceWorker />
            </NextAuthSessionProvider>
          </TanStackQueryProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
