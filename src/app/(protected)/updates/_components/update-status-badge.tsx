"use client";

import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
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
      icon={<PriorityHighIcon fontSize="small" />}
      label="Urgent"
      size="small"
      color="warning"
      variant="filled"
      sx={{ fontWeight: 700 }}
    />
  );
}
