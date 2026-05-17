import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

export type ChronicleDocument = {
  id: string;
  workspaceId: string;
  projectId?: string;
  title: string;
  icon?: string;
  coverImage?: string;
  content: unknown;
  parentId?: string;
  order: number;
  createdBy: string;
  linkedWorkItems: string[];
  createdAt: number;
  updatedAt: number;
};

const docsCollection = collection(db, "docs");

export async function listDocuments(workspaceId: string, projectId?: string) {
  const constraints = [where("workspaceId", "==", workspaceId), orderBy("order", "asc")];
  if (projectId) constraints.unshift(where("projectId", "==", projectId));
  const snapshot = await getDocs(query(docsCollection, ...constraints));
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChronicleDocument, "id">) }));
}

export async function createDocument(payload: Omit<ChronicleDocument, "id" | "createdAt" | "updatedAt">) {
  const now = Date.now();
  const ref = await addDoc(docsCollection, {
    ...payload,
    createdAt: now,
    updatedAt: now,
    serverCreatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument(id: string, patch: Partial<ChronicleDocument>) {
  await updateDoc(doc(db, "docs", id), { ...patch, updatedAt: Date.now() });
}

export async function deleteDocument(id: string) {
  await deleteDoc(doc(db, "docs", id));
}
