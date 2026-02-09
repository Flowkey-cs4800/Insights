import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Container,
  Stack,
  Link,
  CircularProgress,
} from "@mui/material";
import { alpha, keyframes } from "@mui/material/styles";
import GoogleIcon from "@mui/icons-material/Google";
import GitHubIcon from "@mui/icons-material/GitHub";
import { login } from "../services/authService";
import { useTheme } from "../hooks/useTheme";
import AppBar from "../components/AppBar";

// Subtle fade-up for staggered entrance
const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Gentle pulse for the activity dots
const softPulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

// Example data for the activity grid visualization
const GRID_DATA = [
  [0, 0, 1, 1, 0, 1, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 1, 0, 1, 1],
];

export default function Landing() {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = () => {
    setSigningIn(true);
    login();
  };

  const accent = "#facc15";

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

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Container
          maxWidth="md"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            py: { xs: 4, md: 6 },
          }}
        >
          {/* ── Hero ── */}
          <Box
            sx={{
              animation: `${fadeUp} 0.6s ease-out both`,
              mb: { xs: 5, md: 7 },
            }}
          >
            {/* Tagline chip */}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.5,
                mb: { xs: 2, md: 3 },
                borderRadius: 99,
                border: "1px solid",
                borderColor: isDark ? alpha(accent, 0.25) : alpha(accent, 0.4),
                bgcolor: isDark ? alpha(accent, 0.08) : alpha(accent, 0.06),
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: accent,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  color: isDark ? alpha(accent, 0.9) : "#a16207",
                }}
              >
                track anything · find patterns
              </Typography>
            </Box>

            {/* Main heading */}
            <Typography
              sx={{
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                fontWeight: 800,
                letterSpacing: "-0.04em",
                fontSize: { xs: "2.75rem", sm: "3.75rem", md: "5rem" },
                lineHeight: 1.05,
                mb: 2,
              }}
            >
              Know what
              <br />
              actually{" "}
              <Box
                component="span"
                sx={{
                  position: "relative",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: "0.08em",
                    left: 0,
                    right: 0,
                    height: "0.15em",
                    bgcolor: accent,
                    borderRadius: 1,
                    opacity: 0.7,
                  },
                }}
              >
                works
              </Box>
              .
            </Typography>

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: { xs: "1rem", md: "1.15rem" },
                lineHeight: 1.6,
                maxWidth: 480,
              }}
            >
              Log your habits. Insights finds the connections you'd miss — which
              routines lift your mood, what actually helps you focus, where the
              patterns are hiding.
            </Typography>

            {/* CTA */}
            <Button
              variant="contained"
              size="large"
              onClick={handleSignIn}
              disabled={signingIn}
              startIcon={
                signingIn ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <GoogleIcon />
                )
              }
              sx={{
                mt: { xs: 3, md: 4 },
                textTransform: "none",
                px: 3.5,
                py: 1.5,
                borderRadius: 2.5,
                fontSize: "0.95rem",
                fontWeight: 600,
                boxShadow: "none",
                "&:hover": {
                  boxShadow: `0 4px 20px ${alpha(accent, 0.3)}`,
                },
              }}
            >
              {signingIn ? "Signing in…" : "Get started with Google"}
            </Button>
          </Box>

          {/* ── Visual: How it works ── */}
          <Box
            sx={{
              animation: `${fadeUp} 0.6s ease-out 0.15s both`,
            }}
          >
            {/* Metric example cards */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2.5 }}
            >
              {/* Example log entries */}
              {[
                { name: "Exercise", display: "✓", kind: "boolean" },
                { name: "Sleep", display: "7.5 hrs", kind: "number" },
                { name: "Mood", display: "8", kind: "number" },
              ].map((item, i) => (
                <Box
                  key={item.name}
                  sx={{
                    flex: 1,
                    p: 2,
                    borderRadius: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: isDark
                      ? alpha("#fff", 0.02)
                      : alpha("#000", 0.015),
                    animation: `${fadeUp} 0.5s ease-out ${0.3 + i * 0.08}s both`,
                    transition: "border-color 0.2s",
                    "&:hover": {
                      borderColor: isDark
                        ? alpha(accent, 0.3)
                        : alpha(accent, 0.5),
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.disabled",
                          fontWeight: 500,
                          fontSize: "0.7rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {item.kind === "boolean" ? "daily" : "tracked"}
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          lineHeight: 1.3,
                        }}
                      >
                        {item.name}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize:
                          item.kind === "boolean" ? "1.1rem" : "0.95rem",
                        color: accent,
                      }}
                    >
                      {item.display}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>

            {/* The insight that emerges */}
            <Box
              sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: isDark ? alpha(accent, 0.2) : alpha(accent, 0.3),
                bgcolor: isDark ? alpha(accent, 0.05) : alpha(accent, 0.03),
                animation: `${fadeUp} 0.5s ease-out 0.55s both`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Connecting line visual */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 24,
                  width: 2,
                  height: 12,
                  bgcolor: isDark ? alpha(accent, 0.2) : alpha(accent, 0.25),
                  borderRadius: 1,
                  transform: "translateY(-100%)",
                }}
              />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ sm: "center" }}
              >
                {/* Activity grid */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "3px",
                    width: { xs: 100, md: 120 },
                    flexShrink: 0,
                  }}
                >
                  {GRID_DATA.flat().map((v, i) => (
                    <Box
                      key={i}
                      sx={{
                        aspectRatio: "1",
                        borderRadius: "3px",
                        bgcolor: v
                          ? accent
                          : isDark
                            ? alpha("#fff", 0.06)
                            : alpha("#000", 0.06),
                        opacity: v ? 0.85 : 1,
                        animation: v
                          ? `${softPulse} ${2 + (i % 3) * 0.5}s ease-in-out ${
                              (i % 5) * 0.2
                            }s infinite`
                          : "none",
                      }}
                    />
                  ))}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: isDark ? alpha(accent, 0.7) : "#a16207",
                      fontSize: "0.65rem",
                      display: "block",
                      mb: 0.5,
                    }}
                  >
                    Discovered insight
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "0.95rem", md: "1.05rem" },
                      lineHeight: 1.4,
                      mb: 0.5,
                    }}
                  >
                    Your mood is 34% higher on days you exercise and sleep 7+
                    hours
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Based on 28 days of data · exercise ↔ sleep ↔ mood
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* How it works — minimal inline steps */}
            <Stack
              direction="row"
              spacing={{ xs: 2, md: 4 }}
              justifyContent="center"
              sx={{
                mt: { xs: 4, md: 5 },
                mb: { xs: 2, md: 3 },
                animation: `${fadeUp} 0.5s ease-out 0.7s both`,
              }}
            >
              {[
                { step: "01", text: "Log daily" },
                { step: "02", text: "We analyze" },
                { step: "03", text: "See what works" },
              ].map((item, i) => (
                <Box key={i} sx={{ textAlign: "center" }}>
                  <Typography
                    sx={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      fontSize: "0.7rem",
                      color: accent,
                      mb: 0.25,
                    }}
                  >
                    {item.step}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "text.secondary",
                      fontSize: { xs: "0.8rem", md: "0.85rem" },
                    }}
                  >
                    {item.text}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        </Container>

        {/* ── Footer ── */}
        <Box
          component="footer"
          sx={{
            py: 2.5,
            textAlign: "center",
            borderTop: "1px solid",
            borderColor: "divider",
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
              color: "text.disabled",
              textDecoration: "none",
              fontSize: "0.8rem",
              fontWeight: 500,
              "&:hover": { color: "text.secondary" },
            }}
          >
            <GitHubIcon sx={{ fontSize: 16 }} />
            Source on GitHub
          </Link>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.75,
              color: "text.disabled",
              fontSize: "0.7rem",
            }}
          >
            Lindsay, Kenzie & Ashley · CS 4800
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
