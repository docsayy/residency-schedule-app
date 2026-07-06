import { useMemo, useState } from "react";
import {
  Box,
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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { blockDates, blockScheduleRows } from "../data/sampleBlockSchedule";

type LevelFilter = "PGY-1" | "PGY-2" | "PGY-3" | "All";

export default function BlockSchedule() {
  const [level, setLevel] = useState<LevelFilter>("PGY-1");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return blockScheduleRows.filter((row) => {
      const matchesLevel = level === "All" || row.level === level;
      const matchesSearch = row.name.toLowerCase().includes(search.toLowerCase());
      return matchesLevel && matchesSearch;
    });
  }, [level, search]);

  return (
    <Box sx={{ bgcolor: "#f5f7fb", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="xl">
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h4" fontWeight={800}>
                    Block Schedule
                  </Typography>
                  <Typography color="text.secondary">
                    PGY Block Schedule, 2025–2026
                  </Typography>
                </Box>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <ToggleButtonGroup
                    exclusive
                    value={level}
                    onChange={(_, nextLevel) => {
                      if (nextLevel) setLevel(nextLevel);
                    }}
                    size="small"
                  >
                    <ToggleButton value="PGY-1">PGY-1</ToggleButton>
                    <ToggleButton value="PGY-2">PGY-2</ToggleButton>
                    <ToggleButton value="PGY-3">PGY-3</ToggleButton>
                    <ToggleButton value="All">All</ToggleButton>
                  </ToggleButtonGroup>

                  <TextField
                    size="small"
                    label="Search resident"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Resident</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Level</strong>
                      </TableCell>
                      {blockDates.map((date) => (
                        <TableCell key={date}>
                          <strong>{date}</strong>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.name} hover>
                        <TableCell>
                          <Typography fontWeight={700}>{row.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={row.level} size="small" />
                        </TableCell>
                        {row.rotations.map((rotation, index) => (
                          <TableCell key={`${row.name}-${index}`}>
                            {rotation || "—"}
                          </TableCell>
                        ))}
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