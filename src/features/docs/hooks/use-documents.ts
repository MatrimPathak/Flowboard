"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { createDocument, deleteDocument, listDocuments, subscribeDocuments, type ChronicleDocument, updateDocument } from "@/lib/docs-firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export const useDocuments = (workspaceId: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["docs", workspaceId, projectId ?? "workspace"], [workspaceId, projectId]);

  // Firebase Auth uses server-side session cookies; the client SDK has no signed-in
  // user. Exchange the session cookie for a custom token so Firestore rules pass.
  const [firebaseReady, setFirebaseReady] = useState(!!auth.currentUser);

  useEffect(() => {
    if (auth.currentUser) { setFirebaseReady(true); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) { setFirebaseReady(true); return; }
      setFirebaseReady(false);
      try {
        const r = await fetch("/api/auth/firebase-token");
        if (!r.ok) throw new Error("token fetch failed");
        const { token }: { token?: string } = await r.json();
        if (!token) throw new Error("missing token");
        await signInWithCustomToken(auth, token);
        // firebaseReady flips to true via the next onAuthStateChanged(user) call
      } catch {
        setFirebaseReady(false);
      }
    });
    return unsub;
  }, []);

  const docsQuery = useQuery({
    queryKey,
    queryFn: () => listDocuments(workspaceId, projectId),
    enabled: !!workspaceId && firebaseReady,
  });

  useEffect(() => {
    if (!workspaceId || !firebaseReady) return;
    const unsubscribe = subscribeDocuments(workspaceId, projectId, (docs) => {
      queryClient.setQueryData(queryKey, docs);
    });
    return unsubscribe;
  }, [workspaceId, projectId, queryClient, queryKey, firebaseReady]);

  const createDoc = useMutation({
    mutationFn: async (data: Partial<ChronicleDocument>) => {
      return createDocument({
        workspaceId,
        projectId,
        title: data.title ?? "Untitled",
        content: data.content ?? { type: "doc", content: [] },
        icon: data.icon,
        coverImage: data.coverImage,
        parentId: data.parentId,
        order: data.order ?? Date.now(),
        createdBy: auth.currentUser?.uid ?? "unknown",
        linkedWorkItems: data.linkedWorkItems ?? [],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateDoc = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ChronicleDocument> }) => updateDocument(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const removeDoc = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { docsQuery, createDoc, updateDoc, removeDoc };
};
