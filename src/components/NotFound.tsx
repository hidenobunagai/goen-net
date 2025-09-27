import { Box, Button, Container, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  useDocumentTitle('Not Found');

  return (
    <Container sx={{ mt: 8, textAlign: 'center' }}>
      <Box sx={{ maxWidth: 400, margin: '0 auto' }}>
        <Typography variant="h2" component="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          The requested page was not found.
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          The page you requested does not exist, or the URL is incorrect.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Back to Home
        </Button>
      </Box>
    </Container>
  );
};

export default NotFound;
