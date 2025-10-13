"use client";

import EditIcon from "@mui/icons-material/Edit";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Unstable_Grid2";
import { useMemo, useState, useTransition } from "react";

import {
  combineDateAndTime,
  extractDate,
  extractTime,
  formatSessionRange,
  normalizeToDatetimeLocal,
} from "@/lib/datetime";

type InitialSession = {
  startAt: string | null;
  endAt: string | null;
  location: string | null;
};

type FormState = {
  date: string;
  startTime: string;
  endTime: string;
  location: string;
};

type StatusState = { type: "success" | "error"; message: string } | null;

export function NextSessionCard({ initial }: { initial: InitialSession | null }) {
  const normalized = useMemo(() => {
    if (!initial) {
      return { startAt: null, endAt: null, location: "" } as const;
    }
    return {
      startAt: normalizeToDatetimeLocal(initial.startAt) || null,
      endAt: normalizeToDatetimeLocal(initial.endAt) || null,
      location: initial.location ?? "",
    } as const;
  }, [initial]);

  const locationValue = normalized.location?.trim() ?? "";
  const locationIsUrl = useMemo(() => {
    if (!locationValue) {
      return false;
    }
    try {
      const parsed = new URL(locationValue);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, [locationValue]);
  const locationLabel = locationValue || "To be determined";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<StatusState>(null);
  const [form, setForm] = useState<FormState>(() => ({
    date: extractDate(normalized.startAt) || new Date().toISOString().slice(0, 10),
    startTime: extractTime(normalized.startAt) || "10:00",
    endTime: extractTime(normalized.endAt),
    location: normalized.location || "",
  }));

  const { dateLabel, timeLabel } = useMemo(() => {
    if (!normalized.startAt) {
      return { dateLabel: "Date to be determined", timeLabel: "" } as const;
    }

    const start = new Date(normalized.startAt);
    if (Number.isNaN(start.getTime())) {
      return {
        dateLabel: formatSessionRange(normalized.startAt, normalized.endAt),
        timeLabel: "",
      } as const;
    }

    const locale = "en-US";
    const formatDate = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
    const formatTime = new Intl.DateTimeFormat(locale, { timeStyle: "short" });

    const formattedDate = formatDate.format(start);
    let formattedTime = formatTime.format(start);

    if (normalized.endAt) {
      const end = new Date(normalized.endAt);
      if (!Number.isNaN(end.getTime())) {
        if (start.toDateString() === end.toDateString()) {
          formattedTime = `${formattedTime} – ${formatTime.format(end)}`;
        } else {
          formattedTime = `${formattedTime} – ${formatDate.format(end)} ${formatTime.format(end)}`;
        }
      }
    }

    return { dateLabel: formattedDate, timeLabel: formattedTime } as const;
  }, [normalized.endAt, normalized.startAt]);

  const openDialog = () => {
    setForm({
      date: extractDate(normalized.startAt) || new Date().toISOString().slice(0, 10),
      startTime: extractTime(normalized.startAt) || "10:00",
      endTime: extractTime(normalized.endAt),
      location: normalized.location || "",
    });
    setStatus(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    if (!isPending) {
      setDialogOpen(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    if (!form.date || !form.startTime) {
      setStatus({
        type: "error",
        message: "Date and start time are required.",
      });
      return;
    }

    const startAt = combineDateAndTime(form.date, form.startTime);
    const endAt = form.endTime ? combineDateAndTime(form.date, form.endTime) : null;

    startTransition(async () => {
      try {
        const response = await fetch("/api/next-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startAt,
            endAt,
            location: form.location.trim() || null,
          }),
        });
        const json = await response.json().catch(() => null);
        if (!response.ok || json?.ok === false) {
          const message = json?.error?.message || "Failed to update next session.";
          throw new Error(message);
        }
        setStatus({
          type: "success",
          message: "Next session updated successfully.",
        });
        setDialogOpen(false);
        window.location.reload();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update next session.";
        setStatus({ type: "error", message });
      }
    });
  };

  return (
    <Card
      sx={{
        height: "100%",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        bgcolor: "#ffffff",
        borderRadius: 2,
        boxShadow: "0 1px 2px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
        border: "none",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: "0 2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)",
          transform: "translateY(-2px)",
          "& .edit-icon": {
            opacity: 1,
          },
        },
      }}
    >
      <CardContent
        sx={{
          position: "relative",
          zIndex: 1,
          p: { xs: 3.5, sm: 4, md: 4.5 },
          pb: { xs: 2.5, sm: 3, md: 3.5 },
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Chip
                label={normalized.startAt ? "Upcoming" : "Set the date"}
                color="primary"
                size="small"
                sx={{
                  alignSelf: "flex-start",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  fontSize: "0.75rem",
                  px: 0.5,
                  height: 28,
                  background:
                    "linear-gradient(135deg, rgba(0, 51, 102, 0.95) 0%, rgba(0, 51, 102, 1) 100%)",
                  boxShadow: "0 2px 8px rgba(0, 51, 102, 0.15)",
                }}
              />
              <IconButton
                onClick={openDialog}
                disabled={isPending}
                size="small"
                className="edit-icon"
                sx={{
                  opacity: 0,
                  transition: "all 0.2s ease",
                  color: "primary.main",
                  padding: "4px",
                  "&:hover": {
                    backgroundColor: "rgba(0, 51, 102, 0.08)",
                  },
                  "&:disabled": {
                    opacity: 0.3,
                  },
                }}
              >
                <EditIcon sx={{ fontSize: "1.2rem" }} />
              </IconButton>
            </Stack>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
              Next Session
            </Typography>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
              <Box component="span" display="block">
                {dateLabel}
              </Box>
              {timeLabel ? (
                <Box component="span" display="block">
                  {timeLabel}
                </Box>
              ) : null}
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: "uppercase", letterSpacing: "0.14em" }}
            >
              Location
            </Typography>
            {locationIsUrl ? (
              <Typography
                component="a"
                href={locationValue}
                target="_blank"
                rel="noopener noreferrer"
                variant="body1"
                sx={{
                  fontWeight: 600,
                  wordBreak: "break-word",
                  color: "primary.main",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    textDecoration: "underline",
                    color: "primary.dark",
                  },
                }}
              >
                {locationValue}
              </Typography>
            ) : (
              <Typography variant="body1" sx={{ fontWeight: 600, wordBreak: "break-word" }}>
                {locationLabel}
              </Typography>
            )}
          </Stack>
          {status ? <Alert severity={status.type}>{status.message}</Alert> : null}
        </Stack>
      </CardContent>

      <Dialog open={dialogOpen} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Edit next session</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Stack spacing={3}>
              <TextField
                label="Date"
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                InputLabelProps={{ shrink: true, sx: { lineHeight: 1 } }}
                required
              />
              <Grid container spacing={2} columns={{ xs: 1, sm: 2 }}>
                <Grid xs={1}>
                  <TextField
                    label="Start time"
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        startTime: event.target.value,
                      }))
                    }
                    InputLabelProps={{ shrink: true, sx: { lineHeight: 1 } }}
                    inputProps={{ step: 1800 }}
                    required
                  />
                </Grid>
                <Grid xs={1}>
                  <TextField
                    label="End time (optional)"
                    type="time"
                    value={form.endTime}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        endTime: event.target.value,
                      }))
                    }
                    InputLabelProps={{ shrink: true, sx: { lineHeight: 1 } }}
                    inputProps={{ step: 1800 }}
                  />
                </Grid>
              </Grid>
              <TextField
                label="Location (URL or venue)"
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Zoom, NYC office, etc."
                InputLabelProps={{ sx: { lineHeight: 1 } }}
                inputProps={{
                  spellCheck: false,
                  autoCorrect: "off",
                  autoCapitalize: "none",
                }}
              />
            </Stack>
            <DialogActions sx={{ px: 0, pt: 4 }}>
              <Button onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
