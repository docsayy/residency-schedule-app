export type AppRole =
  | "Resident"
  | "Chief Resident"
  | "Attending"
  | "Program Coordinator"
  | "Admin";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: AppRole;
  active: boolean;
  createdAt: string;
}