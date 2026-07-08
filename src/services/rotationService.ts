import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";
import type { RotationRequirement } from "../types/rotation";

const rotationsCollection = collection(db, "rotations");

export async function getRotations(): Promise<RotationRequirement[]> {
  const q = query(rotationsCollection, orderBy("displayOrder", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<RotationRequirement, "id">),
  }));
}

export async function seedDefaultRotations() {
  const rotations: RotationRequirement[] = [
    { id: "vacation", name: "Vacation", category: "Vacation", requiredPGY1: 0, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 0, active: true, displayOrder: 1 },
    { id: "2n", name: "2N", category: "Ward", requiredPGY1: 3, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 1, active: true, displayOrder: 2 },
    { id: "2n-ccu", name: "2N-CCU", category: "Ward", requiredPGY1: 0, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 1, active: true, displayOrder: 3 },
    { id: "4n", name: "4N", category: "Ward", requiredPGY1: 4, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 2, active: true, displayOrder: 4 },
    { id: "tele", name: "Tele", category: "Ward", requiredPGY1: 3, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 2, active: true, displayOrder: 5 },
    { id: "pulm", name: "Pulm", category: "Consult", requiredPGY1: 0, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 2, active: true, displayOrder: 6 },
    { id: "ccu-cardio", name: "CCU/Cardio", category: "Consult", requiredPGY1: 0, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 1, active: true, displayOrder: 7 },
    { id: "ambulatory", name: "Ambulatory", category: "Ambulatory", requiredPGY1: 0, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 0, active: true, displayOrder: 8 },
    { id: "neuro", name: "Neuro", category: "Consult", requiredPGY1: 0, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 1, active: true, displayOrder: 9 },
    { id: "id", name: "ID", category: "Consult", requiredPGY1: 1, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 1, active: true, displayOrder: 10 },
    { id: "night-float", name: "Night Float", category: "Night Float", requiredPGY1: 2, requiredPGY2: 0, requiredPGY3: 1, requiredSenior: 2, active: true, displayOrder: 11 },
    { id: "3w", name: "3W", category: "Ward", requiredPGY1: 2, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 1, active: true, displayOrder: 12 },
    { id: "micu", name: "MICU", category: "ICU", requiredPGY1: 4, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 2, active: true, displayOrder: 13 },
    { id: "gi", name: "GI", category: "Consult", requiredPGY1: 0, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 1, active: true, displayOrder: 14 },
    { id: "heme-onc", name: "Heme-Onc", category: "Consult", requiredPGY1: 0, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 1, active: true, displayOrder: 15 },
    { id: "nephro-rheum-endo", name: "Nephro-Rheum-Endo", category: "Consult", requiredPGY1: 0, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 1, active: true, displayOrder: 16 },
    { id: "admission", name: "Admission", category: "Admission", requiredPGY1: 1, requiredPGY2: 0, requiredPGY3: 0, requiredSenior: 1, active: true, displayOrder: 17 },
    { id: "jeopardy", name: "Jeopardy", category: "Jeopardy", requiredPGY1: 1, requiredPGY2: 1, requiredPGY3: 1, requiredSenior: 0, active: true, displayOrder: 18 },
  ];

  for (const rotation of rotations) {
    const { id, ...data } = rotation;
    await setDoc(doc(db, "rotations", id), data);
  }
}