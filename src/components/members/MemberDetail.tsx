import { Alert, Box, Button, CircularProgress, Container, Paper, Snackbar, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  // Add other fields as per Angular models
}

const MemberDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUid } = useAuth();
  const navigate = useNavigate();
  const [member, setMember] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    let abort = false;
    const fetchUser = async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        if (abort) return;
        const u: User = {
          id: String(data.id),
          firstName: String(data.firstName || ''),
          lastName: String(data.lastName || ''),
          email: String(data.email || ''),
        };
        setMember(u);
        setEditFirstName(u.firstName);
        setEditLastName(u.lastName);
  setIsOwner(currentUid === id);
      } catch {
        if (!abort) setMember(null);
      } finally {
        if (!abort) setLoading(false);
      }
    };
    fetchUser();
    return () => { abort = true; };
  }, [id, currentUid]);

  const handleUpdate = async () => {
    if (!id || !member || !currentUid) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}?uid=${encodeURIComponent(currentUid)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: editFirstName, lastName: editLastName }),
      });
      if (!res.ok && res.status !== 204) throw new Error('Update failed');
      // local state update
      setMember({ ...member, firstName: editFirstName, lastName: editLastName });
  setToast({ open: true, message: 'Profile has been updated.', severity: 'success' });
    } catch (error) {
      console.error('Update error:', error);
  setToast({ open: true, message: 'Failed to update.', severity: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!member) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>Member not found.</Typography>
      </Container>
    );
  }

  return (
    <>
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {`${member.firstName} ${member.lastName}`}
      </Typography>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Email:
          </Typography>
          <Typography variant="body1">
            {member.email}
          </Typography>
        </Box>
        {isOwner && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Edit Profile
            </Typography>
            <TextField
              label="First Name"
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Last Name"
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              fullWidth
              margin="normal"
            />
            <Button
              variant="contained"
              onClick={handleUpdate}
              disabled={
                updating ||
                !editFirstName.trim() ||
                !editLastName.trim() ||
                (editFirstName === member.firstName && editLastName === member.lastName)
              }
              sx={{ mt: 2 }}
            >
              {updating ? <CircularProgress size={24} /> : 'Update'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => { setEditFirstName(member.firstName); setEditLastName(member.lastName); }}
              sx={{ ml: 2, mt: 2 }}
              disabled={updating}
            >
              Cancel
            </Button>
          </Box>
        )}
        <Box sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/members')}
          >
            Back to list
          </Button>
        </Box>
      </Paper>
    </Container>
    <Snackbar
      open={toast.open}
      autoHideDuration={3000}
      onClose={() => setToast((t) => ({ ...t, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))} sx={{ width: '100%' }}>
        {toast.message}
      </Alert>
    </Snackbar>
    </>
  );
};

export default MemberDetail;
