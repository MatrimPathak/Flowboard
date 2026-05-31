import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { generateDocId } from "@/lib/docs-utils";

export type ChronicleDocument = {
  id: string;
  workspaceId?: string;
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

type StoredFields = Omit<ChronicleDocument, "id" | "workspaceId" | "projectId">;

const wsColl = (wid: string) => collection(db, "workspaces", wid, "docs");
const projColl = (wid: string, pid: string) => collection(db, "workspaces", wid, "projects", pid, "docs");
const scopedColl = (wid: string, pid?: string) => pid ? projColl(wid, pid) : wsColl(wid);

function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function toDoc(raw: Record<string, unknown>, id: string, wid: string, pid: string | undefined): ChronicleDocument {
  const { workspaceId: _w, projectId: _p, ...rest } = raw as Partial<ChronicleDocument>;
  return { id, workspaceId: wid, ...(pid !== undefined && { projectId: pid }), ...(rest as StoredFields) };
}

export async function listDocuments(workspaceId: string, projectId?: string): Promise<ChronicleDocument[]> {
  if (projectId) {
    const [wsSnap, projSnap] = await Promise.all([
      getDocs(wsColl(workspaceId)),
      getDocs(projColl(workspaceId, projectId)),
    ]);
    return [
      ...wsSnap.docs.map((d) => toDoc(d.data() as Record<string, unknown>, d.id, workspaceId, undefined)),
      ...projSnap.docs.map((d) => toDoc(d.data() as Record<string, unknown>, d.id, workspaceId, projectId)),
    ].sort((a, b) => a.order - b.order);
  }
  const snap = await getDocs(wsColl(workspaceId));
  return snap.docs
    .map((d) => toDoc(d.data() as Record<string, unknown>, d.id, workspaceId, undefined))
    .sort((a, b) => a.order - b.order);
}

export function subscribeDocuments(
  workspaceId: string,
  projectId: string | undefined,
  onData: (docs: ChronicleDocument[]) => void,
): () => void {
  if (projectId) {
    let wsDocs: ChronicleDocument[] = [];
    let projDocs: ChronicleDocument[] = [];
    const emit = () => onData([...wsDocs, ...projDocs].sort((a, b) => a.order - b.order));
    const unsubWS = onSnapshot(wsColl(workspaceId), (snap) => {
      wsDocs = snap.docs.map((d) => toDoc(d.data() as Record<string, unknown>, d.id, workspaceId, undefined));
      emit();
    });
    const unsubProj = onSnapshot(projColl(workspaceId, projectId), (snap) => {
      projDocs = snap.docs.map((d) => toDoc(d.data() as Record<string, unknown>, d.id, workspaceId, projectId));
      emit();
    });
    return () => { unsubWS(); unsubProj(); };
  }
  return onSnapshot(wsColl(workspaceId), (snap) => {
    onData(snap.docs.map((d) => toDoc(d.data() as Record<string, unknown>, d.id, workspaceId, undefined)).sort((a, b) => a.order - b.order));
  });
}

export async function createDocument(
  workspaceId: string,
  projectId: string | undefined,
  payload: Omit<ChronicleDocument, "id" | "workspaceId" | "projectId" | "createdAt" | "updatedAt">,
): Promise<string> {
  const id = generateDocId();
  const now = Date.now();
  await setDoc(doc(scopedColl(workspaceId, projectId), id), stripUndefined({
    ...payload,
    createdAt: now,
    updatedAt: now,
    serverCreatedAt: serverTimestamp(),
  }));
  return id;
}

export async function updateDocument(
  workspaceId: string,
  projectId: string | undefined,
  id: string,
  patch: Partial<ChronicleDocument>,
): Promise<void> {
  const { workspaceId: _w, projectId: _p, ...rest } = patch;
  await updateDoc(doc(scopedColl(workspaceId, projectId), id), stripUndefined({ ...(rest as Partial<StoredFields>), updatedAt: Date.now() }));
}

export async function deleteDocument(
  workspaceId: string,
  projectId: string | undefined,
  id: string,
): Promise<void> {
  await deleteDoc(doc(scopedColl(workspaceId, projectId), id));
}
