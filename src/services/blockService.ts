import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import type { AcademicBlock } from "../types/block";

const blocksCollection = collection(db, "academicBlocks");

export async function getAcademicBlocks(): Promise<AcademicBlock[]> {
  const q = query(blocksCollection, orderBy("startDate", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<AcademicBlock, "id">),
  }));
}

export async function saveAcademicBlocks(blocks: AcademicBlock[]) {
  for (const block of blocks) {
    const { id, ...data } = block;
    await setDoc(doc(db, "academicBlocks", id), data);
  }
}