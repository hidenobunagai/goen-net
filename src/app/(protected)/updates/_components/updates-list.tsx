"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
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
  Typography,
  useMediaQuery,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useTheme } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useTransition } from "react";

import type { UpdateRecord } from "@/lib/updates";
import { fetchUpdatesClient } from "@/lib/updates-client";

import { deleteAllUpdatesAction, deleteUpdateAction } from "../actions";
import { DeleteAllUpdatesDialog, DeleteUpdateDialog } from "./delete-dialogs";
import { UpdateCard } from "./update-card";
import { UpdateDetailsDialog } from "./update-details-dialog";
import { UpdateFormDialog } from "./update-form-dialog";

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

type UpdatesBoardProps = {
  viewerEmail: string | null;
};

export function UpdatesBoard({ viewerEmail }: UpdatesBoardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Use React Query to fetch updates data
  const {
    data: updates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["updates", viewerEmail],
    queryFn: () => fetchUpdatesClient(200),
    enabled: !!viewerEmail,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
    refetchIntervalInBackground: false, // Don't refetch when tab is not active
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const [selectedUid, setSelectedUid] = useState<string>("all");
  const [detailsItem, setDetailsItem] = useState<UpdateRecord | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UpdateRecord | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, startDeleteAllTransition] = useTransition();

  const [snackbar, setSnackbar] = useState<SnackbarState>(null);

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

  const filteredUpdates = useMemo(() => {
    if (selectedUid === "all") {
      return updates;
    }
    return updates.filter((update) => update.uid === selectedUid);
  }, [updates, selectedUid]);

  const groupedUpdates = useMemo(() => {
    const grouped: Record<number, { past: UpdateRecord[]; future: UpdateRecord[] }> = {};

    for (const category of CATEGORIES) {
      grouped[category.id] = { past: [], future: [] };
    }

    for (const update of filteredUpdates) {
      const bucket = update.when <= 0 ? "past" : "future";
      grouped[update.category] ??= { past: [], future: [] };
      grouped[update.category][bucket].push(update);
    }

    const groupUpdatesByUser = (items: UpdateRecord[]) => {
      const groups = new Map<string, UpdateRecord[]>();
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

  const handleUpdateCreated = () => {
    setSnackbar({ severity: "success", message: "Update added." });
    refetch();
  };

  const requestDelete = (item: UpdateRecord) => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    startDeleteTransition(async () => {
      try {
        const result = await deleteUpdateAction(deleteTarget.id);
        if (result.ok) {
          setSnackbar({ severity: "success", message: "Update deleted." });
          setDeleteDialogOpen(false);
          setDeleteTarget(null);
          if (detailsItem?.id === deleteTarget.id) {
            setDetailsItem(null);
          }
          refetch();
        } else {
          setSnackbar({ severity: "error", message: result.error || "Failed to delete update." });
        }
      } catch {
        setSnackbar({ severity: "error", message: "Failed to delete update." });
      }
    });
  };

  const openDeleteAll = () => setDeleteAllDialogOpen(true);

  const cancelDeleteAll = () => {
    if (isDeletingAll) return;
    setDeleteAllDialogOpen(false);
  };

  const confirmDeleteAll = () => {
    startDeleteAllTransition(async () => {
      try {
        const result = await deleteAllUpdatesAction();
        if (result.ok) {
          setSnackbar({ severity: "success", message: "All updates deleted." });
          setDeleteAllDialogOpen(false);
          refetch();
        } else {
          setSnackbar({ severity: "error", message: result.error || "Failed to delete updates." });
        }
      } catch {
        setSnackbar({ severity: "error", message: "Failed to delete updates." });
      }
    });
  };

  const handleSnackbarClose = () => setSnackbar(null);

  const handleMemberFilterChange = (event: SelectChangeEvent<string>) => {
    setSelectedUid(event.target.value);
  };

  const renderCell = (items: UpdateRecord[]) => {
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
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
          },
          gap: { xs: 1, sm: 1.5 },
        }}
      >
        {items.map((item) => (
          <UpdateCard key={item.id} item={item} onClick={setDetailsItem} />
        ))}
      </Box>
    );
  };

  return (
    <Box>
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
                Share your team&apos;s latest updates and ideas to keep everyone aligned on what
                matters most.
              </Typography>
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", sm: "center" }}
            >
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 } }}>
                <InputLabel
                  id="updates-member-filter-label"
                  sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    "&.Mui-focused": { color: "rgba(255, 255, 255, 0.9)" },
                  }}
                >
                  Member
                </InputLabel>
                <Select
                  labelId="updates-member-filter-label"
                  label="Member"
                  value={selectedUid}
                  onChange={handleMemberFilterChange}
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
                  <MenuItem value="all">All members</MenuItem>
                  {memberOptions.map((member) => (
                    <MenuItem key={member.uid} value={member.uid}>
                      {member.by}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <UpdateFormDialog defaultCategory={0} onCreated={handleUpdateCreated} />
            </Stack>
          </Stack>

          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                py: 8,
              }}
            >
              <CircularProgress sx={{ color: "rgba(255, 255, 255, 0.8)" }} />
            </Box>
          ) : error ? (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                bgcolor: "rgba(211, 47, 47, 0.1)",
                color: "#ffcdd2",
                "& .MuiAlert-icon": {
                  color: "#ffcdd2",
                },
              }}
            >
              Failed to load updates. Please try again later.
            </Alert>
          ) : !isMobile ? (
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: "hidden",
                border: "none",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              }}
            >
              <Table sx={{ tableLayout: "fixed" }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        width: CATEGORY_COL_WIDTH,
                        bgcolor: (theme) => theme.palette.primary.main, // Slate 900
                        color: "#fff",
                        fontSize: "0.875rem",
                        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      Category
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        width: FLEX_COL_WIDTH,
                        bgcolor: (theme) => theme.palette.primary.main,
                        color: "#fff",
                        fontSize: "0.875rem",
                        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      Reflect on the past 3 months
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        width: FLEX_COL_WIDTH,
                        bgcolor: (theme) => theme.palette.primary.main,
                        color: "#fff",
                        fontSize: "0.875rem",
                      }}
                    >
                      Next 3 months
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {CATEGORIES.map((category, index) => (
                    <TableRow key={category.id}>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          verticalAlign: "top",
                          fontSize: "0.9375rem",
                          bgcolor: "#fff",
                          color: (theme) => theme.palette.text.primary,
                          borderRight: "1px solid rgba(0, 0, 0, 0.06)",
                          borderBottom:
                            index < CATEGORIES.length - 1
                              ? "1px solid rgba(0, 0, 0, 0.06)"
                              : undefined,
                        }}
                      >
                        {category.label}
                      </TableCell>
                      <TableCell
                        sx={{
                          verticalAlign: "top",
                          p: 2,
                          bgcolor: "#fff",
                          borderRight: "1px solid rgba(0, 0, 0, 0.06)",
                          borderBottom:
                            index < CATEGORIES.length - 1
                              ? "1px solid rgba(0, 0, 0, 0.06)"
                              : undefined,
                        }}
                      >
                        {renderCell(groupedUpdates[category.id]?.past ?? [])}
                      </TableCell>
                      <TableCell
                        sx={{
                          verticalAlign: "top",
                          p: 2,
                          bgcolor: "#fff",
                          borderBottom:
                            index < CATEGORIES.length - 1
                              ? "1px solid rgba(0, 0, 0, 0.06)"
                              : undefined,
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
                <Paper
                  key={category.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    border: "none",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      color: (theme) => theme.palette.primary.main,
                    }}
                  >
                    {category.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Reflect on the past 3 months
                  </Typography>
                  <Box sx={{ mt: 1, mb: 2 }}>
                    {renderCell(groupedUpdates[category.id]?.past ?? [])}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Next 3 months
                  </Typography>
                  <Box sx={{ mt: 1 }}>{renderCell(groupedUpdates[category.id]?.future ?? [])}</Box>
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

        <DeleteUpdateDialog
          open={deleteDialogOpen}
          target={deleteTarget}
          loading={isDeleting}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
        />

        <DeleteAllUpdatesDialog
          open={deleteAllDialogOpen}
          loading={isDeletingAll}
          onClose={cancelDeleteAll}
          onConfirm={confirmDeleteAll}
        />

        <UpdateDetailsDialog
          item={detailsItem}
          onClose={() => setDetailsItem(null)}
          onDelete={requestDelete}
          deleteLoading={isDeleting && deleteTarget?.id === detailsItem?.id}
        />

        <Snackbar
          open={Boolean(snackbar)}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          {snackbar ? (
            <Alert
              onClose={handleSnackbarClose}
              severity={snackbar.severity}
              sx={{ width: "100%" }}
            >
              {snackbar.message}
            </Alert>
          ) : undefined}
        </Snackbar>
      </Container>
    </Box>
  );
}
