"use client";

import AddIcon from "@mui/icons-material/Add";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useTheme } from "@mui/material/styles";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import type { UpdateRecord } from "@/lib/updates";

const CATEGORY_OPTIONS = [
  { value: 0, label: "Work" },
  { value: 1, label: "Family" },
  { value: 2, label: "Personal" },
];

type UpdateFormDialogProps = {
  defaultCategory?: number;
  onCreated?: (update: UpdateRecord | null) => Promise<void> | void;
};

export function UpdateFormDialog({ defaultCategory = 0, onCreated }: UpdateFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<number>(defaultCategory);
  const [urgent, setUrgent] = useState(false);
  const [when, setWhen] = useState<-1 | 1>(-1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setBody("");
    setCategory(defaultCategory);
    setUrgent(false);
    setWhen(-1);
    setError(null);
  };

  const handleCategoryChange = (event: SelectChangeEvent<number>) => {
    setCategory(Number(event.target.value));
  };

  const handleUrgentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUrgent(event.target.checked);
  };

  const handleWhenChange = (event: ChangeEvent<HTMLInputElement>) => {
    setWhen(Number(event.target.value) === 1 ? 1 : -1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    if (!body.trim()) {
      setError("Update text is required.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: trimmedTitle,
          update: body.trim(),
          category,
          urgent,
          when,
        }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok || json?.ok === false) {
        const message = json?.error?.message || "Failed to submit update.";
        throw new Error(message);
      }

      const rawUpdate =
        json && typeof json === "object" && "update" in json
          ? (json as { update?: unknown }).update
          : undefined;
      const createdUpdate =
        rawUpdate && typeof rawUpdate === "object" ? (rawUpdate as UpdateRecord) : null;

      await onCreated?.(createdUpdate);
      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit update.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={() => setOpen(true)}
        sx={{ whiteSpace: "nowrap" }}
      >
        Add Update
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          if (!submitting) {
            setOpen(false);
          }
        }}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>Add update</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Short title"
                fullWidth
                required
              />

              <TextField
                label="Update text"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Share recent progress or insights"
                fullWidth
                multiline
                minRows={4}
                required
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="update-category-label">Category</InputLabel>
                  <Select
                    labelId="update-category-label"
                    label="Category"
                    value={category}
                    onChange={handleCategoryChange}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={<Checkbox checked={urgent} onChange={handleUrgentChange} />}
                  label="Mark as urgent"
                  sx={{ mt: { xs: 0, sm: "10px" } }}
                />
              </Stack>

              <FormControl>
                <FormLabel>Timeframe</FormLabel>
                <RadioGroup row={!isMobile} value={when} onChange={handleWhenChange}>
                  <FormControlLabel value={-1} control={<Radio />} label="Past 3 months" />
                  <FormControlLabel value={1} control={<Radio />} label="Next 3 months" />
                </RadioGroup>
              </FormControl>

              {error ? (
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => {
                if (!submitting) {
                  setOpen(false);
                }
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={20} /> : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
