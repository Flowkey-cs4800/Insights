import { CircularProgress, Box } from "@mui/material";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";

import { useAuth } from "./hooks/useAuth";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import MetricView from "./pages/MetricView";
import Insights from "./pages/Insights";
import AppLayout from "./layout/AppLayout";

function AuthCallback() {
  useEffect(() => {
    window.opener?.postMessage(
      { type: "auth-success" },
      window.location.origin
    );
    window.close();
  }, []);
  return <div>Signing in...</div>;
}

function App() {
  const { user, loading } = useAuth();

  // Handle auth callback immediately
  if (window.location.pathname === "/auth-callback") {
    return <AuthCallback />;
  }

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
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <Landing />}
        />

        {user ? (
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Home />} />
            <Route path="/metrics" element={<MetricView />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
