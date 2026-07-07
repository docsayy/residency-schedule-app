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

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { useAuth } from "../context/AuthContext";
import { useResidents } from "../hooks/useResidents";
import type { PGY, Resident, ResidentRole } from "../types/resident";
import { canManageResidents } from "../utils/permissions";

const emptyResident: Resident = {
  id: "",
  firstName: "",
  lastName: "",
  displayName: "",
  email: "",
  pager: "",
  phone: "",
  pgy: "PGY-1",
  role: "Resident",
  active: true,
};

export default function ResidentsPage() {
  const { profile } = useAuth();
  const allowManage = canManageResidents(profile?.role);

  const {
    residents,
    loading,
    error,
    addResident,
    saveResident,
    removeResident,
  } = useResidents();

  const [search, setSearch] = useState("");
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [addingResident, setAddingResident] = useState(false);

  const filteredResidents = useMemo(() => {
    return residents.filter((resident) => {
      const text =
        `${resident.displayName} ${resident.firstName} ${resident.lastName} ${resident.email} ${resident.pgy} ${resident.role}`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [residents, search]);

  async function deactivateResident(id: string) {
    if (!allowManage) return;

    const resident = residents.find((item) => item.id === id);
    if (!resident) return;

    await saveResident({ ...resident, active: false });
  }

  async function activateResident(id: string) {
    if (!allowManage) return;

    const resident = residents.find((item) => item.id === id);
    if (!resident) return;

    await saveResident({ ...resident, active: true });
  }

  async function saveEditedResident(updated: Resident) {
    if (!allowManage) return;

    await saveResident(updated);
    setEditingResident(null);
  }

  async function handleAddResident(newResident: Resident) {
    if (!allowManage) return;

    const { id, ...residentWithoutId } = newResident;
    void id;

    await addResident({
      ...residentWithoutId,
      active: true,
    });

    setAddingResident(false);
  }

  async function handleDeleteResident(id: string) {
    if (!allowManage) return;
    await removeResident(id);
  }

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Residents
          </Typography>
          <Typography color="text.secondary">
            View and manage resident profiles.
          </Typography>
        </Box>

        {allowManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddingResident(true)}
          >
            Add Resident
          </Button>
        )}
      </Stack>

      {!allowManage && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have view-only access. Chiefs, program coordinators, and admins can
          edit resident profiles.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            label="Search residents"
            placeholder="Search by name, email, PGY, or role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 5 }}>
              <CircularProgress />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Loading residents...
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2}>
              {filteredResidents.map((resident) => (
                <Box
                  key={resident.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: allowManage
                        ? "1.4fr 1.5fr 0.8fr 1.2fr 0.8fr 1.8fr"
                        : "1.4fr 1.5fr 0.8fr 1.2fr 0.8fr",
                    },
                    gap: 2,
                    alignItems: "center",
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Box>
                    <Typography fontWeight={700}>
                      {resident.displayName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {resident.firstName} {resident.lastName}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography>{resident.email || "-"}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Pager
                    </Typography>
                    <Typography>{resident.pager || "-"}</Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      PGY / Role
                    </Typography>
                    <Typography>
                      {resident.pgy} · {resident.role}
                    </Typography>
                  </Box>

                  <Box>
                    <Chip
                      label={resident.active ? "Active" : "Inactive"}
                      color={resident.active ? "success" : "default"}
                      size="small"
                    />
                  </Box>

                  {allowManage && (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => setEditingResident(resident)}
                      >
                        Edit
                      </Button>

                      {resident.active ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => deactivateResident(resident.id)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => activateResident(resident.id)}
                        >
                          Activate
                        </Button>
                      )}

                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteResident(resident.id)}
                      >
                        Delete
                      </Button>
                    </Stack>
                  )}
                </Box>
              ))}

              {filteredResidents.length === 0 && (
                <Typography color="text.secondary">
                  No residents found.
                </Typography>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      {editingResident && allowManage && (
        <ResidentFormDialog
          title="Edit Resident"
          resident={editingResident}
          open={Boolean(editingResident)}
          onCancel={() => setEditingResident(null)}
          onSave={saveEditedResident}
        />
      )}

      {addingResident && allowManage && (
        <ResidentFormDialog
          title="Add Resident"
          resident={emptyResident}
          open={addingResident}
          onCancel={() => setAddingResident(false)}
          onSave={handleAddResident}
        />
      )}
    </Box>
  );
}

function ResidentFormDialog({
  title,
  resident,
  open,
  onCancel,
  onSave,
}: {
  title: string;
  resident: Resident;
  open: boolean;
  onCancel: () => void;
  onSave: (resident: Resident) => void;
}) {
  const [form, setForm] = useState<Resident>(resident);

  function handleSave() {
    const displayName =
      form.displayName.trim() ||
      `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

    onSave({
      ...form,
      displayName,
    });
  }

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Display Name"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            fullWidth
          />

          <TextField
            label="First Name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            fullWidth
          />

          <TextField
            label="Last Name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            fullWidth
          />

          <TextField
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            fullWidth
          />

          <TextField
            label="Pager"
            value={form.pager}
            onChange={(e) => setForm({ ...form, pager: e.target.value })}
            fullWidth
          />

          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            fullWidth
          />

          <TextField
            select
            label="PGY"
            value={form.pgy}
            onChange={(e) => setForm({ ...form, pgy: e.target.value as PGY })}
            fullWidth
          >
            <MenuItem value="PGY-1">PGY-1</MenuItem>
            <MenuItem value="PGY-2">PGY-2</MenuItem>
            <MenuItem value="PGY-3">PGY-3</MenuItem>
          </TextField>

          <TextField
            select
            label="Role"
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as ResidentRole })
            }
            fullWidth
          >
            <MenuItem value="Resident">Resident</MenuItem>
            <MenuItem value="Chief Resident">Chief Resident</MenuItem>
            <MenuItem value="Attending">Attending</MenuItem>
            <MenuItem value="Program Coordinator">
              Program Coordinator
            </MenuItem>
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}