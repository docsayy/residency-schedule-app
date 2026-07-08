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
import { useResidents } from "../hooks/useResidents";
import { useRotations } from "../hooks/useRotations";
import type { AcademicBlock } from "../types/block";
import type { BlockAssignment } from "../types/blockAssignment";
import type { Resident } from "../types/resident";
import type { RotationRequirement } from "../types/rotation";
import { generateAcademicBlocks } from "../utils/academicBlocks";
import { canBuildSchedule } from "../utils/permissions";

function getDefaultAcademicYear() {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

export default function BlockSchedulePage() {
  const { profile } = useAuth();
  const allowBuild = canBuildSchedule(profile?.role);

  const { blocks, loading, error, saveBlocks } = useAcademicBlocks();
  const { residents } = useResidents();

  const {
    rotations,
    loading: rotationsLoading,
    error: rotationsError,
    seedRotations,
  } = useRotations();

  const {
    assignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    addAssignment,
    saveAssignment,
    removeAssignment,
  } = useBlockAssignments();

  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [firstBlockEndDate, setFirstBlockEndDate] = useState("");
  const [editingCell, setEditingCell] = useState<{
    resident: Resident;
    block: AcademicBlock;
    assignment?: BlockAssignment;
  } | null>(null);

  const previewBlocks = useMemo(() => {
    if (!academicYear || !firstBlockEndDate) return [];
    return generateAcademicBlocks({ academicYear, firstBlockEndDate });
  }, [academicYear, firstBlockEndDate]);

  const displayedBlocks = useMemo(() => {
    const source = previewBlocks.length > 0 ? previewBlocks : blocks;
    return source.filter((block) => block.academicYear === academicYear);
  }, [previewBlocks, blocks, academicYear]);

  const activeResidents = useMemo(
    () =>
      residents
        .filter((resident) => resident.active)
        .sort((a, b) => {
          const pgyOrder = a.pgy.localeCompare(b.pgy);
          if (pgyOrder !== 0) return pgyOrder;
          return a.displayName.localeCompare(b.displayName);
        }),
    [residents]
  );

  const activeRotations = useMemo(
    () =>
      rotations
        .filter((rotation) => rotation.active)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [rotations]
  );

  const assignmentsByResidentBlock = useMemo(() => {
    const grouped: Record<string, BlockAssignment> = {};
    for (const assignment of assignments) {
      grouped[`${assignment.residentId}_${assignment.blockId}`] = assignment;
    }
    return grouped;
  }, [assignments]);

  async function handleSaveBlocks() {
    if (!allowBuild || previewBlocks.length === 0) return;
    await saveBlocks(previewBlocks);
  }

  async function handleSeedRotations() {
    if (!allowBuild) return;
    await seedRotations();
  }

  async function handleSaveAssignment(data: {
    resident: Resident;
    block: AcademicBlock;
    rotationId: string;
    notes: string;
    existingAssignment?: BlockAssignment;
  }) {
    if (!allowBuild) return;

    const rotation = activeRotations.find((item) => item.id === data.rotationId);
    if (!rotation) return;

    const now = new Date().toISOString();

    if (data.existingAssignment) {
      await saveAssignment({
        ...data.existingAssignment,
        rotationId: rotation.id,
        rotationName: rotation.name,
        notes: data.notes,
        updatedAt: now,
      });
    } else {
      await addAssignment({
        academicYear: data.block.academicYear,
        blockId: data.block.id,
        blockNumber: data.block.blockNumber,
        residentId: data.resident.id,
        residentName: data.resident.displayName,
        rotationId: rotation.id,
        rotationName: rotation.name,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      });
    }

    setEditingCell(null);
  }

  async function handleRemoveAssignment(id: string) {
    if (!allowBuild) return;
    await removeAssignment(id);
  }

  const pageError = error || rotationsError || assignmentsError;
  const pageLoading = loading || rotationsLoading || assignmentsLoading;

  return (
    <Box>
      <Stack sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={800}>
          Block Schedule
        </Typography>
        <Typography color="text.secondary">
          Assign residents to rotations across academic blocks.
        </Typography>
      </Stack>

      {!allowBuild && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access. Chiefs, program coordinators, and admins can
          edit block assignments.
        </Alert>
      )}

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      {allowBuild && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6" fontWeight={800}>
                Academic Year Setup
              </Typography>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField
                  label="Academic Year"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026-2027"
                  fullWidth
                />

                <TextField
                  label="First Block End Date"
                  type="date"
                  value={firstBlockEndDate}
                  onChange={(e) => setFirstBlockEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Block 1 starts July 1. Next block starts Thursday. Last block ends June 30."
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="contained"
                  onClick={handleSaveBlocks}
                  disabled={previewBlocks.length === 0}
                >
                  Save Academic Blocks
                </Button>

                {activeRotations.length === 0 && (
                  <Button variant="outlined" onClick={handleSeedRotations}>
                    Seed Rotations
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            Block Assignment Matrix
          </Typography>

          {pageLoading ? (
            <Stack alignItems="center" sx={{ py: 5 }}>
              <CircularProgress />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Loading block schedule...
              </Typography>
            </Stack>
          ) : displayedBlocks.length === 0 ? (
            <Typography color="text.secondary">
              No blocks found for this academic year.
            </Typography>
          ) : (
            <Box
              sx={{
                overflow: "auto",
                maxHeight: "calc(100vh - 210px)",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `170px repeat(${displayedBlocks.length}, 130px)`,
                  minWidth: 170 + displayedBlocks.length * 130,
                }}
              >
                <Box sx={topLeftCell}>Resident</Box>

                {displayedBlocks.map((block) => (
                  <Box key={block.id} sx={headerCell}>
                    <Typography fontWeight={900} fontSize={12}>
                      {block.name}
                    </Typography>
                    <Typography variant="caption">
                      {block.startDate.slice(5)} → {block.endDate.slice(5)}
                    </Typography>
                  </Box>
                ))}

                {activeResidents.map((resident) => (
                  <Box key={resident.id} sx={{ display: "contents" }}>
                    <Box sx={residentCell}>
                      <Typography fontWeight={800} fontSize={12}>
                        {resident.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {resident.pgy}
                      </Typography>
                    </Box>

                    {displayedBlocks.map((block) => {
                      const assignment =
                        assignmentsByResidentBlock[
                          `${resident.id}_${block.id}`
                        ];

                      return (
                        <Box
                          key={`${resident.id}-${block.id}`}
                          sx={{
                            ...matrixCell,
                            cursor: allowBuild ? "pointer" : "default",
                          }}
                          onClick={() => {
                            if (!allowBuild) return;
                            setEditingCell({ resident, block, assignment });
                          }}
                        >
                          {assignment ? (
                            <Stack spacing={0.25}>
                              <Typography fontWeight={800} fontSize={12}>
                                {assignment.rotationName}
                              </Typography>

                              {assignment.notes && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {assignment.notes}
                                </Typography>
                              )}

                              {allowBuild && (
                                <Button
                                  size="small"
                                  color="error"
                                  sx={{ minWidth: 0, p: 0.25 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveAssignment(assignment.id);
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
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            Rotation Requirements
          </Typography>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {activeRotations.map((rotation) => (
              <Chip
                key={rotation.id}
                label={`${rotation.name}: I ${rotation.requiredPGY1}, II ${rotation.requiredPGY2}, III ${rotation.requiredPGY3}, Sr ${rotation.requiredSenior}`}
                sx={{ height: 22 }}
              />
            ))}

            {activeRotations.length === 0 && (
              <Typography color="text.secondary">
                No rotations saved yet.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {editingCell && allowBuild && (
        <BlockAssignmentDialog
          open={Boolean(editingCell)}
          resident={editingCell.resident}
          block={editingCell.block}
          rotations={activeRotations}
          existingAssignment={editingCell.assignment}
          onCancel={() => setEditingCell(null)}
          onSave={handleSaveAssignment}
        />
      )}
    </Box>
  );
}

function BlockAssignmentDialog({
  open,
  resident,
  block,
  rotations,
  existingAssignment,
  onCancel,
  onSave,
}: {
  open: boolean;
  resident: Resident;
  block: AcademicBlock;
  rotations: RotationRequirement[];
  existingAssignment?: BlockAssignment;
  onCancel: () => void;
  onSave: (data: {
    resident: Resident;
    block: AcademicBlock;
    rotationId: string;
    notes: string;
    existingAssignment?: BlockAssignment;
  }) => Promise<void>;
}) {
  const [rotationId, setRotationId] = useState(
    existingAssignment?.rotationId || ""
  );
  const [notes, setNotes] = useState(existingAssignment?.notes || "");

  async function handleSave() {
    if (!rotationId) return;
    await onSave({ resident, block, rotationId, notes, existingAssignment });
  }

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>
        {resident.displayName} — {block.name}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Resident" value={resident.displayName} disabled />

          <TextField
            label="Block"
            value={`${block.name}: ${block.startDate} → ${block.endDate}`}
            disabled
          />

          <TextField
            select
            label="Rotation"
            value={rotationId}
            onChange={(e) => setRotationId(e.target.value)}
            fullWidth
          >
            {rotations.map((rotation) => (
              <MenuItem key={rotation.id} value={rotation.id}>
                {rotation.name}
              </MenuItem>
            ))}
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
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const topLeftCell = {
  p: 0.75,
  fontWeight: 900,
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
  p: 0.75,
  fontWeight: 900,
  backgroundColor: "#e2e8f0",
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  position: "sticky",
  top: 0,
  zIndex: 3,
};

const residentCell = {
  p: 0.75,
  backgroundColor: "#f8fafc",
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  position: "sticky",
  left: 0,
  zIndex: 2,
};

const matrixCell = {
  minHeight: 70,
  p: 0.75,
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  backgroundColor: "white",
  "&:hover": {
    backgroundColor: "#f8fafc",
  },
};