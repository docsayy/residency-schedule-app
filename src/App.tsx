import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import {
  AppBar,
  Button,
  CssBaseline,
  Toolbar,
  Typography,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

import Dashboard from "./pages/Dashboard";
import BlockSchedule from "./pages/BlockSchedule";
import Login from "./pages/Login";
import AdminResidents from "./pages/AdminResidents";

export default function App() {
  return (
    <BrowserRouter>
      <CssBaseline />

      <AppBar position="static" elevation={0}>
        <Toolbar>
          <CalendarTodayIcon sx={{ mr: 2 }} />

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Residency Scheduler
          </Typography>

          <Button color="inherit" component={Link} to="/">
            Who&apos;s On
          </Button>

          <Button color="inherit" component={Link} to="/block-schedule">
            Block Schedule
          </Button>

          <Button color="inherit" component={Link} to="/admin/residents">
            Residents
          </Button>

          <Button color="inherit" component={Link} to="/login">
            Login
          </Button>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/block-schedule" element={<BlockSchedule />} />
        <Route path="/admin/residents" element={<AdminResidents />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}