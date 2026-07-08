import { useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
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
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import { useAuth } from "../context/AuthContext";
import { useAttendings } from "../hooks/useAttendings";
import { useAttendingSchedule } from "../hooks/useAttendingSchedule";
import { useServices } from "../hooks/useServices";
import type { Attending } from "../types/attending";
import type {
  AttendingScheduleAssignment,
  AttendingScheduleGroup,
} from "../types/attendingSchedule";
import type { ScheduleService } from "../types/schedule";
import { canBuildSchedule } from "../utils/permissions";

type ScheduleTab = "Core" | "Specialty";

function todayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthId() {
  return todayDate().slice(0, 7);
}

function serviceIcon(service: string) {
  const lower = service.toLowerCase();
  if (lower.includes("card")) return "🫀";
  if (lower.includes("pulm") || lower.includes("micu")) return "🫁";
  if (lower.includes("neuro")) return "🧠";
  if (lower.includes("gi") || lower.includes("gastro")) return "🍽️";
  if (lower.includes("neph")) return "🫘";
  if (lower.includes("heme") || lower.includes("onc")) return "🩸";
  if (lower.includes("infect")) return "🦠";
  if (lower.includes("rheum")) return "🦴";
  if (lower.includes("observ")) return "👀";
  if (lower.includes("faculty")) return "⭐";
  return "🏥";
}

export default function AttendingCallSchedulePage() {
  const { profile } = useAuth();
  const allowBuild = canBuildSchedule(profile?.role);

  const { attendings } = useAttendings();
  const { services } = useServices();

  const {
    assignments,
    loading,
    error,
    addAssignment,
    saveAssignment,
    removeAssignment,
  } = useAttendingSchedule();

  const [tab, setTab] = useState<ScheduleTab>("Core");
  const [monthId, setMonthId] = useState(currentMonthId());
  const [editingAssignment, setEditingAssignment] =
    useState<AttendingScheduleAssignment | null>(null);
  const [addingAssignment, setAddingAssignment] = useState(false);

  const activeServices = useMemo(() => {
    return services
      .filter((service) => service.active)
      .filter((service) => service.coverageGroup === "Attending")
      .filter((service) => service.attendingScheduleType === tab)
      .sort((a, b) => a.displayOrderAll - b.displayOrderAll);
  }, [services, tab]);

  const activeAttendings = useMemo(() => {
    return attendings
      .filter((attending) => attending.active)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [attendings]);

  const visibleAssignments = useMemo(() => {
    return assignments
      .filter((assignment) => assignment.group === tab)
      .filter(
        (assignment) =>
          assignment.startDate.slice(0, 7) === monthId ||
          assignment.endDate.slice(0, 7) === monthId ||
          (assignment.startDate <= `${monthId}-31` &&
            assignment.endDate >= `${monthId}-01`)
      )
      .sort((a, b) => {
        const dateSort = a.startDate.localeCompare(b.startDate);
        if (dateSort !== 0) return dateSort;
        return a.serviceName.localeCompare(b.serviceName);
      });
  }, [assignments, monthId, tab]);

  async function handleSave(data: {
    existing?: AttendingScheduleAssignment;
    service: ScheduleService;
    attending: Attending;
    startDate: string;
    endDate: string;
    coverageStartTime: string;
    coverageEndTime: string;
    coverageNote: string;
    notes: string;
  }) {
    if (!allowBuild) return;

    const now = new Date().toISOString();

    const payload: Omit<AttendingScheduleAssignment, "id"> = {
      serviceId: data.service.id,
      serviceName: data.service.name,
      group: data.service.attendingScheduleType as AttendingScheduleGroup,
      attendingId: data.attending.id,
      attendingName: data.attending.displayName,
      startDate: data.startDate,
      endDate: data.endDate,
      coverageStartTime: data.coverageStartTime,
      coverageEndTime: data.coverageEndTime,
      coverageNote: data.coverageNote,
      phone: data.attending.phone,
      pager: data.attending.pager,
      notes: data.notes,
      createdAt: data.existing?.createdAt || now,
      updatedAt: now,
    };

    if (data.existing) {
      await saveAssignment({
        id: data.existing.id,
        ...payload,
      });
      setEditingAssignment(null);
    } else {
      await addAssignment(payload);
      setAddingAssignment(false);
    }
  }

  async function handleDelete(id: string) {
    if (!allowBuild) return;
    const confirmed = window.confirm("Delete this attending assignment?");
    if (!confirmed) return;
    await removeAssignment(id);
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Attending Call Schedule
          </Typography>
          <Typography color="text.secondary">
            Date-range schedule for admitting attendings and consulting services.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <TextField
            label="Month"
            type="month"
            size="small"
            value={monthId}
            onChange={(e) => setMonthId(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 170 }}
          />

          {allowBuild && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddingAssignment(true)}
            >
              Add
            </Button>
          )}
        </Stack>
      </Stack>

      {!allowBuild && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access. Chiefs, coordinators, and admins can edit
          attending call schedules.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5 }}>
          <Tabs
            value={tab}
            onChange={(_, value: ScheduleTab) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Admitting / Core" value="Core" />
            <Tab label="Specialty / Consulting" value="Specialty" />
          </Tabs>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3, boxShadow: "0 10px 30px rgba(15,23,42,0.08)" }}>
        <CardContent sx={{ p: 1.5 }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 5 }}>
              <CircularProgress />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Loading attending schedule...
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: allowBuild ? 920 : 780 }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: allowBuild
                      ? "210px 180px 130px 130px 150px 150px"
                      : "210px 180px 130px 130px 150px",
                    gap: 1,
                    px: 1,
                    py: 0.75,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <HeaderText>Service</HeaderText>
                  <HeaderText>Attending</HeaderText>
                  <HeaderText>From</HeaderText>
                  <HeaderText>To</HeaderText>
                  <HeaderText>Coverage</HeaderText>
                  {allowBuild && <HeaderText>Controls</HeaderText>}
                </Box>

                {visibleAssignments.map((assignment, index) => (
                  <Box
                    key={assignment.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: allowBuild
                        ? "210px 180px 130px 130px 150px 150px"
                        : "210px 180px 130px 130px 150px",
                      gap: 1,
                      alignItems: "center",
                      px: 1,
                      py: 0.6,
                      minHeight: 44,
                      borderBottom: "1px solid",
                      borderColor: "#eef2f7",
                      backgroundColor: index % 2 === 0 ? "white" : "#f8fafc",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 1.25,
                          backgroundColor: "#f8fafc",
                          border: "1px solid #dbeafe",
                        }}
                      >
                        {serviceIcon(assignment.serviceName)}
                      </Box>
                      <Typography fontSize={13} fontWeight={750}>
                        {assignment.serviceName}
                      </Typography>
                    </Stack>

                    <Box>
                      <Typography fontSize={13} fontWeight={800}>
                        {assignment.attendingName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assignment.phone || assignment.pager || "No contact"}
                      </Typography>
                    </Box>

                    <Typography fontSize={13}>{assignment.startDate}</Typography>

                    <Typography fontSize={13}>{assignment.endDate}</Typography>

                    <Chip
                      size="small"
                      label={
                        assignment.coverageNote ||
                        `${assignment.coverageStartTime}-${assignment.coverageEndTime}`
                      }
                      sx={{
                        width: "fit-content",
                        fontWeight: 800,
                        color: "#6d28d9",
                        backgroundColor: "#f5f3ff",
                        border: "1px solid #ddd6fe",
                      }}
                    />

                    {allowBuild && (
                      <Stack direction="row" spacing={0.25}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => setEditingAssignment(assignment)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(assignment.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </Box>
                ))}

                {visibleAssignments.length === 0 && (
                  <Typography color="text.secondary" sx={{ p: 2 }}>
                    No attending assignments found for this month.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {(addingAssignment || editingAssignment) && allowBuild && (
        <AttendingScheduleDialog
          open={addingAssignment || Boolean(editingAssignment)}
          tab={tab}
          services={activeServices}
          attendings={activeAttendings}
          existing={editingAssignment || undefined}
          onCancel={() => {
            setAddingAssignment(false);
            setEditingAssignment(null);
          }}
          onSave={handleSave}
        />
      )}
    </Box>
  );
}

function HeaderText({ children }: { children: React.ReactNode }) {
  return (
    <Typography fontSize={12} fontWeight={850} color="text.secondary">
      {children}
    </Typography>
  );
}

function AttendingScheduleDialog({
  open,
  tab,
  services,
  attendings,
  existing,
  onCancel,
  onSave,
}: {
  open: boolean;
  tab: ScheduleTab;
  services: ScheduleService[];
  attendings: Attending[];
  existing?: AttendingScheduleAssignment;
  onCancel: () => void;
  onSave: (data: {
    existing?: AttendingScheduleAssignment;
    service: ScheduleService;
    attending: Attending;
    startDate: string;
    endDate: string;
    coverageStartTime: string;
    coverageEndTime: string;
    coverageNote: string;
    notes: string;
  }) => Promise<void>;
}) {
  const defaultService =
    services.find((service) => service.id === existing?.serviceId) || null;
  const defaultAttending =
    attendings.find((attending) => attending.id === existing?.attendingId) ||
    null;

  const [service, setService] = useState<ScheduleService | null>(
    defaultService
  );
  const [attending, setAttending] = useState<Attending | null>(
    defaultAttending
  );
  const [startDate, setStartDate] = useState(existing?.startDate || todayDate());
  const [endDate, setEndDate] = useState(existing?.endDate || todayDate());
  const [coverageStartTime, setCoverageStartTime] = useState(
    existing?.coverageStartTime || "07:00"
  );
  const [coverageEndTime, setCoverageEndTime] = useState(
    existing?.coverageEndTime || "07:00"
  );
  const [coverageNote, setCoverageNote] = useState(
    existing?.coverageNote || "7a-7a"
  );
  const [notes, setNotes] = useState(existing?.notes || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!service || !attending) return;

    setSaving(true);
    try {
      await onSave({
        existing,
        service,
        attending,
        startDate,
        endDate,
        coverageStartTime,
        coverageEndTime,
        coverageNote,
        notes,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>
        {existing ? "Edit" : "Add"}{" "}
        {tab === "Core" ? "Admitting/Core" : "Specialty"} Assignment
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Autocomplete
            options={services}
            value={service}
            onChange={(_, value) => setService(value)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label="Service" />}
          />

          <Autocomplete
            options={attendings}
            value={attending}
            onChange={(_, value) => setAttending(value)}
            getOptionLabel={(option) =>
              `${option.displayName}${option.specialty ? ` — ${option.specialty}` : ""}`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label="Attending" />
            )}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="Coverage Start"
              type="time"
              value={coverageStartTime}
              onChange={(e) => setCoverageStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Coverage End"
              type="time"
              value={coverageEndTime}
              onChange={(e) => setCoverageEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>

          <TextField
            label="Coverage Display"
            value={coverageNote}
            onChange={(e) => setCoverageNote(e.target.value)}
            placeholder="7a-7a, 24/7, Until 4PM, Starting 4PM..."
            fullWidth
          />

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
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!service || !attending || saving}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}