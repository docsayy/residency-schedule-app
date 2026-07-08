import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import type { BlockAssignment } from "../types/blockAssignment";

const blockAssignmentsCollection = collection(db, "blockAssignments");

export async function getBlockAssignments(): Promise<BlockAssignment[]> {
  const snapshot = await getDocs(blockAssignmentsCollection);

  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<BlockAssignment, "id">),
    }))
    .sort((a, b) => {
      if (a.academicYear !== b.academicYear) {
        return a.academicYear.localeCompare(b.academicYear);
      }

      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber - b.blockNumber;
      }

      return a.residentName.localeCompare(b.residentName);
    });
}

export async function createBlockAssignment(
  assignment: Omit<BlockAssignment, "id">
): Promise<string> {
  const docRef = await addDoc(blockAssignmentsCollection, assignment);
  return docRef.id;
}

export async function updateBlockAssignment(
  assignment: BlockAssignment
): Promise<void> {
  const ref = doc(db, "blockAssignments", assignment.id);
  const { id, ...data } = assignment;
  await updateDoc(ref, data);
}

export async function deleteBlockAssignmentById(id: string): Promise<void> {
  const ref = doc(db, "blockAssignments", id);
  await deleteDoc(ref);
}