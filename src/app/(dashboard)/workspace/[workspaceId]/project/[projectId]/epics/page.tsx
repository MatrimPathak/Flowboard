import { IssueListPage } from "../_components/issue-list-page";
import { IssueType } from "@/features/tasks/types";
export default function EpicsPage() { return <IssueListPage issueType={IssueType.EPIC} pageTitle="Epics" />; }
