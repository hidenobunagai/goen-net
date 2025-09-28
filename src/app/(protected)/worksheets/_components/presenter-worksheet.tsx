"use client";

import { useDocumentTitle } from "@/hooks/use-document-title";
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

const STORAGE_KEY = "worksheet_presenter_v1";

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

function readInitialForm(): PresenterForm {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PresenterForm;

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
  } catch (error) {
    console.warn("Failed to parse presenter worksheet state", error);
    return {};
  }
}

type ChangeHandler = (
  key: keyof PresenterForm
) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

export function PresenterWorksheet() {
  useDocumentTitle("Presenter Worksheet");
  const [form, setForm] = useState<PresenterForm>(() => readInitialForm());

  const handleChange: ChangeHandler = (key) => (event) => {
    const target = event.target as HTMLInputElement;
    const value =
      target.type === "checkbox" ? target.checked : event.target.value;
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch (error) {
      console.warn("Failed to persist presenter worksheet", error);
    }
  };

  const handleClear = () => {
    if (typeof window === "undefined") return;
    if (!window.confirm("Clear all saved inputs for Presenter worksheet?"))
      return;
    window.localStorage.removeItem(STORAGE_KEY);
    setForm({});
  };

  const issueTypeChecks = useMemo(
    () => [
      { label: "Work", key: "typeWork" as const },
      { label: "Home", key: "typeHome" as const },
      { label: "Personal", key: "typePersonal" as const },
    ],
    []
  );

  return (
    <Container maxWidth="md" sx={{ my: 4, pb: 8 }}>
      <Stack spacing={3}>
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: "1px solid",
            borderColor: "warning.light",
            background:
              "linear-gradient(135deg, rgba(251,191,36,0.16), rgba(249,115,22,0.12))",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)",
          }}
        >
          <Stack spacing={1.5}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 800, color: "warning.dark" }}
              gutterBottom
            >
              Presentation Worksheet [For Presenters]
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ fontSize: 14, maxWidth: 720 }}
            >
              First, fill in the boxes below. Then let the coach ask you to
              clarify the issue you are facing, so that you can describe
              specifically about (a) what is happening in what context, (b) what
              you feel about it, (c) what you think will/might happen, and (d)
              your options. After sorting out the situation and identifying your
              issue, the presenter and the coach together prepare communication
              starters.
            </Typography>
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
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              1. Prepare the presentation details
            </Typography>

            <Box>
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
              />
            </Box>

            <Box>
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
              />
            </Box>

            <Box>
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
              />
            </Box>

            <Box>
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

            <Box>
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
              />
            </Box>

            <Box>
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
              />
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
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="flex-end"
          >
            <Button variant="contained" onClick={handleSave}>
              Save locally
            </Button>
            <Button variant="outlined" color="warning" onClick={handleClear}>
              Clear
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
