"use client";

import Button from "@mui/material/Button";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <Button
      variant="outlined"
      color="inherit"
      onClick={() => signOut({ callbackUrl: "/signin" })}
    >
      Sign out
    </Button>
  );
}
