import { Alert, Box, Container, Stack, Typography } from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const SignIn: React.FC = () => {
  useDocumentTitle('Sign In');
  const { isAuthenticated, emailError } = useAuth();
  const [/* loadingGoogle */, setLoadingGoogle] = useState(false);
  const googleDivRef = useRef<HTMLDivElement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initGoogle = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId || !window.google || !googleDivRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gis = (window.google.accounts.id as unknown as any);
  try { gis.disableAutoSelect?.(); } catch { /* noop */ }
    gis.initialize({
      client_id: clientId,
      ux_mode: 'popup',
      auto_select: false,
      use_fedcm_for_prompt: false,
  callback: async (response: GsiCredentialResponse) => {
        try {
          setLoadingGoogle(true);
          const idToken = response.credential as string;
          const res = await fetch('/api/auth/google/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
            credentials: 'include',
          });
          if (!res.ok) {
            const data: unknown = await res.json().catch(() => ({}));
            const anyData = data as { error?: unknown; detail?: unknown };
            const err = anyData?.error as unknown;
            const msg = (typeof err === 'string') ? err
              : ((err as { message?: string })?.message || (anyData?.detail as string | undefined) || `Google sign-in failed (${res.status})`);
            setErrorMsg(String(msg));
            throw new Error(msg);
          }
          setErrorMsg(null);
          // Use full reload so AuthContext re-evaluates cookie session immediately
          window.location.replace('/');
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingGoogle(false);
        }
      }
    });
  gis.renderButton(googleDivRef.current, { theme: 'outline', size: 'large', width: 320, type: 'standard' });
  }, []);

  useEffect(() => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;
    if (window.google && window.google.accounts?.id) {
      initGoogle();
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => initGoogle();
    document.head.appendChild(s);
    return () => {
      document.head.removeChild(s);
    };
  }, [initGoogle]);

  // If already authenticated, redirect away from the sign-in page
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign In
        </Typography>
        <Stack spacing={2} sx={{ mt: 3, width: '100%' }}>
          {(emailError || errorMsg) && <Alert severity="error">{emailError || errorMsg}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <div ref={googleDivRef} />
          </Box>
          <Typography variant="body2" color="text.secondary" align="center">
            Sign in with your Google account
          </Typography>
        </Stack>
      </Box>
    </Container>
  );
};

export default SignIn;
