import { useEffect, useMemo, useState } from "react";
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "../context/AuthContext";
import { useAcademicBlocks } from "../hooks/useAcademicBlocks";
import { useBlockAssignments } from "../hooks/useBlockAssignments";
import { useResidents } from "../hooks/useResidents";
import { useRotations } from "../hooks/useRotations";
import {
  NIGHT_FLOAT_ROTATION_IDS,
  OLD_GENERIC_NIGHT_FLOAT_ROTATION_ID,
} from "../services/rotationService";
import type { AcademicBlock } from "../types/block";
import type { BlockAssignment } from "../types/blockAssignment";
import type { Resident } from "../types/resident";
import type { RotationRequirement } from "../types/rotation";
import { generateAcademicBlocks } from "../utils/academicBlocks";
import { canBuildSchedule } from "../utils/permissions";

type BlockTab = "Everyone" | "PGY-1" | "PGY-2" | "PGY-3";

type RotationValidation = {
  rotationId: string;
  rotationName: string;
  requiredPGY1: number;
  assignedPGY1: number;
  requiredPGY2: number;
  assignedPGY2: number;
  requiredPGY3: number;
  assignedPGY3: number;
  requiredSenior: number;
  assignedSenior: number;
  issues: string[];
};

type BlockValidation = {
  block: AcademicBlock;
  assignedResidents: number;
  totalResidents: number;
  missingResidents: Resident[];
  duplicateResidents: {
    resident: Resident;
    assignments: BlockAssignment[];
  }[];
  rotationValidations: RotationValidation[];
  issueCount: number;
  completionPercent: number;
};

function getDefaultAcademicYear() {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

function rotationColor(rotationName: string) {
  const lower = rotationName.toLowerCase();

  if (lower.includes("micu")) return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
  if (lower.includes("ccu") || lower.includes("card")) return { bg: "#fff1f2", color: "#be123c", border: "#fecdd3" };
  if (lower.includes("tele")) return { bg: "#f0fdfa", color: "#0f766e", border: "#99f6e4" };
  if (lower.includes("ambulatory") || lower.includes("clinic")) return { bg: "#ecfdf5", color: "#15803d", border: "#bbf7d0" };
  if (lower.includes("vacation")) return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
  if (lower.includes("nf") || lower.includes("night")) return { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" };
  if (lower.includes("jeopardy")) return { bg: "#fefce8", color: "#a16207", border: "#fde68a" };

  return { bg: "#f8fafc", color: "#334155", border: "#e2e8f0" };
}

function validationColor(issueCount: number, completionPercent: number) {
  if (issueCount === 0 && completionPercent === 100) {
    return { bg: "#ecfdf5", color: "#15803d", border: "#bbf7d0", label: "Complete" };
  }

  if (completionPercent >= 80) {
    return { bg: "#fffbeb", color: "#b45309", border: "#fde68a", label: "Needs review" };
  }

  return { bg: "#fff1f2", color: "#be123c", border: "#fecdd3", label: "Incomplete" };
}

function isGenericNightFloatAssignment(assignment: BlockAssignment) {
  return (
    assignment.rotationId === OLD_GENERIC_NIGHT_FLOAT_ROTATION_ID ||
    assignment.rotationName.trim().toLowerCase() === "night float"
  );
}

function pickExactNightFloatRotationId(resident: Resident, notes: string) {
  const lowerNotes = notes.toLowerCase();

  const looksLikeFourNorthThreeWest =
    lowerNotes.includes("4n") ||
    lowerNotes.includes("3w") ||
    lowerNotes.includes("4n-3w") ||
    lowerNotes.includes("4n 3w");

  if (resident.pgy === "PGY-1") {
    return looksLikeFourNorthThreeWest
      ? NIGHT_FLOAT_ROTATION_IDS.pgy1FourNorthThreeWest
      : NIGHT_FLOAT_ROTATION_IDS.pgy1TwoNorthCcu;
  }

  if (resident.pgy === "PGY-2") {
    return looksLikeFourNorthThreeWest
      ? NIGHT_FLOAT_ROTATION_IDS.pgy2FourNorthThreeWest
      : NIGHT_FLOAT_ROTATION_IDS.pgy2TwoNorthCcu;
  }

  if (resident.pgy === "PGY-3") {
    return NIGHT_FLOAT_ROTATION_IDS.pgy3;
  }

  return "";
}

function hasAnyRequirement(rotation: RotationRequirement) {
  return (
    rotation.requiredPGY1 > 0 ||
    rotation.requiredPGY2 > 0 ||
    rotation.requiredPGY3 > 0 ||
    rotation.requiredSenior > 0
  );
}

function compareRequirement(label: string, required: number, assigned: number) {
  if (required === 0) return "";
  if (assigned < required) return `${label} needs ${required - assigned} more`;
  if (assigned > required) return `${label} has ${assigned - required} extra`;
  return "";
}

function buildBlockValidations({
  blocks,
  assignments,
  residents,
  rotations,
}: {
  blocks: AcademicBlock[];
  assignments: BlockAssignment[];
  residents: Resident[];
  rotations: RotationRequirement[];
}): BlockValidation[] {
  const activeResidents = residents.filter((resident) => resident.active);
  const activeResidentById = new Map(activeResidents.map((resident) => [resident.id, resident]));
  const requiredRotations = rotations.filter((rotation) => rotation.active && hasAnyRequirement(rotation));

  return blocks.map((block) => {
    const blockAssignments = assignments.filter((assignment) => assignment.blockId === block.id);

    const assignmentsByResident = new Map<string, BlockAssignment[]>();
    for (const assignment of blockAssignments) {
      const current = assignmentsByResident.get(assignment.residentId) || [];
      current.push(assignment);
      assignmentsByResident.set(assignment.residentId, current);
    }

    const assignedResidentIds = new Set(
      blockAssignments
        .filter((assignment) => activeResidentById.has(assignment.residentId))
        .map((assignment) => assignment.residentId)
    );

    const missingResidents = activeResidents.filter(
      (resident) => !assignedResidentIds.has(resident.id)
    );

    const duplicateResidents = Array.from(assignmentsByResident.entries())
      .filter(([, residentAssignments]) => residentAssignments.length > 1)
      .map(([residentId, residentAssignments]) => {
        const resident = activeResidentById.get(residentId);
        if (!resident) return null;
        return {
          resident,
          assignments: residentAssignments,
        };
      })
      .filter(Boolean) as {
        resident: Resident;
        assignments: BlockAssignment[];
      }[];

    const rotationValidations: RotationValidation[] = requiredRotations.map((rotation) => {
      const rotationAssignments = blockAssignments.filter(
        (assignment) => assignment.rotationId === rotation.id
      );

      let assignedPGY1 = 0;
      let assignedPGY2 = 0;
      let assignedPGY3 = 0;

      for (const assignment of rotationAssignments) {
        const resident = activeResidentById.get(assignment.residentId);
        if (!resident) continue;

        if (resident.pgy === "PGY-1") assignedPGY1 += 1;
        if (resident.pgy === "PGY-2") assignedPGY2 += 1;
        if (resident.pgy === "PGY-3") assignedPGY3 += 1;
      }

      const assignedSenior = assignedPGY2 + assignedPGY3;

      const issues = [
        compareRequirement("PGY1", rotation.requiredPGY1, assignedPGY1),
        compareRequirement("PGY2", rotation.requiredPGY2, assignedPGY2),
        compareRequirement("PGY3", rotation.requiredPGY3, assignedPGY3),
        compareRequirement("Senior", rotation.requiredSenior, assignedSenior),
      ].filter(Boolean);

      return {
        rotationId: rotation.id,
        rotationName: rotation.name,
        requiredPGY1: rotation.requiredPGY1,
        assignedPGY1,
        requiredPGY2: rotation.requiredPGY2,
        assignedPGY2,
        requiredPGY3: rotation.requiredPGY3,
        assignedPGY3,
        requiredSenior: rotation.requiredSenior,
        assignedSenior,
        issues,
      };
    });

    const rotationIssueCount = rotationValidations.reduce(
      (count, item) => count + item.issues.length,
      0
    );

    const issueCount =
      rotationIssueCount + missingResidents.length + duplicateResidents.length;

    const assignedResidents = assignedResidentIds.size;
    const totalResidents = activeResidents.length;

    const completionPercent =
      totalResidents === 0
        ? 0
        : Math.round((assignedResidents / totalResidents) * 100);

    return {
      block,
      assignedResidents,
      totalResidents,
      missingResidents,
      duplicateResidents,
      rotationValidations,
      issueCount,
      completionPercent,
    };
  });
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

  const [tab, setTab] = useState<BlockTab>("Everyone");
  const [search, setSearch] = useState("");
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [firstBlockEndDate, setFirstBlockEndDate] = useState("");
  const [migrationDone, setMigrationDone] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState("");
  const [editingCell, setEditingCell] = useState<{
    resident: Resident;
    block: AcademicBlock;
    assignment?: BlockAssignment;
  } | null>(null);

  const pageError = error || rotationsError || assignmentsError;
  const pageLoading = loading || rotationsLoading || assignmentsLoading;

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
        .filter((resident) => {
          if (tab === "Everyone") return true;
          return resident.pgy === tab;
        })
        .filter((resident) => {
          const text =
            `${resident.displayName} ${resident.firstName} ${resident.lastName} ${resident.email} ${resident.pgy}`.toLowerCase();

          return text.includes(search.toLowerCase());
        })
        .sort((a, b) => {
          const pgyOrder = a.pgy.localeCompare(b.pgy);
          if (pgyOrder !== 0) return pgyOrder;
          return a.displayName.localeCompare(b.displayName);
        }),
    [residents, search, tab]
  );

  const activeRotations = useMemo(
    () =>
      rotations
        .filter((rotation) => rotation.active)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [rotations]
  );

  const blockValidations = useMemo(
    () =>
      buildBlockValidations({
        blocks: displayedBlocks,
        assignments,
        residents,
        rotations: activeRotations,
      }),
    [activeRotations, assignments, displayedBlocks, residents]
  );

  const validationSummary = useMemo(() => {
    const totalBlocks = blockValidations.length;
    const completeBlocks = blockValidations.filter(
      (item) => item.issueCount === 0 && item.completionPercent === 100
    ).length;
    const totalIssues = blockValidations.reduce(
      (sum, item) => sum + item.issueCount,
      0
    );

    const averageCompletion =
      totalBlocks === 0
        ? 0
        : Math.round(
            blockValidations.reduce(
              (sum, item) => sum + item.completionPercent,
              0
            ) / totalBlocks
          );

    return {
      totalBlocks,
      completeBlocks,
      totalIssues,
      averageCompletion,
    };
  }, [blockValidations]);

  const assignmentsByResidentBlock = useMemo(() => {
    const grouped: Record<string, BlockAssignment> = {};
    for (const assignment of assignments) {
      grouped[`${assignment.residentId}_${assignment.blockId}`] = assignment;
    }
    return grouped;
  }, [assignments]);

  const rotationCountsByResident = useMemo(() => {
    const visibleResidentIds = new Set(activeResidents.map((resident) => resident.id));
    const displayedBlockIds = new Set(displayedBlocks.map((block) => block.id));

    const grouped: Record<string, Record<string, number>> = {};

    for (const resident of activeResidents) {
      grouped[resident.id] = {};
    }

    for (const assignment of assignments) {
      if (!visibleResidentIds.has(assignment.residentId)) continue;
      if (!displayedBlockIds.has(assignment.blockId)) continue;

      grouped[assignment.residentId][assignment.rotationName] =
        (grouped[assignment.residentId][assignment.rotationName] || 0) + 1;
    }

    return grouped;
  }, [activeResidents, assignments, displayedBlocks]);

  useEffect(() => {
    async function migrateOldGenericNightFloatAssignments() {
      if (!allowBuild) return;
      if (migrationDone) return;
      if (pageLoading) return;
      if (assignments.length === 0) return;
      if (residents.length === 0) return;
      if (activeRotations.length === 0) return;

      const residentById = new Map(residents.map((resident) => [resident.id, resident]));
      const rotationById = new Map(activeRotations.map((rotation) => [rotation.id, rotation]));

      const genericAssignments = assignments.filter(isGenericNightFloatAssignment);

      if (genericAssignments.length === 0) {
        setMigrationDone(true);
        return;
      }

      let migrated = 0;

      for (const assignment of genericAssignments) {
        const resident = residentById.get(assignment.residentId);
        if (!resident) continue;

        const targetRotationId = pickExactNightFloatRotationId(
          resident,
          assignment.notes || ""
        );

        const targetRotation = rotationById.get(targetRotationId);
        if (!targetRotation) continue;

        await saveAssignment({
          ...assignment,
          rotationId: targetRotation.id,
          rotationName: targetRotation.name,
          notes: assignment.notes || "",
          updatedAt: new Date().toISOString(),
        });

        migrated += 1;
      }

      if (migrated > 0) {
        setMigrationMessage(
          `Migrated ${migrated} old generic Night Float assignment${migrated === 1 ? "" : "s"} to exact NF rotations. Please review PGY1/PGY2 location if any old assignment did not have 4N/3W notes.`
        );
      }

      setMigrationDone(true);
    }

    migrateOldGenericNightFloatAssignments();
  }, [
    activeRotations,
    allowBuild,
    assignments,
    migrationDone,
    pageLoading,
    residents,
    saveAssignment,
  ]);

  async function handleSaveBlocks() {
    if (!allowBuild || previewBlocks.length === 0) return;
    await saveBlocks(previewBlocks);
  }

  async function handleSeedRotations() {
    if (!allowBuild) return;
    await seedRotations();
    setMigrationDone(false);
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

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={1.5}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={850} sx={{ lineHeight: 1 }}>
            Block Schedule
          </Typography>
          <Typography color="text.secondary" fontSize={14}>
            Compact rotation matrix by academic block with validation.
          </Typography>
        </Box>

        <TextField
          size="small"
          label="Search resident"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: "100%", md: 260 } }}
        />
      </Stack>

      {!allowBuild && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access. Chiefs, program coordinators, and admins can
          edit block assignments.
        </Alert>
      )}

      {migrationMessage && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {migrationMessage}
        </Alert>
      )}

      {pageError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      <Card sx={{ mb: 1.5, borderRadius: 3 }}>
        <CardContent sx={{ p: 1.5 }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", lg: "center" }}
          >
            <Box>
              <Typography fontWeight={900} fontSize={15}>
                Block Validation
              </Typography>
              <Typography color="text.secondary" fontSize={12.5}>
                Checks required coverage, missing residents, and duplicate block assignments.
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Chip
                label={`${validationSummary.completeBlocks}/${validationSummary.totalBlocks} complete`}
                size="small"
                sx={{
                  fontWeight: 900,
                  color: "#15803d",
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                }}
              />

              <Chip
                label={`${validationSummary.averageCompletion}% assigned`}
                size="small"
                sx={{
                  fontWeight: 900,
                  color: "#2563eb",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              />

              <Chip
                label={`${validationSummary.totalIssues} issue${validationSummary.totalIssues === 1 ? "" : "s"}`}
                size="small"
                sx={{
                  fontWeight: 900,
                  color: validationSummary.totalIssues === 0 ? "#15803d" : "#be123c",
                  backgroundColor: validationSummary.totalIssues === 0 ? "#ecfdf5" : "#fff1f2",
                  border: "1px solid",
                  borderColor: validationSummary.totalIssues === 0 ? "#bbf7d0" : "#fecdd3",
                }}
              />
            </Stack>
          </Stack>

          <Box sx={{ overflowX: "auto", mt: 1.25 }}>
            <Stack direction="row" spacing={0.75} sx={{ minWidth: "max-content" }}>
              {blockValidations.map((validation) => (
                <BlockValidationCard key={validation.block.id} validation={validation} />
              ))}
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 1.5, borderRadius: 2 }}>
        <CardContent sx={{ p: 1 }}>
          <Tabs
            value={tab}
            onChange={(_, value: BlockTab) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Everyone" value="Everyone" />
            <Tab label="PGY1" value="PGY-1" />
            <Tab label="PGY2" value="PGY-2" />
            <Tab label="PGY3" value="PGY-3" />
          </Tabs>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, borderRadius: 3, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}>
        <CardContent sx={{ p: 1.25 }}>
          {pageLoading ? (
            <Stack alignItems="center" sx={{ py: 5 }}>
              <CircularProgress />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Loading block schedule...
              </Typography>
            </Stack>
          ) : displayedBlocks.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              No blocks found for this academic year.
            </Typography>
          ) : (
            <Box
              sx={{
                overflow: "auto",
                maxHeight: "calc(100vh - 300px)",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `155px repeat(${displayedBlocks.length}, 108px)`,
                  minWidth: 155 + displayedBlocks.length * 108,
                }}
              >
                <Box sx={topLeftCell}>Resident</Box>

                {displayedBlocks.map((block) => {
                  const validation = blockValidations.find((item) => item.block.id === block.id);
                  const status = validation
                    ? validationColor(validation.issueCount, validation.completionPercent)
                    : validationColor(1, 0);

                  return (
                    <Box key={block.id} sx={headerCell}>
                      <Typography fontWeight={900} fontSize={11.5}>
                        {block.name.replace("Block ", "B")}
                      </Typography>
                      <Typography variant="caption" fontSize={10.5}>
                        {block.startDate.slice(5)} → {block.endDate.slice(5)}
                      </Typography>
                      <Box
                        sx={{
                          mt: 0.35,
                          mx: "auto",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: status.color,
                        }}
                      />
                    </Box>
                  );
                })}

                {activeResidents.map((resident) => (
                  <Box key={resident.id} sx={{ display: "contents" }}>
                    <Box sx={residentCell}>
                      <Typography fontWeight={800} fontSize={12}>
                        {resident.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontSize={10.5}>
                        {resident.pgy}
                      </Typography>
                    </Box>

                    {displayedBlocks.map((block) => {
                      const assignment =
                        assignmentsByResidentBlock[
                          `${resident.id}_${block.id}`
                        ];

                      const color = assignment
                        ? rotationColor(assignment.rotationName)
                        : undefined;

                      return (
                        <Box
                          key={`${resident.id}-${block.id}`}
                          sx={{
                            ...matrixCell,
                            cursor: allowBuild ? "pointer" : "default",
                            backgroundColor: assignment ? color?.bg : "white",
                            borderColor: assignment ? color?.border : "divider",
                            "&:hover": {
                              backgroundColor: assignment ? color?.bg : "#f8fafc",
                            },
                          }}
                          onClick={() => {
                            if (!allowBuild) return;
                            setEditingCell({ resident, block, assignment });
                          }}
                        >
                          {assignment ? (
                            <Stack spacing={0.2}>
                              <Typography
                                fontWeight={850}
                                fontSize={11.5}
                                sx={{ color: color?.color }}
                              >
                                {assignment.rotationName}
                              </Typography>

                              {assignment.notes && (
                                <Typography variant="caption" color="text.secondary" fontSize={10}>
                                  {assignment.notes}
                                </Typography>
                              )}

                              {allowBuild && (
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
                                    handleRemoveAssignment(assignment.id);
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
        </CardContent>
      </Card>

      <Card sx={{ mb: 2, borderRadius: 3 }}>
        <CardContent sx={{ p: 1.5 }}>
          <Typography variant="h6" fontWeight={850} sx={{ mb: 1 }}>
            Resident Block Counts
          </Typography>

          {activeResidents.length === 0 ? (
            <Typography color="text.secondary">No residents found.</Typography>
          ) : (
            <Stack spacing={0.75}>
              {activeResidents.map((resident) => {
                const counts = rotationCountsByResident[resident.id] || {};
                const entries = Object.entries(counts).sort((a, b) =>
                  a[0].localeCompare(b[0])
                );

                return (
                  <Box
                    key={resident.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "160px 1fr" },
                      gap: 1,
                      alignItems: "center",
                      borderBottom: "1px solid",
                      borderColor: "#eef2f7",
                      py: 0.75,
                    }}
                  >
                    <Box>
                      <Typography fontSize={13} fontWeight={800}>
                        {resident.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {resident.pgy}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {entries.length > 0 ? (
                        entries.map(([rotationName, count]) => {
                          const color = rotationColor(rotationName);

                          return (
                            <Chip
                              key={`${resident.id}-${rotationName}`}
                              label={`${rotationName}: ${count}`}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: 11,
                                fontWeight: 800,
                                color: color.color,
                                backgroundColor: color.bg,
                                border: "1px solid",
                                borderColor: color.border,
                              }}
                            />
                          );
                        })
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No blocks assigned.
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      {allowBuild && (
        <Card sx={{ borderRadius: 3, opacity: 0.92 }}>
          <CardContent sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={850} sx={{ mb: 1 }}>
              Academic Year Setup
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                size="small"
                label="Academic Year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026-2027"
                sx={{ width: { xs: "100%", md: 170 } }}
              />

              <TextField
                size="small"
                label="First Block End Date"
                type="date"
                value={firstBlockEndDate}
                onChange={(e) => setFirstBlockEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ width: { xs: "100%", md: 190 } }}
              />

              <Button
                variant="contained"
                size="small"
                onClick={handleSaveBlocks}
                disabled={previewBlocks.length === 0}
                sx={{ textTransform: "none" }}
              >
                Save Academic Blocks
              </Button>

              <Button
                variant="outlined"
                size="small"
                onClick={handleSeedRotations}
                sx={{ textTransform: "none" }}
              >
                Seed / Update Rotations
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Block 1 starts July 1. Next blocks start Thursday. Last block ends June 30.
            </Typography>
          </CardContent>
        </Card>
      )}

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

function BlockValidationCard({ validation }: { validation: BlockValidation }) {
  const status = validationColor(validation.issueCount, validation.completionPercent);
  const rotationIssues = validation.rotationValidations.filter(
    (item) => item.issues.length > 0
  );

  return (
    <Box
      sx={{
        width: 230,
        minHeight: 126,
        p: 1,
        borderRadius: 2,
        backgroundColor: status.bg,
        border: "1px solid",
        borderColor: status.border,
      }}
    >
      <Stack spacing={0.65}>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography fontSize={12.5} fontWeight={950} sx={{ color: status.color }}>
              {validation.block.name.replace("Block ", "B")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {validation.assignedResidents}/{validation.totalResidents} assigned
            </Typography>
          </Box>

          <Chip
            label={`${validation.completionPercent}%`}
            size="small"
            sx={{
              height: 20,
              fontSize: 10.5,
              fontWeight: 900,
              color: status.color,
              backgroundColor: "#ffffff",
              border: "1px solid",
              borderColor: status.border,
            }}
          />
        </Stack>

        <Chip
          label={status.label}
          size="small"
          sx={{
            width: "fit-content",
            height: 19,
            fontSize: 10,
            fontWeight: 900,
            color: status.color,
            backgroundColor: "#ffffff",
            border: "1px solid",
            borderColor: status.border,
          }}
        />

        {validation.issueCount === 0 && validation.completionPercent === 100 ? (
          <Typography fontSize={11.5} fontWeight={800} sx={{ color: "#15803d" }}>
            ✓ No issues found
          </Typography>
        ) : (
          <Stack spacing={0.35}>
            {validation.missingResidents.length > 0 && (
              <Typography fontSize={11} sx={{ color: "#be123c" }}>
                ⚠ {validation.missingResidents.length} resident{validation.missingResidents.length === 1 ? "" : "s"} missing
              </Typography>
            )}

            {validation.duplicateResidents.length > 0 && (
              <Typography fontSize={11} sx={{ color: "#be123c" }}>
                ⚠ {validation.duplicateResidents.length} duplicate resident{validation.duplicateResidents.length === 1 ? "" : "s"}
              </Typography>
            )}

            {rotationIssues.slice(0, 3).map((item) => (
              <Typography key={item.rotationId} fontSize={11} sx={{ color: "#b45309" }}>
                ⚠ {item.rotationName}: {item.issues[0]}
              </Typography>
            ))}

            {rotationIssues.length > 3 && (
              <Typography fontSize={11} color="text.secondary">
                + {rotationIssues.length - 3} more rotation issue{rotationIssues.length - 3 === 1 ? "" : "s"}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
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
  fontWeight: 900,
  backgroundColor: "#e2e8f0",
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  position: "sticky",
  top: 0,
  zIndex: 3,
  textAlign: "center",
};

const residentCell = {
  p: 0.65,
  backgroundColor: "#f8fafc",
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  position: "sticky",
  left: 0,
  zIndex: 2,
};

const matrixCell = {
  minHeight: 52,
  p: 0.55,
  borderRight: "1px solid",
  borderBottom: "1px solid",
  borderColor: "divider",
  backgroundColor: "white",
};