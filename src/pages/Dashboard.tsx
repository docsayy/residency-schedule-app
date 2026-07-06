import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import EditIcon from "@mui/icons-material/Edit";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { coverageRows, type CoverageView } from "../data/sampleCoverage";

export default function Dashboard() {
  const [view, setView] = useState<CoverageView>("calls");

  const today = new Date();

  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = today.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const rows = useMemo(
    () => coverageRows.filter((row) => row.view.includes(view)),
    [view]
  );

  return (
    <Box sx={{ bgcolor: "#f5f7fb", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                  spacing={2}
                >
                  <Box>
                    <Typography variant="h4" fontWeight={800}>
                      Who&apos;s On
                    </Typography>
                    <Typography color="text.secondary">
                      {formattedDate} · as of {formattedTime}
                    </Typography>
                  </Box>

                  <ToggleButtonGroup
                    exclusive
                    value={view}
                    onChange={(_, nextView) => {
                      if (nextView) setView(nextView);
                    }}
                    size="small"
                  >
                    <ToggleButton value="calls">Calls Only</ToggleButton>
                    <ToggleButton value="all">All Services</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button variant="outlined" startIcon={<ArrowBackIcon />}>
                    Previous Day
                  </Button>

                  <Button variant="contained">Today</Button>

                  <Button variant="outlined" startIcon={<CalendarMonthIcon />}>
                    Pick Date
                  </Button>

                  <Button variant="outlined" startIcon={<CalendarMonthIcon />}>
                    Calendar
                  </Button>

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
                {view === "calls" ? "Call Schedule" : "All Services"}
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
                    {rows.map((row) => (
                      <TableRow
                        key={`${row.service}-${row.name}-${row.contact}`}
                        hover
                      >
                        <TableCell>{row.service}</TableCell>
                        <TableCell>{row.shift || "—"}</TableCell>
                        <TableCell>
                          <Typography fontWeight={600}>{row.name}</Typography>
                          {row.note && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              {row.note}
                            </Typography>
                          )}
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
                          <Button
                            size="small"
                            variant={row.messageReady ? "outlined" : "text"}
                            disabled={!row.messageReady}
                          >
                            {row.messageReady ? "Secure Message" : "Not Ready"}
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
  );
}