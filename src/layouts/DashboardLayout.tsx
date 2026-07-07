import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

import { useAuth } from "../context/AuthContext";

const drawerWidth = 260;

const navItems = [
  { label: "Dashboard", icon: <DashboardIcon /> },
  { label: "Residents", icon: <PeopleIcon /> },
  { label: "Schedule", icon: <CalendarMonthIcon /> },
  { label: "Call Swaps", icon: <SwapHorizIcon /> },
  { label: "Vacation", icon: <BeachAccessIcon /> },
  { label: "Settings", icon: <SettingsIcon /> },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, logout } = useAuth();

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: "white",
          color: "#0f172a",
          boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" noWrap fontWeight={700}>
            Residency Scheduler
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
              <Typography variant="body2" fontWeight={700}>
                {profile?.displayName || user?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {profile?.role || "User"}
              </Typography>
            </Box>

            <Button
              size="small"
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={logout}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#0f172a",
            color: "white",
          },
        }}
      >
        <Toolbar />

        <Box sx={{ p: 2 }}>
          <Typography variant="overline" sx={{ color: "#94a3b8" }}>
            Main Menu
          </Typography>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.label}
              selected={item.label === "Residents"}
              sx={{
                mx: 1,
                my: 0.5,
                borderRadius: 2,
                color: "white",
                "&.Mui-selected": {
                  backgroundColor: "rgba(255,255,255,0.14)",
                },
                "&.Mui-selected:hover": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                },
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          p: 3,
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}