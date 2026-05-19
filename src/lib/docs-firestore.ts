import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
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
  const q = query(docsCollection, where("workspaceId", "==", workspaceId));
  const snapshot = await getDocs(q);
  let docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChronicleDocument, "id">) }));
  if (projectId !== undefined) docs = docs.filter((d) => d.projectId === projectId);
  return docs.sort((a, b) => a.order - b.order);
}

export function subscribeDocuments(
  workspaceId: string,
  projectId: string | undefined,
  onData: (docs: ChronicleDocument[]) => void,
) {
  const q = query(docsCollection, where("workspaceId", "==", workspaceId));
  return onSnapshot(q, (snapshot) => {
    let docs = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChronicleDocument, "id">) }));
    if (projectId !== undefined) docs = docs.filter((d) => d.projectId === projectId);
    onData(docs.sort((a, b) => a.order - b.order));
  });
}

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export async function createDocument(payload: Omit<ChronicleDocument, "id" | "createdAt" | "updatedAt">) {
  const now = Date.now();
  const ref = await addDoc(docsCollection, stripUndefined({
    ...payload,
    createdAt: now,
    updatedAt: now,
    serverCreatedAt: serverTimestamp(),
  }));
  return ref.id;
}

export async function updateDocument(id: string, patch: Partial<ChronicleDocument>) {
  await updateDoc(doc(db, "docs", id), stripUndefined({ ...patch, updatedAt: Date.now() }));
}

export async function deleteDocument(id: string) {
  await deleteDoc(doc(db, "docs", id));
}
