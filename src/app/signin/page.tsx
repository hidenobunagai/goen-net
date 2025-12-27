"use client";

import GoogleIcon from "@mui/icons-material/Google";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#020617", // Slate 950
        backgroundImage: "radial-gradient(ellipse at 50% 0%, #1E293B 0%, #020617 100%)",
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 420,
          p: { xs: 4, sm: 6 },
          backgroundColor: (theme) => `rgba(255, 255, 255, 0.03)`,
          backdropFilter: "blur(24px)",
          borderRadius: 4,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <Stack spacing={5} alignItems="center" textAlign="center">
          <Stack spacing={2} sx={{ width: "100%" }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #D4AF37 0%, #FCD34D 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 1,
                boxShadow: "0 8px 16px rgba(212, 175, 55, 0.2)",
              }}
            >
              <Typography variant="h5" sx={{ color: "#0F172A", fontWeight: 800 }}>
                G
              </Typography>
            </Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                color: "#F8FAFC",
                letterSpacing: "-0.01em",
              }}
            >
              Welcome to Goen Net
            </Typography>
            <Typography variant="body1" sx={{ color: "#94A3B8" }}>
              The private mentoring network for visionary leaders.
            </Typography>
          </Stack>

          <Button
            type="button"
            variant="contained"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={() => signIn("google", { callbackUrl: "/" })}
            sx={{
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 600,
              color: "#0F172A",
              bgcolor: "#F8FAFC",
              "&:hover": {
                bgcolor: "#E2E8F0",
              },
            }}
          >
            Sign in with Google
          </Button>

          <Typography variant="caption" sx={{ color: "#64748B" }}>
            By signing in, you agree to our confidentiality protocols.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
