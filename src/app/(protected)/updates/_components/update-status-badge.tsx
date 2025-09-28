"use client";

import { Chip } from "@mui/material";

export type UpdateStatusBadgeProps = {
  urgent: boolean;
};

export function UpdateStatusBadge({ urgent }: UpdateStatusBadgeProps) {
  if (!urgent) {
    return null;
  }

  return (
    <Chip
      label="!"
      size="small"
      color="warning"
      variant="filled"
      sx={{
        fontWeight: 800,
        fontSize: "0.9rem",
        minWidth: 32,
        letterSpacing: 0.5,
      }}
    />
  );
}
