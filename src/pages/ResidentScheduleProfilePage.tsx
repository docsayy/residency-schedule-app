import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";

import { useAcademicBlocks } from "../hooks/useAcademicBlocks";
import { useBlockAssignments } from "../hooks/useBlockAssignments";
import { useMonthlySchedule } from "../hooks/useMonthlySchedule";
import { useResidents } from "../hooks/useResidents";
import type { MonthlyScheduleCell } from "../types/monthSchedule";
import type { RequiredTraining, ScheduleService } from "../types/schedule";
import {
  EXACT_NF_SERVICE_IDS,
  getAutoNightFloatCell,
  parseLocalDate,
} from "../utils/nightFloatSchedule";

type ProfileTab = "calendar" | "blocks";

const residentCallServices: ScheduleService[] = [
  makeService("tele-pgy1", "Tele PGY1", "Day", 1, ["PGY-1"], "07:00", "19:00"),
  makeService("2n-ccu-pgy1", "2N-CCU PGY1", "Day", 2, ["PGY-1"], "07:00", "19:00"),
  makeService("2n-ccu-pgy2", "2N-CCU PGY2", "Day", 3, ["PGY-2"], "07:00", "19:00"),
  makeService("3w-pgy1", "3W PGY1", "Day", 4, ["PGY-1"], "07:00", "19:00"),
  makeService("4n-pgy1", "4N PGY1", "Day", 5, ["PGY-1"], "07:00", "19:00"),
  makeService("4n-3w-pgy2", "4N-3W PGY2", "Day", 6, ["PGY-2"], "07:00", "19:00"),
  makeService("micu-pgy1", "MICU PGY1", "ICU", 7, ["PGY-1"], "07:00", "07:00"),
  makeService("micu-senior", "MICU Senior", "ICU", 8, ["PGY-2", "PGY-3"], "08:00", "08:00"),
  makeService("chief-on-call", "Chief On Call", "Chief", 9, ["PGY-3"], "07:00", "19:00"),

  makeService(EXACT_NF_SERVICE_IDS.pgy1FourNorthThreeWest, "4N-3W PGY1 NF", "Night", 10, ["PGY-1"], "19:00", "07:00"),
  makeService(EXACT_NF_SERVICE_IDS.pgy2FourNorthThreeWest, "4N-3W PGY2 NF", "Night", 11, ["PGY-2"], "19:00", "07:00"),
  makeService(EXACT_NF_SERVICE_IDS.pgy1TwoNorthCcu, "2N-CCU PGY1 NF", "Night", 12, ["PGY-1"], "19:00", "07:00"),
  makeService(EXACT_NF_SERVICE_IDS.pgy2TwoNorthCcu, "2N-CCU PGY2 NF", "Night", 13, ["PGY-2"], "19:00", "07:00"),
  makeService(EXACT_NF_SERVICE_IDS.pgy3, "PGY3 NF", "Night", 14, ["PGY-3"], "19:00", "07:00"),
];

function makeService(
  id: string,
  name: string,
  category: string,
  order: number,
  requiredTraining: RequiredTraining[],
  start: string,
  end: string
): ScheduleService {
  return {
    id,
    name,
    shortName: name,
    category,
    coverageGroup: "Resident",
    attendingScheduleType: "None",
    requiredTraining,
    defaultStartTime: start,
    defaultEndTime: end,
    displayOrderCall: order,
    displayOrderAll: order,
    visibleOnCall: true,
    visibleOnAllServices: true,
    active: true,
  };
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthId(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthName(monthId: string) {
  const [year, month] = monthId.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getCalendarDays(monthId: string) {
  const [year, month] = monthId.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toDateInputValue(date);
  });
}

function addMonths(monthId: string, months: number) {
  const [year, month] = monthId.split("-").map(Number);
  const date = new Date(year, month - 1 + months, 1);
  return getMonthId(date);
}

function isSameMonth(date: string, monthId: string) {
  return date.slice(0, 7) === monthId;
}

function getCurrentBlockRotation(date: string, residentId: string, blockAssignments: any[], blocks: any[]) {
  const block = blocks.find((item) => date >= item.startDate && date <= item.endDate);
  if (!block) return "";

  const assignment = blockAssignments.find(
    (item) => item.blockId === block.id && item.residentId === residentId
  );

  return assignment?.rotationName || "";
}

function rotationColor(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes("vacation")) return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
  if (lower.includes("nf") || lower.includes("night")) return { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" };
  if (lower.includes("micu")) return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
  if (lower.includes("elective")) return { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" };
  if (lower.includes("jeopardy")) return { bg: "#fefce8", color: "#a16207", border: "#fde68a" };
  if (lower.includes("call") || lower.includes("chief")) return { bg: "#fff1f2", color: "#be123c", border: "#fecdd3" };

  return { bg: "#ecfdf5", color: "#15803d", border: "#bbf7d0" };
}

function downloadCsv(filename: string, rows: Record<string, string>[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map((h) => `"${h}"`).join(","),
    ...rows.map((row) =>
      headers
        .map((header) => `"${String(row[header] || "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

export default function ResidentScheduleProfilePage({
  residentId,
  onBack,
}: {
  residentId: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<ProfileTab>("calendar");
  const [monthId, setMonthId] = useState(getMonthId(new Date()));

  const { residents, loading: residentsLoading, error: residentsError } = useResidents();
  const { blocks, loading: blocksLoading, error: blocksError } = useAcademicBlocks();
  const {
    assignments: blockAssignments,
    loading: blockAssignmentsLoading,
    error: blockAssignmentsError,
  } = useBlockAssignments();

  const {
    schedule,
    loading: scheduleLoading,
    error: scheduleError,
  } = useMonthlySchedule(monthId);

  const resident = residents.find((item) => item.id === residentId);
  const days = useMemo(() => getCalendarDays(monthId), [monthId]);

  const monthlyAssignments = schedule?.assignments || {};

  const residentCallCells = useMemo(() => {
    if (!resident) return [];

    const manualCells = Object.values(monthlyAssignments).filter(
      (cell) => cell.residentId === resident.id
    );

    const autoCells = days
      .flatMap((date) =>
        residentCallServices.map((service) =>
          getAutoNightFloatCell({
            date,
            service,
            blocks,
            blockAssignments,
            residents,
          })
        )
      )
      .filter(Boolean) as MonthlyScheduleCell[];

    const combined = [...manualCells];

    for (const autoCell of autoCells) {
      if (autoCell.residentId !== resident.id) continue;

      const alreadyManual = combined.some(
        (cell) => cell.date === autoCell.date && cell.serviceId === autoCell.serviceId
      );

      if (!alreadyManual) combined.push(autoCell);
    }

    return combined;
  }, [blockAssignments, blocks, days, monthlyAssignments, resident, residents]);

  const blockRows = useMemo(() => {
    if (!resident) return [];

    return blocks
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((block) => {
        const assignment = blockAssignments.find(
          (item) => item.blockId === block.id && item.residentId === resident.id
        );

        return {
          block: block.name,
          startDate: block.startDate,
          endDate: block.endDate,
          rotation: assignment?.rotationName || "Unassigned",
          notes: assignment?.notes || "",
        };
      });
  }, [blockAssignments, blocks, resident]);

  const loading =
    residentsLoading || blocksLoading || blockAssignmentsLoading || scheduleLoading;

  const error = residentsError || blocksError || blockAssignmentsError || scheduleError;

  function getCallsForDate(date: string) {
    return residentCallCells.filter((cell) => cell.date === date);
  }

  function handlePrint() {
    window.print();
  }

  function exportCalendarCsv() {
    if (!resident) return;

    const rows = days
      .filter((date) => isSameMonth(date, monthId))
      .map((date) => {
        const rotation = getCurrentBlockRotation(date, resident.id, blockAssignments, blocks);
        const calls = getCallsForDate(date).map((cell) => cell.serviceName).join("; ");

        return {
          Date: date,
          Rotation: rotation,
          Calls: calls,
        };
      });

    downloadCsv(`${resident.displayName}-${monthId}-calendar.csv`, rows);
  }

  function exportBlocksCsv() {
    if (!resident) return;
    downloadCsv(`${resident.displayName}-blocks.csv`, blockRows);
  }

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Loading resident profile...
        </Typography>
      </Stack>
    );
  }

  if (!resident) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2 }}>
          Back
        </Button>
        <Alert severity="error">Resident not found.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box className="no-print" sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 1 }}>
          Back to Residents
        </Button>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      </Box>

      <Card sx={{ borderRadius: 3, mb: 2 }} className="print-header">
        <CardContent sx={{ p: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            spacing={1.5}
          >
            <Box>
              <Typography variant="h4" fontWeight={900}>
                {resident.displayName}
              </Typography>
              <Typography color="text.secondary" fontWeight={700}>
                {resident.pgy} Resident
              </Typography>
              <Typography color="text.secondary" fontSize={13}>
                {tab === "calendar"
                  ? `${getMonthName(monthId)} Monthly Schedule`
                  : "Academic Block Schedule"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap className="no-print">
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                sx={{ textTransform: "none", fontWeight: 800 }}
              >
                Print / PDF
              </Button>

              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={tab === "calendar" ? exportCalendarCsv : exportBlocksCsv}
                sx={{ textTransform: "none", fontWeight: 800 }}
              >
                Export CSV
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, borderRadius: 2 }} className="no-print">
        <CardContent sx={{ p: 1 }}>
          <Tabs
            value={tab}
            onChange={(_, value: ProfileTab) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Monthly Calendar" value="calendar" />
            <Tab label="Academic Blocks" value="blocks" />
          </Tabs>
        </CardContent>
      </Card>

      {tab === "calendar" ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 1.25 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 1 }}
              className="no-print"
            >
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => setMonthId(addMonths(monthId, -1))}>
                  <ChevronLeftIcon />
                </Button>

                <Box
                  sx={{
                    minWidth: 190,
                    height: 40,
                    display: "grid",
                    placeItems: "center",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    backgroundColor: "#f8fafc",
                    fontWeight: 900,
                  }}
                >
                  {getMonthName(monthId)}
                </Box>

                <Button variant="outlined" onClick={() => setMonthId(addMonths(monthId, 1))}>
                  <ChevronRightIcon />
                </Button>
              </Stack>
            </Stack>

            <Box className="print-area">
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(120px, 1fr))",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <Box
                    key={day}
                    sx={{
                      p: 0.75,
                      backgroundColor: "#e2e8f0",
                      borderRight: "1px solid",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      textAlign: "center",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    {day}
                  </Box>
                ))}

                {days.map((date) => {
                  const rotation = getCurrentBlockRotation(
                    date,
                    resident.id,
                    blockAssignments,
                    blocks
                  );

                  const calls = getCallsForDate(date);
                  const dimmed = !isSameMonth(date, monthId);
                  const rotationStyle = rotation ? rotationColor(rotation) : undefined;

                  return (
                    <Box
                      key={date}
                      sx={{
                        minHeight: 112,
                        p: 0.7,
                        borderRight: "1px solid",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        backgroundColor: dimmed ? "#f8fafc" : "white",
                        opacity: dimmed ? 0.55 : 1,
                      }}
                    >
                      <Typography fontWeight={900} fontSize={12} sx={{ mb: 0.5 }}>
                        {parseLocalDate(date).getDate()}
                      </Typography>

                      {rotation && (
                        <Chip
                          label={rotation}
                          size="small"
                          sx={{
                            height: 20,
                            maxWidth: "100%",
                            fontSize: 10.5,
                            fontWeight: 850,
                            color: rotationStyle?.color,
                            backgroundColor: rotationStyle?.bg,
                            border: "1px solid",
                            borderColor: rotationStyle?.border,
                            mb: 0.4,
                          }}
                        />
                      )}

                      <Stack spacing={0.35}>
                        {calls.map((call) => {
                          const style = rotationColor(call.serviceName);

                          return (
                            <Box
                              key={`${call.date}-${call.serviceId}`}
                              sx={{
                                px: 0.5,
                                py: 0.25,
                                borderRadius: 1,
                                backgroundColor: style.bg,
                                border: "1px solid",
                                borderColor: style.border,
                                color: style.color,
                                fontSize: 10.5,
                                fontWeight: 900,
                              }}
                            >
                              {call.serviceName}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 1.25 }}>
            <Box className="print-area" sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 820 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "120px 130px 130px minmax(200px, 1fr) minmax(160px, 1fr)",
                    backgroundColor: "#e2e8f0",
                    borderRadius: "8px 8px 0 0",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {["Block", "Start", "End", "Rotation", "Notes"].map((header) => (
                    <Typography
                      key={header}
                      fontSize={12}
                      fontWeight={900}
                      sx={{ p: 0.9, borderRight: "1px solid", borderColor: "divider" }}
                    >
                      {header}
                    </Typography>
                  ))}
                </Box>

                {blockRows.map((row, index) => {
                  const style = rotationColor(row.rotation);

                  return (
                    <Box
                      key={`${row.block}-${row.startDate}`}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "120px 130px 130px minmax(200px, 1fr) minmax(160px, 1fr)",
                        borderLeft: "1px solid",
                        borderRight: "1px solid",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        backgroundColor: index % 2 === 0 ? "white" : "#f8fafc",
                      }}
                    >
                      <Typography fontSize={12.5} fontWeight={800} sx={{ p: 0.9 }}>
                        {row.block}
                      </Typography>
                      <Typography fontSize={12.5} sx={{ p: 0.9 }}>
                        {row.startDate}
                      </Typography>
                      <Typography fontSize={12.5} sx={{ p: 0.9 }}>
                        {row.endDate}
                      </Typography>
                      <Box sx={{ p: 0.75 }}>
                        <Chip
                          label={row.rotation}
                          size="small"
                          sx={{
                            fontWeight: 850,
                            color: style.color,
                            backgroundColor: style.bg,
                            border: "1px solid",
                            borderColor: style.border,
                          }}
                        />
                      </Box>
                      <Typography fontSize={12.5} color="text.secondary" sx={{ p: 0.9 }}>
                        {row.notes || "—"}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            .no-print {
              display: none !important;
            }

            .MuiAppBar-root,
            .MuiDrawer-root {
              display: none !important;
            }

            main {
              padding: 0 !important;
              background: white !important;
            }

            .print-header {
              box-shadow: none !important;
              border: none !important;
            }

            .print-area {
              overflow: visible !important;
            }
          }
        `}
      </style>
    </Box>
  );
}