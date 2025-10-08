"use client";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { useDocumentTitle } from "@/hooks/use-document-title";

type ObserverForm = {
  good?: string;
  improve?: string;
  protocolListen?: string;
  protocolAccept?: string;
  protocolQuestion?: string;
  protocolSupport?: string;
};

type ChangeHandler = (
  key: keyof ObserverForm
) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

function normalizeFormValue(value: unknown): ObserverForm {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as ObserverForm;
}

export function ObserverWorksheet() {
  useDocumentTitle("Observer Worksheet");
  const [form, setForm] = useState<ObserverForm>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch("/api/worksheets/observer", {
          method: "GET",
          credentials: "include",
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok: true; worksheet: { data: unknown } | null }
          | { ok: false; error?: { message?: string } }
          | null;

        if (!response.ok || payload?.ok === false) {
          const message =
            (payload && "error" in payload ? payload.error?.message : undefined) ??
            "Unable to load saved worksheet data. Please try again.";
          throw new Error(message);
        }

        if (cancelled) {
          return;
        }

        setForm(normalizeFormValue(payload?.worksheet?.data ?? {}));
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Unable to load saved worksheet data.";
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
    setStatus(null);
    setForm((prev) => ({
      ...prev,
      [key]: event.target.value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/worksheets/observer", {
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
          (payload && "error" in payload ? payload.error?.message : undefined) ??
          "Unable to save worksheet right now. Please try again.";
        throw new Error(message);
      }

      setStatus({ type: "success", message: "Worksheet saved." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save worksheet right now.";
      setStatus({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Clear all saved inputs for Observer worksheet?");
      if (!confirmed) {
        return;
      }
    }

    setClearing(true);
    setStatus(null);
    try {
      const response = await fetch("/api/worksheets/observer", {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: { message?: string } }
        | null;

      if (!response.ok || payload?.ok === false) {
        const message =
          (payload && "error" in payload ? payload.error?.message : undefined) ??
          "Unable to clear worksheet right now. Please try again.";
        throw new Error(message);
      }

      setForm({});
      setStatus({ type: "success", message: "Worksheet cleared." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to clear worksheet right now.";
      setStatus({ type: "error", message });
    } finally {
      setClearing(false);
    }
  };

  const protocolSections = useMemo(
    () => [
      {
        key: "protocolListen" as const,
        title: "Listen closely",
        prompts: [
          "□ Did peers show genuine interest? Did they try to understand the presenter's emotions?",
          "□ Did anyone listen without looking in the other person's face or show a lack of interest?",
        ],
      },
      {
        key: "protocolAccept" as const,
        title: "Accept / Empathize",
        prompts: [
          "□ Did all peers accept the other person's thoughts and values? Did anyone behave or say things that appeared to label people based on their own values?",
          "□ Was there an atmosphere of mutual support and endorsement?",
        ],
      },
      {
        key: "protocolQuestion" as const,
        title: "Question",
        prompts: [
          "□ Did anyone feel offended by “why” questions without sharing the intentions behind his/her questions?",
          "□ Did anyone ask questions leading up to their own opinions? “Shouldn't you xxx?” or “Why don't you xxx?”",
        ],
      },
      {
        key: "protocolSupport" as const,
        title: "Support",
        prompts: [
          "• Share experiences",
          "• “I”-statements",
          "□ Did anyone stop at sharing their own experience? Did they also share lessons learned?",
          "□ Did anyone try to convince the presenter or force advice instead of “I” statements?",
          "□ Did anyone act irresponsibly, sharing general advice instead of their own experience?",
          "□ Did anyone force their opinions on others?",
        ],
      },
    ],
    []
  );

  const headerHighlights = useMemo(
    () => [
      {
        title: "Observe patterns",
        description: "Capture moments that showcase effective collaboration and meeting flow.",
      },
      {
        title: "Spot opportunities",
        description: "Document where the team can communicate with more empathy and rigor.",
      },
      {
        title: "Share actionable feedback",
        description: "Synthesize observations into insights the cohort can apply immediately.",
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
                    bgcolor: "secondary.main",
                    color: "secondary.contrastText",
                    fontSize: 32,
                    boxShadow: "0 16px 40px rgba(99, 102, 241, 0.35)",
                  }}
                >
                  👀
                </Avatar>
                <Box>
                  <Chip
                    label="Process observer"
                    color="secondary"
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      bgcolor: "rgba(255,255,255,0.24)",
                      borderColor: "rgba(165, 180, 252, 0.6)",
                    }}
                  />
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "secondary.dark" }}>
                    Process Feedback Worksheet
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, color: "secondary.dark", mt: 0.5 }}
                  >
                    Capture the meeting dynamics so the team can celebrate wins and adjust
                    behaviours together.
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ borderColor: "rgba(165, 180, 252, 0.4)" }} />

              <Stack spacing={2}>
                <Typography color="text.secondary" sx={{ fontSize: 14, maxWidth: 760 }}>
                  Observe while participating, note concrete examples, and translate them into
                  collective learning for your cohort.
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
                        border: "1px solid rgba(165, 180, 252, 0.45)",
                        bgcolor: "rgba(255,255,255,0.28)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: "secondary.dark" }}
                      >
                        {highlight.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
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
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={3}>
              <Box sx={{ px: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  1. What was good
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  (E.g.: “The question XXX–san asked really helped the presenter see the issue from
                  the positive side.”; “The presenter shared a very tough issue with courage. It
                  helped other members to speak deeper from the heart.”)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  value={form.good ?? ""}
                  onChange={handleChange("good")}
                  placeholder="Notes of what was good"
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
                      "&.Mui-focused": {
                        outline: "none",
                      },
                    },
                    "& .MuiOutlinedInput-input": {
                      outline: "none",
                    },
                  }}
                />
              </Box>

              <Box sx={{ px: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  2. What could be improved
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  (E.g.: “When YYY–san asked a question about ‘(specific topic)‘, it may have
                  sounded like criticizing.”; “When sharing experiences, QQQ–san told the presenter
                  ‘you should do this,’ but probably without realizing.”)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  value={form.improve ?? ""}
                  onChange={handleChange("improve")}
                  placeholder="Notes of what could be improved"
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
                      "&.Mui-focused": {
                        outline: "none",
                      },
                    },
                    "& .MuiOutlinedInput-input": {
                      outline: "none",
                    },
                  }}
                />
              </Box>
            </Stack>
          </Paper>

          <Paper
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)",
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={2.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                3. Communication protocol: Did everybody follow it properly?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review each step and capture concrete observations that can help the team reinforce
                strengths and improve future sessions.
              </Typography>
              {protocolSections.map(({ key, title, prompts }) => (
                <Paper
                  key={key}
                  variant="outlined"
                  sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    borderColor: form[key] ? "primary.main" : "divider",
                    bgcolor: form[key] ? "primary.50" : "background.paper",
                  }}
                >
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {title}
                    </Typography>
                    <Stack spacing={0.75}>
                      {prompts.map((prompt) => (
                        <Typography key={prompt}>{prompt}</Typography>
                      ))}
                    </Stack>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={form[key] ?? ""}
                      onChange={handleChange(key)}
                      placeholder="Notes"
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
                          "&.Mui-focused": {
                            outline: "none",
                          },
                        },
                        "& .MuiOutlinedInput-input": {
                          outline: "none",
                        },
                      }}
                    />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>

          <Paper
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
              bgcolor: "background.paper",
            }}
          >
            <Stack spacing={1.5}>
              {status && (
                <Alert severity={status.type} variant="outlined">
                  {status.message}
                </Alert>
              )}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSave}
                  disabled={loading || saving || clearing}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
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
