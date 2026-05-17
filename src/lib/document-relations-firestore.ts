import { db } from "@/lib/firebase";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";

export type DocumentRelation = {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationType: string;
};

const relationsCollection = collection(db, "document_relations");

export async function listRelationsForSource(sourceType: string, sourceId: string) {
  const snap = await getDocs(query(relationsCollection, where("sourceType", "==", sourceType), where("sourceId", "==", sourceId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DocumentRelation, "id">) }));
}

export async function createRelation(relation: Omit<DocumentRelation, "id">) {
  const ref = await addDoc(relationsCollection, relation);
  return ref.id;
}
