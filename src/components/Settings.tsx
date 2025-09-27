import { Container, Divider, List, ListItem, ListItemButton, ListItemText, Paper, Typography } from '@mui/material';
import React from 'react';
// Change Password is no longer used; only placeholders remain.

const Settings: React.FC = () => {
  // No-op: settings page shows placeholders for future options.

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      <Paper elevation={3} sx={{ p: 4 }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton disabled>
              <ListItemText primary="Account Settings" secondary="Manage your account" />
            </ListItemButton>
          </ListItem>
          <Divider />
          <ListItem disablePadding>
            <ListItemButton disabled>
              <ListItemText primary="Notifications" secondary="Manage notifications" />
            </ListItemButton>
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
};

export default Settings;
