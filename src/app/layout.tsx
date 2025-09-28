import { Navbar } from "@/components/navbar";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { ThemeRegistry } from "@/components/theme-registry";
import Box from "@mui/material/Box";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goen Net",
  description:
    "Private alumni dashboard for sharing updates and next-session planning.",
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
          <NextAuthSessionProvider>
            <Navbar />
            <Box component="main" sx={{ bgcolor: "background.default" }}>
              {children}
            </Box>
          </NextAuthSessionProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
