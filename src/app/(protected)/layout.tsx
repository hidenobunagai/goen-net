import { requireUserSession } from "@/lib/session";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUserSession();

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "72rem",
        mx: "auto",
        px: { xs: 2, lg: 3 },
        py: 5,
      }}
    >
      {children}
    </Box>
  );
}
