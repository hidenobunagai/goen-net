"use client";

import type { SessionProviderProps } from "next-auth/react";
import { SessionProvider } from "next-auth/react";

export function NextAuthSessionProvider({ children, ...rest }: SessionProviderProps) {
  return <SessionProvider {...rest}>{children}</SessionProvider>;
}
