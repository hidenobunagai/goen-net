"use client";

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
import { UpdateVoteButton } from "./update-vote-button";

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
  const [voteBusyIds, setVoteBusyIds] = useState<Set<string>>(() => new Set());

  const setVotePending = useCallback((id: string, pending: boolean) => {
    setVoteBusyIds((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const updateLocalItem = useCallback(
    (id: string, updater: (prev: UpdateItem) => UpdateItem) => {
      setUpdates((prev) =>
        prev.map((item) => (item.id === id ? updater(item) : item))
      );
      setDetailsItem((prev) => (prev && prev.id === id ? updater(prev) : prev));
      setDeleteTarget((prev) =>
        prev && prev.id === id ? updater(prev) : prev
      );
    },
    []
  );

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
        const response = await fetch(`/api/updates?limit=200`, {
          method: "GET",
          credentials: "include",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.ok === false) {
          const message =
            payload?.error?.message ??
            "Failed to load updates. Please try again.";
          throw new Error(message);
        }

        const list = Array.isArray(payload?.updates)
          ? (payload.updates as UpdateRecord[])
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
        if (updated) {
          setVoteBusyIds(new Set());
        }
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

    const sortUpdates = (a: UpdateItem, b: UpdateItem) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return b.createdAtDate.getTime() - a.createdAtDate.getTime();
    };

    for (const category of CATEGORIES) {
      grouped[category.id].past.sort(sortUpdates);
      grouped[category.id].future.sort(sortUpdates);
    }

    return grouped;
  }, [filteredUpdates]);

  const handleToggleVote = useCallback(
    async (item: UpdateItem) => {
      if (!viewerEmail) {
        setSnackbar({ severity: "error", message: "Please sign in to vote." });
        return;
      }

      if (voteBusyIds.has(item.id)) {
        return;
      }

      const voting = !item.viewerHasVoted;
      setVotePending(item.id, true);
      updateLocalItem(item.id, (prev) => ({
        ...prev,
        votes: Math.max(0, prev.votes + (voting ? 1 : -1)),
        viewerHasVoted: voting,
      }));

      try {
        const response = await fetch(
          `/api/updates/${encodeURIComponent(item.id)}/vote`,
          {
            method: voting ? "POST" : "DELETE",
            credentials: "include",
          }
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.ok === false) {
          const message =
            payload?.error?.message ??
            "Failed to update vote. Please try again.";
          throw new Error(message);
        }

        const nextVotes =
          typeof payload?.votes === "number" ? payload.votes : undefined;
        const nextViewerHasVoted =
          typeof payload?.viewerHasVoted === "boolean"
            ? payload.viewerHasVoted
            : undefined;

        updateLocalItem(item.id, (prev) => ({
          ...prev,
          votes: typeof nextVotes === "number" ? nextVotes : prev.votes,
          viewerHasVoted:
            typeof nextViewerHasVoted === "boolean"
              ? nextViewerHasVoted
              : prev.viewerHasVoted,
        }));
      } catch (error) {
        updateLocalItem(item.id, (prev) => ({
          ...prev,
          votes: Math.max(0, prev.votes + (voting ? -1 : 1)),
          viewerHasVoted: !voting,
        }));

        const message =
          error instanceof Error
            ? error.message
            : "Failed to update vote. Please try again.";
        setSnackbar({ severity: "error", message });
      } finally {
        setVotePending(item.id, false);
      }
    },
    [viewerEmail, voteBusyIds, setVotePending, updateLocalItem]
  );

  const requestDelete = (item: UpdateItem) => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  const cancelDelete = () => {
    if (deleteLoading) return;
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(
        `/api/updates/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) {
        const message =
          payload?.error?.message ??
          "Failed to delete update. Please try again.";
        throw new Error(message);
      }

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
      const response = await fetch(`/api/updates`, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) {
        const message =
          payload?.error?.message ??
          "Failed to delete updates. Please try again.";
        throw new Error(message);
      }

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
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      );
    }

    return (
      <Stack spacing={1.5}>
        {items.map((item) => {
          const votePending = voteBusyIds.has(item.id);
          return (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                borderColor: item.viewerHasVoted ? "primary.main" : undefined,
                bgcolor: item.viewerHasVoted
                  ? "action.hover"
                  : "background.paper",
                transition:
                  "border-color 0.2s ease, background-color 0.2s ease",
                boxShadow: "0 18px 36px rgba(15, 23, 42, 0.08)",
                width: "100%",
              }}
            >
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={1}
                >
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 999,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      letterSpacing: 0.3,
                      lineHeight: 1.3,
                      display: "inline-flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 0.25,
                      maxWidth: "100%",
                      wordBreak: "break-word",
                      boxShadow: "0 10px 20px rgba(0, 27, 68, 0.16)",
                    }}
                    title={item.by}
                  >
                    {item.by}
                  </Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent={{ xs: "flex-start", sm: "flex-end" }}
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                  >
                    <UpdateStatusBadge urgent={item.urgent} />
                    <UpdateVoteButton
                      viewerHasVoted={item.viewerHasVoted}
                      votes={item.votes}
                      disabled={votePending}
                      onToggle={() => {
                        void handleToggleVote(item);
                      }}
                    />
                    {item.viewerIsOwner ? (
                      <Tooltip title="Delete this update" placement="left">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => requestDelete(item)}
                            disabled={
                              deleteLoading && deleteTarget?.id === item.id
                            }
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    ) : null}
                  </Stack>
                </Stack>

                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    wordBreak: "break-word",
                    cursor: "pointer",
                  }}
                  onClick={() => handleDetailsOpen(item)}
                >
                  {item.title || "Untitled"}
                </Typography>

                <Button
                  size="small"
                  onClick={() => handleDetailsOpen(item)}
                  sx={{ textTransform: "none", px: 0, alignSelf: "flex-start" }}
                >
                  View details
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Stack spacing={0.5}>
            <Typography variant="overline" color="primary" letterSpacing={4}>
              Peer Updates
            </Typography>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Updates
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 680 }}
            >
              Share your team’s latest updates and ideas. Vote to align
              everyone’s focus on what matters most.
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
              <InputLabel id="updates-member-filter-label">Member</InputLabel>
              <Select
                labelId="updates-member-filter-label"
                label="Member"
                value={selectedUid}
                onChange={handleMemberFilterChange}
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
          <TableContainer component={Paper} variant="outlined">
            <Table sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{ fontWeight: 700, width: CATEGORY_COL_WIDTH }}
                  >
                    Category
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: FLEX_COL_WIDTH }}>
                    Reflect on the past 3 months
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: FLEX_COL_WIDTH }}>
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
                      }}
                    >
                      {category.label}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top" }}>
                      {renderCell(groupedUpdates[category.id]?.past ?? [])}
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top" }}>
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
          variant="outlined"
          color="error"
          size="small"
          onClick={openDeleteAll}
          disabled={updates.length === 0}
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
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {detailsItem.by}
                </Typography>
                <UpdateStatusBadge urgent={detailsItem.urgent} />
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
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
  );
}
