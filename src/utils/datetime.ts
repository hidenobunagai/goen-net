export function normalizeToDatetimeLocal(value?: string | null): string {
  if (!value) return ''
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  const normalized = trimmed.replace(' ', 'T')
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  if (!match) return ''
  return `${match[1]}T${match[2]}:${match[3]}`
}

export function extractDate(value?: string | null): string {
  if (!value) return ''
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

export function extractTime(value?: string | null): string {
  if (!value) return ''
  const match = String(value).trim().match(/T(\d{2}:\d{2})/)
  return match ? match[1] : ''
}

export function combineDateAndTime(date: string, time: string): string {
  if (!date || !time) return ''
  return `${date}T${time}`
}

export function formatSessionRange(startAt: string, endAt: string): string {
  const toDisplay = (input: string) => (input ? input.replace('T', ' ') : '')

  if (startAt && endAt) {
    const startMatch = startAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
    const endMatch = endAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)

    if (startMatch && endMatch && startMatch[1] === endMatch[1]) {
      return `${startMatch[1]} ${startMatch[2]} - ${endMatch[2]}`
    }

    return `${toDisplay(startAt)} – ${toDisplay(endAt)}`
  }

  if (startAt) return toDisplay(startAt)
  return 'TBD'
}

export function validateSessionTimes(date: string, startTime: string, endTime: string): string | null {
  if (!date || !startTime) {
    return 'Date and start time are required'
  }
  if (endTime && endTime <= startTime) {
    return 'End time must be later than start time'
  }
  return null
}
