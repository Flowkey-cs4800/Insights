import { useEffect, useState } from 'react';
import { Button, Container, Typography, Box } from '@mui/material';
import { callApi } from './services/apiService';

function App() {
  const [health, setHealth] = useState<string>('checking...');

  useEffect(() => {
    let ignore = false;

    async function fetchHealth() {
      const result = await callApi<{ status: string }>('/api/health');
      if (!ignore) {
        if (result.success) {
          setHealth(result.data.status);
        } else {
          setHealth(`Error: ${result.error}`);
        }
      }
    }

    fetchHealth();

    return () => {
      ignore = true;
    };
  }, []);

  const checkHealth = async () => {
    const result = await callApi<{ status: string }>('/api/health');
    if (result.success) {
      setHealth(result.data.status);
    } else {
      setHealth(`Error: ${result.error}`);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Insights
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Server status: {health}
        </Typography>
        <Button variant="contained" onClick={checkHealth}>
          Check Again
        </Button>
      </Box>
    </Container>
  );
}

export default App;