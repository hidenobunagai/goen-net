import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt'
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined'
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel, IconButton, InputLabel, MenuItem, Paper, Radio, RadioGroup, Select, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useMediaQuery } from '@mui/material'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { fetchUpdateItems, UpdateItem } from '../utils/updates'

const CATEGORIES: { id: number; label: string }[] = [
  { id: 0, label: 'Work' },
  { id: 1, label: 'Family' },
  { id: 2, label: 'Personal' },
]
const CATEGORY_COL_PX = 160
const FLEX_COL_WIDTH = `calc((100% - ${CATEGORY_COL_PX}px) / 2)`

type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'
const chipPalette: ChipColor[] = ['primary', 'secondary', 'success', 'warning', 'info', 'error']

type RequestError = Error & { status?: number }

const Updates: React.FC = () => {
  useDocumentTitle('Updates')
  const { currentUid, currentDisplayName } = useAuth()
  const [updates, setUpdates] = useState<UpdateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<number>(0)
  const [priority, setPriority] = useState(false)
  const [title, setTitle] = useState('')
  const [updateText, setUpdateText] = useState('')
  const [whenChoice, setWhenChoice] = useState<'past' | 'future'>('past')
  const [adding, setAdding] = useState(false)
  const [selectedUid, setSelectedUid] = useState<string>('all')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsItem, setDetailsItem] = useState<UpdateItem | null>(null)
  const isMobile = useMediaQuery('(max-width:600px)')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UpdateItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false)
  const [deleteAllLoading, setDeleteAllLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)
  const [voteBusyIds, setVoteBusyIds] = useState<Set<string>>(() => new Set())

  const setVotePending = useCallback((id: string, pending: boolean) => {
    setVoteBusyIds((prev) => {
      const next = new Set(prev)
      if (pending) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const updateLocalItem = useCallback((id: string, updater: (prev: UpdateItem) => UpdateItem) => {
    setUpdates((prev) => prev.map((item) => (item.id === id ? updater(item) : item)))
    setDetailsItem((prev) => (prev && prev.id === id ? updater(prev) : prev))
    setDeleteTarget((prev) => (prev && prev.id === id ? updater(prev) : prev))
  }, [])

  const getMemberChipColor = (uid: string): ChipColor => {
    if (!uid) return 'default'
    let h = 0
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0
    return chipPalette[h % chipPalette.length]
  }

  const loadUpdates = useCallback(async ({ signal, silent }: { signal?: AbortSignal; silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true)
    }
    setFetchError(null)
    try {
      const list = await fetchUpdateItems({ signal })
      if (signal?.aborted) return
      setUpdates(list)
      setVoteBusyIds(new Set())
    } catch (error) {
      if (signal?.aborted) return
      console.error('Failed to load updates', error)
      const status = (error as RequestError)?.status
      const message = status === 401
        ? 'Your session has expired. Please sign in again.'
        : error instanceof Error
          ? error.message
          : 'Failed to load updates. Please try again.'
      setFetchError(message)
    } finally {
      if (!silent && !signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadUpdates({ signal: controller.signal })
    return () => controller.abort()
  }, [loadUpdates])

  const memberOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of updates) {
      if (!map.has(u.uid)) map.set(u.uid, u.by)
    }
    return Array.from(map, ([uid, by]) => ({ uid, by })).sort((a, b) => a.by.localeCompare(b.by))
  }, [updates])

  const handleAddUpdate = async () => {
    if (!currentUid || !updateText.trim()) return
    setAdding(true)
    try {
      const payload = {
        by: currentDisplayName || 'Unknown',
        category,
        priority,
        uid: currentUid,
        title: title.trim(),
        update: updateText.trim(),
        when: whenChoice === 'past' ? -1 : 1,
      }
      const response = await fetch('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        let message = 'Failed to add update. Please try again.'
        try {
          const body = await response.json()
          message = body?.error?.message || body?.message || message
        } catch {}
        const error: RequestError = new Error(message)
        error.status = response.status
        throw error
      }
      await loadUpdates({ silent: true })
      setOpen(false)
      setUpdateText('')
      setTitle('')
      setCategory(0)
      setPriority(false)
      setWhenChoice('past')
      setSnackbar({ severity: 'success', message: 'Update added.' })
    } catch (error) {
      console.error('Add update error:', error)
      const status = (error as RequestError)?.status
      if (status === 401) {
        setSnackbar({ severity: 'error', message: 'Your session has expired. Please sign in again.' })
      } else {
        const message = error instanceof Error ? error.message : 'Failed to add update. Please try again.'
        setSnackbar({ severity: 'error', message })
      }
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/updates/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
      if (!response.ok && response.status !== 204) {
        let message = 'Failed to delete update. Please try again.'
        try {
          const body = await response.json()
          message = body?.error?.message || body?.message || message
        } catch {}
        const error: RequestError = new Error(message)
        error.status = response.status
        throw error
      }
      setUpdates((prev) => prev.filter((u) => u.id !== id))
      setSnackbar({ severity: 'success', message: 'Update deleted.' })
    } catch (error) {
      console.error('Delete error:', error)
      const status = (error as RequestError)?.status
      if (status === 401) {
        setSnackbar({ severity: 'error', message: 'Your session has expired. Please sign in again.' })
      } else {
        const message = error instanceof Error ? error.message : 'Failed to delete update. Please try again.'
        setSnackbar({ severity: 'error', message })
      }
      throw error
    }
  }

  const requestDelete = (item: UpdateItem) => {
    setDeleteTarget(item)
    setDeleteConfirmOpen(true)
  }
  const cancelDelete = () => {
    if (deleting) return
    setDeleteConfirmOpen(false)
    setDeleteTarget(null)
  }
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await handleDelete(deleteTarget.id)
      setDeleteConfirmOpen(false)
      setDeleteTarget(null)
    } catch {
      // Keep dialog open so the user can retry
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteAll = () => setDeleteAllConfirmOpen(true)
  const cancelDeleteAll = () => {
    if (deleteAllLoading) return
    setDeleteAllConfirmOpen(false)
  }
  const confirmDeleteAll = async () => {
    setDeleteAllLoading(true)
    try {
      const response = await fetch('/api/updates', { method: 'DELETE', credentials: 'include' })
      if (!response.ok && response.status !== 204) {
        let message = 'Failed to delete updates. Please try again.'
        try {
          const body = await response.json()
          message = body?.error?.message || body?.message || message
        } catch {}
        const error: RequestError = new Error(message)
        error.status = response.status
        throw error
      }
      await loadUpdates({ silent: true })
      setDeleteAllConfirmOpen(false)
      setSnackbar({ severity: 'success', message: 'All updates deleted.' })
    } catch (error) {
      console.error('Delete all error:', error)
      const status = (error as RequestError)?.status
      if (status === 401) {
        setSnackbar({ severity: 'error', message: 'Your session has expired. Please sign in again.' })
      } else {
        const message = error instanceof Error ? error.message : 'Failed to delete updates. Please try again.'
        setSnackbar({ severity: 'error', message })
      }
    } finally {
      setDeleteAllLoading(false)
    }
  }

  const toggleVote = useCallback(async (item: UpdateItem) => {
    if (!currentUid) {
      setSnackbar({ severity: 'error', message: 'Please sign in to vote.' })
      return
    }
    if (voteBusyIds.has(item.id)) return
    const voting = !item.viewerHasVoted
    setVotePending(item.id, true)
    updateLocalItem(item.id, (prev) => ({
      ...prev,
      votes: Math.max(0, prev.votes + (voting ? 1 : -1)),
      viewerHasVoted: voting,
    }))
    try {
      const response = await fetch(`/api/updates/${encodeURIComponent(item.id)}/vote`, {
        method: voting ? 'POST' : 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        let message = 'Failed to update vote. Please try again.'
        try {
          const body = await response.json()
          message = body?.error?.message || body?.message || message
        } catch {}
        throw new Error(message)
      }
      let payload: any = {}
      try {
        payload = await response.json()
      } catch {}
      const votesFromResponse = typeof payload?.votes === 'number' ? payload.votes : undefined
      const viewerHasVotedFromResponse = payload?.viewerHasVoted
      const votes = typeof votesFromResponse === 'number' ? votesFromResponse : item.votes + (voting ? 1 : -1)
      const viewerHasVoted = viewerHasVotedFromResponse !== undefined
        ? viewerHasVotedFromResponse === true || viewerHasVotedFromResponse === 1 || viewerHasVotedFromResponse === '1'
        : voting
      updateLocalItem(item.id, (prev) => ({
        ...prev,
        votes,
        viewerHasVoted,
      }))
    } catch (error) {
      console.error('Vote error:', error)
      updateLocalItem(item.id, (prev) => ({
        ...prev,
        votes: Math.max(0, prev.votes + (voting ? -1 : 1)),
        viewerHasVoted: !voting,
      }))
      const message = error instanceof Error ? error.message : 'Failed to update vote. Please try again.'
      setSnackbar({ severity: 'error', message })
    } finally {
      setVotePending(item.id, false)
    }
  }, [currentUid, voteBusyIds, setVotePending, updateLocalItem])

  const filteredUpdates = useMemo(() => {
    if (selectedUid === 'all') return updates
    return updates.filter((u) => u.uid === selectedUid)
  }, [updates, selectedUid])

  const grouped = useMemo(() => {
    const init: Record<number, { past: UpdateItem[]; future: UpdateItem[] }> = {}
    for (const c of CATEGORIES) init[c.id] = { past: [], future: [] }
    for (const up of filteredUpdates) {
      const key = up.when <= 0 ? 'past' : 'future'
      if (init[up.category]) init[up.category][key].push(up)
    }
    const sortByPriority = (a: UpdateItem, b: UpdateItem) => {
      if (b.votes !== a.votes) return b.votes - a.votes
      return b.date.getTime() - a.date.getTime()
    }
    for (const c of CATEGORIES) {
      init[c.id].past.sort(sortByPriority)
      init[c.id].future.sort(sortByPriority)
    }
    return init
  }, [filteredUpdates])

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <CircularProgress />
      </Container>
    )
  }

  const openDetails = (item: UpdateItem) => {
    setDetailsItem(item)
    setDetailsOpen(true)
  }
  const closeDetails = () => {
    setDetailsOpen(false)
    setDetailsItem(null)
  }

  const renderCell = (items: UpdateItem[]) => {
    if (!items.length) return <Typography variant="body2" color="text.secondary">—</Typography>
    return (
      <Stack spacing={1}>
        {items.map((up) => {
          const pending = voteBusyIds.has(up.id)
          return (
            <Paper
              key={up.id}
              variant="outlined"
              sx={{
                p: 1.25,
                borderRadius: 1.25,
                borderColor: up.viewerHasVoted ? 'primary.main' : undefined,
                bgcolor: up.viewerHasVoted ? 'action.hover' : undefined,
                transition: 'border-color 0.2s ease, background-color 0.2s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Chip size="small" label={up.by} color={getMemberChipColor(up.uid)} variant="filled" sx={{ height: 20 }} />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Tooltip title={up.viewerHasVoted ? 'Remove vote' : 'Vote to prioritize this topic'} placement="top">
                      <Box component="span" sx={{ display: 'inline-flex' }}>
                        <IconButton
                          size="small"
                          color={up.viewerHasVoted ? 'primary' : 'default'}
                          disabled={pending}
                          aria-pressed={up.viewerHasVoted}
                          aria-label={up.viewerHasVoted ? 'Remove vote' : 'Add vote'}
                          onClick={() => { void toggleVote(up) }}
                          sx={{
                            bgcolor: up.viewerHasVoted ? 'primary.main' : undefined,
                            color: up.viewerHasVoted ? 'primary.contrastText' : undefined,
                            '&:hover': {
                              bgcolor: up.viewerHasVoted ? 'primary.dark' : undefined,
                            },
                          }}
                        >
                          {up.viewerHasVoted ? <ThumbUpAltIcon fontSize="small" /> : <ThumbUpAltOutlinedIcon fontSize="small" />}
                        </IconButton>
                      </Box>
                    </Tooltip>
                    <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 20, textAlign: 'right' }}>{up.votes}</Typography>
                  </Stack>
                  {up.priority && <Chip size="small" color="error" label="High" />}
                  {currentUid && up.uid === currentUid && (
                    <IconButton size="small" aria-label="delete" onClick={() => requestDelete(up)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              </Box>
              <Typography
                variant="body2"
                sx={{ wordBreak: 'break-word', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => openDetails(up)}
              >
                {up.title || 'Untitled'}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                <Button size="small" onClick={() => openDetails(up)} sx={{ p: 0, minWidth: 'auto' }}>View details</Button>
                <Typography variant="caption" color="text.secondary">{up.date.toLocaleDateString()}</Typography>
              </Stack>
            </Paper>
          )
        })}
      </Stack>
    )
  }

  const handleSnackbarClose = () => setSnackbar(null)

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h1">
          Updates
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="filter-member-label">Member</InputLabel>
            <Select
              labelId="filter-member-label"
              label="Member"
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value as string)}
            >
              <MenuItem value="all">All members</MenuItem>
              {memberOptions.map((m) => (
                <MenuItem key={m.uid} value={m.uid}>{m.by}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Add Update
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={openDeleteAll}
            disabled={updates.length === 0}
          >
            Delete all updates
          </Button>
        </Box>
      </Box>
      {fetchError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={() => loadUpdates()}>Retry</Button>}
        >
          {fetchError}
        </Alert>
      )}
      {!isMobile && (
        <TableContainer component={Paper}>
          <Table sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: CATEGORY_COL_PX }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700, width: FLEX_COL_WIDTH }}>Reflect on the past 3 months</TableCell>
                <TableCell sx={{ fontWeight: 700, width: FLEX_COL_WIDTH }}>Next 3 months</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CATEGORIES.map((c) => (
                <TableRow key={c.id}>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap', width: CATEGORY_COL_PX, verticalAlign: 'top' }}>{c.label}</TableCell>
                  <TableCell sx={{ width: FLEX_COL_WIDTH, verticalAlign: 'top' }}>{renderCell(grouped[c.id]?.past ?? [])}</TableCell>
                  <TableCell sx={{ width: FLEX_COL_WIDTH, verticalAlign: 'top' }}>{renderCell(grouped[c.id]?.future ?? [])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {isMobile && (
        <Stack spacing={2}>
          {CATEGORIES.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{c.label}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Reflect on the past 3 months</Typography>
              <Box sx={{ mt: 0.5, mb: 1 }}>{renderCell(grouped[c.id]?.past ?? [])}</Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Next 3 months</Typography>
              <Box sx={{ mt: 0.5 }}>{renderCell(grouped[c.id]?.future ?? [])}</Box>
            </Paper>
          ))}
        </Stack>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullScreen={isMobile}>
        <DialogTitle>Add New Update</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="update-category-label">Category</InputLabel>
            <Select
              labelId="update-category-label"
              label="Category"
              value={category}
              onChange={(e) => setCategory(Number(e.target.value))}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={(
              <Checkbox
                checked={priority}
                onChange={(e) => setPriority(e.target.checked)}
              />
            )}
            label="High priority"
          />
          <TextField
            label="Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            placeholder="Short title"
          />
          <TextField
            label="Update text"
            fullWidth
            multiline
            rows={4}
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
            margin="normal"
            required
          />
          <FormControl sx={{ mt: 1 }}>
            <FormLabel>When</FormLabel>
            <RadioGroup
              row
              value={whenChoice}
              onChange={(e) => setWhenChoice(e.target.value as 'past' | 'future')}
            >
              <FormControlLabel value="past" control={<Radio />} label="Past 3 months" />
              <FormControlLabel value="future" control={<Radio />} label="Next 3 months" />
            </RadioGroup>
          </FormControl>
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={2}
            sx={{ mt: 3, alignItems: 'stretch' }}
          >
            <Button
              onClick={() => setOpen(false)}
              disabled={adding}
              fullWidth={isMobile}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUpdate}
              variant="contained"
              disabled={adding || !updateText.trim()}
              fullWidth={isMobile}
            >
              {adding ? <CircularProgress size={24} /> : 'Add'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
      <Dialog
        open={detailsOpen}
        onClose={closeDetails}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 'auto' },
            borderRadius: { xs: 2, sm: 1 },
          },
        }}
      >
        <DialogTitle sx={{ px: { xs: 3, sm: 3.5 }, pt: { xs: 3, sm: 3 } }}>
          {detailsItem?.title || 'Details'}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 3, sm: 3.5 }, pb: { xs: 3, sm: 3.5 } }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{detailsItem?.update}</Typography>
          {detailsItem && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              {detailsItem.by} • {detailsItem.date.toLocaleString()} • {detailsItem.votes} vote{detailsItem.votes === 1 ? '' : 's'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 3, sm: 3.5 }, pb: { xs: 3, sm: 3 } }}>
          <Button fullWidth={isMobile} onClick={closeDetails}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteConfirmOpen}
        onClose={cancelDelete}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 0 },
          },
        }}
      >
        <DialogTitle>Delete update?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete this update? This action cannot be undone.
          </Typography>
          {deleteTarget && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Title: {deleteTarget.title || 'Untitled'}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={deleting}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteAllConfirmOpen}
        onClose={cancelDeleteAll}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 2, sm: 0 },
          },
        }}
      >
        <DialogTitle>Delete all updates?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will permanently remove every update from the database, including those posted by other members.
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteAll} disabled={deleteAllLoading}>Cancel</Button>
          <Button onClick={confirmDeleteAll} color="error" variant="contained" disabled={deleteAllLoading}>
            {deleteAllLoading ? <CircularProgress size={20} /> : 'Delete all'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!snackbar}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  )
}

export default Updates
