"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";

import { logger } from "@/lib/logger";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Protected route error boundary caught error", {
      error: {
        name: error.name,
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      },
    });
  }, [error]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          py: 8,
          textAlign: "center",
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Something went wrong
        </Typography>

        <Alert severity="error" sx={{ mb: 4, textAlign: "left" }}>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: "pre-wrap" }}>
            {error.message || "An unexpected error occurred."}
          </Typography>
        </Alert>

        <Button variant="contained" onClick={reset} size="large">
          Try again
        </Button>
      </Box>
    </Container>
  );
}
