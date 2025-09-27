export interface RecentUpdateItem { id: string; update: string; by: string; date: Date }

export interface UpdateRow {
  id?: unknown
  by?: unknown
  category?: unknown
  priority?: unknown
  uid?: unknown
  title?: unknown
  update?: unknown
  when?: unknown
  createdAt?: unknown
  votes?: unknown
  viewerHasVoted?: unknown
}

export interface UpdateItem {
  id: string
  by: string
  category: number
  priority: boolean
  uid: string
  title: string
  update: string
  when: number
  date: Date
  votes: number
  viewerHasVoted: boolean
}

type RequestError = Error & { status?: number }

const FALLBACK_TITLE = 'Untitled'
const TITLE_PREVIEW_LENGTH = 80

function toUpdateItem(row: UpdateRow): UpdateItem {
  const updateText = typeof row.update === 'string' ? row.update : ''
  const titleFromRow = typeof row.title === 'string' ? row.title.trim() : ''
  const title = titleFromRow || (updateText ? updateText.slice(0, TITLE_PREVIEW_LENGTH) : FALLBACK_TITLE)

  const createdRaw = row.createdAt
  let createdAt = new Date()
  if (typeof createdRaw === 'string' || typeof createdRaw === 'number') {
    const parsed = new Date(createdRaw)
    if (!Number.isNaN(parsed.getTime())) {
      createdAt = parsed
    }
  }

  const uid = row.uid != null ? String(row.uid) : ''
  const id = row.id != null ? String(row.id) : `${uid || 'anonymous'}:${createdAt.getTime()}`
  const votes = typeof row.votes === 'number' ? row.votes : Number(row.votes ?? 0) || 0
  const viewerHasVoted = typeof row.viewerHasVoted === 'boolean'
    ? row.viewerHasVoted
    : Number(row.viewerHasVoted ?? 0) === 1

  return {
    id,
    by: typeof row.by === 'string' && row.by.trim() ? row.by : 'Unknown',
    category: typeof row.category === 'number' ? row.category : Number(row.category ?? 0) || 0,
    priority: typeof row.priority === 'boolean' ? row.priority : Number(row.priority ?? 0) === 1,
    uid,
    title,
    update: updateText,
    when: typeof row.when === 'number' ? row.when : Number(row.when ?? 0) || 0,
    date: createdAt,
    votes,
    viewerHasVoted,
  }
}

export function parseUpdateRows(payload: unknown): UpdateRow[] {
  if (Array.isArray(payload)) return payload as UpdateRow[]
  if (payload && typeof payload === 'object' && Array.isArray((payload as any).rows)) {
    return (payload as any).rows as UpdateRow[]
  }
  return []
}

export function parseUpdateItems(payload: unknown): UpdateItem[] {
  return parseUpdateRows(payload)
    .map(toUpdateItem)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

interface FetchUpdateItemsOptions {
  signal?: AbortSignal
  limit?: number
  offset?: number
  credentials?: RequestCredentials
}

export async function fetchUpdateItems(options: FetchUpdateItemsOptions = {}): Promise<UpdateItem[]> {
  const { signal, limit, offset, credentials = 'include' } = options
  const params = new URLSearchParams()
  if (typeof limit === 'number') params.set('limit', String(limit))
  if (typeof offset === 'number' && offset > 0) params.set('offset', String(offset))
  const query = params.toString()
  const response = await fetch(`/api/updates${query ? `?${query}` : ''}`, { signal, credentials })
  if (!response.ok) {
    let message = `Failed to fetch updates (${response.status})`
    try {
      const body = await response.json()
      message = body?.error?.message || body?.message || message
    } catch {}
    const error: RequestError = new Error(message)
    error.status = response.status
    throw error
  }
  const payload = await response.json()
  return parseUpdateItems(payload)
}

export async function fetchRecentUpdates(limit = 3): Promise<RecentUpdateItem[]> {
  try {
    const items = await fetchUpdateItems({ limit })
    return items.slice(0, limit).map(({ id, update, by, date }) => ({ id, update, by, date }))
  } catch {
    return []
  }
}
