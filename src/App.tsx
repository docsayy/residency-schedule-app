import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AppBar, Button, CssBaseline, Toolbar, Typography } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Dashboard from "./pages/Dashboard";
import BlockSchedule from "./pages/BlockSchedule";

function App() {
  return (
    <BrowserRouter>
      <CssBaseline />

      <AppBar position="static" elevation={0}>
        <Toolbar>
          <CalendarTodayIcon sx={{ mr: 2 }} />

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Residency Scheduler
          </Typography>

          <Button color="inherit" component={Link} to="/block-schedule">
            Block Schedule
          </Button>

          <Button color="inherit" component={Link} to="/">
            Who&apos;s On
          </Button>

          <Button color="inherit" component={Link} to="/my-schedule">
            My Schedule
          </Button>

          <Button color="inherit" component={Link} to="/special-requests">
            Special Requests
          </Button>

          <Button color="inherit" component={Link} to="/send-page">
            Send a Page
          </Button>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/block-schedule" element={<BlockSchedule />} />
        <Route path="/my-schedule" element={<PlaceholderPage title="My Schedule" />} />
        <Route path="/special-requests" element={<PlaceholderPage title="Special Requests" />} />
        <Route path="/send-page" element={<PlaceholderPage title="Send a Page" />} />
      </Routes>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: 32 }}>
      <h1>{title}</h1>
      <p>This page will be built next.</p>
    </div>
  );
}

export default App;