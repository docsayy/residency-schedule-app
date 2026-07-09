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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function shortDate(date: string) {
  const parsed = parseLocalDate(date);
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function getCurrentBlockRotation(
  date: string,
  residentId: string,
  blockAssignments: any[],
  blocks: any[]
) {
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

  const blockSummary = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const row of blockRows) {
      if (row.rotation === "Unassigned") continue;
      counts[row.rotation] = (counts[row.rotation] || 0) + 1;
    }

    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [blockRows]);

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
    <Box sx={{ width: "100%", maxWidth: "none", minWidth: 0 }}>
      <Box className="no-print" sx={{ mb: { xs: 1, md: 2 } }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 1 }}>
          Back
        </Button>

        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      </Box>

      <Card sx={{ borderRadius: { xs: 2, md: 3 }, mb: { xs: 1, md: 2 } }} className="print-header">
        <CardContent sx={{ p: { xs: 1.25, md: 2 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            spacing={1}
          >
            <Box>
              <Typography
                variant="h4"
                fontWeight={900}
                sx={{ fontSize: { xs: 24, md: 34 }, lineHeight: 1.1 }}
              >
                {resident.displayName}
              </Typography>
              <Typography color="text.secondary" fontWeight={700} fontSize={{ xs: 13, md: 14 }}>
                {resident.pgy} Resident
              </Typography>
              <Typography color="text.secondary" fontSize={13}>
                {tab === "calendar"
                  ? `${getMonthName(monthId)} Monthly Schedule`
                  : "Academic Block Schedule"}
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap className="no-print">
              <Button
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                size="small"
                sx={{ textTransform: "none", fontWeight: 800 }}
              >
                Print/PDF
              </Button>

              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={tab === "calendar" ? exportCalendarCsv : exportBlocksCsv}
                size="small"
                sx={{ textTransform: "none", fontWeight: 800 }}
              >
                CSV
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: { xs: 1, md: 2 }, borderRadius: 2 }} className="no-print">
        <CardContent sx={{ p: { xs: 0.5, md: 1 } }}>
          <Tabs
            value={tab}
            onChange={(_, value: ProfileTab) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 38,
              "& .MuiTab-root": {
                minHeight: 38,
                py: 0.75,
                px: { xs: 1.25, md: 2 },
                fontSize: { xs: 12, md: 13 },
                fontWeight: 850,
              },
            }}
          >
            <Tab label="Monthly Calendar" value="calendar" />
            <Tab label="Academic Blocks" value="blocks" />
          </Tabs>
        </CardContent>
      </Card>

      {tab === "calendar" ? (
        <Card sx={{ borderRadius: { xs: 2, md: 3 } }}>
          <CardContent sx={{ p: { xs: 0.75, md: 1.25 } }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{ mb: 1 }}
              className="no-print"
            >
              <Button
                variant="outlined"
                onClick={() => setMonthId(addMonths(monthId, -1))}
                sx={{ minWidth: 42, px: { xs: 0.75, md: 1.5 } }}
              >
                <ChevronLeftIcon />
              </Button>

              <Box
                sx={{
                  height: 38,
                  px: { xs: 1, md: 2 },
                  flex: 1,
                  minWidth: 0,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  fontWeight: 900,
                  fontSize: { xs: 13, md: 15 },
                  whiteSpace: "nowrap",
                }}
              >
                {getMonthName(monthId)}
              </Box>

              <Button
                variant="outlined"
                onClick={() => setMonthId(addMonths(monthId, 1))}
                sx={{ minWidth: 42, px: { xs: 0.75, md: 1.5 } }}
              >
                <ChevronRightIcon />
              </Button>
            </Stack>

            <Box className="print-area" sx={{ overflowX: "auto", width: "100%" }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(7, minmax(62px, 1fr))",
                    sm: "repeat(7, minmax(88px, 1fr))",
                    md: "repeat(7, minmax(110px, 1fr))",
                  },
                  minWidth: { xs: 434, sm: 616, md: 0 },
                  width: { xs: "max-content", md: "100%" },
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
                      p: { xs: 0.45, md: 0.75 },
                      backgroundColor: "#e2e8f0",
                      borderRight: "1px solid",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      textAlign: "center",
                      fontWeight: 900,
                      fontSize: { xs: 10.5, md: 12 },
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
                        minHeight: { xs: 62, sm: 74, md: 86 },
                        p: { xs: 0.4, md: 0.55 },
                        borderRight: "1px solid",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        backgroundColor: dimmed ? "#f8fafc" : "white",
                        opacity: dimmed ? 0.5 : 1,
                        overflow: "hidden",
                      }}
                    >
                      <Typography fontWeight={900} fontSize={{ xs: 10.5, md: 12 }} sx={{ mb: 0.25 }}>
                        {parseLocalDate(date).getDate()}
                      </Typography>

                      {rotation && (
                        <Box
                          sx={{
                            px: 0.4,
                            py: 0.15,
                            mb: 0.25,
                            borderRadius: 0.75,
                            color: rotationStyle?.color,
                            backgroundColor: rotationStyle?.bg,
                            border: "1px solid",
                            borderColor: rotationStyle?.border,
                            fontSize: { xs: 9.5, md: 10.5 },
                            fontWeight: 850,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {rotation}
                        </Box>
                      )}

                      <Stack spacing={0.25}>
                        {calls.slice(0, 2).map((call) => {
                          const style = rotationColor(call.serviceName);

                          return (
                            <Box
                              key={`${call.date}-${call.serviceId}`}
                              sx={{
                                px: 0.4,
                                py: 0.1,
                                borderRadius: 0.75,
                                backgroundColor: style.bg,
                                border: "1px solid",
                                borderColor: style.border,
                                color: style.color,
                                fontSize: { xs: 9, md: 10 },
                                fontWeight: 900,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {call.serviceName}
                            </Box>
                          );
                        })}

                        {calls.length > 2 && (
                          <Typography fontSize={9.5} color="text.secondary">
                            +{calls.length - 2} more
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius: { xs: 2, md: 3 } }}>
          <CardContent sx={{ p: { xs: 0.75, md: 1.25 } }}>
            <Box className="print-area">
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    sm: "repeat(3, minmax(0, 1fr))",
                    md: "repeat(4, minmax(0, 1fr))",
                    lg: "repeat(6, minmax(0, 1fr))",
                  },
                  gap: { xs: 0.75, md: 1 },
                }}
              >
                {blockRows.map((row) => {
                  const style = rotationColor(row.rotation);

                  return (
                    <Box
                      key={`${row.block}-${row.startDate}`}
                      sx={{
                        minHeight: { xs: 86, md: 96 },
                        p: { xs: 0.75, md: 1 },
                        borderRadius: 2,
                        backgroundColor: style.bg,
                        border: "1px solid",
                        borderColor: style.border,
                        overflow: "hidden",
                      }}
                    >
                      <Typography fontSize={{ xs: 12, md: 13 }} fontWeight={950} sx={{ color: style.color }}>
                        {row.block.replace("Block ", "B")}
                      </Typography>

                      <Typography fontSize={{ xs: 10.5, md: 11.5 }} color="text.secondary" sx={{ mb: 0.4 }}>
                        {shortDate(row.startDate)} to {shortDate(row.endDate)}
                      </Typography>

                      <Typography
                        fontSize={{ xs: 12, md: 13 }}
                        fontWeight={900}
                        sx={{
                          color: style.color,
                          lineHeight: 1.15,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {row.rotation}
                      </Typography>

                      {row.notes && (
                        <Typography
                          fontSize={10.5}
                          color="text.secondary"
                          sx={{
                            mt: 0.35,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.notes}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography fontWeight={900} fontSize={{ xs: 14, md: 16 }} sx={{ mb: 1 }}>
                  Block Summary
                </Typography>

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {blockSummary.length > 0 ? (
                    blockSummary.map(([rotation, count]) => {
                      const style = rotationColor(rotation);

                      return (
                        <Chip
                          key={rotation}
                          label={`${rotation}: ${count}`}
                          size="small"
                          sx={{
                            height: 23,
                            fontSize: 11,
                            fontWeight: 850,
                            color: style.color,
                            backgroundColor: style.bg,
                            border: "1px solid",
                            borderColor: style.border,
                          }}
                        />
                      );
                    })
                  ) : (
                    <Typography color="text.secondary" fontSize={13}>
                      No assigned blocks yet.
                    </Typography>
                  )}
                </Stack>
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