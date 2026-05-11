"use client";

import { IssueTypeList } from "@/features/tasks/components/issue-type-list";
import { IssueType } from "@/features/tasks/types";

interface TaskListClientProps {
	issueType: IssueType;
	pageTitle: string;
}

export const TaskListClient = ({ issueType, pageTitle }: TaskListClientProps) => {
	return <IssueTypeList issueType={issueType} pageTitle={pageTitle} />;
};