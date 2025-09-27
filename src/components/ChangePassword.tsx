import { Alert, Box, Button, CircularProgress, Container, Paper, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, updateUserPassword } = useAuth();
  const navigate = useNavigate();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await updateUserPassword(newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/signin'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    }
    setLoading(false);
  };

  if (!user) {
    return null; // Protected route, should not be accessible without auth
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Change Password
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>Password changed successfully. Redirecting to sign in...</Alert>}
        <Box component="form" onSubmit={handleChangePassword} sx={{ mt: 2 }}>
          <TextField
            label="Current Password (if required)"
            type="password"
            fullWidth
            margin="normal"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            label="New Password"
            type="password"
            fullWidth
            margin="normal"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            margin="normal"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Change Password'}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate('/settings')}
          >
            Back to Settings
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChangePassword;
