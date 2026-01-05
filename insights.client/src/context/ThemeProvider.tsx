// src/context/ThemeProvider.tsx

/**
 * // These all pull from the theme automatically
        <Button color="primary">Main action</Button>
        <Button color="secondary">Secondary</Button>
        <Typography color="success.main">+0.73</Typography>
        <Typography color="error.main">-0.45</Typography>
        <Box sx={{ bgcolor: 'background.paper' }}>Card</Box>
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
// CUSTOMIZE COLORS HERE
// ===========================================

const colors = {
  light: {
    primary: "#1976d2", // main buttons, links
    secondary: "#9c27b0", // secondary actions
    background: "#fafafa", // page background
    paper: "#ffffff", // cards, menus
    error: "#d32f2f", // error states
    success: "#2e7d32", // success states (positive correlation)
    warning: "#ed6c02", // warnings
  },
  dark: {
    primary: "#90caf9",
    secondary: "#ce93d8",
    background: "#121212",
    paper: "#1e1e1e",
    error: "#f44336",
    success: "#66bb6a",
    warning: "#ffa726",
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
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      // Adjust sizes here if needed
      h2: { fontWeight: 800 },
      h5: { fontWeight: 300 },
      h6: { fontWeight: 700 },
    },
    shape: {
      borderRadius: 8, // rounded corners on everything
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none", // no ALL CAPS on buttons
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
