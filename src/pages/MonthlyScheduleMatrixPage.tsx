import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";

import { useAuth } from "../context/AuthContext";
import { useAcademicBlocks } from "../hooks/useAcademicBlocks";
import { useBlockAssignments } from "../hooks/useBlockAssignments";
import { useMonthlySchedule } from "../hooks/useMonthlySchedule";
import { useResidents } from "../hooks/useResidents";
import type {
  RequiredTraining,
  ScheduleService,
  ShiftType,
} from "../types/schedule";
import type { MonthlySchedule, MonthlyScheduleCell } from "../types/monthSchedule";
import { canBuildSchedule } from "../utils/permissions";
import {
  EXACT_NF_SERVICE_IDS,
  dayOfWeek,
  getAutoNightFloatCell,
  isNightFloatService,
  parseLocalDate,
  residentTraining,
} from "../utils/nightFloatSchedule";
import {
  detectDailyScheduleIssues,
  issueSeverityStyle,
  type ScheduleIssue,
} from "../utils/schedulingIntelligence";

type SchedulePerson = {
  id: string;
  displayName: string;
  training: RequiredTraining;
  pager: string;
};

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

function getMonthIdFromDate(date: string) {
  return date.slice(0, 7);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWednesdayStart(date: Date) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day >= 3 ? 3 - day : -4 - day;
  current.setDate(current.getDate() + diff);
  return current;
}

function getWeekDays(weekStartDate: string) {
  const start = parseLocalDate(weekStartDate);
  return Array.from({ length: 14 }, (_, index) =>
    toDateInputValue(addDays(start, index))
  );
}

function formatWeekRange(days: string[]) {
  if (days.length === 0) return "";
  const first = parseLocalDate(days[0]);
  const last = parseLocalDate(days[days.length - 1]);

  return `${first.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${last.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function isWeekend(date: string) {
  const day = dayOfWeek(date);
  return day === 0 || day === 6;
}

function formatDay(date: string) {
  const localDate = parseLocalDate(date);
  const weekday = localDate.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday} ${localDate.getDate()}`;
}

function serviceIcon(service: string) {
  const lower = service.toLowerCase();
  if (lower.includes("chief") || lower.includes("pgy3 nf")) return "👑";
  if (lower.includes("nf")) return "🌙";
  if (lower.includes("micu")) return "🫁";
  if (lower.includes("ccu")) return "🫀";
  if (lower.includes("tele")) return "🖥️";
  if (lower.includes("4n")) return "🏥";
  if (lower.includes("3w")) return "🛏️";
  return "🏥";
}

export default function MonthlyScheduleMatrixPage({
  onOpenResidentProfile,
}: {
  onOpenResidentProfile?: (residentId: string) => void;
}) {
  const { profile } = useAuth();
  const allowBuild = canBuildSchedule(profile?.role);

  const [weekStartDate, setWeekStartDate] = useState(
    toDateInputValue(getWednesdayStart(new Date()))
  );

  const monthId = getMonthIdFromDate(weekStartDate);

  const [editingCell, setEditingCell] = useState<{
    date: string;
    service: ScheduleService;
  } | null>(null);

  const { residents } = useResidents();
  const { blocks } = useAcademicBlocks();
  const { assignments: blockAssignments } = useBlockAssignments();

  const {
    schedule,
    loading,
    saving,
    error,
    updateCell,
    removeCell,
    saveSchedule,
  } = useMonthlySchedule(monthId);

  const days = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);
  const monthlyAssignments = schedule?.assignments || {};
  const isPublished = schedule?.status === "published";
  const canViewSchedule = allowBuild || isPublished;

  const scheduleIssues = useMemo(() => {
    return days.flatMap((date) =>
      detectDailyScheduleIssues({
        date,
        services: residentCallServices,
        monthlyAssignments,
        blocks,
        blockAssignments,
        residents,
      })
    );
  }, [blockAssignments, blocks, days, monthlyAssignments, residents]);

  function getManualCell(date: string, service: ScheduleService) {
    return schedule?.assignments[`${date}_${service.id}`];
  }

  function getAutoCell(date: string, service: ScheduleService) {
    return getAutoNightFloatCell({
      date,
      service,
      blocks,
      blockAssignments,
      residents,
    });
  }

  function getCell(date: string, service: ScheduleService) {
    return getManualCell(date, service) || getAutoCell(date, service);
  }

  function isAutoCell(date: string, service: ScheduleService) {
    return !getManualCell(date, service) && Boolean(getAutoCell(date, service));
  }

  function getIssuesForCell(date: string, service: ScheduleService) {
    return scheduleIssues.filter(
      (issue) => issue.date === date && issue.serviceId === service.id
    );
  }

  function getEligiblePeople(service: ScheduleService): SchedulePerson[] {
    const required = service.requiredTraining || [];

    return residents
      .filter((resident) => {
        if (!resident.active) return false;
        const training = residentTraining(resident);
        if (required.length === 0) return true;
        return required.includes(training);
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map((resident) => ({
        id: resident.id,
        displayName: resident.displayName,
        training: residentTraining(resident),
        pager: resident.pager,
      }));
  }

  async function handleSaveCell(data: {
    date: string;
    service: ScheduleService;
    personId: string;
    notes: string;
  }) {
    if (!allowBuild) return;

    const eligiblePeople = getEligiblePeople(data.service);
    const person = eligiblePeople.find((item) => item.id === data.personId);

    if (!person) return;

    const cell: MonthlyScheduleCell = {
      date: data.date,
      serviceId: data.service.id,
      serviceName: data.service.name,
      residentId: person.id,
      residentName: person.displayName,
      training: person.training,
      pager: person.pager,
      shiftType: data.service.category as ShiftType,
      startTime: data.service.defaultStartTime,
      endTime: data.service.defaultEndTime,
      notes: data.notes,
    };

    await updateCell(cell);
    setEditingCell(null);
  }

  async function handleRemoveCell(date: string, serviceId: string) {
    if (!allowBuild) return;
    await removeCell(date, serviceId);
  }

  async function handlePublish(status: MonthlySchedule["status"]) {
    if (!allowBuild || !schedule) return;
    await saveSchedule({
      ...schedule,
      status,
    });
  }

  function goPreviousWeek() {
    setWeekStartDate((current) =>
      toDateInputValue(addDays(parseLocalDate(current), -14))
    );
  }

  function goNextWeek() {
    setWeekStartDate((current) =>
      toDateInputValue(addDays(parseLocalDate(current), 14))
    );
  }

  function goToday() {
    setWeekStartDate(toDateInputValue(getWednesdayStart(new Date())));
  }

  return (
    <Box sx={{ width: "100%", maxWidth: "none", minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 1, md: 1.5 }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: { xs: 1, md: 2 } }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={850}
            sx={{ lineHeight: 1, fontSize: { xs: 25, md: 34 } }}
          >
            Daily Call Schedule
          </Typography>
          <Typography
            color="text.secondary"
            fontSize={14}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            Two-week resident call schedule. Drafts are hidden from regular residents until published.
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: { xs: "100%", md: "auto" } }}>
          <Button
            variant="outlined"
            onClick={goPreviousWeek}
            sx={{ minWidth: { xs: 42, md: 48 }, px: { xs: 0.75, md: 1.5 } }}
          >
            <ChevronLeftIcon />
          </Button>

          <Box
            sx={{
              height: 38,
              px: { xs: 1, md: 2 },
              borderRadius: 2,
              fontWeight: 850,
              display: "grid",
              placeItems: "center",
              backgroundColor: "#f8fafc",
              border: "1px solid",
              borderColor: "divider",
              fontSize: { xs: 12, md: 14 },
              flex: { xs: 1, md: "unset" },
              minWidth: 0,
              whiteSpace: "nowrap",
            }}
          >
            {formatWeekRange(days)}
          </Box>

          <Button
            variant="outlined"
            onClick={goNextWeek}
            sx={{ minWidth: { xs: 42, md: 48 }, px: { xs: 0.75, md: 1.5 } }}
          >
            <ChevronRightIcon />
          </Button>

          <Button
            variant="outlined"
            startIcon={<TodayIcon />}
            onClick={goToday}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              minWidth: { xs: 42, md: 92 },
              px: { xs: 1, md: 1.5 },
              "& .MuiButton-startIcon": {
                mr: { xs: 0, md: 0.75 },
              },
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
              Current
            </Box>
          </Button>

          {allowBuild && (
            <Button
              variant={isPublished ? "outlined" : "contained"}
              color={isPublished ? "warning" : "primary"}
              onClick={() => handlePublish(isPublished ? "draft" : "published")}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                textTransform: "none",
                fontWeight: 850,
              }}
            >
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
          )}
        </Stack>

        {allowBuild && (
          <Button
            variant={isPublished ? "outlined" : "contained"}
            color={isPublished ? "warning" : "primary"}
            onClick={() => handlePublish(isPublished ? "draft" : "published")}
            sx={{
              display: { xs: "inline-flex", sm: "none" },
              textTransform: "none",
              fontWeight: 850,
            }}
          >
            {isPublished ? "Unpublish Month" : "Publish Month"}
          </Button>
        )}
      </Stack>

      {!allowBuild && !isPublished && (
        <Alert severity="warning" sx={compactAlertSx}>
          Schedule is not published yet.
        </Alert>
      )}

      {!allowBuild && isPublished && (
        <Alert severity="info" sx={compactAlertSx}>
          View-only access.
        </Alert>
      )}

      {allowBuild && (
        <Alert severity={isPublished ? "success" : "warning"} sx={compactAlertSx}>
          Month status: <b>{isPublished ? "Published" : "Draft"}</b>.
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            {" "}Regular residents can only see published schedules.
          </Box>
        </Alert>
      )}

      {error && <Alert severity="error" sx={compactAlertSx}>{error}</Alert>}

      {canViewSchedule && allowBuild && <ScheduleIssuesPanel issues={scheduleIssues} />}

      <Card
        sx={{
          borderRadius: { xs: 2, md: 3 },
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          width: "100%",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: { xs: 0.75, md: 1.25 } }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 5 }}>
              <CircularProgress />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Loading daily call schedule...
              </Typography>
            </Stack>
          ) : !canViewSchedule ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              Schedule is not published yet.
            </Typography>
          ) : (
            <Box
              sx={{
                overflow: "auto",
                maxHeight: { xs: "calc(100vh - 210px)", md: "calc(100vh - 245px)" },
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                width: "100%",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: `minmax(118px, max-content) repeat(${days.length}, minmax(82px, max-content))`,
                    md: `180px repeat(${days.length}, minmax(105px, 1fr))`,
                  },
                  minWidth: {
                    xs: "max-content",
                    md: 180 + days.length * 105,
                  },
                  width: { xs: "max-content", md: "100%" },
                }}
              >
                <Box sx={topLeftCell}>Service</Box>

                {days.map((day) => {
                  const dayIssues = scheduleIssues.filter(
                    (issue) => issue.date === day && issue.severity === "critical"
                  );

                  return (
                    <Box key={day} sx={isWeekend(day) ? weekendHeaderCell : weekdayHeaderCell}>
                      <Typography fontSize={{ xs: 10.5, md: 11.5 }} fontWeight={900} noWrap>
                        {formatDay(day)}
                      </Typography>

                      {allowBuild && dayIssues.length > 0 && (
                        <Box
                          sx={{
                            mt: 0.25,
                            mx: "auto",
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            backgroundColor: "#be123c",
                          }}
                        />
                      )}
                    </Box>
                  );
                })}

                {residentCallServices.map((service) => (
                  <Box key={service.id} sx={{ display: "contents" }}>
                    <Box sx={isNightFloatService(service.id) ? nightServiceCell : serviceCell}>
                      <Stack direction="row" spacing={{ xs: 0.5, md: 0.75 }} alignItems="center" sx={{ minWidth: 0 }}>
                        <Box sx={serviceIconBox}>{serviceIcon(service.name)}</Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={800} fontSize={{ xs: 11.5, md: 12.5 }} noWrap>
                            {service.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            fontSize={{ xs: 9.5, md: 10.5 }}
                            sx={{ display: { xs: "none", sm: "block" } }}
                          >
                            {service.defaultStartTime}-{service.defaultEndTime}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    {days.map((day) => {
                      const cell = getCell(day, service);
                      const autoCell = isAutoCell(day, service);
                      const manualCell = getManualCell(day, service);
                      const weekend = isWeekend(day);
                      const cellIssues = getIssuesForCell(day, service);
                      const hasCriticalIssue = cellIssues.some(
                        (issue) => issue.severity === "critical"
                      );
                      const hasWarningIssue = cellIssues.some(
                        (issue) => issue.severity === "warning"
                      );

                      return (
                        <Box
                          key={`${service.id}-${day}`}
                          sx={{
                            ...matrixCell,
                            backgroundColor:
                              allowBuild && hasCriticalIssue
                                ? "#fff1f2"
                                : allowBuild && hasWarningIssue
                                  ? "#fffbeb"
                                  : autoCell
                                    ? "#f5f3ff"
                                    : weekend
                                      ? "#fff7ed"
                                      : "white",
                            cursor: allowBuild ? "pointer" : "default",
                            boxShadow:
                              allowBuild && hasCriticalIssue
                                ? "inset 0 0 0 2px #fecdd3"
                                : allowBuild && hasWarningIssue
                                  ? "inset 0 0 0 2px #fde68a"
                                  : "none",
                          }}
                          onClick={() => {
                            if (!allowBuild) return;
                            setEditingCell({ date: day, service });
                          }}
                        >
                          {cell ? (
                            <Stack spacing={0.15}>
                              <Button
                                variant="text"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenResidentProfile?.(cell.residentId);
                                }}
                                sx={{
                                  p: 0,
                                  minWidth: 0,
                                  maxWidth: "100%",
                                  textTransform: "none",
                                  justifyContent: "flex-start",
                                  color: "#0f172a",
                                  fontWeight: 850,
                                  fontSize: { xs: 11.5, md: 12 },
                                  lineHeight: 1.1,
                                  textAlign: "left",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  "&:hover": {
                                    backgroundColor: "transparent",
                                    textDecoration: "underline",
                                  },
                                }}
                              >
                                {cell.residentName}
                              </Button>

                              {allowBuild && hasCriticalIssue && (
                                <Chip
                                  label="Issue"
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: 9,
                                    fontWeight: 900,
                                    color: "#be123c",
                                    backgroundColor: "#ffe4e6",
                                    width: "fit-content",
                                  }}
                                />
                              )}

                              {allowBuild && !hasCriticalIssue && hasWarningIssue && (
                                <Chip
                                  label="Warn"
                                  size="small"
                                  sx={{
                                    height: 16,
                                    fontSize: 9,
                                    fontWeight: 900,
                                    color: "#b45309",
                                    backgroundColor: "#fef3c7",
                                    width: "fit-content",
                                  }}
                                />
                              )}

                              {allowBuild && manualCell && (
                                <Button
                                  size="small"
                                  color="error"
                                  sx={{
                                    minWidth: 0,
                                    width: "fit-content",
                                    p: "0 3px",
                                    fontSize: 9.5,
                                    textTransform: "none",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveCell(day, service.id);
                                  }}
                                >
                                  Clear
                                </Button>
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary" fontSize={{ xs: 10, md: 10.5 }}>
                              {allowBuild ? "Assign" : "—"}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {saving && allowBuild && (
            <Typography color="text.secondary" sx={{ mt: 1 }} fontSize={13}>
              Saving...
            </Typography>
          )}
        </CardContent>
      </Card>

      {editingCell && allowBuild && (
        <MatrixCellDialog
          open={Boolean(editingCell)}
          date={editingCell.date}
          service={editingCell.service}
          people={getEligiblePeople(editingCell.service)}
          existingCell={getCell(editingCell.date, editingCell.service)}
          issues={getIssuesForCell(editingCell.date, editingCell.service)}
          isAutoOnly={!getManualCell(editingCell.date, editingCell.service) && Boolean(getAutoCell(editingCell.date, editingCell.service))}
          onCancel={() => setEditingCell(null)}
          onSave={handleSaveCell}
        />
      )}
    </Box>
  );
}

const compactAlertSx = {
  mb: { xs: 1, md: 2 },
  borderRadius: 2,
  py: { xs: 0.25, md: 0.75 },
  px: { xs: 1, md: 2 },
  "& .MuiAlert-icon": {
    fontSize: { xs: 20, md: 24 },
    mr: { xs: 1, md: 1.5 },
  },
  "& .MuiAlert-message": {
    fontSize: { xs: 13, md: 14 },
    py: { xs: 0.35, md: 0.5 },
  },
};

function ScheduleIssuesPanel({ issues }: { issues: ScheduleIssue[] }) {
  const critical = issues.filter((issue) => issue.severity === "critical");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const info = issues.filter((issue) => issue.severity === "info");

  if (issues.length === 0) {
    return (
      <Alert severity="success" sx={compactAlertSx}>
        No schedule conflicts detected.
      </Alert>
    );
  }

  return (
    <Card sx={{ mb: { xs: 1, md: 2 }, borderRadius: 2 }}>
      <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography fontWeight={900} fontSize={{ xs: 13.5, md: 15 }}>
              Schedule Warnings
            </Typography>
            <Typography color="text.secondary" fontSize={12}>
              Conflicts are warnings only.
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <IssueCountChip label="Critical" count={critical.length} severity="critical" />
            <IssueCountChip label="Warning" count={warnings.length} severity="warning" />
            <IssueCountChip label="Info" count={info.length} severity="info" />
          </Stack>
        </Stack>

        <Stack spacing={0.5}>
          {issues.slice(0, 3).map((issue) => {
            const style = issueSeverityStyle(issue.severity);

            return (
              <Box
                key={issue.id}
                sx={{
                  p: 0.65,
                  borderRadius: 1.5,
                  backgroundColor: style.bg,
                  border: "1px solid",
                  borderColor: style.border,
                }}
              >
                <Typography fontSize={12} fontWeight={900} sx={{ color: style.color }}>
                  {issue.title}
                </Typography>
                <Typography fontSize={11.5} color="text.secondary">
                  {issue.message}
                </Typography>
              </Box>
            );
          })}

          {issues.length > 3 && (
            <Typography fontSize={11.5} color="text.secondary">
              + {issues.length - 3} more issue{issues.length - 3 === 1 ? "" : "s"}.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function IssueCountChip({
  label,
  count,
  severity,
}: {
  label: string;
  count: number;
  severity: "critical" | "warning" | "info";
}) {
  const style = issueSeverityStyle(severity);

  return (
    <Chip
      label={`${label}: ${count}`}
      size="small"
      sx={{
        height: 21,
        fontSize: 10.5,
        fontWeight: 900,
        color: style.color,
        backgroundColor: style.bg,
        border: "1px solid",
        borderColor: style.border,
      }}
    />
  );
}

function MatrixCellDialog({
  open,
  date,
  service,
  people,
  existingCell,
  issues,
  isAutoOnly,
  onCancel,
  onSave,
}: {
  open: boolean;
  date: string;
  service: ScheduleService;
  people: SchedulePerson[];
  existingCell?: MonthlyScheduleCell;
  issues: ScheduleIssue[];
  isAutoOnly: boolean;
  onCancel: () => void;
  onSave: (data: {
    date: string;
    service: ScheduleService;
    personId: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [personId, setPersonId] = useState(existingCell?.residentId || "");
  const [notes, setNotes] = useState(
    isAutoOnly ? "" : existingCell?.notes || ""
  );

  async function handleSave() {
    if (!personId) return;
    await onSave({ date, service, personId, notes });
  }

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>
        {service.name} — {date}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {isAutoOnly && (
            <Alert severity="info">
              This is currently auto-filled from the Block Schedule. Saving here creates a manual override.
            </Alert>
          )}

          {issues.length > 0 && (
            <Stack spacing={0.75}>
              {issues.map((issue) => {
                const style = issueSeverityStyle(issue.severity);
                return (
                  <Box key={issue.id} sx={{ p: 1, borderRadius: 2, backgroundColor: style.bg, border: "1px solid", borderColor: style.border }}>
                    <Typography fontSize={12.5} fontWeight={900} sx={{ color: style.color }}>
                      {issue.title}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">
                      {issue.message}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          )}

          <TextField label="Service" value={service.name} disabled fullWidth />
          <TextField label="Date" value={date} disabled fullWidth />

          <TextField
            select
            label="Resident"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            helperText={
              service.requiredTraining?.length
                ? `Eligible: ${service.requiredTraining.join(", ")}`
                : "Eligible residents"
            }
            fullWidth
          >
            {people.map((person) => (
              <MenuItem key={person.id} value={person.id}>
                {person.displayName} — {person.training}
                {person.pager ? ` — ${person.pager}` : ""}
              </MenuItem>
            ))}

            {people.length === 0 && (
              <MenuItem disabled>No eligible residents found</MenuItem>
            )}
          </TextField>

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={3}
            placeholder={isAutoOnly ? "Optional reason for override, e.g. sick call coverage" : ""}
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!personId}>
          Save Override
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const topLeftCell = {
  p: { xs: 0.55, md: 0.65 },
  fontWeight: 900,
  fontSize: { xs: 11.5, md: 12 },
  backgroundColor: "#e2e8f0",
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  position: "sticky",
  top: 0,
  left: 0,
  zIndex: 5,
};

const weekdayHeaderCell = {
  p: { xs: 0.45, md: 0.65 },
  backgroundColor: "#e2e8f0",
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  position: "sticky",
  top: 0,
  zIndex: 3,
  textAlign: "center",
};

const weekendHeaderCell = {
  ...weekdayHeaderCell,
  backgroundColor: "#fed7aa",
};

const serviceCell = {
  p: { xs: 0.5, md: 0.65 },
  backgroundColor: "#f8fafc",
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  position: "sticky",
  left: 0,
  zIndex: 2,
  minWidth: 0,
};

const nightServiceCell = {
  ...serviceCell,
  backgroundColor: "#eef2ff",
};

const serviceIconBox = {
  width: { xs: 21, md: 24 },
  height: { xs: 21, md: 24 },
  borderRadius: 1.25,
  display: "grid",
  placeItems: "center",
  backgroundColor: "#ffffff",
  border: "1px solid",
  borderColor: "#dbeafe",
  fontSize: { xs: 12.5, md: 14 },
  flexShrink: 0,
};

const matrixCell = {
  minHeight: { xs: 38, md: 48 },
  p: { xs: 0.45, md: 0.55 },
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  backgroundColor: "white",
  minWidth: 0,
  "&:hover": {
    backgroundColor: "#f8fafc",
  },
};