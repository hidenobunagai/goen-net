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
const ENC_VERSION = "v1";
const SALT_BYTES = 16;
const IV_BYTES = 12;
const MIN_PASSPHRASE_LENGTH = 8;

const isWebCryptoAvailable = () =>
  typeof window !== "undefined" && Boolean(window.crypto?.subtle);

const toBase64 = (value: Uint8Array): string => {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    let binary = "";
    value.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value).toString("base64");
  }
  throw new Error("Base64 encoding is not supported in this environment.");
};

const fromBase64 = (encoded: string): Uint8Array => {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    const binary = window.atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(encoded, "base64"));
  }
  throw new Error("Base64 decoding is not supported in this environment.");
};

async function deriveKey(passphrase: string, salt: Uint8Array) {
  if (!isWebCryptoAvailable()) {
    throw new Error("Web Crypto API is not available.");
  }

  const encoder = new TextEncoder();
  const material = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 250_000,
      hash: "SHA-256",
    },
    material,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptFormData(
  passphrase: string,
  form: CoachForm
): Promise<string> {
  if (!isWebCryptoAvailable()) {
    throw new Error("Web Crypto API is not available.");
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const encoder = new TextEncoder();
  const payload = encoder.encode(JSON.stringify(form));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    payload
  );

  return [
    ENC_VERSION,
    toBase64(salt),
    toBase64(iv),
    toBase64(new Uint8Array(encrypted)),
  ].join(":");
}

async function decryptFormData(
  passphrase: string,
  record: string
): Promise<CoachForm | null> {
  if (!isWebCryptoAvailable()) {
    return null;
  }

  try {
    const [version, saltEncoded, ivEncoded, payloadEncoded] = record.split(":");
    if (
      version !== ENC_VERSION ||
      !saltEncoded ||
      !ivEncoded ||
      !payloadEncoded
    ) {
      return null;
    }

    const salt = fromBase64(saltEncoded);
    const iv = fromBase64(ivEncoded);
    const payload = fromBase64(payloadEncoded);
    const key = await deriveKey(passphrase, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      payload.buffer as ArrayBuffer
    );
    const decoder = new TextDecoder();
    const json = decoder.decode(decrypted);
    return JSON.parse(json) as CoachForm;
  } catch (error) {
    console.warn("Failed to decrypt coach worksheet", error);
    return null;
  }
}

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

type ChangeHandler = (
  key: keyof CoachForm
) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

export function CoachWorksheet() {
  useDocumentTitle("Coach Worksheet");
  const [form, setForm] = useState<CoachForm>({});
  const [passphrase, setPassphrase] = useState<string>("");
  const [storedCipher, setStoredCipher] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);

  const cryptoSupported = isWebCryptoAvailable();
  const hasSavedData = Boolean(storedCipher);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setInitialError(null);
      try {
        const response = await fetch("/api/worksheets/coach", {
          method: "GET",
          credentials: "include",
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok: true; worksheet: { data: unknown } | null }
          | { ok: false; error?: { message?: string } }
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
        if (typeof data === "string") {
          setStoredCipher(data);
        } else if (data && typeof data === "object") {
          setForm(data as CoachForm);
          setStoredCipher(null);
        } else {
          setStoredCipher(null);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load saved worksheet data.";
        setInitialError(message);
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
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaveStatus(null);
  };

  const handleConfidentialChange = (level: ConfidentialLevel) => () => {
    setForm((prev) => ({
      ...prev,
      confidential: prev.confidential === level ? "" : level,
    }));
    setSaveStatus(null);
  };

  const handlePassphraseChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setPassphrase(event.target.value);
    setLoadError(null);
    setSaveStatus(null);
  };

  const handleUnlock = async () => {
    if (!cryptoSupported) {
      setLoadError("This browser does not support secure storage.");
      return;
    }

    if (!hasSavedData) {
      setLoadError("No encrypted notes were found for this account.");
      return;
    }

    const secret = passphrase.trim();

    if (secret.length < MIN_PASSPHRASE_LENGTH) {
      setLoadError(
        `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters to unlock saved notes.`
      );
      return;
    }

    setUnlocking(true);
    setLoadError(null);
    try {
      const decrypted = await decryptFormData(secret, storedCipher!);
      if (!decrypted) {
        setLoadError(
          "Unable to unlock saved notes with the provided passphrase."
        );
        return;
      }
      setForm(decrypted);
      setLoadError(null);
      setSaveStatus(null);
    } catch {
      setLoadError("Unable to unlock saved notes right now.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleSave = async () => {
    if (!cryptoSupported) {
      setSaveStatus({
        type: "error",
        message:
          "This browser does not support the required security features.",
      });
      return;
    }

    const secret = passphrase.trim();

    if (secret.length < MIN_PASSPHRASE_LENGTH) {
      setSaveStatus({
        type: "error",
        message: `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters to save notes.`,
      });
      return;
    }

    setSaving(true);
    setSaveStatus(null);
    try {
      const encrypted = await encryptFormData(secret, form);
      const response = await fetch("/api/worksheets/coach", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: encrypted }),
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
            "Unable to save notes right now. Please try again.";
        throw new Error(message);
      }

      setStoredCipher(encrypted);
      setSaveStatus({
        type: "success",
        message: "Saved encrypted notes.",
      });
    } catch (error) {
      console.warn("Failed to persist coach worksheet", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save notes. Please try again.";
      setSaveStatus({
        type: "error",
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Clear all saved inputs for Coach worksheet?"
      );
      if (!confirmed) {
        return;
      }
    }

    setSaveStatus(null);
    try {
      const response = await fetch("/api/worksheets/coach", {
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
            "Unable to clear notes right now. Please try again.";
        throw new Error(message);
      }

      setForm({});
      setStoredCipher(null);
      setPassphrase("");
      setLoadError(null);
      setInitialError(null);
      setSaveStatus({
        type: "success",
        message: "Saved notes have been removed.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to clear notes right now.";
      setSaveStatus({ type: "error", message });
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

  const confidentialityOptions: Array<{
    level: ConfidentialLevel;
    title: string;
    description: string;
  }> = [
    {
      level: "HIGH",
      title: "HIGH",
      description:
        "After this presentation, absolutely no mention of what is discussed here.",
    },
    {
      level: "MEDIUM",
      title: "MEDIUM",
      description:
        "You can discuss this topic later, only when the presenter wants to do so.",
    },
    {
      level: "NORMAL",
      title: "NORMAL",
      description:
        "Members can talk about this topic later, but only in a closed environment.",
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
        description:
          "Use open questions to surface insights, options, and desired outcomes.",
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
    <Box
      sx={{
        minHeight: "100vh",
        background: `
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 51, 102, 0.08), transparent),
          radial-gradient(ellipse 60% 50% at 90% 60%, rgba(230, 0, 18, 0.04), transparent),
          linear-gradient(180deg, #fafbfc 0%, #ffffff 40%, #f8f9fb 100%)
        `,
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(0, 51, 102, 0.1), transparent)",
        },
      }}
    >
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 }, pb: 8 }}>
        <Stack spacing={4}>
        {initialError && (
          <Alert severity="error" variant="outlined">
            {initialError}
          </Alert>
        )}
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: "1px solid transparent",
            background: "linear-gradient(135deg, rgba(14,116,144,0.12), rgba(59,130,246,0.08))",
            backdropFilter: "blur(20px) saturate(150%)",
            boxShadow: `
              0 1px 2px rgba(14, 116, 144, 0.08),
              0 8px 24px rgba(14, 116, 144, 0.12),
              0 16px 48px rgba(14, 116, 144, 0.08)
            `,
            position: "relative",
            overflow: "hidden",
            isolation: "isolate",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              padding: "1px",
              background: "linear-gradient(135deg, rgba(14, 116, 144, 0.3), rgba(59, 130, 246, 0.2), rgba(14, 116, 144, 0.1))",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              background: `
                radial-gradient(ellipse 140px at 15% 15%, rgba(255,255,255,0.4), transparent 60%),
                radial-gradient(ellipse 200px at 85% 5%, rgba(125,211,252,0.3), transparent 55%)
              `,
              pointerEvents: "none",
              zIndex: -1,
            },
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
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: "primary.dark" }}
                >
                  Coaching Worksheet
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "primary.dark", mt: 0.5 }}
                >
                  Guide the presenter to surface the real issue and prepare the
                  cohort to support effectively.
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ borderColor: "rgba(125, 211, 252, 0.4)" }} />

            <Stack spacing={2}>
              <Typography
                color="text.secondary"
                sx={{ fontSize: 14, maxWidth: 760 }}
              >
                Review the presentation sheet together, listen deeply, and use
                this worksheet to introduce the presenter with clarity.
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
                1. Help the presenter identify what he/she really wants to
                resolve.
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Ask the Presenter.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Help him/her describe and understand the issue/problem by
                asking:
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
                    • First: Identify the presenter’s emotions (What is he/she
                    feeling? Sad? Worried? Excited? Angry?, etc)
                  </Typography>
                  <Typography>
                    • What does he/she can do to overcome/resolve the issue?
                    (Focus on what the presenter can do. Do not on the external
                    environment which cannot be controlled.)
                  </Typography>
                  <Typography>
                    • What his/her issue is really about? What really is the
                    problem? (Summarize and clarify)
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
                Then, DEFINE THE ISSUE, Types of Issues, What the Presenter
                Wants, and Confidentiality Level.
              </Typography>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  DEFINE THE ISSUE: GIVE THE PRESENTATION a “TITLE” to best
                  describe what to discuss.
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  What do you think is the substance of the issue that the
                  presenter wants to resolve?
                </Typography>
                <TextField
                  fullWidth
                  value={form.title ?? ""}
                  onChange={handleChange("title")}
                  placeholder="Title / substance of the issue"
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
                  Know the presenter’s feelings and emotions toward the issue.
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  List the presenter’s feelings and emotions toward the issue,
                  and IDENTIFY THE STRONGEST ONE.
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={form.feelings ?? ""}
                  onChange={handleChange("feelings")}
                  placeholder="Feelings and the strongest one"
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  What does the presenter want from the peers in their
                  responses?
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Support, ideas, opinions, understanding and empathy, lesson
                  from experience
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={form.want ?? ""}
                  onChange={handleChange("want")}
                  placeholder="What the presenter wants from peers"
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Confidentiality level
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Specify the level of confidentiality (Check one)
                </Typography>
                <Stack spacing={1.5}>
                  {confidentialityOptions.map(
                    ({ level, title, description }) => (
                      <Paper
                        key={level}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          borderColor:
                            form.confidential === level
                              ? "primary.main"
                              : "divider",
                          bgcolor:
                            form.confidential === level
                              ? "primary.50"
                              : "background.paper",
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
                                  fontWeight:
                                    form.confidential === level ? 700 : 500,
                                }}
                              >
                                {title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {description}
                              </Typography>
                            </Box>
                          }
                          sx={{ alignItems: "flex-start", m: 0 }}
                        />
                      </Paper>
                    )
                  )}
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
              Communication starters are comments from all members, to express
              that they feel as if the presenter’s issue is an issue of their
              own, so that the presenter will feel safer and easier to open
              his/her heart and speak about his/her issue during the
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
              <Typography sx={{ fontWeight: 700 }}>
                Communication Starters:
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                <Typography>
                  1. Tell the members “title”. “The title of the presenter’s
                  issue is ‘......’ .”
                </Typography>
                <Typography>
                  2. Tell them the emotions the presenter is feeling. “The
                  presenter is feeling ‘... ’.
                </Typography>
                <Typography>
                  3. And tell them: “Please imagine what the presenter is
                  feeling. And then, please tell the presenter that you are
                  ready to listen.”
                </Typography>
                <Typography>
                  4. Coach or Moderator will be the first one to say “I am ready
                  to listen.”
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
            <Stack spacing={0.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Protect your notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set a personal passphrase to encrypt anything you save for this
                account. The same passphrase is required to unlock the notes
                later.
              </Typography>
            </Stack>

            <TextField
              label="Encryption passphrase"
              type="password"
              value={passphrase}
              onChange={handlePassphraseChange}
              fullWidth
              autoComplete="new-password"
              disabled={!cryptoSupported}
              helperText={
                cryptoSupported
                  ? `Use at least ${MIN_PASSPHRASE_LENGTH} characters.`
                  : "Secure local storage requires a browser with Web Crypto support."
              }
            />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="flex-end"
            >
              <Button
                variant="outlined"
                onClick={() => {
                  void handleUnlock();
                }}
                disabled={
                  !cryptoSupported ||
                  !hasSavedData ||
                  passphrase.trim().length < MIN_PASSPHRASE_LENGTH ||
                  unlocking
                }
              >
                {unlocking ? "Unlocking…" : "Unlock saved data"}
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  void handleSave();
                }}
                disabled={
                  !cryptoSupported ||
                  passphrase.trim().length < MIN_PASSPHRASE_LENGTH ||
                  saving
                }
              >
                {saving ? "Saving…" : "Save securely"}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => {
                  void handleClear();
                }}
              >
                Clear
              </Button>
            </Stack>

            {loadError ? (
              <Typography color="error.main" variant="body2">
                {loadError}
              </Typography>
            ) : null}

            {saveStatus ? (
              <Typography
                color={
                  saveStatus.type === "success" ? "success.main" : "error.main"
                }
                variant="body2"
              >
                {saveStatus.message}
              </Typography>
            ) : null}

            {!cryptoSupported ? (
              <Typography color="warning.main" variant="body2">
                Your browser does not support the Web Crypto API. Saved notes
                will remain unavailable until you switch to a supported browser.
              </Typography>
            ) : null}
          </Stack>
        </Paper>
      </Stack>
      </Container>
    </Box>
  );
}
