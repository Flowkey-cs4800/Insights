import { useState } from "react";
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Box,
  Link,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Button,
} from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { logout } from "../services/authService";

export default function AppBar() {
  const { user } = useAuth();
  const { mode, toggleMode } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  return (
    <MuiAppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <img
            src="/logo.png"
            alt="Insights"
            style={{ height: 32, width: "auto", marginRight: 8 }}
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              letterSpacing: "-0.5px",
              flexGrow: 1,
            }}
          >
            INSIGHTS
          </Typography>

          <IconButton onClick={toggleMode} sx={{ mr: 1 }}>
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>

          {user ? (
            // Logged in: always dropdown
            <>
              <Button
                onClick={handleMenuOpen}
                startIcon={<AccountCircleIcon />}
                sx={{ textTransform: "none", color: "text.primary" }}
              >
                {user.name}
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleMenuClose}>Home</MenuItem>
                <MenuItem onClick={handleMenuClose}>About</MenuItem>
                <MenuItem onClick={handleMenuClose}>Contact</MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>Sign out</MenuItem>
              </Menu>
            </>
          ) : (
            // Logged out: spread on desktop, hamburger on mobile
            <>
              {/* Desktop nav */}
              <Box sx={{ display: { xs: "none", md: "flex" }, gap: 4 }}>
                <Link
                  href="#"
                  underline="hover"
                  color="text.secondary"
                  sx={{ fontSize: 14 }}
                >
                  home
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="text.secondary"
                  sx={{ fontSize: 14 }}
                >
                  about
                </Link>
                <Link
                  href="#"
                  underline="hover"
                  color="text.secondary"
                  sx={{ fontSize: 14 }}
                >
                  contact
                </Link>
              </Box>

              {/* Mobile hamburger */}
              <Box sx={{ display: { xs: "flex", md: "none" } }}>
                <IconButton onClick={handleMenuOpen}>
                  <MenuIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem onClick={handleMenuClose}>Home</MenuItem>
                  <MenuItem onClick={handleMenuClose}>About</MenuItem>
                  <MenuItem onClick={handleMenuClose}>Contact</MenuItem>
                </Menu>
              </Box>
            </>
          )}
        </Toolbar>
      </Container>
    </MuiAppBar>
  );
}
