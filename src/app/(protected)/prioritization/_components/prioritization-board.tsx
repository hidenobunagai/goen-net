"use client";

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
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
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { UpdateRecord } from "@/lib/updates";

const STORAGE_KEY = "goen-prioritization-board-v1";
const BOARD_VERSION = 2;
const BACKLOG_COLUMN_ID = "backlog";

const CATEGORY_PRESETS: Record<number, { id: string; title: string }> = {
  0: { id: "work", title: "Work" },
  1: { id: "family", title: "Family" },
  2: { id: "personal", title: "Personal" },
};

type UniqueId = string;

type UpdateItem = {
  id: string;
  title: string;
  body: string;
  by: string;
  uid: string;
  category: number;
  urgent: boolean;
  when: -1 | 1;
  createdAt: Date;
};

type ColumnState = {
  id: UniqueId;
  title: string;
  itemIds: UniqueId[];
  removable: boolean;
};

type BoardState = {
  columns: Record<UniqueId, ColumnState>;
  columnOrder: UniqueId[];
};

type StoredBoardState = {
  version: number;
  board: BoardState;
};

function toUpdateItem(record: UpdateRecord): UpdateItem {
  return {
    id: record.id,
    title: record.title,
    body: record.body,
    by: record.by,
    uid: record.uid,
    category: record.category,
    urgent: record.urgent,
    when: record.when,
    createdAt: new Date(record.createdAt ?? Date.now()),
  };
}

function getCategoryPreset(category: number): { id: UniqueId; title: string } {
  return (
    CATEGORY_PRESETS[category] ?? {
      id: `category-${category}`,
      title: `Category ${category}`,
    }
  );
}

function loadBoardFromStorage(): BoardState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBoardState | null;
    if (!parsed || parsed.version !== BOARD_VERSION || !parsed.board) return null;
    return parsed.board;
  } catch (error) {
    console.warn("Failed to read prioritization board from storage", error);
    return null;
  }
}

function saveBoardToStorage(board: BoardState) {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredBoardState = { version: BOARD_VERSION, board };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist prioritization board", error);
  }
}

function ensureBacklogColumn(board: BoardState): BoardState {
  if (board.columns[BACKLOG_COLUMN_ID]) return board;
  const backlog: ColumnState = {
    id: BACKLOG_COLUMN_ID,
    title: "Unassigned",
    removable: false,
    itemIds: [],
  };
  return {
    columns: { ...board.columns, [BACKLOG_COLUMN_ID]: backlog },
    columnOrder: [BACKLOG_COLUMN_ID, ...board.columnOrder.filter((id) => id !== BACKLOG_COLUMN_ID)],
  };
}

function buildInitialBoard(updates: UpdateItem[]): BoardState {
  const sorted = [...updates].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return {
    columns: {
      [BACKLOG_COLUMN_ID]: {
        id: BACKLOG_COLUMN_ID,
        title: "Unassigned",
        removable: false,
        itemIds: sorted.map((item) => item.id),
      },
    },
    columnOrder: [BACKLOG_COLUMN_ID],
  };
}

function createBoardWithUpdates(board: BoardState | null, updates: UpdateItem[]): BoardState {
  const baseBoard = ensureBacklogColumn(board ?? buildInitialBoard(updates));
  const itemsById = new Map(updates.map((item) => [item.id, item]));
  const assignedIds = new Set<UniqueId>();
  const columns: Record<UniqueId, ColumnState> = {};
  const columnOrder: UniqueId[] = [];

  for (const columnId of baseBoard.columnOrder) {
    if (columnId === BACKLOG_COLUMN_ID) continue;
    const column = baseBoard.columns[columnId];
    if (!column) continue;
    const filtered = column.itemIds.filter((itemId) => itemsById.has(itemId));
    filtered.forEach((id) => assignedIds.add(id));
    columns[columnId] = { ...column, itemIds: filtered };
    columnOrder.push(columnId);
  }

  const unassignedIds = updates
    .filter((item) => !assignedIds.has(item.id))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((item) => item.id);

  columns[BACKLOG_COLUMN_ID] = {
    id: BACKLOG_COLUMN_ID,
    title: "Unassigned",
    removable: false,
    itemIds: unassignedIds,
  };
  columnOrder.unshift(BACKLOG_COLUMN_ID);

  return { columns, columnOrder };
}

function createColumnId(title: string): UniqueId {
  const normalized = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Date.now().toString(36);
  return normalized ? `${normalized}-${suffix}` : `custom-${suffix}`;
}

function findColumnIdByItem(board: BoardState, itemId: UniqueId): UniqueId | null {
  for (const columnId of board.columnOrder) {
    if (board.columns[columnId]?.itemIds.includes(itemId)) {
      return columnId;
    }
  }
  return null;
}

type PrioritizationBoardProps = {
  initialUpdates: UpdateRecord[];
};

export function PrioritizationBoard({ initialUpdates }: PrioritizationBoardProps) {
  const initialUpdatesRef = useRef<UpdateItem[] | null>(null);
  if (!initialUpdatesRef.current) {
    initialUpdatesRef.current = initialUpdates.map(toUpdateItem);
  }
  const [updates, setUpdates] = useState<UpdateItem[]>(() => initialUpdatesRef.current ?? []);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [activeId, setActiveId] = useState<UniqueId | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const storedBoard = loadBoardFromStorage();
    setBoard(createBoardWithUpdates(storedBoard, initialUpdatesRef.current));
  }, []); // Run once on mount to initialize board with updates

  useEffect(() => {
    setUpdates(initialUpdates.map(toUpdateItem));
  }, [initialUpdates]);

  useEffect(() => {
    if (!board) return;
    saveBoardToStorage(board);
  }, [board]);

  useEffect(() => {
    setBoard((prev) => createBoardWithUpdates(prev, updates));
  }, [updates]);

  const memberOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of updates) {
      const key = item.uid?.trim() || `by:${item.by.toLowerCase()}` || "unknown";
      if (!map.has(key)) {
        map.set(key, item.by || "Unknown member");
      }
    }
    return Array.from(map.entries())
      .map(([uid, by]) => ({ uid, by }))
      .sort((a, b) => a.by.localeCompare(b.by));
  }, [updates]);

  useEffect(() => {
    if (selectedMember === "all") return;
    if (!memberOptions.some((option) => option.uid === selectedMember)) {
      setSelectedMember("all");
    }
  }, [memberOptions, selectedMember]);

  const visibleUnassignedUpdates = useMemo(() => {
    return updates.filter((item) => {
      // 既に他のカラムに割り当てられているアイテムは除外
      if (board) {
        for (const columnId of board.columnOrder) {
          if (
            columnId !== BACKLOG_COLUMN_ID &&
            board.columns[columnId]?.itemIds.includes(item.id)
          ) {
            return false;
          }
        }
      }

      // メンバーフィルター
      if (selectedMember !== "all") {
        const key = item.uid?.trim() || `by:${item.by.toLowerCase()}` || "unknown";
        if (key !== selectedMember) {
          return false;
        }
      }

      // 時間フィルター (when フィールドを使用)
      if (selectedTimeframe === "past3") {
        if (item.when !== -1) {
          return false;
        }
      } else if (selectedTimeframe === "next3") {
        if (item.when !== 1) {
          return false;
        }
      }

      // カテゴリフィルター
      if (selectedCategory !== "all") {
        if (getCategoryPreset(item.category).id !== selectedCategory) {
          return false;
        }
      }

      return true;
    });
  }, [board, updates, selectedMember, selectedTimeframe, selectedCategory]);

  const visibleUnassignedIds = useMemo(
    () => new Set(visibleUnassignedUpdates.map((item) => item.id)),
    [visibleUnassignedUpdates]
  );

  const filtersActive =
    selectedMember !== "all" || selectedTimeframe !== "all" || selectedCategory !== "all";

  const allItemsById = useMemo(() => new Map(updates.map((item) => [item.id, item])), [updates]);

  const handleAddColumn = useCallback(() => {
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    setBoard((prev) => {
      const nextBoard = prev ?? createBoardWithUpdates(null, updates);
      const id = createColumnId(trimmed);
      if (nextBoard.columns[id]) return nextBoard;
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
      };
    });
    setNewColumnName("");
  }, [newColumnName, updates]);

  const handleMemberChange = (event: SelectChangeEvent<string>) => {
    setSelectedMember(event.target.value);
  };

  const handleTimeframeChange = (event: SelectChangeEvent<string>) => {
    setSelectedTimeframe(event.target.value);
  };

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    setSelectedCategory(event.target.value);
  };

  const handleClearFilters = () => {
    setSelectedMember("all");
    setSelectedTimeframe("all");
    setSelectedCategory("all");
  };

  const handleDeleteColumn = (columnId: UniqueId) => {
    setBoard((prev) => {
      if (!prev || columnId === BACKLOG_COLUMN_ID) return prev;
      const column = prev.columns[columnId];
      if (!column || !column.removable) return prev;

      const backlog = prev.columns[BACKLOG_COLUMN_ID] ?? {
        id: BACKLOG_COLUMN_ID,
        title: "Unassigned",
        removable: false,
        itemIds: [],
      };

      const updatedBacklog: ColumnState = {
        ...backlog,
        itemIds: [
          ...column.itemIds,
          ...backlog.itemIds.filter((id) => !column.itemIds.includes(id)),
        ],
      };

      const restColumns = { ...prev.columns };
      delete restColumns[columnId];
      return {
        columns: {
          ...restColumns,
          [BACKLOG_COLUMN_ID]: updatedBacklog,
        },
        columnOrder: prev.columnOrder.filter((id) => id !== columnId),
      };
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!board || !event.over) return;

    const activeId = String(event.active.id);
    const overId = String(event.over.id);

    const sourceColumnId = findColumnIdByItem(board, activeId);
    const targetColumnId = event.over.data.current?.columnId
      ? String(event.over.data.current.columnId)
      : findColumnIdByItem(board, overId);

    if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) {
      return;
    }

    setBoard((prev) => {
      if (!prev) return prev;
      const sourceColumn = prev.columns[sourceColumnId];
      const targetColumn = prev.columns[targetColumnId];
      if (!sourceColumn || !targetColumn) return prev;

      const sourceIndex = sourceColumn.itemIds.indexOf(activeId);
      if (sourceIndex === -1) return prev;

      const newSourceIds = [...sourceColumn.itemIds];
      newSourceIds.splice(sourceIndex, 1);

      const overItemType = event.over?.data.current?.type;
      let targetIndex = targetColumn.itemIds.length;
      if (overItemType === "item") {
        const overItemId = event.over?.id ? String(event.over.id) : null;
        if (overItemId) {
          targetIndex = targetColumn.itemIds.indexOf(overItemId);
        }
        if (targetIndex === -1) {
          targetIndex = targetColumn.itemIds.length;
        }
      }

      const newTargetIds = [...targetColumn.itemIds];
      newTargetIds.splice(targetIndex, 0, activeId);

      return {
        columns: {
          ...prev.columns,
          [sourceColumnId]: { ...sourceColumn, itemIds: newSourceIds },
          [targetColumnId]: { ...targetColumn, itemIds: newTargetIds },
        },
        columnOrder: prev.columnOrder,
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (!board || !event.over) return;

    const activeId = String(event.active.id);
    const overId = String(event.over.id);

    const columnId = findColumnIdByItem(board, activeId);
    const overColumnId = event.over.data.current?.columnId
      ? String(event.over.data.current.columnId)
      : findColumnIdByItem(board, overId);

    if (!columnId || !overColumnId || columnId !== overColumnId) {
      return;
    }

    const column = board.columns[columnId];
    if (!column) return;

    const oldIndex = column.itemIds.indexOf(activeId);
    const newIndex = column.itemIds.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    setBoard((prev) => {
      if (!prev) return prev;
      const currentColumn = prev.columns[columnId];
      if (!currentColumn) return prev;
      return {
        columns: {
          ...prev.columns,
          [columnId]: {
            ...currentColumn,
            itemIds: arrayMove(currentColumn.itemIds, oldIndex, newIndex),
          },
        },
        columnOrder: prev.columnOrder,
      };
    });
  };

  if (!board) {
    return (
      <Container sx={{ py: 6 }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress sx={{ color: "rgba(255, 255, 255, 0.8)" }} />
          <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.75)" }}>
            Initializing board…
          </Typography>
        </Stack>
      </Container>
    );
  }

  const activeItem = activeId ? (allItemsById.get(activeId) ?? null) : null;

  return (
    <Box>
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={5}>
          <Stack
            spacing={2}
            sx={{
              animation: "fadeInUp 0.8s ease-out",
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{
                  color: "rgba(255, 255, 255, 0.8)",
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  fontSize: "0.8125rem",
                  textTransform: "uppercase",
                  position: "relative",
                  display: "inline-block",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: -4,
                    left: 0,
                    width: "40px",
                    height: "2px",
                    background: "linear-gradient(90deg, rgba(255, 255, 255, 0.6), transparent)",
                  },
                }}
              >
                Session Planning
              </Typography>
            </Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.025em",
                lineHeight: 1.2,
                color: "rgba(255, 255, 255, 0.95)",
              }}
            >
              Prioritization
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: "1.0625rem",
                lineHeight: 1.75,
                maxWidth: 760,
                opacity: 0.9,
                color: "rgba(255, 255, 255, 0.75)",
              }}
            >
              Organize the latest updates into categories to prepare for the session discussion.
              Create any categories you need, then drag updates into each column in order of
              importance.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{ mt: 2, flexWrap: "wrap" }}
            >
              <FormControl size="small" sx={{ width: { xs: "100%", sm: 220 } }}>
                <InputLabel
                  id="timeframe-filter-label"
                  sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    "&.Mui-focused": { color: "rgba(255, 255, 255, 0.9)" },
                  }}
                >
                  Filter by time
                </InputLabel>
                <Select
                  labelId="timeframe-filter-label"
                  value={selectedTimeframe}
                  label="Filter by time"
                  onChange={handleTimeframeChange}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        "& .MuiMenuItem-root": {
                          "&:focus": {
                            outline: "none",
                          },
                          "&:focus-visible": {
                            outline: "none",
                          },
                        },
                      },
                    },
                  }}
                  sx={{
                    color: "rgba(255, 255, 255, 0.9)",
                    ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255, 255, 255, 0.3)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255, 255, 255, 0.5)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255, 255, 255, 0.7)",
                    },
                    ".MuiSvgIcon-root": { color: "rgba(255, 255, 255, 0.7)" },
                  }}
                >
                  <MenuItem value="all">All dates</MenuItem>
                  <MenuItem value="past3">Past 3 months</MenuItem>
                  <MenuItem value="next3">Next 3 months</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ width: { xs: "100%", sm: 220 } }}>
                <InputLabel
                  id="category-filter-label"
                  sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    "&.Mui-focused": { color: "rgba(255, 255, 255, 0.9)" },
                  }}
                >
                  Filter by category
                </InputLabel>
                <Select
                  labelId="category-filter-label"
                  value={selectedCategory}
                  label="Filter by category"
                  onChange={handleCategoryChange}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        "& .MuiMenuItem-root": {
                          "&:focus": {
                            outline: "none",
                          },
                          "&:focus-visible": {
                            outline: "none",
                          },
                        },
                      },
                    },
                  }}
                  sx={{
                    color: "rgba(255, 255, 255, 0.9)",
                    ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255, 255, 255, 0.3)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255, 255, 255, 0.5)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255, 255, 255, 0.7)",
                    },
                    ".MuiSvgIcon-root": { color: "rgba(255, 255, 255, 0.7)" },
                  }}
                >
                  <MenuItem value="all">All categories</MenuItem>
                  <MenuItem value="work">Work</MenuItem>
                  <MenuItem value="family">Family</MenuItem>
                  <MenuItem value="personal">Personal</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ width: { xs: "100%", sm: 260 } }}>
                <InputLabel
                  id="member-filter-label"
                  sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    "&.Mui-focused": { color: "rgba(255, 255, 255, 0.9)" },
                  }}
                >
                  Filter by member
                </InputLabel>
                <Select
                  labelId="member-filter-label"
                  value={selectedMember}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        "& .MuiMenuItem-root": {
                          "&:focus": {
                            outline: "none",
                          },
                          "&:focus-visible": {
                            outline: "none",
                          },
                        },
                      },
                    },
                  }}
                  sx={{
                    color: "rgba(255, 255, 255, 0.9)",
                    ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255, 255, 255, 0.3)" },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255, 255, 255, 0.5)",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255, 255, 255, 0.7)",
                    },
                    ".MuiSvgIcon-root": { color: "rgba(255, 255, 255, 0.7)" },
                  }}
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
              <Button
                variant="text"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                disabled={!filtersActive}
                sx={{
                  color: "rgba(255, 255, 255, 0.8)",
                  "&:hover": {
                    color: "rgba(255, 255, 255, 1)",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
                  "&.Mui-disabled": { color: "rgba(255, 255, 255, 0.3)" },
                }}
              >
                Clear filters
              </Button>
            </Stack>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: "rgba(255, 255, 255, 0.05)",
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <TextField
                label="New category"
                InputLabelProps={{ shrink: true }}
                value={newColumnName}
                onChange={(event) => setNewColumnName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddColumn();
                  }
                }}
                sx={{
                  flexGrow: 1,
                  maxWidth: 320,
                  "& .MuiOutlinedInput-root": {
                    color: "rgba(255, 255, 255, 0.9)",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255, 255, 255, 0.3)",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255, 255, 255, 0.5)",
                  },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(255, 255, 255, 0.7)",
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(255, 255, 255, 0.7)",
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "rgba(255, 255, 255, 0.9)",
                  },
                  "& .MuiInputBase-input": {
                    color: "rgba(255, 255, 255, 0.9)",
                    // ブラウザのオートコンプリート時の背景色とテキスト色を調整
                    "&:-webkit-autofill": {
                      WebkitBoxShadow: "0 0 0 100px rgba(30, 41, 59, 1) inset !important",
                      WebkitTextFillColor: "rgba(255, 255, 255, 0.9) !important",
                      caretColor: "rgba(255, 255, 255, 0.9)",
                      transition: "background-color 5000s ease-in-out 0s",
                    },
                    "&:-webkit-autofill:hover": {
                      WebkitBoxShadow: "0 0 0 100px rgba(30, 41, 59, 1) inset !important",
                      WebkitTextFillColor: "rgba(255, 255, 255, 0.9) !important",
                    },
                    "&:-webkit-autofill:focus": {
                      WebkitBoxShadow: "0 0 0 100px rgba(30, 41, 59, 1) inset !important",
                      WebkitTextFillColor: "rgba(255, 255, 255, 0.9) !important",
                    },
                    "&:-webkit-autofill:active": {
                      WebkitBoxShadow: "0 0 0 100px rgba(30, 41, 59, 1) inset !important",
                      WebkitTextFillColor: "rgba(255, 255, 255, 0.9) !important",
                    },
                  },
                }}
              />
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddColumn}
                disabled={!newColumnName.trim()}
                sx={{
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  color: "rgba(255, 255, 255, 0.9)",
                  whiteSpace: "nowrap",
                  "&:hover": {
                    borderColor: "rgba(255, 255, 255, 0.5)",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                  },
                  "&.Mui-disabled": {
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    color: "rgba(255, 255, 255, 0.3)",
                  },
                }}
              >
                Add Category
              </Button>
            </Stack>
          </Paper>

          <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.2)" }} />

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 2,
                overflowX: "auto",
                pb: 4,
              }}
            >
              {board.columnOrder.map((columnId) => {
                const column = board.columns[columnId];
                if (!column) return null;
                const items = column.itemIds
                  .filter((itemId) =>
                    columnId === BACKLOG_COLUMN_ID ? visibleUnassignedIds.has(itemId) : true
                  )
                  .map((itemId) => allItemsById.get(itemId))
                  .filter((item): item is UpdateItem => Boolean(item));

                return (
                  <Column
                    key={column.id}
                    column={column}
                    items={items}
                    onDelete={handleDeleteColumn}
                  />
                );
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
    </Box>
  );
}

type ColumnProps = {
  column: ColumnState;
  items: UpdateItem[];
  onDelete: (columnId: UniqueId) => void;
};

function Column({ column, items, onDelete }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  // Lazy loading: 初期表示数とロード数
  const INITIAL_LOAD = 10;
  const LOAD_MORE = 10;
  const [displayCount, setDisplayCount] = useState(INITIAL_LOAD);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 表示するアイテム
  const displayedItems = useMemo(() => items.slice(0, displayCount), [items, displayCount]);

  const hasMore = displayCount < items.length;

  // Intersection Observer でスクロール時に追加読み込み
  useEffect(() => {
    if (!hasMore || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setDisplayCount((prev) => Math.min(prev + LOAD_MORE, items.length));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, items.length]);

  // アイテムが変更されたらリセット
  useEffect(() => {
    setDisplayCount(INITIAL_LOAD);
  }, [items.length]);

  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={600} noWrap>
            {column.title}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
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
      <SortableContext
        id={column.id}
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <Stack
          ref={setNodeRef}
          spacing={1}
          sx={{
            borderRadius: 1,
            p: items.length === 0 ? 1 : 0,
            transition: "background-color 0.2s ease, border-color 0.2s ease",
            bgcolor: isOver ? "action.hover" : undefined,
            border: isOver ? "1px dashed" : undefined,
            borderColor: isOver ? "primary.light" : undefined,
          }}
        >
          {items.length === 0 ? (
            <EmptyDropzone
              label={column.id === BACKLOG_COLUMN_ID ? "Drop updates here" : "Drag updates here"}
            />
          ) : (
            <>
              {displayedItems.map((item) => (
                <SortableUpdateCard key={item.id} item={item} columnId={column.id} />
              ))}
              {hasMore && (
                <Box
                  ref={loadMoreRef}
                  sx={{
                    py: 2,
                    textAlign: "center",
                    color: "rgba(255, 255, 255, 0.5)",
                  }}
                >
                  <CircularProgress size={24} sx={{ color: "rgba(255, 255, 255, 0.5)" }} />
                </Box>
              )}
            </>
          )}
        </Stack>
      </SortableContext>
    </Paper>
  );
}

type EmptyDropzoneProps = {
  label: string;
};

function EmptyDropzone({ label }: EmptyDropzoneProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        py: 6,
        px: 2,
        borderStyle: "dashed",
        color: "text.secondary",
        textAlign: "center",
        bgcolor: "background.default",
      }}
    >
      {label}
    </Paper>
  );
}

type SortableUpdateCardProps = {
  item: UpdateItem;
  columnId: UniqueId;
};

function SortableUpdateCard({ item, columnId }: SortableUpdateCardProps) {
  const sortable = useSortable({
    id: item.id,
    data: { type: "item", columnId },
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <UpdateCard item={item} isDragging={isDragging} />
    </Box>
  );
}

type UpdateCardProps = {
  item: UpdateItem;
  isDragging?: boolean;
};

function UpdateCard({ item, isDragging }: UpdateCardProps) {
  return (
    <Paper
      elevation={isDragging ? 4 : 1}
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: isDragging ? "primary.light" : "divider",
        bgcolor: isDragging ? "background.paper" : "background.default",
        cursor: "grab",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Typography variant="subtitle1" fontWeight={600} noWrap title={item.title}>
        {item.title}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap title={item.body}>
        {item.body || "No additional details provided."}
      </Typography>
      <Stack direction="row" spacing={1} justifyContent="flex-start" alignItems="center">
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {item.by}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default PrioritizationBoard;
