import { Button, Container, Typography, Box, CircularProgress } from '@mui/material';
import { useAuth } from './hooks/useAuth';
import { login, logout } from './services/auth-service';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Insights
        </Typography>
        
        {user ? (
          <>
            <Typography variant="body1" gutterBottom>
              Welcome, {user.name}!
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {user.email}
            </Typography>
            <Button variant="outlined" onClick={() => logout()} sx={{ mt: 2 }}>
              Sign Out
            </Button>
          </>
        ) : (
          <>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Track your habits and discover correlations
            </Typography>
            <Button variant="contained" onClick={() => login()} sx={{ mt: 2 }}>
              Sign in with Google
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
}

export default App;