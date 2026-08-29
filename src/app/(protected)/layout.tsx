import Box from "@mui/material/Box";
import type { ReactNode } from "react";

import { requireUserSession } from "@/lib/session";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireUserSession();

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #001a33 0%, #003366 100%)",
      }}
    >
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
    </Box>
  );
}
