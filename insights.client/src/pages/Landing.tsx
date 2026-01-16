import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Stack,
  Link,
  CircularProgress,
} from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import { login } from "../services/authService";
import { useTheme } from "../hooks/useTheme";
import AppBar from "../components/AppBar";

// Subtle glow pulse animation
const glowPulse = keyframes`
  0%, 100% {
    filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.4)) drop-shadow(0 0 20px rgba(250, 204, 21, 0.2));
  }
  50% {
    filter: drop-shadow(0 0 12px rgba(250, 204, 21, 0.6)) drop-shadow(0 0 30px rgba(250, 204, 21, 0.3));
  }
`;

export default function Landing() {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = () => {
    setSigningIn(true);
    login();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar />

      <Container maxWidth="sm" sx={{ flex: 1 }}>
        {/* Hero - Centered */}
        <Box
          sx={{
            textAlign: "center",
            pt: { xs: 4, md: 5 },
            pb: { xs: 3, md: 4 },
          }}
        >
          {/* Glowing Logo */}
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="Insights"
              sx={{
                height: { xs: 56, md: 64 },
                width: "auto",
                animation: `${glowPulse} 3s ease-in-out infinite`,
              }}
            />
          </Box>

          <Typography
            variant="h3"
            sx={{
              letterSpacing: "-1px",
              mb: 0.75,
              fontSize: { xs: "1.75rem", sm: "2.25rem", md: "2.5rem" },
            }}
          >
            manage what you measure
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 3, fontSize: { xs: "1rem", md: "1.1rem" } }}
          >
            track your habits. find the patterns.
          </Typography>

          {/* Big CTA Button */}
          <Button
            variant="contained"
            size="large"
            onClick={handleSignIn}
            disabled={signingIn}
            startIcon={
              signingIn ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <GoogleIcon />
              )
            }
            sx={(theme) => ({
              textTransform: "none",
              px: 4,
              py: 1.5,
              borderRadius: 3,
              fontSize: "1rem",
              fontWeight: 600,
              minWidth: 220,
              boxShadow: `0 4px 14px 0 ${alpha(
                theme.palette.primary.main,
                0.35
              )}`,
              "&:hover": {
                boxShadow: `0 6px 20px 0 ${alpha(
                  theme.palette.primary.main,
                  0.45
                )}`,
              },
            })}
          >
            {signingIn ? "Signing in..." : "Sign in with Google"}
          </Button>
        </Box>

        {/* Screenshot / Preview Card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: "1px solid",
            borderColor: isDark ? "grey.800" : "grey.200",
            overflow: "hidden",
            bgcolor: isDark ? "grey.900" : "grey.50",
          }}
        >
          {/* Fake browser bar */}
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderBottom: "1px solid",
              borderColor: isDark ? "grey.800" : "grey.200",
              display: "flex",
              gap: 0.75,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: isDark ? "grey.700" : "grey.300",
              }}
            />
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: isDark ? "grey.700" : "grey.300",
              }}
            />
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: isDark ? "grey.700" : "grey.300",
              }}
            />
          </Box>

          {/* Content area - shows example insight */}
          <Box sx={{ p: 2 }}>
            {/* Example insight card */}
            <Paper
              variant="outlined"
              sx={(theme) => ({
                p: 1.5,
                borderRadius: 3,
                borderColor: "primary.light",
                bgcolor: alpha(
                  theme.palette.primary.main,
                  isDark ? 0.08 : 0.04
                ),
              })}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <TipsAndUpdatesIcon sx={{ color: "#facc15", fontSize: 22 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    your mood is 34% better on days you exercise and sleep 7+
                    hours
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    28 days of data
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Example metric logs */}
            <Stack spacing={0.75} sx={{ mt: 1.5 }}>
              {[
                { name: "Exercise", checked: true },
                { name: "Sleep", value: "7.5 hrs" },
                { name: "Mood", value: "8/10" },
              ].map((item) => (
                <Paper
                  key={item.name}
                  variant="outlined"
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "primary.main",
                      fontWeight: 500,
                    }}
                  >
                    {item.checked ? "done" : item.value}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Paper>

        {/* Footer tagline */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            textAlign: "center",
            mt: 3,
            mb: 1.5,
            fontStyle: "italic",
          }}
        >
          sleep &middot; mood &middot; caffeine &middot; exercise &middot;
          whatever you want
        </Typography>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: "center",
        }}
      >
        <Link
          href="https://github.com/Flowkey-cs4800/Insights"
          target="_blank"
          rel="noopener"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            color: "text.secondary",
            textDecoration: "none",
            fontSize: "0.875rem",
            "&:hover": { color: "text.primary" },
          }}
        >
          <GitHubIcon sx={{ fontSize: 18 }} />
          Open source on GitHub
        </Link>
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: "block", mt: 0.75 }}
        >
          Built by Lindsay, Kenzie & Ashley for CS 4800
        </Typography>
      </Box>
    </Box>
  );
}
