"use client";

import { useDocumentTitle } from "@/hooks/use-document-title";
import {
    Alert,
    Avatar,
    Box,
    Button,
    Checkbox,
    Chip,
    Container,
    Divider,
    FormControlLabel,
    FormGroup,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type PresenterForm = {
  context?: string;
  situation?: string;
  future?: string;
  options?: string;
  type?: string;
  typeWork?: boolean;
  typeHome?: boolean;
  typePersonal?: boolean;
  issue?: string;
  ask?: string;
};

function normalizeFormValue(value: unknown): PresenterForm {
  if (!value || typeof value !== "object") {
    return {};
  }

  const parsed = value as PresenterForm;
  const legacyType = (parsed.type ?? "").toLowerCase();
  return {
    ...parsed,
    typeWork: parsed.typeWork ?? legacyType.includes("work"),
    typeHome:
      parsed.typeHome ??
      (legacyType.includes("home") || legacyType.includes("family")),
    typePersonal:
      parsed.typePersonal ??
      (legacyType.includes("personal") || legacyType.includes("self")),
  };
}

type ChangeHandler = (
  key: keyof PresenterForm
) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

export function PresenterWorksheet() {
  useDocumentTitle("Presenter Worksheet");
  const [form, setForm] = useState<PresenterForm>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState<
    { type: "success" | "error"; message: string }
  | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch("/api/worksheets/presenter", {
          method: "GET",
          credentials: "include",
        });
        const payload = (await response.json().catch(() => null)) as
          | {
              ok: true;
              worksheet: { data: unknown } | null;
              error?: undefined;
            }
          | {
              ok: false;
              error?: { message?: string };
              worksheet?: undefined;
            }
          | null;

        if (!response.ok || payload?.ok === false) {
          const message =
            (payload && "error" in payload
              ? payload.error?.message
              : undefined) ??
            "Unable to load saved worksheet data. Please try again.";
          throw new Error(message);
        }

        if (cancelled) {
          return;
        }

        const data = payload?.worksheet?.data;
        setForm(normalizeFormValue(data));
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load saved worksheet data.";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange: ChangeHandler = (key) => (event) => {
    const target = event.target as HTMLInputElement;
    const value =
      target.type === "checkbox" ? target.checked : event.target.value;
    setStatus(null);
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/worksheets/presenter", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: form }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: { message?: string } }
        | null;

        if (!response.ok || payload?.ok === false) {
          const message =
            (payload && "error" in payload
              ? payload.error?.message
              : undefined) ??
            "Unable to save worksheet right now. Please try again.";
        throw new Error(message);
      }

      setStatus({ type: "success", message: "Worksheet saved." });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save worksheet right now.";
      setStatus({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Clear all saved inputs for Presenter worksheet?"
      );
      if (!confirmed) {
        return;
      }
    }

    setClearing(true);
    setStatus(null);
    try {
      const response = await fetch("/api/worksheets/presenter", {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: { message?: string } }
        | null;

        if (!response.ok || payload?.ok === false) {
          const message =
            (payload && "error" in payload
              ? payload.error?.message
              : undefined) ??
            "Unable to clear worksheet right now. Please try again.";
        throw new Error(message);
      }

      setForm({});
      setStatus({
        type: "success",
        message: "Worksheet cleared.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to clear worksheet right now.";
      setStatus({ type: "error", message });
    } finally {
      setClearing(false);
    }
  };

  const issueTypeChecks = useMemo(
    () => [
      { label: "Work", key: "typeWork" as const },
      { label: "Home", key: "typeHome" as const },
      { label: "Personal", key: "typePersonal" as const },
    ],
    []
  );

  const headerHighlights = useMemo(
    () => [
      {
        title: "Clarify the story",
        description:
          "Capture the context, emotions, and expectations around the issue.",
      },
      {
        title: "Co-create insight",
        description:
          "Partner with your coach to surface perspectives and options.",
      },
      {
        title: "Plan your ask",
        description:
          "Shape a clear request that invites support from your peers.",
      },
    ],
    []
  );

  return (
    <Box>
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 }, pb: 8 }}>
        <Stack spacing={4}>
        {loadError && (
          <Alert severity="error" variant="outlined">
            {loadError}
          </Alert>
        )}
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 2,
            bgcolor: "#ffffff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
            border: "none",
          }}
        >
          <Stack spacing={3}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ sm: "center" }}
            >
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "warning.main",
                  color: "warning.contrastText",
                  fontSize: 32,
                  boxShadow: "0 16px 40px rgba(234, 179, 8, 0.35)",
                }}
              >
                🎤
              </Avatar>
              <Box>
                <Chip
                  label="Presenter role"
                  color="warning"
                  variant="outlined"
                  size="small"
                  sx={{
                    fontWeight: 600,
                    mb: 1,
                    bgcolor: "rgba(255,255,255,0.24)",
                    borderColor: "rgba(253, 186, 116, 0.6)",
                  }}
                />
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: "warning.dark" }}
                >
                  Presentation Worksheet
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "warning.dark", mt: 0.5 }}
                >
                  Prepare to lead the conversation with clarity and confidence.
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ borderColor: "rgba(253, 186, 116, 0.4)" }} />

            <Stack spacing={2}>
              <Typography
                color="text.secondary"
                sx={{ fontSize: 14, maxWidth: 760 }}
              >
                First, fill in the boxes below. Then let the coach ask you to
                clarify the issue you are facing, so that you can describe
                specifically about (a) what is happening in what context, (b)
                what you feel about it, (c) what you think will/might happen,
                and (d) your options. After sorting out the situation and
                identifying your issue, the presenter and the coach together
                prepare communication starters.
              </Typography>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{
                  "& > *": {
                    flex: 1,
                  },
                }}
              >
                {headerHighlights.map((highlight) => (
                  <Box
                    key={highlight.title}
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderRadius: 2.5,
                      border: "1px solid rgba(253, 186, 116, 0.4)",
                      bgcolor: "rgba(255,255,255,0.28)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: "warning.dark" }}
                    >
                      {highlight.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", mt: 0.5 }}
                    >
                      {highlight.description}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: "1px solid transparent",
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)",
            backdropFilter: "blur(24px) saturate(180%)",
            boxShadow: `
              0 1px 2px rgba(0, 51, 102, 0.04),
              0 4px 12px rgba(0, 51, 102, 0.08),
              0 16px 32px rgba(0, 51, 102, 0.06)
            `,
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              padding: "1px",
              background: "linear-gradient(135deg, rgba(0, 51, 102, 0.1), rgba(230, 0, 18, 0.08), rgba(0, 51, 102, 0.04))",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
            },
          }}
        >
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              1. Prepare the presentation details
            </Typography>

            <Box sx={{ px: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                (a) Context
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                When and how did this issue arise and develop to become an issue
                to you?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={form.context ?? ""}
                onChange={handleChange("context")}
                placeholder="Describe the context"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderWidth: "1px",
                    },
                    "&:hover fieldset": {
                      borderWidth: "1px",
                    },
                    "&.Mui-focused fieldset": {
                      borderWidth: "1px !important",
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ px: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                (b) Present situation and what you feel
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                As a result, WHAT IS THE SITUATION you are facing now? How do
                you FEEL about it?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={form.situation ?? ""}
                onChange={handleChange("situation")}
                placeholder="Describe the present situation and feelings"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderWidth: "1px",
                    },
                    "&:hover fieldset": {
                      borderWidth: "1px",
                    },
                    "&.Mui-focused fieldset": {
                      borderWidth: "1px !important",
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ px: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                (c) Prospects for the future
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                What is likely to happen in the future, and how do you FEEL
                about it?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={form.future ?? ""}
                onChange={handleChange("future")}
                placeholder="Prospects and feelings"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderWidth: "1px",
                    },
                    "&:hover fieldset": {
                      borderWidth: "1px",
                    },
                    "&.Mui-focused fieldset": {
                      borderWidth: "1px !important",
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ px: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                (d) Your options and what you want to do
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                What are your likely options? What do you really want to do
                about the issue at hand?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={form.options ?? ""}
                onChange={handleChange("options")}
                placeholder="Options and intended action"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderWidth: "1px",
                    },
                    "&:hover fieldset": {
                      borderWidth: "1px",
                    },
                    "&.Mui-focused fieldset": {
                      borderWidth: "1px !important",
                    },
                  },
                }}
              />
            </Box>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 2,
            bgcolor: "#ffffff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
            border: "none",
          }}
        >
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              2. Review the above and sum up
            </Typography>
            <Typography color="text.secondary">
              Describe the type of your issue, and what you would like from your
              peers.
            </Typography>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Type of your issue
              </Typography>
              <FormGroup row sx={{ gap: 1 }}>
                {issueTypeChecks.map(({ label, key }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={Boolean(form[key])}
                        onChange={handleChange(key)}
                      />
                    }
                    label={label}
                  />
                ))}
              </FormGroup>
            </Box>

            <Box sx={{ px: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Define the issue
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                What is the issue (or substance of the issue) that you really
                want to resolve?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={form.issue ?? ""}
                onChange={handleChange("issue")}
                placeholder="Define the issue"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderWidth: "1px",
                    },
                    "&:hover fieldset": {
                      borderWidth: "1px",
                    },
                    "&.Mui-focused fieldset": {
                      borderWidth: "1px !important",
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ px: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                What would you like your peers to share in their responses?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Share experience and lesson learned, emotional support, ideas,
                opinions, understanding and empathy
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={form.ask ?? ""}
                onChange={handleChange("ask")}
                placeholder="Your requests to peers"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderWidth: "1px",
                    },
                    "&:hover fieldset": {
                      borderWidth: "1px",
                    },
                    "&.Mui-focused fieldset": {
                      borderWidth: "1px !important",
                    },
                  },
                }}
              />
            </Box>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 2,
            bgcolor: "#ffffff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1)",
            border: "none",
          }}
        >
          <Stack spacing={1.5}>
            {status && (
              <Alert severity={status.type} variant="outlined">
                {status.message}
              </Alert>
            )}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="flex-end"
            >
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={loading || saving || clearing}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleClear}
                disabled={clearing || saving}
              >
                Clear
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
      </Container>
    </Box>
  );
}
