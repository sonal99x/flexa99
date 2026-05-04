import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: "doctor" | "patient";
  createdAt: unknown;
}

// Which exercise numbers (1–6) are assigned to a patient
export interface Assignment {
  doctorUid: string;
  doctorName: string;
  patientUid: string;
  exercises: number[];
  updatedAt: unknown;
}

export interface ExerciseData {
  value: number;
  reps: number;
  sets: number;
}

// One saved session snapshot
export interface SessionLog {
  id: string;
  patientUid: string;
  savedAt: unknown;
  readings: {
    ex1: ExerciseData;
    ex2: ExerciseData;
    ex3: ExerciseData;
    ex4: ExerciseData;
    ex5: ExerciseData;
    ex6: ExerciseData;
  };
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, "uid" | "createdAt">) {
  await setDoc(doc(db, "users", uid), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function getAllPatients(): Promise<UserProfile[]> {
  const q = query(collection(db, "users"), where("role", "==", "patient"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as UserProfile);
}

export async function getAssignmentsForPatients(patients: UserProfile[]): Promise<Assignment[]> {
  if (patients.length === 0) return [];
  const results = await Promise.allSettled(
    patients.map((p) => getDoc(doc(db, "assignments", p.uid)))
  );
  const assignments: Assignment[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.exists()) {
      assignments.push(result.value.data() as Assignment);
    }
  }
  return assignments;
}

export async function getAssignmentForPatient(patientUid: string): Promise<Assignment | null> {
  try {
    const snap = await getDoc(doc(db, "assignments", patientUid));
    return snap.exists() ? (snap.data() as Assignment) : null;
  } catch {
    return null;
  }
}

// Replace the full exercise list for a patient (checkbox-based bulk assign)
export async function assignExercisesToPatient(
  doctorUid: string,
  doctorName: string,
  patientUid: string,
  exerciseNumbers: number[]
): Promise<void> {
  const docRef = doc(db, "assignments", patientUid);
  let docExists = false;
  try {
    const snap = await getDoc(docRef);
    docExists = snap.exists();
  } catch {
    docExists = false;
  }

  const payload = {
    doctorUid,
    doctorName,
    patientUid,
    exercises: exerciseNumbers,
    updatedAt: serverTimestamp(),
  };

  if (docExists) {
    await updateDoc(docRef, payload);
  } else {
    await setDoc(docRef, payload);
  }
}

// Save a session with readings + reps + sets per exercise
export async function saveSession(
  patientUid: string,
  readings: SessionLog["readings"]
): Promise<void> {
  await addDoc(collection(db, "sessions", patientUid, "logs"), {
    patientUid,
    readings,
    savedAt: serverTimestamp(),
  });
}

// Delete a single session log
export async function deleteSession(patientUid: string, logId: string): Promise<void> {
  await deleteDoc(doc(db, "sessions", patientUid, "logs", logId));
}

// Get all saved sessions for a patient, newest first
export async function getSessionsForPatient(patientUid: string): Promise<SessionLog[]> {
  try {
    const q = query(
      collection(db, "sessions", patientUid, "logs"),
      orderBy("savedAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SessionLog));
  } catch {
    return [];
  }
}
