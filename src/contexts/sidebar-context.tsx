"use client";

import { IssueType } from "@/features/tasks/types";
import {
	createContext,
	useContext,
	useState,
	useCallback,
	useMemo,
	useEffect,
	ReactNode,
} from "react";
import { useMedia } from "@/hooks/use-media";

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
	isCollapsed: boolean;
	toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(
	undefined
);

export function SidebarProvider({ children }: { children: ReactNode }) {
	const [prefill, setPrefillState] = useState<SidebarPrefill>({});
	const [isCollapsed, setIsCollapsed] = useState(false);
	const isTablet = useMedia("(max-width: 1279px)");

	useEffect(() => {
		const saved = localStorage.getItem("chronicle-sidebar");
		if (saved !== null) {
			setIsCollapsed(saved === "true");
		} else {
			setIsCollapsed(isTablet);
		}
	}, [isTablet]);

	const setPrefill = useCallback((newPrefill: SidebarPrefill) => {
		setPrefillState((prev) => ({ ...prev, ...newPrefill }));
	}, []);

	const clearPrefill = useCallback(() => {
		setPrefillState({});
	}, []);

	const toggleSidebar = useCallback(() => {
		setIsCollapsed((prev) => {
			const next = !prev;
			localStorage.setItem("chronicle-sidebar", String(next));
			return next;
		});
	}, []);

	const value = useMemo(
		() => ({
			prefill,
			setPrefill,
			clearPrefill,
			isCollapsed,
			toggleSidebar,
		}),
		[prefill, setPrefill, clearPrefill, isCollapsed, toggleSidebar]
	);

	return (
		<SidebarContext.Provider value={value}>
			{children}
		</SidebarContext.Provider>
	);
}

export function useSidebarContext() {
	const context = useContext(SidebarContext);
	if (!context) {
		throw new Error(
			"useSidebarContext must be used within a SidebarProvider"
		);
	}
	return context;
}

export function usePrefill() {
	const { prefill, setPrefill, clearPrefill } = useSidebarContext();
	return { prefill, setPrefill, clearPrefill };
}

export function useSidebarCollapsed() {
	const { isCollapsed, toggleSidebar } = useSidebarContext();
	return { isCollapsed, toggleSidebar };
}
