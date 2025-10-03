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
        justifyContent: "flex-start",
        bgcolor: "background.default",
        px: 2,
        pt: { xs: 10, md: 14 },
        pb: { xs: 6, md: 10 },
      }}
    >
      <Paper
        elevation={2}
        sx={{ width: "100%", maxWidth: 400, p: { xs: 4, sm: 5 } }}
      >
        <Stack spacing={4} alignItems="center" textAlign="center">
          <Stack spacing={1}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              Sign in to Goen Net
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please sign in with your Google account to continue.
            </Typography>
          </Stack>
          <Button
            type="button"
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<GoogleIcon fontSize="small" />}
            onClick={() => signIn("google", { callbackUrl: "/" })}
            sx={{ fontWeight: 600 }}
          >
            Sign in with Google
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
