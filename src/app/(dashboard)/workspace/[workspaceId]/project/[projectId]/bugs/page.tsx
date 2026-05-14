import { IssueListPage } from "../_components/issue-list-page";
import { IssueType } from "@/features/tasks/types";
export default function BugsPage() { return <IssueListPage issueType={IssueType.BUG} pageTitle="Bugs" />; }
