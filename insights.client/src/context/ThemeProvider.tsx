// src/context/ThemeProvider.tsx

/**
 * Usage examples - these all pull from the theme automatically:
 *   <Button color="primary">Main action</Button>
 *   <Typography color="success.main">+0.73</Typography>
 *   <Box sx={{ bgcolor: 'background.paper' }}>Card</Box>
 *
 * Fonts: Unbounded (display) + Manrope (body)
 * Add to index.html:
 *   <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Unbounded:wght@400;500;600;700&display=swap" rel="stylesheet">
 */

import { useState, useMemo } from "react";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
} from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { ThemeContext } from "./ThemeContext";
import type { ReactNode } from "react";

type ThemeMode = "light" | "dark";

// ===========================================
// COLORS
// ===========================================

const colors = {
  light: {
    primary: "#1e3a5f", // navy from logo
    secondary: "#4a9ead", // muted teal accent
    background: "#f8fafc", // cool white
    paper: "#ffffff",
    error: "#c53030", // warm red
    success: "#2f855a", // forest green
    warning: "#c05621", // burnt orange
  },
  dark: {
    primary: "#7dd3e8", // soft cyan
    secondary: "#4a9ead", // muted teal
    background: "#0c1929", // deep navy
    paper: "#162033", // navy-grey
    error: "#fc8181", // soft red
    success: "#68d391", // soft green
    warning: "#f6ad55", // soft orange
  },
};

// ===========================================
// TYPOGRAPHY
// ===========================================

const fontFamily = '"Manrope", system-ui, -apple-system, sans-serif';
const displayFont = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';

const typography = {
  fontFamily,

  // Display - Plus Jakarta Sans (heroes, landing, app name)
  h1: {
    fontFamily: displayFont,
    fontWeight: 700,
    fontSize: "3rem",
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  h2: {
    fontFamily: displayFont,
    fontWeight: 700,
    fontSize: "2.25rem",
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
  },
  h3: {
    fontFamily: displayFont,
    fontWeight: 600,
    fontSize: "1.75rem",
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
  },

  // UI Headers - Manrope (page titles, section headers)
  h4: {
    fontFamily,
    fontWeight: 600,
    fontSize: "1.5rem",
    lineHeight: 1.3,
  },
  h5: {
    fontFamily,
    fontWeight: 600,
    fontSize: "1.25rem",
    lineHeight: 1.4,
  },
  h6: {
    fontFamily,
    fontWeight: 600,
    fontSize: "1rem",
    lineHeight: 1.4,
  },

  // Card titles
  subtitle1: {
    fontFamily,
    fontWeight: 500,
    fontSize: "1rem",
    lineHeight: 1.5,
  },
  subtitle2: {
    fontFamily,
    fontWeight: 500,
    fontSize: "0.875rem",
    lineHeight: 1.5,
  },

  // Body text
  body1: {
    fontFamily,
    fontWeight: 400,
    fontSize: "1rem",
    lineHeight: 1.6,
  },
  body2: {
    fontFamily,
    fontWeight: 400,
    fontSize: "0.875rem",
    lineHeight: 1.6,
  },

  // Labels, metadata
  caption: {
    fontFamily,
    fontWeight: 400,
    fontSize: "0.75rem",
    lineHeight: 1.5,
  },

  // Category labels
  overline: {
    fontFamily,
    fontWeight: 500,
    fontSize: "0.75rem",
    lineHeight: 1.5,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },

  // Buttons
  button: {
    fontFamily,
    fontWeight: 500,
    fontSize: "0.875rem",
    textTransform: "none" as const,
  },
};

// ===========================================

const getTheme = (mode: ThemeMode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: colors[mode].primary },
      secondary: { main: colors[mode].secondary },
      background: {
        default: colors[mode].background,
        paper: colors[mode].paper,
      },
      error: { main: colors[mode].error },
      success: { main: colors[mode].success },
      warning: { main: colors[mode].warning },
    },
    typography,
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 500,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
    },
  });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  const toggleMode = () => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
