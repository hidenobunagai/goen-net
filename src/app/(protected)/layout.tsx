import type { ReactNode } from "react";
import { requireUserSession } from "@/lib/session";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireUserSession();

  return <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-6">{children}</div>;
}
