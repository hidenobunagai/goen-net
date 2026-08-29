"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

type ClearWorksheetDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  role: string;
  isClearing?: boolean;
};

export function ClearWorksheetDialog({
  open,
  onClose,
  onConfirm,
  role,
  isClearing = false,
}: ClearWorksheetDialogProps) {
  const label = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <Dialog
      open={open}
      onClose={isClearing ? undefined : onClose}
      PaperProps={{
        sx: {
          bgcolor: "#0f172a",
          color: "#fff",
          borderRadius: 2,
          border: "1px solid rgba(255, 255, 255, 0.15)",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Clear {label} Worksheet?</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: "rgba(255, 255, 255, 0.75)" }}>
          Are you sure you want to clear all saved inputs for the {label} worksheet? This action
          cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={isClearing} sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isClearing}
          variant="contained"
          color="error"
          sx={{ fontWeight: 600 }}
        >
          {isClearing ? "Clearing..." : "Clear"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
