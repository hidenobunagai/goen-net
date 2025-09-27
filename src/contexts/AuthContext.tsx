/* eslint-disable react-refresh/only-export-components */
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import React, { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

// Firebase has been removed. We now rely on a backend session (cookie) established
// by the Google Identity Services sign-in flow (see SignIn.tsx). This context
// fetches a minimal session object and applies the email whitelist.

const normalizeGmail = (email: string): string => {
  if (!email) return email
  const lower = email.toLowerCase()
  // Only apply dot / plus normalization to gmail / googlemail domains
  const m = lower.match(/^([^@]+)@(gmail\.com|googlemail\.com)$/)
  if (!m) return lower
  let local = m[1]
  // remove dot characters
  local = local.replace(/\./g, '')
  // remove +suffix
  local = local.replace(/\+.*/, '')
  return `${local}@gmail.com`
}

interface AppUser {
  id: string
  firstName: string
  lastName: string
  email: string
  displayName?: string
}

interface AuthContextType {
  user: AppUser | null // unified user (backend session)
  isAuthenticated: boolean // convenience flag
  currentUid: string | null // id
  currentDisplayName: string | null // display name or email
  emailError?: string | null // whitelist / sign-in error
  refreshSession: () => Promise<void> // manual refresh (e.g. after profile update)
  signOut: () => Promise<void> // backend sign out
  status: 'loading' | 'authorized' | 'unauthorized' | 'guest'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized' | 'guest'>('loading')

  // Allowed emails (comma separated). Empty => allow all (local dev convenience)
  const allowedEmails: string[] = React.useMemo(() => {
    const raw = (import.meta.env.VITE_ALLOWED_EMAILS as string | undefined) || ''
    return raw
      .split(',')
      .map(entry => normalizeGmail(entry.trim()))
      .filter(Boolean)
  }, [])

  const applyWhitelist = (u: AppUser | null) => {
    if (!u) return u
    const email = normalizeGmail(u.email || '')
    if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
      setEmailError('This account is not authorized to access Goen Net.')
      setStatus('unauthorized')
      return null // treat as not authenticated
    }
    setEmailError(null)
    setStatus('authorized')
    return u
  }

  const loadSession = async () => {
    try {
      const r = await fetch('/api/auth/me', { credentials: 'include' })
      if (!r.ok) {
        setUser(null)
        setStatus('guest')
        return
      }
      const data = await r.json()
      if (data?.authenticated && data.user?.id) {
        const unified: AppUser = {
          id: String(data.user.id),
          firstName: String(data.user.firstName || ''),
          lastName: String(data.user.lastName || ''),
          email: String(data.user.email || ''),
          displayName: data.user.displayName || data.user.name || data.user.email || '',
        }
        setUser(applyWhitelist(unified))
      } else {
        setUser(null)
        setStatus('guest')
      }
    } catch (e) {
      console.warn('Session load failed:', e)
      setUser(null)
      setStatus('guest')
    }
  }

  const refreshSession = async () => {
    await loadSession()
  }

  useEffect(() => {
    (async () => {
      await loadSession()
      setLoading(false)
    })()
    // allowedEmails intentionally excluded from deps to avoid re-fetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOutHandler = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' })
    } catch (e) {
      console.warn('Sign out request failed:', e)
    } finally {
      setUser(null)
      setStatus('guest')
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    currentUid: user?.id ?? null,
    currentDisplayName: user?.displayName || user?.email || null,
    emailError,
    refreshSession,
    signOut: signOutHandler,
    status,
  }

  if (loading) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255,255,255,0.85)',
          zIndex: 9999,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={32} />
          <Typography variant="body1" sx={{ fontWeight: 500 }}>Loading…</Typography>
        </Stack>
      </Box>
    )
  }

  if (status === 'unauthorized') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 3,
          gap: 2,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Access Restricted
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, lineHeight: 1.6 }}>
          Your Google account is not on the allowed list for this private workspace.
          <br />
          If you believe this is a mistake, please contact the organizer to be added.
        </Typography>
        <Button variant="contained" onClick={signOutHandler} sx={{ mt: 1.5 }}>
          Sign Out
        </Button>
      </Box>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
