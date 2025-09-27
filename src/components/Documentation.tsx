import { Box, Container, Paper, Typography } from '@mui/material';
import React from 'react';

const Documentation: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Documentation
      </Typography>
      <Box sx={{ pt: 2 }}>
        <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Overview
          </Typography>
          <Typography variant="body1" paragraph>
            Goen Net is a closed community app for Globis alumni.
            It aims to facilitate knowledge sharing and networking among members.
          </Typography>
          <Typography variant="body1" paragraph>
            This app is limited to 8 users, with privacy and security prioritized.
          </Typography>
        </Paper>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            How to use
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Auth:</strong> Sign in with email and password. Reset your password from Settings.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Members:</strong> Browse the alumni list and view profile details.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Updates:</strong> Post and browse updates. Categorize by priority and category.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Profile/Settings:</strong> Update your personal info and change password.
          </Typography>
          <Typography variant="body1">
            <strong>Notes:</strong> Be careful when sharing sensitive information. This app is limited to Globis alumni.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Documentation;
