import { Button, Container, Typography, Box, CircularProgress } from '@mui/material';
import { useAuth } from './hooks/useAuth';
import { login, logout } from './services/auth-service';
import StatCard from './components/StatCard';

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
            
            <Box sx={{ display: 'flex', gap: 2, mt: 4, mb: 4 }}>
              <StatCard title="Entries" value={0} subtitle="this week" />
              <StatCard title="Streak" value={0} subtitle="days" />
            </Box>

            <Button variant="outlined" onClick={() => logout()}>
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