import { AppBar, Button, CssBaseline, Toolbar, Typography } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <>
      <CssBaseline />

      <AppBar position="static" elevation={0}>
        <Toolbar>
          <CalendarTodayIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Residency Scheduler
          </Typography>
          <Button color="inherit">Block Schedule</Button>
          <Button color="inherit">Call Schedule</Button>
          <Button color="inherit">My Schedule</Button>
        </Toolbar>
      </AppBar>

      <Dashboard />
    </>
  );
}

export default App;