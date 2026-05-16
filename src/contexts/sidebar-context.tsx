"use client";

import { IssueType } from "@/features/tasks/types";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";

interface SidebarPrefill {
  projectId?: string;
  projectName?: string;
  issueType?: IssueType;
  sprintId?: string;
  versionId?: string;
}

interface SidebarContextValue {
  prefill: SidebarPrefill;
  setPrefill: (prefill: SidebarPrefill) => void;
  clearPrefill: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefillState] = useState<SidebarPrefill>({});

  const setPrefill = useCallback((newPrefill: SidebarPrefill) => {
    setPrefillState((prev) => ({ ...prev, ...newPrefill }));
  }, []);

  const clearPrefill = useCallback(() => {
    setPrefillState({});
  }, []);

  const value = useMemo(
    () => ({ prefill, setPrefill, clearPrefill }),
    [prefill, setPrefill, clearPrefill]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebarContext must be used within SidebarProvider");
  return context;
}

export function usePrefill() {
  const { prefill, setPrefill, clearPrefill } = useSidebarContext();
  return { prefill, setPrefill, clearPrefill };
}

/** Stub — sidebar is fixed width in Chronicle Phase 1. Kept for component compatibility. */
export function useSidebarCollapsed() {
  return { isCollapsed: false, toggleSidebar: () => {} };
}
