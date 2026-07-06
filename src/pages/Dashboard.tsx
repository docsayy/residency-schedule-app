import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
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
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("All");

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

  const services = useMemo(() => {
    const visibleRows = coverageRows.filter((row) => row.view.includes(view));
    return ["All", ...Array.from(new Set(visibleRows.map((row) => row.service)))];
  }, [view]);

  const rows = useMemo(() => {
    return coverageRows.filter((row) => {
      const matchesView = row.view.includes(view);
      const matchesService =
        serviceFilter === "All" || row.service === serviceFilter;
      const searchText = `${row.service} ${row.shift} ${row.name} ${row.training} ${row.contact} ${row.note ?? ""}`.toLowerCase();
      const matchesSearch = searchText.includes(search.toLowerCase());

      return matchesView && matchesService && matchesSearch;
    });
  }, [view, serviceFilter, search]);

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
                      if (nextView) {
                        setView(nextView);
                        setServiceFilter("All");
                        setSearch("");
                      }
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

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    size="small"
                    label="Search name, service, pager"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    sx={{ minWidth: 280 }}
                  />

                  <TextField
                    select
                    size="small"
                    label="Service"
                    value={serviceFilter}
                    onChange={(event) => setServiceFilter(event.target.value)}
                    sx={{ minWidth: 220 }}
                  >
                    {services.map((service) => (
                      <MenuItem key={service} value={service}>
                        {service}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
                spacing={1}
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" fontWeight={700}>
                  {view === "calls" ? "Call Schedule" : "All Services"}
                </Typography>

                <Typography color="text.secondary">
                  Showing {rows.length} assignment{rows.length === 1 ? "" : "s"}
                </Typography>
              </Stack>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Service</strong></TableCell>
                      <TableCell><strong>Shift</strong></TableCell>
                      <TableCell><strong>Name</strong></TableCell>
                      <TableCell><strong>Training</strong></TableCell>
                      <TableCell><strong>Contact</strong></TableCell>
                      <TableCell><strong>Message</strong></TableCell>
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

                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography color="text.secondary" sx={{ py: 3 }}>
                            No matching assignments found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
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