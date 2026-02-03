"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";

import { logger } from "@/lib/logger";

export default function UpdatesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Updates page error", {
      error: {
        name: error.name,
        message: error.message,
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <Box sx={{ p: 3 }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={reset}>
            Retry
          </Button>
        }
      >
        <Typography variant="body2">Failed to load updates. Please try again.</Typography>
      </Alert>
    </Box>
  );
}
