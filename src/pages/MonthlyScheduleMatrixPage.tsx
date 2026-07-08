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
import { useMonthlySchedule } from "../hooks/useMonthlySchedule";
import { useResidents } from "../hooks/useResidents";
import type {
  RequiredTraining,
  ScheduleService,
  ShiftType,
} from "../types/schedule";
import type { MonthlyScheduleCell } from "../types/monthSchedule";
import { canBuildSchedule } from "../utils/permissions";

type SchedulePerson = {
  id: string;
  displayName: string;
  training: RequiredTraining;
  pager: string;
};

const residentCallServices: ScheduleService[] = [
  makeService("tele-pgy1", "Tele PGY1", "Day", 1, ["PGY-1"], "07:00", "19:00"),
  makeService("2n-ccu-pgy1", "2N CCU PGY1", "Day", 2, ["PGY-1"], "07:00", "19:00"),
  makeService("2n-ccu-pgy2", "2N CCU PGY2", "Day", 3, ["PGY-2"], "07:00", "19:00"),
  makeService("3w-pgy1", "3W PGY1", "Day", 4, ["PGY-1"], "07:00", "19:00"),
  makeService("4n-pgy1", "4N PGY1", "Day", 5, ["PGY-1"], "07:00", "19:00"),
  makeService("4n-3w-pgy2", "4N-3W PGY2", "Day", 6, ["PGY-2"], "07:00", "19:00"),
  makeService("micu-pgy1", "MICU PGY1", "ICU", 7, ["PGY-1"], "07:00", "07:00"),
  makeService("micu-senior", "MICU Senior", "ICU", 8, ["PGY-2", "PGY-3"], "08:00", "08:00"),
  makeService("chief-on-call", "Chief On Call", "Chief", 9, ["PGY-3"], "07:00", "19:00"),
  makeService("4n-3w-pgy1-nf", "4N-3W PGY1 NF", "Night", 10, ["PGY-1"], "19:00", "07:00"),
  makeService("4n-3w-pgy2-nf", "4N-3W PGY2 NF", "Night", 11, ["PGY-2"], "19:00", "07:00"),
  makeService("2n-ccu-pgy1-nf", "2N CCU PGY1 NF", "Night", 12, ["PGY-1"], "19:00", "07:00"),
  makeService("2n-ccu-pgy2-nf", "2N CCU PGY2 NF", "Night", 13, ["PGY-2"], "19:00", "07:00"),
  makeService("pgy3-nf", "PGY3 NF", "Night", 14, ["PGY-3"], "19:00", "07:00"),
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
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getDaysInMonth(monthId: string) {
  const [year, month] = monthId.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    return `${monthId}-${String(day).padStart(2, "0")}`;
  });
}

function formatDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);
  const weekday = localDate.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday} ${day}`;
}

function residentTraining(resident: { pgy: string }): RequiredTraining {
  if (resident.pgy === "PGY-1") return "PGY-1";
  if (resident.pgy === "PGY-2") return "PGY-2";
  return "PGY-3";
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
  if (level.includes("PGY-1")) {
    return { color: "#dc2626", bg: "#fff1f2", border: "#fecdd3" };
  }
  if (level.includes("PGY-2")) {
    return { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };
  }
  if (level.includes("PGY-3")) {
    return { color: "#15803d", bg: "#ecfdf5", border: "#bbf7d0" };
  }
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

  const { schedule, loading, saving, error, updateCell, removeCell } =
    useMonthlySchedule(monthId);

  const days = useMemo(() => getDaysInMonth(monthId), [monthId]);

  function getCell(date: string, serviceId: string) {
    return schedule?.assignments[`${date}_${serviceId}`];
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
          <Typography variant="h4" fontWeight={800}>
            Daily Call Schedule
          </Typography>
          <Typography color="text.secondary" fontSize={14}>
            Compact monthly resident call assignment matrix.
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
          You have view-only access. Chiefs, program coordinators, and admins can
          edit the daily call schedule.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
                  <Box key={day} sx={headerCell}>
                    {formatDay(day)}
                  </Box>
                ))}

                {residentCallServices.map((service) => (
                  <Box key={service.id} sx={{ display: "contents" }}>
                    <Box sx={serviceCell}>
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
                      const cell = getCell(day, service.id);

                      return (
                        <Box
                          key={`${service.id}-${day}`}
                          sx={{
                            ...matrixCell,
                            cursor: allowBuild ? "pointer" : "default",
                          }}
                          onClick={() => {
                            if (!allowBuild) return;
                            setEditingCell({ date: day, service });
                          }}
                        >
                          {cell ? (
                            <Stack spacing={0.35}>
                              <Typography fontWeight={750} fontSize={12}>
                                {cell.residentName}
                              </Typography>

                              <LevelChip level={cell.training} />

                              {cell.pager && (
                                <Typography variant="caption" color="text.secondary">
                                  📟 {cell.pager}
                                </Typography>
                              )}

                              {allowBuild && (
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
                            <Typography variant="caption" color="text.secondary">
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
          existingCell={getCell(editingCell.date, editingCell.service.id)}
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
  onCancel,
  onSave,
}: {
  open: boolean;
  date: string;
  service: ScheduleService;
  people: SchedulePerson[];
  existingCell?: MonthlyScheduleCell;
  onCancel: () => void;
  onSave: (data: {
    date: string;
    service: ScheduleService;
    personId: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [personId, setPersonId] = useState(existingCell?.residentId || "");
  const [notes, setNotes] = useState(existingCell?.notes || "");

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
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!personId}>
          Save
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

const headerCell = {
  p: 0.65,
  fontWeight: 850,
  fontSize: 11.5,
  backgroundColor: "#e2e8f0",
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  position: "sticky",
  top: 0,
  zIndex: 3,
  textAlign: "center",
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