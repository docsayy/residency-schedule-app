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
import type { MonthlyScheduleCell } from "../types/monthSchedule";
import { canBuildSchedule } from "../utils/permissions";
import {
  EXACT_NF_SERVICE_IDS,
  dayOfWeek,
  getAutoNightFloatCell,
  isNightFloatService,
  parseLocalDate,
  residentTraining,
} from "../utils/nightFloatSchedule";

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

function getCurrentMonthId() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getDaysInMonth(monthId: string) {
  const [year, month] = monthId.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    return `${monthId}-${String(day).padStart(2, "0")}`;
  });
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

function levelChipColor(level: string) {
  if (level.includes("PGY-1")) return { color: "#dc2626", bg: "#fff1f2", border: "#fecdd3" };
  if (level.includes("PGY-2")) return { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };
  if (level.includes("PGY-3")) return { color: "#15803d", bg: "#ecfdf5", border: "#bbf7d0" };
  return { color: "#475569", bg: "#f8fafc", border: "#e2e8f0" };
}

export default function MonthlyScheduleMatrixPage() {
  const { profile } = useAuth();
  const allowBuild = canBuildSchedule(profile?.role);

  const [monthId, setMonthId] = useState(getCurrentMonthId());
  const [editingCell, setEditingCell] = useState<{
    date: string;
    service: ScheduleService;
  } | null>(null);

  const { residents } = useResidents();
  const { blocks } = useAcademicBlocks();
  const { assignments: blockAssignments } = useBlockAssignments();

  const { schedule, loading, saving, error, updateCell, removeCell } =
    useMonthlySchedule(monthId);

  const days = useMemo(() => getDaysInMonth(monthId), [monthId]);

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

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={850} sx={{ lineHeight: 1 }}>
            Daily Call Schedule
          </Typography>
          <Typography color="text.secondary" fontSize={14}>
            Resident calls with night float auto-filled from exact block schedule assignments.
          </Typography>
        </Box>

        <TextField
          label="Month"
          type="month"
          size="small"
          value={monthId}
          onChange={(e) => setMonthId(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 180 }}
        />
      </Stack>

      {!allowBuild && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access. Chiefs, program coordinators, and admins can edit the daily call schedule.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ borderRadius: 3, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}>
        <CardContent sx={{ p: 1.25 }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 5 }}>
              <CircularProgress />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Loading daily call schedule...
              </Typography>
            </Stack>
          ) : (
            <Box
              sx={{
                overflow: "auto",
                maxHeight: "calc(100vh - 170px)",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `165px repeat(${days.length}, 105px)`,
                  minWidth: 165 + days.length * 105,
                }}
              >
                <Box sx={topLeftCell}>Service</Box>

                {days.map((day) => (
                  <Box key={day} sx={isWeekend(day) ? weekendHeaderCell : weekdayHeaderCell}>
                    <Typography fontSize={11.5} fontWeight={900}>
                      {formatDay(day)}
                    </Typography>
                  </Box>
                ))}

                {residentCallServices.map((service) => (
                  <Box key={service.id} sx={{ display: "contents" }}>
                    <Box sx={isNightFloatService(service.id) ? nightServiceCell : serviceCell}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={serviceIconBox}>{serviceIcon(service.name)}</Box>
                        <Box>
                          <Typography fontWeight={750} fontSize={12.5}>
                            {service.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
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

                      return (
                        <Box
                          key={`${service.id}-${day}`}
                          sx={{
                            ...matrixCell,
                            backgroundColor: autoCell
                              ? "#f5f3ff"
                              : weekend
                                ? "#fff7ed"
                                : "white",
                            cursor: allowBuild ? "pointer" : "default",
                          }}
                          onClick={() => {
                            if (!allowBuild) return;
                            setEditingCell({ date: day, service });
                          }}
                        >
                          {cell ? (
                            <Stack spacing={0.25}>
                              <Typography fontWeight={750} fontSize={12}>
                                {cell.residentName}
                              </Typography>

                              <LevelChip level={cell.training} />

                              {autoCell && (
                                <Chip
                                  label="Block NF"
                                  size="small"
                                  sx={{
                                    height: 17,
                                    fontSize: 9.5,
                                    fontWeight: 900,
                                    color: "#6d28d9",
                                    backgroundColor: "#ede9fe",
                                  }}
                                />
                              )}

                              {manualCell && isNightFloatService(service.id) && (
                                <Chip
                                  label="Manual"
                                  size="small"
                                  sx={{
                                    height: 17,
                                    fontSize: 9.5,
                                    fontWeight: 900,
                                    color: "#b45309",
                                    backgroundColor: "#fef3c7",
                                  }}
                                />
                              )}

                              {cell.pager && (
                                <Typography variant="caption" color="text.secondary" fontSize={10.5}>
                                  📟 {cell.pager}
                                </Typography>
                              )}

                              {allowBuild && manualCell && (
                                <Button
                                  size="small"
                                  color="error"
                                  sx={{
                                    minWidth: 0,
                                    width: "fit-content",
                                    p: "0 4px",
                                    fontSize: 10,
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
                            <Typography variant="caption" color="text.secondary" fontSize={10.5}>
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
          isAutoOnly={!getManualCell(editingCell.date, editingCell.service) && Boolean(getAutoCell(editingCell.date, editingCell.service))}
          onCancel={() => setEditingCell(null)}
          onSave={handleSaveCell}
        />
      )}
    </Box>
  );
}

function LevelChip({ level }: { level: string }) {
  const style = levelChipColor(level);

  return (
    <Chip
      label={level}
      size="small"
      sx={{
        width: "fit-content",
        height: 18,
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
  isAutoOnly,
  onCancel,
  onSave,
}: {
  open: boolean;
  date: string;
  service: ScheduleService;
  people: SchedulePerson[];
  existingCell?: MonthlyScheduleCell;
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
              This is currently auto-filled from the Block Schedule. Saving here will create a manual override for this date.
            </Alert>
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
  p: 0.65,
  fontWeight: 900,
  fontSize: 12,
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
  p: 0.65,
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
  p: 0.65,
  backgroundColor: "#f8fafc",
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  position: "sticky",
  left: 0,
  zIndex: 2,
};

const nightServiceCell = {
  ...serviceCell,
  backgroundColor: "#eef2ff",
};

const serviceIconBox = {
  width: 24,
  height: 24,
  borderRadius: 1.25,
  display: "grid",
  placeItems: "center",
  backgroundColor: "#ffffff",
  border: "1px solid",
  borderColor: "#dbeafe",
  fontSize: 14,
};

const matrixCell = {
  minHeight: 66,
  p: 0.6,
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  backgroundColor: "white",
  "&:hover": {
    backgroundColor: "#f8fafc",
  },
};