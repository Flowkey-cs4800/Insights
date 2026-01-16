import { useState } from "react";
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Button,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import GoogleIcon from "@mui/icons-material/Google";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { login, logout } from "../services/authService";

export default function AppBar() {
  const { user } = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();

  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  const handleOpenUserMenu = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorElUser(e.currentTarget);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  const handleLogout = async () => {
    handleCloseUserMenu();
    await logout();
  };

  const handleNav = (to: string) => {
    handleCloseUserMenu();
    navigate(to);
  };

  const brandTo = user ? "/dashboard" : "/";

  return (
    <MuiAppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Toolbar sx={{ py: 0.5, px: { xs: 2, sm: 3 } }}>
        {/* Brand */}
        <Box
          component={RouterLink}
          to={brandTo}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            textDecoration: "none",
            color: "text.primary",
            flexGrow: 1,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(250, 204, 21, 0.2)"
                  : "rgba(250, 204, 21, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/logo.png"
              alt="Insights"
              style={{ height: 22, width: "auto" }}
            />
          </Box>
          <Typography
            sx={{
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              fontWeight: 600,
              letterSpacing: "-0.5px",
            }}
          >
            insights
          </Typography>
        </Box>

        {/* Theme toggle */}
        <Tooltip title={mode === "light" ? "Dark mode" : "Light mode"}>
          <IconButton onClick={toggleMode} sx={{ mr: 1 }}>
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>

        {/* Sign in button (guest) or User menu (authenticated) */}
        {user ? (
          <>
            <Button
              onClick={handleOpenUserMenu}
              startIcon={<AccountCircleIcon />}
              sx={{
                textTransform: "none",
                color: "text.primary",
                fontWeight: 500,
              }}
            >
              <Box sx={{ display: { xs: "none", sm: "block" } }}>
                {user.name}
              </Box>
            </Button>

            <Menu
              anchorEl={anchorElUser}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => handleNav("/dashboard")}>
                Dashboard
              </MenuItem>
              <MenuItem onClick={() => handleNav("/metrics")}>Metrics</MenuItem>
              <MenuItem onClick={() => handleNav("/insights")}>
                Insights
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                Sign out
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button
            variant="text"
            onClick={() => login()}
            startIcon={<GoogleIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Sign in
          </Button>
        )}
      </Toolbar>
    </MuiAppBar>
  );
}
