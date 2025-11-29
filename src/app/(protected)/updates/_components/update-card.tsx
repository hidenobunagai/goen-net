"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";

import type { UpdateRecord } from "@/lib/updates";

// Color palette for user badges (distinct, accessible colors)
const USER_BADGE_COLORS = [
  "#1976d2", // blue
  "#2e7d32", // green
  "#ed6c02", // orange
  "#9c27b0", // purple
  "#d32f2f", // red
  "#0288d1", // light blue
  "#f57c00", // deep orange
  "#7b1fa2", // deep purple
  "#00796b", // teal
  "#c62828", // dark red
];

// Deterministic color assignment based on user ID
export function getUserBadgeColor(uid: string): string {
  if (!uid) return USER_BADGE_COLORS[0];
  const hash = uid.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USER_BADGE_COLORS[hash % USER_BADGE_COLORS.length];
}

export function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return fullName;
  }
  const [first] = trimmed.split(/\s+/);
  return first || trimmed;
}

type UpdateCardProps = {
  item: UpdateRecord;
  onClick: (item: UpdateRecord) => void;
};

export function UpdateCard({ item, onClick }: UpdateCardProps) {
  const displayName = getFirstName(item.by);

  return (
    <Paper
      variant="outlined"
      onClick={() => onClick(item)}
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 2,
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        bgcolor: item.urgent ? "#fff4e5" : "#ffffff",
        borderColor: item.urgent ? "#ff9800" : "divider",
        borderLeftWidth: item.urgent ? 4 : 1,
        cursor: "pointer",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Stack spacing={1}>
        {/* Header: Name badge */}
        <Box
          sx={{
            px: 1.2,
            py: 0.4,
            borderRadius: 999,
            bgcolor: getUserBadgeColor(item.uid),
            color: "white",
            fontWeight: 600,
            fontSize: "0.75rem",
            letterSpacing: 0.2,
            lineHeight: 1.3,
            display: "inline-flex",
            alignItems: "center",
            alignSelf: "flex-start",
            width: "fit-content",
            maxWidth: "60%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={item.by}
        >
          {displayName}
        </Box>

        {/* Title */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            wordBreak: "break-word",
            color: "text.primary",
            lineHeight: 1.4,
          }}
        >
          {item.title || "Untitled"}
        </Typography>
      </Stack>
    </Paper>
  );
}
