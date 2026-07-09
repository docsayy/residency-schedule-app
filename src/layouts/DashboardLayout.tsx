import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PeopleIcon from "@mui/icons-material/People";
import BadgeIcon from "@mui/icons-material/Badge";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ViewWeekIcon from "@mui/icons-material/ViewWeek";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

import { useAuth } from "../context/AuthContext";
import type { AppPage } from "../types/page";

const drawerWidth = 250;

const navItems: { label: string; page: AppPage; icon: React.ReactNode }[] = [
  { label: "Who's On", page: "whos-on", icon: <CalendarTodayIcon /> },
  { label: "Residents", page: "residents", icon: <PeopleIcon /> },
  { label: "Attendings", page: "attendings", icon: <BadgeIcon /> },
  {
    label: "Attending Call Schedule",
    page: "attending-call-schedule",
    icon: <LocalHospitalIcon />,
  },
  { label: "Daily Call Schedule", page: "schedule", icon: <CalendarMonthIcon /> },
  { label: "Block Schedule", page: "block-schedule", icon: <ViewWeekIcon /> },
  { label: "Call Swaps", page: "call-swaps", icon: <SwapHorizIcon /> },
  { label: "Vacation", page: "vacation", icon: <BeachAccessIcon /> },
  { label: "Settings", page: "settings", icon: <SettingsIcon /> },
];

export default function DashboardLayout({
  children,
  currentPage,
  onPageChange,
}: {
  children: React.ReactNode;
  currentPage: AppPage;
  onPageChange: (page: AppPage) => void;
}) {
  const { user, profile, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleNavigate(page: AppPage) {
    onPageChange(page);
    setDrawerOpen(false);
  }

  const drawerContent = (
    <>
      <Toolbar />

      <Box sx={{ p: 1.5 }}>
        <Typography variant="overline" sx={{ color: "#94a3b8" }}>
          Main Menu
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

      <List dense>
        {navItems.map((item) => (
          <ListItemButton
            key={item.page}
            selected={item.page === currentPage}
            onClick={() => handleNavigate(item.page)}
            sx={{
              mx: 1,
              my: 0.25,
              py: 0.65,
              borderRadius: 1.5,
              color: "white",
              "&.Mui-selected": {
                backgroundColor: "rgba(255,255,255,0.16)",
              },
              "&.Mui-selected:hover": {
                backgroundColor: "rgba(255,255,255,0.22)",
              },
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 34 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 13 }}
            />
          </ListItemButton>
        ))}
      </List>
    </>
  );

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
        <Toolbar sx={{ justifyContent: "space-between", gap: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconButton edge="start" onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>

            <Typography variant="h6" noWrap fontWeight={800}>
              WhosOn
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
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
              sx={{ minWidth: { xs: 40, sm: 90 } }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                Logout
              </Box>
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#0f172a",
            color: "white",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          p: { xs: 1.5, sm: 2, md: 2 },
          width: "100%",
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}