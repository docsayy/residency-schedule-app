import type { AppRole } from "../types/userProfile";

export function canManageResidents(role?: AppRole | null) {
  return (
    role === "Admin" ||
    role === "Chief Resident" ||
    role === "Program Coordinator"
  );
}

export function canBuildSchedule(role?: AppRole | null) {
  return (
    role === "Admin" ||
    role === "Chief Resident" ||
    role === "Program Coordinator"
  );
}