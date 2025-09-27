import { Alert, Box, Button, CircularProgress, Container, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const Profile: React.FC = () => {
  const { user, currentUid } = useAuth();
  const [isUpdated, setIsUpdated] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abort = false;
    const load = async () => {
      setLoading(true);
      try {
        // 1) Try cookie session first
        const me = await fetch('/api/auth/me');
        if (!abort && me.ok) {
          const data = await me.json();
          if (data?.authenticated && data.user?.id) {
            const u: ApiUser = {
              id: String(data.user.id),
              firstName: String(data.user.firstName || ''),
              lastName: String(data.user.lastName || ''),
              email: String(data.user.email || ''),
            };
            setFirstName(u.firstName);
            setLastName(u.lastName);
            setEmail(u.email);
            setResolvedId(u.id);
            setLoading(false);
            return;
          }
        }
        // 2) Fallback to Firebase UID (legacy auth)
        const id = currentUid || user?.uid || null;
        if (id) {
          const r = await fetch(`/api/users/${encodeURIComponent(id)}`);
          if (!abort && r.ok) {
            const data = (await r.json()) as ApiUser;
            setFirstName(String(data.firstName || ''));
            setLastName(String(data.lastName || ''));
            setEmail(String(data.email || ''));
            setResolvedId(String(data.id));
          }
        }
      } catch {
        // ignore; show empty state
      } finally {
        if (!abort) setLoading(false);
      }
    };
    load();
    return () => { abort = true; };
  }, [currentUid, user]);

  const handleUpdate = async () => {
    if (!resolvedId) return;
    setLoading(true);
    try {
      const url = currentUid
        ? `/api/users/${encodeURIComponent(resolvedId)}?uid=${encodeURIComponent(currentUid)}`
        : `/api/users/${encodeURIComponent(resolvedId)}`; // cookie セッション時はクエリ不要
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName }),
      });
      if (!res.ok && res.status !== 204) throw new Error('Update failed');
      setIsUpdated(true);
      setEditMode(false);
    } catch (error) {
      console.error('Update error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>
      <Box sx={{ maxWidth: 600 }}>
        <TextField
          label="Email"
          value={email}
          fullWidth
          margin="normal"
          disabled
        />
        <TextField
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          fullWidth
          margin="normal"
          disabled={!editMode}
          required
        />
        <TextField
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          fullWidth
          margin="normal"
          disabled={!editMode}
          required
        />
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={!firstName || !lastName || loading || !editMode}
          >
            Update
          </Button>
          {editMode ? (
            <Button
              variant="outlined"
              onClick={() => {
                setEditMode(false);
                setIsUpdated(false);
              }}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="outlined"
              onClick={() => setEditMode(true)}
            >
              Edit
            </Button>
          )}
        </Box>
        {isUpdated && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Your profile is updated.
          </Alert>
        )}
        {/* Change Password link removed as Google Auth is used exclusively */}
      </Box>
    </Container>
  );
};

export default Profile;
