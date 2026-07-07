import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import type { AppRole, UserProfile } from "../types/userProfile";

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return snap.data() as UserProfile;
}

export async function createUserProfile(params: {
  uid: string;
  email: string;
  displayName?: string;
  role?: AppRole;
}) {
  const profile: UserProfile = {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName || params.email.split("@")[0],
    role: params.role || "Resident",
    active: true,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "users", params.uid), profile);
  return profile;
}

export async function updateUserRole(uid: string, role: AppRole) {
  await updateDoc(doc(db, "users", uid), { role });
}