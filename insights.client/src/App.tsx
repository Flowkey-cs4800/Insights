import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import Landing from './pages/Landing';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? <Home /> : <Landing />;
}

export default App;