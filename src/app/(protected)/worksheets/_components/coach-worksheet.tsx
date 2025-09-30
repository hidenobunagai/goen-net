"use client";

import { useDocumentTitle } from "@/hooks/use-document-title";
import {
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
import { useMemo, useState, useEffect } from "react";

const STORAGE_KEY = "worksheet_coach_v1";
const ENC_VERSION = "v2";
const IV_BYTES = 12;
const KEY_DB_NAME = "coachWorksheetSecureStore";
const KEY_STORE_NAME = "keys";
const KEY_ID = "coachWorksheetKey_v1";

const isSecureStorageAvailable = () =>
  typeof window !== "undefined" &&
  Boolean(window.crypto?.subtle) &&
  typeof window.indexedDB !== "undefined";

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

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Secure storage is not available on the server."));
      return;
    }

    const request = window.indexedDB.open(KEY_DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(KEY_STORE_NAME);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open secure storage."));
    };
  });
}

async function getStoredKey(): Promise<CryptoKey | null> {
  try {
    const db = await openKeyDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(KEY_STORE_NAME, "readonly");
      const store = transaction.objectStore(KEY_STORE_NAME);
      const getRequest = store.get(KEY_ID);

      getRequest.onsuccess = () => {
        resolve((getRequest.result as CryptoKey | undefined) ?? null);
      };

      getRequest.onerror = () => {
        reject(getRequest.error ?? new Error("Failed to read secure key."));
      };

      transaction.oncomplete = () => {
        db.close();
      };

      transaction.onerror = () => {
        reject(transaction.error ?? new Error("Secure key transaction failed."));
      };
    });
  } catch (error) {
    console.warn("Failed to access coach worksheet key", error);
    return null;
  }
}

async function storeKey(key: CryptoKey): Promise<void> {
  const db = await openKeyDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE_NAME, "readwrite");
    const store = transaction.objectStore(KEY_STORE_NAME);
    store.put(key, KEY_ID);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error ?? new Error("Failed to persist secure key."));
    };
  });
}

async function deleteStoredKey(): Promise<void> {
  try {
    const db = await openKeyDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(KEY_STORE_NAME, "readwrite");
      const store = transaction.objectStore(KEY_STORE_NAME);
      store.delete(KEY_ID);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error ?? new Error("Failed to remove secure key."));
      };
    });
  } catch (error) {
    console.warn("Failed to remove coach worksheet key", error);
  }
}

async function generateAndStoreKey(): Promise<CryptoKey> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Secure storage is not supported in this environment.");
  }

  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  await storeKey(key);
  return key;
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const existing = await getStoredKey();
  if (existing) {
    return existing;
  }
  return generateAndStoreKey();
}

async function encryptFormData(form: CoachForm): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Secure storage is not supported in this environment.");
  }

  const key = await getOrCreateKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoder = new TextEncoder();
  const payload = encoder.encode(JSON.stringify(form));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    payload
  );

  return [ENC_VERSION, toBase64(iv), toBase64(new Uint8Array(encrypted))].join(":");
}

async function decryptFormData(record: string): Promise<CoachForm | null> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return null;
  }

  try {
    const [version, ivEncoded, payloadEncoded] = record.split(":");
    if (version !== ENC_VERSION || !ivEncoded || !payloadEncoded) {
      return null;
    }

    const key = await getStoredKey();
    if (!key) {
      return null;
    }

    const iv = fromBase64(ivEncoded);
    const payload = fromBase64(payloadEncoded);
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
  const [initializing, setInitializing] = useState(true);
  const [secureStorageSupported, setSecureStorageSupported] = useState(false);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let active = true;

    const initialize = async () => {
      const supported = isSecureStorageAvailable();
      if (!active) return;
      setSecureStorageSupported(supported);

      const record = window.localStorage.getItem(STORAGE_KEY);
      if (!active) return;
      setHasSavedData(Boolean(record));

      if (!supported) {
        setLoadError(
          "Secure storage is not supported in this browser. Notes cannot be saved."
        );
        setInitializing(false);
        return;
      }

      if (!record) {
        setInitializing(false);
        return;
      }

      const decrypted = await decryptFormData(record);
      if (!active) return;

      if (decrypted) {
        setForm(decrypted);
        setLoadError(null);
      } else {
        setLoadError(
          "Saved notes could not be unlocked. They may have been created on another device or have been cleared."
        );
      }

      setInitializing(false);
    };

    initialize().catch((error) => {
      console.warn("Failed to load coach worksheet", error);
      if (!active) return;
      setLoadError("Unable to load saved notes right now.");
      setInitializing(false);
    });

    return () => {
      active = false;
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
    setLoadError(null);
  };

  const handleConfidentialChange = (level: ConfidentialLevel) => () => {
    setForm((prev) => ({
      ...prev,
      confidential: prev.confidential === level ? "" : level,
    }));
    setSaveStatus(null);
    setLoadError(null);
  };

  const handleSave = async () => {
    if (typeof window === "undefined" || initializing) return;

    if (!secureStorageSupported) {
      setSaveStatus({
        type: "error",
        message:
          "Secure storage is not available in this browser, so notes cannot be saved.",
      });
      return;
    }

    setSaving(true);
    setSaveStatus(null);

    try {
      const encrypted = await encryptFormData(form);
      window.localStorage.setItem(STORAGE_KEY, encrypted);
      setHasSavedData(true);
      setLoadError(null);
      setSaveStatus({
        type: "success",
        message: "Saved encrypted notes to this device.",
      });
    } catch (error) {
      console.warn("Failed to persist coach worksheet", error);
      setSaveStatus({
        type: "error",
        message: "Failed to save notes. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (typeof window === "undefined" || initializing) return;
    if (!window.confirm("Clear all saved inputs for Coach worksheet?")) return;

    setClearing(true);

    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setForm({});
      setHasSavedData(false);
      setLoadError(null);
      setSaveStatus({
        type: "success",
        message: "Saved notes have been removed from this device.",
      });
      if (secureStorageSupported) {
        await deleteStoredKey();
      }
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
    <Container maxWidth="md" sx={{ my: 4, pb: 8 }}>
      <Stack spacing={3}>
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: "1px solid",
            borderColor: "primary.light",
            background:
              "linear-gradient(135deg, rgba(14,116,144,0.18), rgba(59,130,246,0.14))",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)",
            position: "relative",
            overflow: "hidden",
            isolation: "isolate",
            "&::after": {
              content: "''",
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(140px at 15% 15%, rgba(255,255,255,0.5), transparent 65%), radial-gradient(200px at 85% 5%, rgba(125,211,252,0.35), transparent 60%)",
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
                Save your notes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Save your progress to this device so you can revisit and edit
                it later. Saved notes stay only on this browser.
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="flex-end"
            >
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={initializing || saving || !secureStorageSupported}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleClear}
                disabled={initializing || clearing || !hasSavedData}
              >
                {clearing ? "Clearing..." : "Clear"}
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
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
