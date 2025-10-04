"use client";

import { del, get } from "@/lib/api-client";
import type { UpdateRecord } from "@/lib/updates";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    useMediaQuery,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useTheme } from "@mui/material/styles";
import { useCallback, useMemo, useState } from "react";
import { UpdateFormDialog } from "./update-form-dialog";
import { UpdateStatusBadge } from "./update-status-badge";

const CATEGORIES = [
  { id: 0, label: "Work" },
  { id: 1, label: "Family" },
  { id: 2, label: "Personal" },
] as const;

const CATEGORY_COL_WIDTH = 160;
const FLEX_COL_WIDTH = `calc((100% - ${CATEGORY_COL_WIDTH}px) / 2)`;

type SnackbarState = {
  severity: "success" | "error";
  message: string;
} | null;

type UpdateItem = UpdateRecord & { createdAtDate: Date };

type UpdatesBoardProps = {
  initialUpdates: UpdateRecord[];
  viewerEmail: string | null | undefined;
};

const toUpdateItem = (record: UpdateRecord): UpdateItem => ({
  ...record,
  createdAtDate: new Date(record.createdAt),
});

// Color palette for user badges (distinct, accessible colors)
const USER_BADGE_COLORS = [
  "#1976d2", // blue
  "#2e7d32", // green
  "#ed6c02", // orange
  "#9c27b0", // purple
  "#d32f2f", // red
  "#0288d1", // light blue
  "#f57c00", // deep orange
  "#7b1fa2", // deep purple
  "#00796b", // teal
  "#c62828", // dark red
];

// Deterministic color assignment based on user ID
function getUserBadgeColor(uid: string): string {
  if (!uid) return USER_BADGE_COLORS[0];
  const hash = uid.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USER_BADGE_COLORS[hash % USER_BADGE_COLORS.length];
}

export function UpdatesBoard({
  initialUpdates,
  viewerEmail,
}: UpdatesBoardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [updates, setUpdates] = useState<UpdateItem[]>(() =>
    initialUpdates.map(toUpdateItem)
  );
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string>("all");
  const [detailsItem, setDetailsItem] = useState<UpdateItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UpdateItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  type ReloadResult = "success" | "preserved" | "skipped" | "error";

  const handleReload = useCallback(
    async ({
      silent = false,
      preserveExistingOnEmpty = false,
    }: {
      silent?: boolean;
      preserveExistingOnEmpty?: boolean;
    } = {}): Promise<ReloadResult> => {
      if (!viewerEmail) {
        return "skipped";
      }

      if (!silent) {
        setRefreshing(true);
      }

      setFetchError(null);
      try {
        const payload = await get<{
          ok: boolean;
          updates?: UpdateRecord[];
          error?: { message?: string };
        }>(`/api/updates?limit=200`);

        if (payload.ok === false) {
          const message =
            payload.error?.message ??
            "Failed to load updates. Please try again.";
          throw new Error(message);
        }

        const list = Array.isArray(payload.updates)
          ? payload.updates
          : [];
        const nextItems = list.map(toUpdateItem);
        let updated = false;
        setUpdates((prev) => {
          if (
            preserveExistingOnEmpty &&
            prev.length > 0 &&
            nextItems.length === 0
          ) {
            return prev;
          }
          updated = true;
          return nextItems;
        });
        if (!updated && preserveExistingOnEmpty && nextItems.length === 0) {
          return "preserved";
        }
        return "success";
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load updates. Please try again.";
        setFetchError(message);
        setSnackbar({ severity: "error", message });
        return "error";
      } finally {
        if (!silent) {
          setRefreshing(false);
        }
      }
    },
    [viewerEmail]
  );

  const memberOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const update of updates) {
      if (!map.has(update.uid)) {
        map.set(update.uid, update.by);
      }
    }
    return Array.from(map.entries())
      .map(([uid, by]) => ({ uid, by }))
      .sort((a, b) => a.by.localeCompare(b.by));
  }, [updates]);

  const handleUpdateCreated = useCallback(
    async (record: UpdateRecord | null) => {
      if (record) {
        const newItem = toUpdateItem(record);
        setUpdates((prev) => {
          const filtered = prev.filter((item) => item.id !== newItem.id);
          return [newItem, ...filtered];
        });
      }

      const reloadResult = await handleReload({
        silent: true,
        preserveExistingOnEmpty: true,
      });

      if (reloadResult === "error") {
        return;
      }

      if (reloadResult === "preserved" && typeof window !== "undefined") {
        window.setTimeout(() => {
          void handleReload({ silent: true });
        }, 1500);
      }

      setSnackbar({ severity: "success", message: "Update added." });
    },
    [handleReload]
  );

  const filteredUpdates = useMemo(() => {
    if (selectedUid === "all") {
      return updates;
    }

    return updates.filter((update) => update.uid === selectedUid);
  }, [updates, selectedUid]);

  const groupedUpdates = useMemo(() => {
    const grouped: Record<
      number,
      { past: UpdateItem[]; future: UpdateItem[] }
    > = {};

    for (const category of CATEGORIES) {
      grouped[category.id] = { past: [], future: [] };
    }

    for (const update of filteredUpdates) {
      const bucket = update.when <= 0 ? "past" : "future";
      grouped[update.category] ??= { past: [], future: [] };
      grouped[update.category][bucket].push(update);
    }

    const groupUpdatesByUser = (items: UpdateItem[]) => {
      const groups = new Map<string, UpdateItem[]>();
      const order: string[] = [];

      for (const item of items) {
        if (!groups.has(item.uid)) {
          groups.set(item.uid, []);
          order.push(item.uid);
        }
        groups.get(item.uid)!.push(item);
      }

      return order.flatMap((uid) => groups.get(uid)!);
    };

    for (const category of CATEGORIES) {
      grouped[category.id].past = groupUpdatesByUser(grouped[category.id].past);
      grouped[category.id].future = groupUpdatesByUser(grouped[category.id].future);
    }

    return grouped;
  }, [filteredUpdates]);

  const requestDelete = (item: UpdateItem) => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  const cancelDelete = () => {
    if (deleteLoading) return;
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    setDeleteLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await del(`/api/updates/${encodeURIComponent(deleteTarget.id)}`);

      setUpdates((prev) =>
        prev.filter((update) => update.id !== deleteTarget.id)
      );
      setSnackbar({ severity: "success", message: "Update deleted." });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete update. Please try again.";
      setSnackbar({ severity: "error", message });
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteAll = () => setDeleteAllDialogOpen(true);

  const cancelDeleteAll = () => {
    if (deleteAllLoading) return;
    setDeleteAllDialogOpen(false);
  };

  const confirmDeleteAll = async () => {
    setDeleteAllLoading(true);
    try {
      await del(`/api/updates`);

      await handleReload({ silent: true });
      setSnackbar({ severity: "success", message: "All updates deleted." });
      setDeleteAllDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete updates. Please try again.";
      setSnackbar({ severity: "error", message });
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleSnackbarClose = () => setSnackbar(null);

  const handleMemberFilterChange = (event: SelectChangeEvent<string>) => {
    setSelectedUid(event.target.value);
  };

  const handleDetailsOpen = (item: UpdateItem) => {
    setDetailsItem(item);
  };

  const handleDetailsClose = () => {
    setDetailsItem(null);
  };

  const renderCell = (items: UpdateItem[]) => {
    if (items.length === 0) {
      return (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontStyle: "italic",
          }}
        >
          —
        </Typography>
      );
    }

    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 1.5,
        }}
      >
        {items.map((item) => {
          return (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Stack spacing={1.2}>
                {/* Header: Name badge + Status + Delete */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={0.5}
                >
                  <Box
                    sx={{
                      px: 1.2,
                      py: 0.4,
                      borderRadius: 999,
                      bgcolor: getUserBadgeColor(item.uid),
                      color: "white",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      letterSpacing: 0.2,
                      lineHeight: 1.3,
                      display: "inline-flex",
                      alignItems: "center",
                      maxWidth: "60%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={item.by}
                  >
                    {item.by}
                  </Box>
                  <Stack direction="row" spacing={0.25} alignItems="center">
                    <UpdateStatusBadge urgent={item.urgent} />
                    {item.viewerIsOwner ? (
                      <Tooltip title="Delete" placement="top">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => requestDelete(item)}
                            disabled={
                              deleteLoading && deleteTarget?.id === item.id
                            }
                            sx={{
                              padding: "4px",
                              color: "text.secondary",
                              "&:hover": {
                                color: "error.main",
                                bgcolor: "rgba(211, 47, 47, 0.08)",
                              },
                            }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: "1rem" }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : null}
                  </Stack>
                </Stack>

                {/* Title */}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    wordBreak: "break-word",
                    cursor: "pointer",
                    color: "text.primary",
                    lineHeight: 1.4,
                    "&:hover": {
                      color: "primary.main",
                    },
                  }}
                  onClick={() => handleDetailsOpen(item)}
                >
                  {item.title || "Untitled"}
                </Typography>

                {/* View details link */}
                <Button
                  size="small"
                  onClick={() => handleDetailsOpen(item)}
                  sx={{
                    textTransform: "none",
                    px: 0,
                    alignSelf: "flex-start",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    minHeight: 0,
                    py: 0.25,
                  }}
                >
                  View details
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #001a33 0%, #003366 100%)",
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={4}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Stack spacing={1.5}>
            <Typography
              variant="overline"
              sx={{
                color: "rgba(255, 255, 255, 0.8)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                fontSize: "0.875rem",
              }}
            >
              Peer Updates
            </Typography>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "rgba(255, 255, 255, 0.95)",
              }}
            >
              Updates
            </Typography>
            <Typography
              variant="body1"
              sx={{
                maxWidth: 680,
                fontSize: "1.0625rem",
                lineHeight: 1.7,
                mb: { xs: 2, sm: 0 },
                color: "rgba(255, 255, 255, 0.75)",
              }}
            >
              Share your team&apos;s latest updates and ideas to keep everyone
              aligned on what matters most.
            </Typography>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 220 } }}
            >
              <InputLabel id="updates-member-filter-label" sx={{ color: "rgba(255, 255, 255, 0.7)", "&.Mui-focused": { color: "rgba(255, 255, 255, 0.9)" } }}>Member</InputLabel>
              <Select
                labelId="updates-member-filter-label"
                label="Member"
                value={selectedUid}
                onChange={handleMemberFilterChange}
                sx={{
                  color: "rgba(255, 255, 255, 0.9)",
                  ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255, 255, 255, 0.3)" },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255, 255, 255, 0.5)" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255, 255, 255, 0.7)" },
                  ".MuiSvgIcon-root": { color: "rgba(255, 255, 255, 0.7)" },
                }}
              >
                <MenuItem value="all">All members</MenuItem>
                {memberOptions.map((member) => (
                  <MenuItem key={member.uid} value={member.uid}>
                    {member.by}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <UpdateFormDialog
              defaultCategory={0}
              onCreated={handleUpdateCreated}
            />
          </Stack>
        </Stack>

        {fetchError ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => handleReload()}
              >
                Retry
              </Button>
            }
          >
            {fetchError}
          </Alert>
        ) : null}

        {refreshing ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : null}

        {!isMobile ? (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Table sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      width: CATEGORY_COL_WIDTH,
                      bgcolor: "#f5f5f5",
                      fontSize: "0.875rem",
                    }}
                  >
                    Category
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      width: FLEX_COL_WIDTH,
                      bgcolor: "#f5f5f5",
                      fontSize: "0.875rem",
                    }}
                  >
                    Reflect on the past 3 months
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      width: FLEX_COL_WIDTH,
                      bgcolor: "#f5f5f5",
                      fontSize: "0.875rem",
                    }}
                  >
                    Next 3 months
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {CATEGORIES.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        verticalAlign: "top",
                        fontSize: "0.9375rem",
                        bgcolor: "#f5f5f5",
                      }}
                    >
                      {category.label}
                    </TableCell>
                    <TableCell
                      sx={{
                        verticalAlign: "top",
                        p: 2,
                      }}
                    >
                      {renderCell(groupedUpdates[category.id]?.past ?? [])}
                    </TableCell>
                    <TableCell
                      sx={{
                        verticalAlign: "top",
                        p: 2,
                      }}
                    >
                      {renderCell(groupedUpdates[category.id]?.future ?? [])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Stack spacing={2}>
            {CATEGORIES.map((category) => (
              <Paper key={category.id} variant="outlined" sx={{ p: 1.5 }}>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, mb: 0.5 }}
                >
                  {category.label}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600 }}
                >
                  Reflect on the past 3 months
                </Typography>
                <Box sx={{ mt: 0.5, mb: 1 }}>
                  {renderCell(groupedUpdates[category.id]?.past ?? [])}
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600 }}
                >
                  Next 3 months
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {renderCell(groupedUpdates[category.id]?.future ?? [])}
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>

      {/* Delete all updates button - below main content */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="text"
          size="small"
          onClick={openDeleteAll}
          disabled={updates.length === 0}
          sx={{
            color: "rgba(255, 255, 255, 0.8)",
            fontSize: "0.8125rem",
            textTransform: "none",
            "&:hover": {
              color: "rgba(255, 255, 255, 1)",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            },
            "&.Mui-disabled": {
              color: "rgba(255, 255, 255, 0.3)",
            },
          }}
        >
          Delete all updates
        </Button>
      </Box>

      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete update?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete this update? This action cannot be undone.
          </DialogContentText>
          {deleteTarget ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Title: {deleteTarget.title || "Untitled"}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteAllDialogOpen}
        onClose={cancelDeleteAll}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete all updates?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete every update. The change affects the
            entire team and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteAll} disabled={deleteAllLoading}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteAll}
            color="error"
            variant="contained"
            disabled={deleteAllLoading}
          >
            {deleteAllLoading ? <CircularProgress size={20} /> : "Delete all"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(detailsItem)}
        onClose={handleDetailsClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {detailsItem?.title || detailsItem?.by || "Update details"}
        </DialogTitle>
        <DialogContent>
          {detailsItem ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 999,
                    bgcolor: getUserBadgeColor(detailsItem.uid),
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    letterSpacing: 0.3,
                    lineHeight: 1.3,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {detailsItem.by}
                </Box>
                <UpdateStatusBadge urgent={detailsItem.urgent} />
              </Stack>
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {detailsItem.body}
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDetailsClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {snackbar ? (
        <Snackbar
          open
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      ) : null}
      </Container>
    </Box>
  );
}
