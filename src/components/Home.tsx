import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import { Alert, Box, Button, Card, CardActions, CardContent, Container, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Stack, TextField, Typography, useMediaQuery } from '@mui/material'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { combineDateAndTime, extractDate, extractTime, normalizeToDatetimeLocal, validateSessionTimes } from '../utils/datetime'

type FeedbackState = { message: string; severity: 'success' | 'error' } | null
type SessionInfo = { startAt: string; endAt: string; location: string }
type SessionFormState = { date: string; startTime: string; endTime: string; location: string }
type RequestError = Error & { status?: number }

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth()
  useDocumentTitle('Goen Net', { skipSuffix: false })

  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({ startAt: '', endAt: '', location: '' })
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<SessionFormState>({ date: '', startTime: '', endTime: '', location: '' })
  const [validationError, setValidationError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const isMobile = useMediaQuery('(max-width:600px)')

  const sessionHighlight = useMemo(() => {
    if (!sessionInfo.startAt) {
      return {
        hasSession: false,
        badgeMonth: '',
        badgeDay: '',
        badgeWeekday: '',
        fullDate: '',
        timeRange: 'Time TBD',
      }
    }

    const start = new Date(sessionInfo.startAt)
    if (Number.isNaN(start.getTime())) {
      return {
        hasSession: false,
        badgeMonth: '',
        badgeDay: '',
        badgeWeekday: '',
        fullDate: '',
        timeRange: 'Time TBD',
      }
    }

    const end = sessionInfo.endAt ? new Date(sessionInfo.endAt) : null
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' })
    const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
    const dateFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
    const badgeMonth = monthFormatter.format(start)
    const badgeDay = new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(start)
    const badgeWeekday = weekdayFormatter.format(start)
    const fullDate = dateFormatter.format(start)
    const startTime = timeFormatter.format(start)
    const endTime = end && !Number.isNaN(end.getTime()) ? timeFormatter.format(end) : null

    return {
      hasSession: true,
      badgeMonth,
      badgeDay,
      badgeWeekday,
      fullDate,
      timeRange: endTime ? `${startTime} – ${endTime}` : startTime,
    }
  }, [sessionInfo.endAt, sessionInfo.startAt])

  const loadNextSession = useCallback(async ({ signal, silent }: { signal?: AbortSignal; silent?: boolean } = {}) => {
    if (!silent) {
      setLoadingSession(true)
    }
    setLoadError(null)
    try {
      const response = await fetch('/api/next-session', { credentials: 'include', signal })
      if (!response.ok) {
        const error: RequestError = new Error(`Failed to load next session (${response.status})`)
        error.status = response.status
        throw error
      }
      const data = await response.json()
      if (signal?.aborted) return
      setSessionInfo({
        startAt: normalizeToDatetimeLocal(data?.startAt),
        endAt: normalizeToDatetimeLocal(data?.endAt),
        location: typeof data?.location === 'string' ? data.location : '',
      })
    } catch (error) {
      if (signal?.aborted) return
      console.error('Failed to load next session', error)
      setSessionInfo({ startAt: '', endAt: '', location: '' })
      setLoadError('Failed to load the next session. Please try again.')
    } finally {
      if (!silent && !signal?.aborted) {
        setLoadingSession(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadNextSession({ signal: controller.signal })
    return () => controller.abort()
  }, [loadNextSession])

  const renderLocation = (value: string): React.ReactNode => {
    const text = (value || '').trim()
    if (!text) return 'Location TBD'
    if (/^https?:\/\//i.test(text)) {
      return <a href={text} target="_blank" rel="noopener noreferrer">{text}</a>
    }
    if (/^www\.[^\s]+$/i.test(text) || /^[\w.-]+\.[a-z]{2,}[^\s]*$/i.test(text)) {
      const url = `https://${text}`
      return <a href={url} target="_blank" rel="noopener noreferrer">{text}</a>
    }
    const match = text.match(/https?:\/\/\S+/i)
    if (!match || match.index == null) return text
    const url = match[0]
    const prefix = text.slice(0, match.index)
    const suffix = text.slice(match.index + url.length)
    return (
      <>
        {prefix}
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
        {suffix}
      </>
    )
  }

  const openDialog = () => {
    const today = new Date().toISOString().slice(0, 10)
    setValidationError(null)
    setForm({
      date: extractDate(sessionInfo.startAt) || today,
      startTime: extractTime(sessionInfo.startAt) || '10:00',
      endTime: extractTime(sessionInfo.endAt),
      location: sessionInfo.location || '',
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (!saving) {
      setDialogOpen(false)
    }
  }

  const handleSave = async () => {
    const errorMessage = validateSessionTimes(form.date, form.startTime, form.endTime)
    setValidationError(errorMessage)
    if (errorMessage) return

    setSaving(true)
    try {
      const payload = {
        startAt: combineDateAndTime(form.date, form.startTime),
        endAt: form.endTime ? combineDateAndTime(form.date, form.endTime) : null,
        location: form.location.trim() || null,
      }
      const response = await fetch('/api/next-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        let message = 'Failed to save the next session. Please try again.'
        try {
          const body = await response.json()
          message = body?.error?.message || body?.message || message
        } catch {}
        const error: RequestError = new Error(message)
        error.status = response.status
        throw error
      }
      setSessionInfo({
        startAt: normalizeToDatetimeLocal(payload.startAt),
        endAt: normalizeToDatetimeLocal(payload.endAt),
        location: payload.location ?? '',
      })
      setLoadError(null)
      setDialogOpen(false)
      setFeedback({ severity: 'success', message: 'Next session updated.' })
    } catch (error) {
      console.error('Failed to save next session', error)
      const status = (error as RequestError)?.status
      if (status === 422) {
        setValidationError(error instanceof Error ? error.message : 'Invalid date/time input.')
        return
      }
      if (status === 401) {
        setFeedback({ severity: 'error', message: 'Your session has expired. Please sign in again.' })
        return
      }
      const message = error instanceof Error ? error.message : 'Failed to save the next session. Please try again.'
      setFeedback({ severity: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  const handleFeedbackClose = () => setFeedback(null)

  const OverviewBlock: React.FC<{ title: string; description: string; hue?: number }> = ({ title, description, hue = 220 }) => (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderRadius: 3,
        borderColor: `hsl(${hue} 60% 75% / 0.55)`,
        background: `linear-gradient(135deg, hsl(${hue} 55% 97% / 0.85) 0%, #fff 100%)`,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 85% 15%, hsl(${hue} 95% 88% / 0.45), transparent 55%)`,
          pointerEvents: 'none',
        },
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 22px 50px rgba(15, 23, 42, 0.12)',
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 3, md: 3.5 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '.08em',
              backgroundColor: `hsl(${hue} 90% 92%)`,
              color: `hsl(${hue} 65% 28%)`,
            }}
          >
            {title.charAt(0)}
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: `hsl(${hue} 60% 28%)` }}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500, lineHeight: 1.6 }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  )

  return (
    <>
      <Container
        maxWidth="lg"
        sx={{
          mt: { xs: 3, md: 6 },
          mb: { xs: 5, md: 6 },
          pb: { xs: 6, md: 10 },
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 600, fontSize: { xs: '2rem', sm: '2.25rem', md: '2.5rem' } }}
        >
          Welcome to Goen Net
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: { xs: 3, md: 4 }, maxWidth: 520 }}>
          A private alumni community to share updates and strengthen connections.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 2.5, md: 3 } }}>
          <Card
            variant="outlined"
            sx={{
              gridColumn: { xs: 'auto', md: 'span 3' },
              borderRadius: { xs: 3, md: 4 },
              borderColor: 'transparent',
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(231,244,255,0.9) 100%)',
              boxShadow: '0 28px 60px rgba(15, 23, 42, 0.08)',
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at top right, rgba(59,130,246,0.18), transparent 45%), radial-gradient(circle at bottom left, rgba(236,72,153,0.16), transparent 50%)',
                pointerEvents: 'none',
              },
            }}
          >
            <CardContent
              sx={{
                position: 'relative',
                zIndex: 1,
                p: { xs: 2.5, sm: 3.25, md: 4 },
              }}
            >
              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '.18em', color: 'primary.main' }}>Next Goen Net Session</Typography>
              {loadingSession ? (
                <Typography variant="body2" color="text.secondary">Loading…</Typography>
              ) : loadError ? (
                <Alert
                  severity="error"
                  action={<Button color="inherit" size="small" onClick={() => loadNextSession()}>Retry</Button>}
                  sx={{ alignItems: 'center' }}
                >
                  {loadError}
                </Alert>
              ) : (
                <Box sx={{ mt: { xs: 2.5, md: 3 } }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: { xs: 2.5, sm: 4 },
                      p: { xs: 2.5, sm: 4 },
                      borderRadius: { xs: 3, md: 4 },
                      background: 'linear-gradient(135deg, rgba(25,118,210,0.14), rgba(123,31,162,0.12))',
                      border: '1px solid rgba(25,118,210,0.35)',
                      boxShadow: '0 18px 40px rgba(25, 118, 210, 0.18)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {sessionHighlight.hasSession ? (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          minWidth: { sm: 160 },
                          px: { xs: 2.5, sm: 3 },
                          py: { xs: 1.75, sm: 2 },
                          borderRadius: { xs: 2.5, sm: 3 },
                          backgroundColor: 'rgba(255, 255, 255, 0.92)',
                          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{
                            textTransform: 'uppercase',
                            letterSpacing: '.2em',
                            fontWeight: 600,
                            color: 'primary.main',
                            mb: 0.5,
                          }}
                        >
                          {sessionHighlight.badgeWeekday}
                        </Typography>
                        <Typography
                          variant="h2"
                          component="div"
                          sx={{
                            fontWeight: 700,
                            lineHeight: 1,
                            color: 'text.primary',
                            fontSize: { xs: '2.75rem', sm: '3.5rem' },
                          }}
                        >
                          {sessionHighlight.badgeDay}
                        </Typography>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            letterSpacing: '.08em',
                            color: 'text.secondary',
                            fontSize: { xs: '0.95rem', sm: '1rem' },
                          }}
                        >
                          {sessionHighlight.badgeMonth}
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          minWidth: { sm: 160 },
                          px: { xs: 2.5, sm: 3 },
                          py: { xs: 1.75, sm: 2 },
                          borderRadius: { xs: 2.5, sm: 3 },
                          backgroundColor: 'rgba(255, 255, 255, 0.92)',
                          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>Date TBD</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>Stay tuned</Typography>
                      </Box>
                    )}
                    <Stack spacing={{ xs: 2, sm: 2.5 }} sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <CalendarMonthIcon color="primary" sx={{ fontSize: { xs: 24, sm: 28 } }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}>
                          {sessionHighlight.hasSession ? sessionHighlight.fullDate : 'Date to be announced'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <AccessTimeIcon color="primary" sx={{ fontSize: { xs: 24, sm: 28 } }} />
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: 700, fontSize: { xs: '1.35rem', sm: '1.6rem' } }}
                        >
                          {sessionHighlight.timeRange}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <LocationOnIcon color="primary" sx={{ fontSize: { xs: 24, sm: 28 }, mt: 0.4 }} />
                        <Typography
                          variant="body1"
                          sx={{ fontWeight: 500, wordBreak: 'break-word', fontSize: { xs: '1rem', sm: '1.05rem' } }}
                        >
                          {renderLocation(sessionInfo.location)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                </Box>
              )}
            </CardContent>
            {isAuthenticated && (
              <CardActions>
                <Button onClick={openDialog} disabled={loadingSession}>Edit</Button>
              </CardActions>
            )}
          </Card>
        </Box>
        <Box component="section" sx={{ mt: { xs: 8, md: 10 } }}>
          <Box
            sx={{
              position: 'relative',
              borderRadius: { xs: 4, md: 5 },
              overflow: 'hidden',
              px: { xs: 3, sm: 5, md: 7 },
              py: { xs: 6, sm: 7, md: 8 },
              background: 'linear-gradient(135deg, rgba(226,232,255,0.9) 0%, rgba(248,250,252,0.96) 48%, #fff 100%)',
              boxShadow: '0 32px 80px rgba(15, 23, 42, 0.12)',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at -10% 20%, rgba(59,130,246,0.18), transparent 45%), radial-gradient(circle at 110% 80%, rgba(236,72,153,0.18), transparent 55%), radial-gradient(circle at 50% 120%, rgba(14,165,233,0.12), transparent 60%)',
                pointerEvents: 'none',
              }}
            />
            <Stack spacing={{ xs: 4, sm: 5, md: 6 }} sx={{ position: 'relative', zIndex: 1 }}>
              <Stack spacing={1.5} alignItems={{ xs: 'flex-start', md: 'center' }} textAlign={{ xs: 'left', md: 'center' }}>
                <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '.3em', color: 'primary.main' }}>Peer Forum Essentials</Typography>
                <Typography variant="h3" component="h2" sx={{ fontWeight: 700, letterSpacing: '.6px' }}>What is Goen Net?</Typography>
                <Typography variant="h6" sx={{ fontWeight: 500, maxWidth: 880, color: 'text.secondary', lineHeight: 1.5 }}>
                  A confidential peer forum for experienced leaders to gain clarity, perspective, and trusted relationships.
                </Typography>
              </Stack>
              <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
                <OverviewBlock title="Why" hue={250} description="A safe space to process what you cannot fully share elsewhere—surface emotions → clearer decisions." />
                <OverviewBlock title="How" hue={200} description="Quarterly small-group sessions with strict confidentiality, punctuality, and a no‑unsolicited‑advice rule." />
                <OverviewBlock title="Gain" hue={160} description="Expanded perspective • Deeper self-awareness • Emotional articulation • Enduring trust." />
              </Box>
              <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 }, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
                <OverviewBlock title="Session Feel" hue={340} description="A focused, restorative 4-hour rhythm (updates → priority issues → deep dives) — calm and structured." />
                <OverviewBlock title="Communication" hue={25} description="Listen → Acknowledge → Ask → Share (I-based experience). No fixing. No judgment. No theory." />
              </Box>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  border: '1px dashed',
                  borderColor: 'primary.light',
                  backgroundColor: 'rgba(255, 255, 255, 0.86)',
                  px: { xs: 3, md: 4 },
                  py: { xs: 3, md: 4 },
                  textAlign: 'center',
                  alignSelf: 'center',
                  maxWidth: 500,
                  mx: 'auto',
                  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '.04em' }}>Simple Rules Create Depth</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.6 }}>
                  Confidentiality • Time commitment • Radical self-disclosure • No advice (experience only).
                </Typography>
              </Card>
            </Stack>
          </Box>
        </Box>
      </Container>
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="xs"
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            mx: { xs: 2, sm: 0 },
            width: { xs: 'calc(100% - 32px)', sm: '100%' },
          },
        }}
      >
        <DialogTitle>Edit Next Session</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField type="date" label="Date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField type="time" label="Start time" value={form.startTime} onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ step: 1800 }} fullWidth />
              <TextField type="time" label="End time (optional)" value={form.endTime} onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))} InputLabelProps={{ shrink: true }} inputProps={{ step: 1800 }} fullWidth />
            </Stack>
            <TextField label="Location (e.g. Tokyo HQ, Zoom URL, etc.)" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} fullWidth inputProps={{ inputMode: 'url', spellCheck: 'false', autoCorrect: 'off', autoCapitalize: 'none' }} />
            {validationError && <Alert severity="error">{validationError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!feedback}
        autoHideDuration={6000}
        onClose={handleFeedbackClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {feedback && (
          <Alert onClose={handleFeedbackClose} severity={feedback.severity} sx={{ width: '100%' }}>
            {feedback.message}
          </Alert>
        )}
      </Snackbar>
    </>
  )
}

export default Home
