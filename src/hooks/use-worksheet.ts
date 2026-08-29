"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState } from "react";

type WorksheetRole = "presenter" | "coach" | "observer";

export type WorksheetStatus = { type: "success" | "error"; message: string } | null;

type UseWorksheetOptions<T> = {
  initial?: T;
  normalize?: (value: unknown) => T;
};

export function useWorksheet<T extends Record<string, unknown>>(
  role: WorksheetRole,
  options: UseWorksheetOptions<T> = {}
) {
  const { initial, normalize } = options;
  const initialRef = useState(() => initial ?? ({} as T))[0];
  const [form, setForm] = useState<T>(initialRef);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState<WorksheetStatus>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/worksheets/${role}`, {
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
        if (cancelled) return;
        const data = payload?.worksheet?.data;
        if (normalize) {
          setForm(normalize(data));
        } else if (data && typeof data === "object") {
          setForm(data as T);
        } else if (data == null) {
          setForm(initialRef);
        }
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unable to load saved worksheet data.";
        setLoadError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [role, normalize, initialRef]);

  const handleChange = useCallback(
    (key: keyof T) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const target = event.target as HTMLInputElement;
      const value = target.type === "checkbox" ? target.checked : event.target.value;
      setStatus(null);
      setForm((prev) => ({ ...prev, [key]: value as T[keyof T] }));
    },
    []
  );

  const save = useCallback(async () => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/worksheets/${role}`, {
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
  }, [role, form]);

  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const requestClear = useCallback(() => {
    setClearDialogOpen(true);
  }, []);

  const confirmClear = useCallback(async () => {
    setClearDialogOpen(false);
    setClearing(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/worksheets/${role}`, {
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
      setForm(initialRef);
      setStatus({ type: "success", message: "Worksheet cleared." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to clear worksheet right now.";
      setStatus({ type: "error", message });
    } finally {
      setClearing(false);
    }
  }, [role, initialRef]);

  return {
    form,
    setForm,
    loading,
    saving,
    clearing,
    status,
    setStatus,
    loadError,
    handleChange,
    save,
    clear: requestClear,
    clearDialogOpen,
    setClearDialogOpen,
    requestClear,
    confirmClear,
  };
}
