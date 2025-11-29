"use client";

import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";

import type { UpdateRecord } from "@/lib/updates";

import { getFirstName, getUserBadgeColor } from "./update-card";
import { UpdateStatusBadge } from "./update-status-badge";

type UpdateDetailsDialogProps = {
  item: UpdateRecord | null;
  onClose: () => void;
  onDelete: (item: UpdateRecord) => void;
  deleteLoading?: boolean;
};

export function UpdateDetailsDialog({
  item,
  onClose,
  onDelete,
  deleteLoading = false,
}: UpdateDetailsDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={Boolean(item)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogContent sx={{ pt: 3 }}>
        <Stack spacing={1.5}>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
              bgcolor: getUserBadgeColor(item.uid),
              color: "white",
              fontWeight: 700,
              fontSize: "0.95rem",
              letterSpacing: 0.3,
              lineHeight: 1.3,
              display: "inline-flex",
              alignItems: "center",
              alignSelf: "flex-start",
              width: "fit-content",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getFirstName(item.by)}
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 2,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h6"
                component="h2"
                sx={{
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  lineHeight: 1.3,
                  mb: 1,
                }}
              >
                {item.title || "Untitled"}
              </Typography>
            </Box>
            {item.urgent ? <UpdateStatusBadge urgent={item.urgent} /> : null}
          </Box>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {item.body}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        {item.viewerIsOwner ? (
          <Button
            onClick={() => onDelete(item)}
            color="error"
            disabled={deleteLoading}
            sx={{ mr: "auto" }}
          >
            {deleteLoading ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        ) : null}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
