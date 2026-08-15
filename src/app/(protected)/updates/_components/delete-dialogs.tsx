"use client";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";

import type { UpdateRecord } from "@/lib/updates";

type DeleteUpdateDialogProps = {
  open: boolean;
  target: UpdateRecord | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteUpdateDialog({
  open,
  target,
  loading,
  onClose,
  onConfirm,
}: DeleteUpdateDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete update?</DialogTitle>
      <DialogContent>
        <DialogContentText>Delete this update? This action cannot be undone.</DialogContentText>
        {target ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Title: {target.title || "Untitled"}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
