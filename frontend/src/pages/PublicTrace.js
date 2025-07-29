import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import ConsumerDashboard from './ConsumerDashboard';

function PublicTrace() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" textAlign="center" mb={2}>
          Wine Traceability Portal
        </Typography>
        <Typography variant="subtitle1" textAlign="center" color="text.secondary" mb={4}>
          Verify the authenticity and trace the journey of your wine
        </Typography>
        <ConsumerDashboard />
      </Box>
    </Container>
  );
}

export default PublicTrace;