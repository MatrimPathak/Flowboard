import { IssueListPage } from "../_components/issue-list-page";
import { IssueType } from "@/features/tasks/types";
export default function SpikesPage() { return <IssueListPage issueType={IssueType.SPIKE} pageTitle="Spikes" />; }
