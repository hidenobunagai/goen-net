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
import { useState, useTransition } from "react";

import type { UpdateRecord } from "@/lib/updates";

import { createUpdateAction } from "../actions";

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
  const [submitting, startTransition] = useTransition();
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

    const formData = new FormData();
    formData.append("title", trimmedTitle);
    formData.append("body", body.trim());
    formData.append("category", String(category));
    formData.append("urgent", String(urgent));
    formData.append("when", String(when));

    startTransition(async () => {
      try {
        const result = await createUpdateAction({ ok: false }, formData);
        if (result.ok) {
          await onCreated?.(null);
          reset();
          setOpen(false);
        } else {
          setError(result.error || "Failed to submit update.");
        }
      } catch {
        setError("Failed to submit update.");
      }
    });
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
                fullWidth
                required
                InputLabelProps={{
                  sx: { lineHeight: 1 },
                }}
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
                InputLabelProps={{
                  sx: { lineHeight: 1 },
                }}
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
