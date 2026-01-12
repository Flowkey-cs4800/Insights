import { useMemo, useState } from "react";
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Button,
  Tooltip,
} from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { logout } from "../services/authService";

type NavItem = { label: string; to: string; icon?: React.ReactNode };

export default function AppBar() {
  const { user } = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [anchorElMobile, setAnchorElMobile] = useState<null | HTMLElement>(null);

  const authedNav: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", to: "/dashboard", icon: <DashboardIcon fontSize="small" /> },
      { label: "Metrics", to: "/metrics", icon: <ListAltIcon fontSize="small" /> },
    ],
    []
  );

  const guestNav: NavItem[] = useMemo(() => [{ label: "Home", to: "/" }], []);

  const nav = user ? authedNav : guestNav;

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  const handleOpenUserMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorElUser(e.currentTarget);
  const handleCloseUserMenu = () => setAnchorElUser(null);

  const handleOpenMobileMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorElMobile(e.currentTarget);
  const handleCloseMobileMenu = () => setAnchorElMobile(null);

  const handleNav = (to: string) => {
    handleCloseMobileMenu();
    handleCloseUserMenu();
    navigate(to);
  };

  const handleLogout = async () => {
    handleCloseUserMenu();
    await logout();
  };

  const brandTo = user ? "/dashboard" : "/";

  return (
    <MuiAppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ borderBottom: "1px solid", borderColor: "divider" }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ py: 1 }}>
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
              mr: 2,
            }}
          >
            <img src="/logo.png" alt="Insights" style={{ height: 30, width: "auto" }} />
            <Typography sx={{ fontWeight: 900, letterSpacing: "-0.5px" }}>INSIGHTS</Typography>
          </Box>

          {/* Desktop nav */}
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1, flexGrow: 1 }}>
            {nav.map((item) => (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                startIcon={item.icon}
                variant={isActive(item.to) ? "contained" : "text"}
                color={isActive(item.to) ? "primary" : "inherit"}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 700,
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Mobile nav (hamburger) */}
          <Box sx={{ display: { xs: "flex", md: "none" }, flexGrow: 1 }}>
            <IconButton onClick={handleOpenMobileMenu} aria-label="open navigation">
              <MenuIcon />
            </IconButton>

            <Menu
              anchorEl={anchorElMobile}
              open={Boolean(anchorElMobile)}
              onClose={handleCloseMobileMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
            >
              {nav.map((item) => (
                <MenuItem key={item.to} onClick={() => handleNav(item.to)}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {item.icon}
                    <Typography>{item.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Theme toggle */}
          <Tooltip title={mode === "light" ? "Dark mode" : "Light mode"}>
            <IconButton onClick={toggleMode} sx={{ mr: 1 }}>
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>

          {/* User menu */}
          {user ? (
            <>
              <Button
                onClick={handleOpenUserMenu}
                startIcon={<AccountCircleIcon />}
                sx={{ textTransform: "none", color: "text.primary", fontWeight: 700 }}
              >
                {user.name}
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <DashboardIcon fontSize="small" />
                    <Typography>Dashboard</Typography>
                  </Box>
                </MenuItem>

                <MenuItem onClick={() => handleNav("/metrics")}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ListAltIcon fontSize="small" />
                    <Typography>Metrics</Typography>
                  </Box>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleLogout}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LogoutIcon fontSize="small" />
                    <Typography>Sign out</Typography>
                  </Box>
                </MenuItem>
              </Menu>
            </>
          ) : null}
        </Toolbar>
      </Container>
    </MuiAppBar>
  );
}