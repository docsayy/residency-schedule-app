import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import type { AttendingScheduleAssignment } from "../types/attendingSchedule";

const attendingScheduleCollection = collection(
  db,
  "attendingScheduleAssignments"
);

export async function getAttendingScheduleAssignments(): Promise<
  AttendingScheduleAssignment[]
> {
  const q = query(attendingScheduleCollection, orderBy("startDate", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<AttendingScheduleAssignment, "id">),
  }));
}

export async function createAttendingScheduleAssignment(
  assignment: Omit<AttendingScheduleAssignment, "id">
): Promise<string> {
  const docRef = await addDoc(attendingScheduleCollection, assignment);
  return docRef.id;
}

export async function updateAttendingScheduleAssignment(
  assignment: AttendingScheduleAssignment
): Promise<void> {
  const ref = doc(db, "attendingScheduleAssignments", assignment.id);
  const { id, ...data } = assignment;
  await updateDoc(ref, data);
}

export async function deleteAttendingScheduleAssignmentById(
  id: string
): Promise<void> {
  const ref = doc(db, "attendingScheduleAssignments", id);
  await deleteDoc(ref);
}