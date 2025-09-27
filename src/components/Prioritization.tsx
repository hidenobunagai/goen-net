import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AddIcon from '@mui/icons-material/Add'
import ClearIcon from '@mui/icons-material/Clear'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import React from 'react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { fetchUpdateItems, type UpdateItem } from '../utils/updates'

type UniqueId = string

interface ColumnState {
  id: UniqueId
  title: string
  itemIds: UniqueId[]
  removable: boolean
}

interface BoardState {
  columns: Record<UniqueId, ColumnState>
  columnOrder: UniqueId[]
}

const STORAGE_KEY = 'goen-prioritization-board-v1'
const BOARD_VERSION = 2
const BACKLOG_COLUMN_ID = 'backlog'

const CATEGORY_PRESETS: Record<number, { id: UniqueId; title: string }> = {
  0: { id: 'work', title: 'Work' },
  1: { id: 'family', title: 'Family' },
  2: { id: 'personal', title: 'Personal' },
}

function getCategoryPreset(category: number): { id: UniqueId; title: string } {
  if (CATEGORY_PRESETS[category]) {
    return CATEGORY_PRESETS[category]
  }
  return {
    id: `category-${category}`,
    title: `Category ${category}`,
  }
}

function deriveCategoryPresets(updates: UpdateItem[]): { id: UniqueId; title: string; removable: boolean }[] {
  const map = new Map<UniqueId, string>()
  for (const item of updates) {
    const preset = getCategoryPreset(item.category)
    if (!map.has(preset.id)) {
      map.set(preset.id, preset.title)
    }
  }
  return Array.from(map, ([id, title]) => ({ id, title, removable: true })).sort((a, b) => a.title.localeCompare(b.title))
}

function getMemberKey(item: UpdateItem): string {
  const uid = (item.uid ?? '').trim()
  if (uid) return uid
  const by = (item.by ?? '').trim()
  if (by) return `by:${by.toLowerCase()}`
  return 'unknown'
}

interface StoredBoardState {
  version: number
  board: BoardState
}

function buildInitialBoard(updates: UpdateItem[]): BoardState {
  // 初期状態はUnassigned列のみ、他はユーザーが追加したときのみ生成
  const sorted = [...updates].sort((a, b) => b.date.getTime() - a.date.getTime())
  const columns: Record<UniqueId, ColumnState> = {
    [BACKLOG_COLUMN_ID]: {
      id: BACKLOG_COLUMN_ID,
      title: 'Unassigned',
      removable: false,
      itemIds: sorted.map((item) => item.id),
    },
  }
  const columnOrder: UniqueId[] = [BACKLOG_COLUMN_ID]
  return { columns, columnOrder }
}

function loadBoardFromStorage(): BoardState | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredBoardState | null
    if (!parsed || parsed.version !== BOARD_VERSION || !parsed.board) return null
    return parsed.board
  } catch (error) {
    console.warn('Failed to read prioritization board from storage', error)
    return null
  }
}

function saveBoardToStorage(board: BoardState) {
  try {
    if (typeof window === 'undefined') return
    const payload: StoredBoardState = { version: BOARD_VERSION, board }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('Failed to persist prioritization board', error)
  }
}

function ensureBacklogColumn(board: BoardState): BoardState {
  if (board.columns[BACKLOG_COLUMN_ID]) return board
  const backlog: ColumnState = {
    id: BACKLOG_COLUMN_ID,
    title: 'Unassigned',
    removable: false,
    itemIds: [],
  }
  return {
    columns: { ...board.columns, [BACKLOG_COLUMN_ID]: backlog },
    columnOrder: [BACKLOG_COLUMN_ID, ...board.columnOrder.filter((id) => id !== BACKLOG_COLUMN_ID)],
  }
}

function createBoardWithUpdates(board: BoardState | null, updates: UpdateItem[]): BoardState {
  // 既存のカラムを維持しつつ、Unassigned列には未割当てのアイテムのみを入れる
  const baseBoard = ensureBacklogColumn(board ?? buildInitialBoard(updates))
  const itemsById = new Map(updates.map((u) => [u.id, u]))
  const assignedIds = new Set<UniqueId>()
  const columns: Record<UniqueId, ColumnState> = {}
  const columnOrder: UniqueId[] = []

  const pushColumnOrder = (id: UniqueId) => {
    if (!columnOrder.includes(id)) {
      columnOrder.push(id)
    }
  }

  // 既存カラムのうちUnassigned以外はそのまま
  for (const columnId of baseBoard.columnOrder) {
    if (columnId === BACKLOG_COLUMN_ID) continue
    const column = baseBoard.columns[columnId]
    if (!column) continue
    const filteredItemIds = column.itemIds.filter((itemId) => itemsById.has(itemId))
    for (const itemId of filteredItemIds) assignedIds.add(itemId)
    columns[columnId] = {
      ...column,
      itemIds: filteredItemIds,
    }
    pushColumnOrder(columnId)
  }

  // Unassigned列は未割当てのアイテムのみ
  const unassignedIds = updates
    .filter((item) => !assignedIds.has(item.id))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((item) => item.id)
  columns[BACKLOG_COLUMN_ID] = {
    id: BACKLOG_COLUMN_ID,
    title: 'Unassigned',
    removable: false,
    itemIds: unassignedIds,
  }
  columnOrder.unshift(BACKLOG_COLUMN_ID)

  return {
    columns,
    columnOrder,
  }
}

function createColumnId(title: string): UniqueId {
  const normalized = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const suffix = Date.now().toString(36)
  return normalized ? `${normalized}-${suffix}` : `custom-${suffix}`
}

function findColumnIdByItem(board: BoardState, itemId: UniqueId): UniqueId | null {
  for (const columnId of board.columnOrder) {
    if (board.columns[columnId]?.itemIds.includes(itemId)) {
      return columnId
    }
  }
  return null
}

function formatDateShort(date: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  } catch {
    return date.toISOString().split('T')[0]
  }
}

const Prioritization: React.FC = () => {
  useDocumentTitle('Prioritization')

  const [updates, setUpdates] = React.useState<UpdateItem[]>([])
  const [board, setBoard] = React.useState<BoardState | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [newColumnName, setNewColumnName] = React.useState('')
  const [activeId, setActiveId] = React.useState<UniqueId | null>(null)
  const [selectedMember, setSelectedMember] = React.useState<string>('all')
  const [selectedTimeframe, setSelectedTimeframe] = React.useState<string>('all')
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  React.useEffect(() => {
    const controller = new AbortController()
    const initialize = async () => {
      setLoading(true)
      setError(null)
      try {
        const [items, storedBoard] = await Promise.all([
          fetchUpdateItems({ signal: controller.signal }),
          Promise.resolve(loadBoardFromStorage()),
        ])
        setUpdates(items)
        setBoard(createBoardWithUpdates(storedBoard, items))
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Failed to load prioritization data', err)
        setError(err instanceof Error ? err.message : 'Failed to load updates')
        setBoard(createBoardWithUpdates(null, []))
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void initialize()
    return () => controller.abort()
  }, [])

  React.useEffect(() => {
    if (!board) return
    saveBoardToStorage(board)
  }, [board])

  React.useEffect(() => {
    setBoard((prev) => createBoardWithUpdates(prev, updates))
  }, [updates])

  const memberOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const item of updates) {
      const key = getMemberKey(item)
      if (!map.has(key)) map.set(key, item.by ?? 'Unknown member')
    }
    return Array.from(map, ([uid, by]) => ({ uid, by })).sort((a, b) => a.by.localeCompare(b.by))
  }, [updates])

  React.useEffect(() => {
    if (selectedMember === 'all') return
    if (!memberOptions.some((option) => option.uid === selectedMember)) {
      setSelectedMember('all')
    }
  }, [memberOptions, selectedMember])

  // Unassigned列のみにフィルターを適用
  const visibleUnassignedUpdates = React.useMemo(() => {
    const now = new Date()
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(now.getMonth() - 3)
    const threeMonthsAhead = new Date(now)
    threeMonthsAhead.setMonth(now.getMonth() + 3)

    return updates.filter((item) => {
      // Unassigned列に入るものだけ
      if (board) {
        for (const colId of board.columnOrder) {
          if (colId !== BACKLOG_COLUMN_ID && board.columns[colId]?.itemIds.includes(item.id)) {
            return false
          }
        }
      }
      if (selectedMember !== 'all' && getMemberKey(item) !== selectedMember) {
        return false
      }
      if (selectedTimeframe === 'past3') {
        if (item.date > now || item.date < threeMonthsAgo) {
          return false
        }
      } else if (selectedTimeframe === 'next3') {
        if (item.date <= now || item.date > threeMonthsAhead) {
          return false
        }
      }
      if (selectedCategory !== 'all' && getCategoryPreset(item.category).id !== selectedCategory) {
        return false
      }
      return true
    })
  }, [updates, selectedMember, selectedTimeframe, selectedCategory, board])

  const allItemsById = React.useMemo(() => new Map(updates.map((item) => [item.id, item])), [updates])
  // Unassigned列のみフィルター適用
  const visibleUnassignedIds = React.useMemo(() => new Set(visibleUnassignedUpdates.map((item) => item.id)), [visibleUnassignedUpdates])
  const selectedMemberLabel = React.useMemo(() => {
    if (selectedMember === 'all') return null
    return memberOptions.find((option) => option.uid === selectedMember)?.by ?? null
  }, [memberOptions, selectedMember])
  const filtersActive = selectedMember !== 'all' || selectedTimeframe !== 'all' || selectedCategory !== 'all'

  const handleAddColumn = () => {
    const trimmed = newColumnName.trim()
    if (!trimmed) return
    setBoard((prev) => {
      const nextBoard = prev ?? createBoardWithUpdates(null, updates)
      const id = createColumnId(trimmed)
      if (nextBoard.columns[id]) return nextBoard
      return {
        columns: {
          ...nextBoard.columns,
          [id]: {
            id,
            title: trimmed,
            itemIds: [],
            removable: true,
          },
        },
        columnOrder: [...nextBoard.columnOrder, id],
      }
    })
    setNewColumnName('')
  }

  const handleMemberChange = (event: SelectChangeEvent<string>) => {
    setSelectedMember(event.target.value)
  }

  const handleTimeframeChange = (event: SelectChangeEvent<string>) => {
    setSelectedTimeframe(event.target.value)
  }

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    setSelectedCategory(event.target.value)
  }

  const handleClearFilters = () => {
    setSelectedMember('all')
    setSelectedTimeframe('all')
    setSelectedCategory('all')
  }

  const handleDeleteColumn = (columnId: UniqueId) => {
    setBoard((prev) => {
      if (!prev || columnId === BACKLOG_COLUMN_ID) return prev
      const column = prev.columns[columnId]
      if (!column || !column.removable) return prev

      const backlog = prev.columns[BACKLOG_COLUMN_ID] ?? {
        id: BACKLOG_COLUMN_ID,
        title: 'Unassigned',
        removable: false,
        itemIds: [],
      }

      const updatedBacklog: ColumnState = {
        ...backlog,
        itemIds: [...column.itemIds, ...backlog.itemIds.filter((id) => !column.itemIds.includes(id))],
      }

      const { [columnId]: _removed, ...restColumns } = prev.columns
      return {
        columns: {
          ...restColumns,
          [BACKLOG_COLUMN_ID]: updatedBacklog,
        },
        columnOrder: prev.columnOrder.filter((id) => id !== columnId),
      }
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const active = event.active
    setActiveId(String(active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!board || !over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const sourceColumnId = findColumnIdByItem(board, activeId)
    const targetColumnId = over.data.current?.columnId
      ? String(over.data.current.columnId)
      : findColumnIdByItem(board, overId)

    if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) {
      return
    }

    setBoard((prev) => {
      if (!prev) return prev
      const sourceColumn = prev.columns[sourceColumnId]
      const targetColumn = prev.columns[targetColumnId]
      if (!sourceColumn || !targetColumn) return prev

      const sourceIndex = sourceColumn.itemIds.indexOf(activeId)
      if (sourceIndex === -1) return prev

      const newSourceIds = [...sourceColumn.itemIds]
      newSourceIds.splice(sourceIndex, 1)

      const overItemType = over.data.current?.type
      let targetIndex = targetColumn.itemIds.length
      if (overItemType === 'item') {
        const overItemId = String(over.id)
        targetIndex = targetColumn.itemIds.indexOf(overItemId)
        if (targetIndex === -1) targetIndex = targetColumn.itemIds.length
      }

      const newTargetIds = [...targetColumn.itemIds]
      newTargetIds.splice(targetIndex, 0, activeId)

      return {
        columns: {
          ...prev.columns,
          [sourceColumnId]: { ...sourceColumn, itemIds: newSourceIds },
          [targetColumnId]: { ...targetColumn, itemIds: newTargetIds },
        },
        columnOrder: prev.columnOrder,
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!board || !over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const sourceColumnId = findColumnIdByItem(board, activeId)
    const targetColumnId = over.data.current?.columnId
      ? String(over.data.current.columnId)
      : findColumnIdByItem(board, overId)

    if (!sourceColumnId || !targetColumnId) return

    if (sourceColumnId !== targetColumnId) {
      return
    }

    const column = board.columns[sourceColumnId]
    const oldIndex = column?.itemIds.indexOf(activeId) ?? -1
    const newIndex = column?.itemIds.indexOf(overId) ?? -1
    if (!column || oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    setBoard((prev) => {
      if (!prev) return prev
      const currentColumn = prev.columns[sourceColumnId]
      if (!currentColumn) return prev
      return {
        columns: {
          ...prev.columns,
          [sourceColumnId]: {
            ...currentColumn,
            itemIds: arrayMove(currentColumn.itemIds, oldIndex, newIndex),
          },
        },
        columnOrder: prev.columnOrder,
      }
    })
  }

  if (loading) {
    return (
      <Container sx={{ py: 6 }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Loading updates…
          </Typography>
        </Stack>
      </Container>
    )
  }

  if (!board) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="error">Failed to initialize prioritization board.</Alert>
      </Container>
    )
  }

  const activeItem = activeId ? allItemsById.get(activeId) ?? null : null

  return (
    <Container sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            Prioritization
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Organize the latest updates into categories to prepare for the session discussion. Create any categories you
            need, then drag updates into each column in order of importance.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ mt: 2, flexWrap: 'wrap' }}
          >
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 220 } }}>
              <InputLabel id="timeframe-filter-label">Filter by time</InputLabel>
              <Select
                labelId="timeframe-filter-label"
                value={selectedTimeframe}
                label="Filter by time"
                onChange={handleTimeframeChange}
              >
                <MenuItem value="all">All dates</MenuItem>
                <MenuItem value="past3">Past 3 months</MenuItem>
                <MenuItem value="next3">Next 3 months</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 220 } }}>
              <InputLabel id="category-filter-label">Filter by category</InputLabel>
              <Select
                labelId="category-filter-label"
                value={selectedCategory}
                label="Filter by category"
                onChange={handleCategoryChange}
              >
                <MenuItem value="all">All categories</MenuItem>
                <MenuItem value="work">Work</MenuItem>
                <MenuItem value="family">Family</MenuItem>
                <MenuItem value="personal">Personal</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 260 } }}>
              <InputLabel id="member-filter-label">Filter by member</InputLabel>
              <Select
                labelId="member-filter-label"
                value={selectedMember}
                label="Filter by member"
                onChange={handleMemberChange}
              >
                <MenuItem value="all">All members</MenuItem>
                {memberOptions.map((option) => (
                  <MenuItem key={option.uid} value={option.uid}>
                    {option.by}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              <Typography variant="body2" color="text.secondary">
                {`${visibleUnassignedUpdates.length} unassigned update${visibleUnassignedUpdates.length === 1 ? '' : 's'} shown${selectedMemberLabel ? ` · ${selectedMemberLabel}` : ''}`}
              </Typography>
              <Button
                variant="text"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                disabled={!filtersActive}
                sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
              >
                Clear filters
              </Button>
            </Stack>
          </Stack>
        </Box>

        {error ? <Alert severity="warning">{error}</Alert> : null}

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <TextField
              size="small"
              label="New category"
              value={newColumnName}
              onChange={(event) => setNewColumnName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAddColumn()
                }
              }}
              sx={{ flexGrow: 1, maxWidth: 320 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddColumn}
              disabled={!newColumnName.trim()}
            >
              Add Category
            </Button>
          </Stack>
        </Paper>

        <Divider />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 2,
              overflowX: 'auto',
              pb: 4,
            }}
          >
            {board.columnOrder.map((columnId) => {
              const column = board.columns[columnId]
              if (!column) return null
              let columnItems: UpdateItem[]
              if (columnId === BACKLOG_COLUMN_ID) {
                // Unassigned列のみフィルター適用
                columnItems = column.itemIds
                  .filter((itemId) => visibleUnassignedIds.has(itemId))
                  .map((itemId) => allItemsById.get(itemId))
                  .filter((item): item is UpdateItem => Boolean(item))
              } else {
                // 他の列は全件表示
                columnItems = column.itemIds
                  .map((itemId) => allItemsById.get(itemId))
                  .filter((item): item is UpdateItem => Boolean(item))
              }
              return (
                <Column
                  key={column.id}
                  column={column}
                  items={columnItems}
                  onDelete={handleDeleteColumn}
                />
              )
            })}
          </Box>

          <DragOverlay dropAnimation={null}>
            {activeItem ? <UpdateCard item={activeItem} isDragging /> : null}
          </DragOverlay>
        </DndContext>

        {updates.length === 0 ? (
          <Alert severity="info">No updates available right now. Check back later.</Alert>
        ) : null}
        {updates.length > 0 && visibleUnassignedUpdates.length === 0 ? (
          <Alert severity="info">No unassigned updates match the selected filters.</Alert>
        ) : null}
      </Stack>
    </Container>
  )
}

interface ColumnProps {
  column: ColumnState
  items: UpdateItem[]
  onDelete: (columnId: UniqueId) => void
}

const Column: React.FC<ColumnProps> = ({ column, items, onDelete }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      columnId: column.id,
    },
  })

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        minHeight: 360,
        maxHeight: '80vh',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={600} noWrap>
            {column.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {items.length}
          </Typography>
        </Stack>
        {column.removable ? (
          <Tooltip title="Remove category">
            <span>
              <IconButton size="small" onClick={() => onDelete(column.id)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
      </Stack>
  <SortableContext id={column.id} items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <Stack
          ref={setNodeRef}
          spacing={1}
          flexGrow={1}
          minHeight={200}
          sx={{
            borderRadius: 1,
            p: items.length === 0 ? 1 : 0,
            transition: 'background-color 0.2s ease, border-color 0.2s ease',
            bgcolor: isOver ? 'action.hover' : undefined,
            border: isOver ? '1px dashed' : undefined,
            borderColor: isOver ? 'primary.light' : undefined,
          }}
        >
          {items.length === 0 ? (
            <EmptyDropzone label={column.id === BACKLOG_COLUMN_ID ? 'Drop updates here' : 'Drag updates here'} />
          ) : (
            items.map((item) => <SortableUpdateCard key={item.id} item={item} columnId={column.id} />)
          )}
        </Stack>
      </SortableContext>
    </Paper>
  )
}

interface EmptyDropzoneProps {
  label: string
}

const EmptyDropzone: React.FC<EmptyDropzoneProps> = ({ label }) => (
  <Paper
    variant="outlined"
    sx={{
      py: 6,
      px: 2,
      borderStyle: 'dashed',
      color: 'text.secondary',
      textAlign: 'center',
      bgcolor: 'background.default',
    }}
  >
    {label}
  </Paper>
)

interface SortableUpdateCardProps {
  item: UpdateItem
  columnId: UniqueId
}

const SortableUpdateCard: React.FC<SortableUpdateCardProps> = ({ item, columnId }) => {
  const sortable = useSortable({
    id: item.id,
    data: {
      type: 'item',
      columnId,
    },
  })

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <UpdateCard item={item} isDragging={isDragging} />
    </Box>
  )
}

interface UpdateCardProps {
  item: UpdateItem
  isDragging?: boolean
}

const UpdateCard: React.FC<UpdateCardProps> = ({ item, isDragging }) => (
  <Paper
    elevation={isDragging ? 4 : 1}
    sx={{
      p: 1.5,
      borderRadius: 1.5,
      border: '1px solid',
      borderColor: isDragging ? 'primary.light' : 'divider',
      bgcolor: isDragging ? 'background.paper' : 'background.default',
      cursor: 'grab',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
    }}
  >
    <Typography variant="subtitle1" fontWeight={600} noWrap title={item.title}>
      {item.title}
    </Typography>
    <Typography variant="body2" color="text.secondary" noWrap title={item.update}>
      {item.update || 'No additional details provided.'}
    </Typography>
    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
      <Typography variant="caption" color="text.secondary">
        {item.by}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {formatDateShort(item.date)} · {item.votes} vote{item.votes === 1 ? '' : 's'}
      </Typography>
    </Stack>
  </Paper>
)

export default Prioritization
