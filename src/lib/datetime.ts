export function normalizeToDatetimeLocal(value?: string | null): string {
  if (!value) return "";
  const normalized = String(value).trim().replace(" ", "T");
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!match) return "";
  return `${match[1]}T${match[2]}:${match[3]}`;
}

export function extractDate(value?: string | null): string {
  if (!value) return "";
  const match = String(value)
    .trim()
    .match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export function extractTime(value?: string | null): string {
  if (!value) return "";
  const match = String(value)
    .trim()
    .match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

export function combineDateAndTime(date: string, time: string): string {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

export function formatSessionRange(
  startAt: string | null,
  endAt: string | null,
  locale = "en-US"
): string {
  if (!startAt) return "TBD";
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return startAt.replace("T", " ");

  const formatDate = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const formatTime = new Intl.DateTimeFormat(locale, { timeStyle: "short" });

  const startDateLabel = formatDate.format(start);
  const startTimeLabel = formatTime.format(start);

  if (!endAt) {
    return `${startDateLabel} ${startTimeLabel}`;
  }

  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) {
    return `${startDateLabel} ${startTimeLabel}`;
  }

  const sameDay = start.toDateString() === end.toDateString();
  const endTimeLabel = formatTime.format(end);
  const endDateLabel = sameDay ? "" : `${formatDate.format(end)} `;

  if (sameDay) {
    return `${startDateLabel} ${startTimeLabel} – ${endTimeLabel}`;
  }

  return `${startDateLabel} ${startTimeLabel} – ${endDateLabel}${endTimeLabel}`.trim();
}
