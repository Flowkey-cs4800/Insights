import { CircularProgress, Box } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { useAuth } from "./hooks/useAuth";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import MetricView from "./pages/MetricView";
import AppLayout from "./layout/AppLayout";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={user ? <Navigate to="/Dashboard" replace /> : <Landing />} />

        {/* Authed app */}
        {user ? (
          <Route element={<AppLayout />}>
            <Route path="//Dashboard" element={<Home />} />
            <Route path="/metrics" element={<MetricView />} />
            <Route path="*" element={<Navigate to="/Dashboard" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;