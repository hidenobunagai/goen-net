"use client";

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
import { useMemo } from "react";

import { useDocumentTitle } from "@/hooks/use-document-title";
import { useWorksheet } from "@/hooks/use-worksheet";

import { ClearWorksheetDialog } from "./clear-dialog";

type ConfidentialLevel = "HIGH" | "MEDIUM" | "NORMAL" | "";

type CoachForm = {
  title?: string;
  typeWork?: boolean;
  typeHome?: boolean;
  typePersonal?: boolean;
  feelings?: string;
  want?: string;
  confidential?: ConfidentialLevel;
};

export function CoachWorksheet() {
  useDocumentTitle("Coach Worksheet");
  const {
    form,
    setForm,
    saving,
    clearing,
    status,
    setStatus,
    loadError,
    handleChange,
    save: handleSave,
    clear: handleClear,
    clearDialogOpen,
    setClearDialogOpen,
    confirmClear,
  } = useWorksheet<CoachForm>("coach");

  const handleConfidentialChange = (level: ConfidentialLevel) => () => {
    setForm((prev) => ({
      ...prev,
      confidential: prev.confidential === level ? "" : level,
    }));
    setStatus(null);
  };

  const issueTypeChecks = useMemo(
    () => [
      { label: "Work", key: "typeWork" as const },
      { label: "Home", key: "typeHome" as const },
      { label: "Personal", key: "typePersonal" as const },
    ],
    []
  );

  const confidentialityOptions: Array<{
    level: ConfidentialLevel;
    title: string;
    description: string;
  }> = [
    {
      level: "HIGH",
      title: "HIGH",
      description: "After this presentation, absolutely no mention of what is discussed here.",
    },
    {
      level: "MEDIUM",
      title: "MEDIUM",
      description: "You can discuss this topic later, only when the presenter wants to do so.",
    },
    {
      level: "NORMAL",
      title: "NORMAL",
      description: "Members can talk about this topic later, but only in a closed environment.",
    },
  ];

  const headerHighlights = useMemo(
    () => [
      {
        title: "Create shared clarity",
        description:
          "Listen for emotions and facts so the presenter can articulate the core issue.",
      },
      {
        title: "Coach with intention",
        description: "Use open questions to surface insights, options, and desired outcomes.",
      },
      {
        title: "Set the team up",
        description:
          "Frame the confidentiality level and what support the presenter needs from peers.",
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
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    fontSize: 32,
                    boxShadow: "0 16px 40px rgba(14, 116, 144, 0.35)",
                  }}
                >
                  🧭
                </Avatar>
                <Box>
                  <Chip
                    label="Coach role"
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      bgcolor: "rgba(255,255,255,0.24)",
                      borderColor: "rgba(125, 211, 252, 0.6)",
                    }}
                  />
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.dark" }}>
                    Coaching Worksheet
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, color: "primary.dark", mt: 0.5 }}
                  >
                    Guide the presenter to surface the real issue and prepare the cohort to support
                    effectively.
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ borderColor: "rgba(125, 211, 252, 0.4)" }} />

              <Stack spacing={2}>
                <Typography color="text.secondary" sx={{ fontSize: 14, maxWidth: 760 }}>
                  Review the presentation sheet together, listen deeply, and use this worksheet to
                  introduce the presenter with clarity.
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
                        border: "1px solid rgba(125, 211, 252, 0.45)",
                        bgcolor: "rgba(255,255,255,0.28)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: "primary.dark" }}
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
              boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
              backdropFilter: "blur(6px)",
              bgcolor: "rgba(255,255,255,0.92)",
            }}
          >
            <Stack spacing={3}>
              <Stack spacing={1.5}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  1. Help the presenter identify what he/she really wants to resolve.
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Ask the Presenter.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Help him/her describe and understand the issue/problem by asking:
                </Typography>
                <Box
                  sx={{
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "grey.50",
                    p: { xs: 2, md: 3 },
                  }}
                >
                  <Stack spacing={1} sx={{ pl: { xs: 1, md: 2 } }}>
                    <Typography>
                      • First: Identify the presenter’s emotions (What is he/she feeling? Sad?
                      Worried? Excited? Angry?, etc)
                    </Typography>
                    <Typography>
                      • What does he/she can do to overcome/resolve the issue? (Focus on what the
                      presenter can do. Do not on the external environment which cannot be
                      controlled.)
                    </Typography>
                    <Typography>
                      • What his/her issue is really about? What really is the problem? (Summarize
                      and clarify)
                    </Typography>
                    <Typography>
                      • What is the underlying cause of the issue (root cause)?
                    </Typography>
                  </Stack>
                </Box>
              </Stack>

              <Divider sx={{ borderStyle: "dashed" }} />

              <Stack spacing={2.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Then, DEFINE THE ISSUE, Types of Issues, What the Presenter Wants, and
                  Confidentiality Level.
                </Typography>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    DEFINE THE ISSUE: GIVE THE PRESENTATION a “TITLE” to best describe what to
                    discuss.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    What do you think is the substance of the issue that the presenter wants to
                    resolve?
                  </Typography>
                  <TextField
                    fullWidth
                    value={form.title ?? ""}
                    onChange={handleChange("title")}
                    placeholder="Title / substance of the issue"
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

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Type of issue
                  </Typography>
                  <FormGroup row sx={{ gap: 1 }}>
                    {issueTypeChecks.map(({ label, key }) => (
                      <FormControlLabel
                        key={key}
                        control={
                          <Checkbox checked={Boolean(form[key])} onChange={handleChange(key)} />
                        }
                        label={label}
                      />
                    ))}
                  </FormGroup>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Know the presenter’s feelings and emotions toward the issue.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    List the presenter’s feelings and emotions toward the issue, and IDENTIFY THE
                    STRONGEST ONE.
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={form.feelings ?? ""}
                    onChange={handleChange("feelings")}
                    placeholder="Feelings and the strongest one"
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
                    What does the presenter want from the peers in their responses?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Support, ideas, opinions, understanding and empathy, lesson from experience
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={form.want ?? ""}
                    onChange={handleChange("want")}
                    placeholder="What the presenter wants from peers"
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

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Confidentiality level
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Specify the level of confidentiality (Check one)
                  </Typography>
                  <Stack spacing={1.5}>
                    {confidentialityOptions.map(({ level, title, description }) => (
                      <Paper
                        key={level}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          borderColor: form.confidential === level ? "primary.main" : "divider",
                          bgcolor: form.confidential === level ? "primary.50" : "background.paper",
                        }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.confidential === level}
                              onChange={handleConfidentialChange(level)}
                            />
                          }
                          label={
                            <Box>
                              <Typography
                                sx={{
                                  fontWeight: form.confidential === level ? 700 : 500,
                                }}
                              >
                                {title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {description}
                              </Typography>
                            </Box>
                          }
                          sx={{ alignItems: "flex-start", m: 0 }}
                        />
                      </Paper>
                    ))}
                  </Stack>
                </Box>
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
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                2. Prepare Communication Starters
              </Typography>
              <Typography color="text.secondary">
                Communication starters are comments from all members, to express that they feel as
                if the presenter’s issue is an issue of their own, so that the presenter will feel
                safer and easier to open his/her heart and speak about his/her issue during the
                presentation.
              </Typography>
              <Box
                sx={{
                  p: { xs: 2, md: 3 },
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "primary.light",
                  bgcolor: "primary.50",
                }}
              >
                <Typography sx={{ fontWeight: 700 }}>Communication Starters:</Typography>
                <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                  <Typography>
                    1. Tell the members “title”. “The title of the presenter’s issue is ‘......’ .”
                  </Typography>
                  <Typography>
                    2. Tell them the emotions the presenter is feeling. “The presenter is feeling
                    ‘... ’.
                  </Typography>
                  <Typography>
                    3. And tell them: “Please imagine what the presenter is feeling. And then,
                    please tell the presenter that you are ready to listen.”
                  </Typography>
                  <Typography>
                    4. Coach or Moderator will be the first one to say “I am ready to listen.”
                  </Typography>
                  <Typography>
                    5. And each member will follow, saying “I am ready to listen.”
                  </Typography>
                </Stack>
              </Box>
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
            <Stack spacing={2.5}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    void handleSave();
                  }}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  onClick={() => {
                    void handleClear();
                  }}
                  disabled={clearing}
                >
                  {clearing ? "Clearing…" : "Clear"}
                </Button>
              </Stack>

              {status ? (
                <Typography
                  color={status.type === "success" ? "success.main" : "error.main"}
                  variant="body2"
                >
                  {status.message}
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      </Container>
      <ClearWorksheetDialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        onConfirm={confirmClear}
        role="coach"
        isClearing={clearing}
      />
    </Box>
  );
}
