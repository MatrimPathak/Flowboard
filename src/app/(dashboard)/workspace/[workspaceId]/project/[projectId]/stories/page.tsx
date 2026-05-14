import { IssueListPage } from "../_components/issue-list-page";
import { IssueType } from "@/features/tasks/types";
export default function StoriesPage() { return <IssueListPage issueType={IssueType.STORY} pageTitle="Stories" />; }
