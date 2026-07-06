import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import EditIcon from "@mui/icons-material/Edit";

const todaysCoverage = [
  { service: "2N-CCU", shift: "7a-7p", name: "Gandapur", training: "PGY-1", contact: "11279" },
  { service: "4N", shift: "7a-7p", name: "Sallam", training: "PGY-1", contact: "11287" },
  { service: "4N-3W PGY2", shift: "7a-7p", name: "Ali", training: "PGY-2", contact: "11155" },
  { service: "3W", shift: "7a-7p", name: "Muslehuddin", training: "PGY-1", contact: "11285" },
  { service: "Tele", shift: "7a-7p", name: "Al-Gharazi", training: "PGY-1", contact: "11273" },
  { service: "2N-CCU PGY2", shift: "7a-7p", name: "Valle", training: "PGY-2", contact: "11171" },
  { service: "MICU", shift: "7a-7a", name: "Burdynskyi", training: "PGY-1", contact: "11275" },
  { service: "MICU Senior", shift: "8a-8a", name: "Najera", training: "PGY-2", contact: "11165" },
  { service: "4N-3W PGY1 NF", shift: "7p-7a", name: "Kodwo", training: "PGY-1", contact: "11282" },
  { service: "4N-3W PGY2 NF", shift: "7p-7a", name: "Chekalil", training: "PGY-2", contact: "11161" },
  { service: "Chief On Call", shift: "7a-7p", name: "Al-Hashimi", training: "PGY-3", contact: "534" },
  { service: "PGY3 NF", shift: "7p-7a", name: "Rahman", training: "PGY-3", contact: "541" },
  { service: "Observation Attending", shift: "7a-7a", name: "Algohary", training: "Attending", contact: "" },
  { service: "Faculty Attending On Call", shift: "7a-7a", name: "Akbar Khan", training: "Attending", contact: "" },
  { service: "Chief Resident", shift: "8p-7a", name: "Zhao", training: "PGY-3", contact: "547" },
];

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

      <Box sx={{ bgcolor: "#f5f7fb", minHeight: "100vh", py: 4 }}>
        <Container maxWidth="xl">
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={2}
                >
                  <Box>
                    <Typography variant="h4" fontWeight={800}>
                      Who&apos;s On Today
                    </Typography>
                    <Typography color="text.secondary">
                      Tue, June 30, 2026 · as of 2:01 PM
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button variant="outlined" startIcon={<ArrowBackIcon />}>
                      Previous Day
                    </Button>
                    <Button variant="contained">Today</Button>
                    <Button variant="outlined" endIcon={<ArrowForwardIcon />}>
                      Next Day
                    </Button>
                    <Button variant="outlined" startIcon={<EditIcon />}>
                      Edit Schedule
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Today&apos;s Coverage
                </Typography>

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Service</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Shift</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Name</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Training</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Contact</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Message</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {todaysCoverage.map((row) => (
                        <TableRow key={`${row.service}-${row.name}`} hover>
                          <TableCell>{row.service}</TableCell>
                          <TableCell>{row.shift}</TableCell>
                          <TableCell>
                            <Typography fontWeight={600}>{row.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.training}
                              size="small"
                              color={
                                row.training === "Attending"
                                  ? "secondary"
                                  : row.training === "PGY-3"
                                  ? "success"
                                  : row.training === "PGY-2"
                                  ? "primary"
                                  : "default"
                              }
                            />
                          </TableCell>
                          <TableCell>{row.contact || "—"}</TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined">
                              Secure Message
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Stack>
        </Container>
      </Box>
    </>
  );
}

export default App;