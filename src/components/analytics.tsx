import { ProjectAnalyticsResponseType } from "@/features/projects/api/use-get-project-analytics";
import { AnalyticsCard } from "./analytics-card";

export const Analytics = ({ data }: ProjectAnalyticsResponseType) => {
	if (!data) return null;
	return (
		<div className="grid grid-cols-2 lg:grid-cols-5 gap-3 w-full shrink-0">
			<div className="bg-card border border-border rounded-lg">
				<AnalyticsCard
					title="Total tasks"
					value={data.taskCount}
					variant={data.taskDifference > 0 ? "up" : "down"}
					increaseValue={data.taskDifference}
				/>
			</div>
			<div className="bg-card border border-border rounded-lg">
				<AnalyticsCard
					title="Assigned tasks"
					value={data.assignedTaskCount}
					variant={data.assignedTaskDifference > 0 ? "up" : "down"}
					increaseValue={data.assignedTaskDifference}
				/>
			</div>
			<div className="bg-card border border-border rounded-lg">
				<AnalyticsCard
					title="Completed tasks"
					value={data.completedTaskCount}
					variant={data.completedTaskDifference > 0 ? "up" : "down"}
					increaseValue={data.completedTaskDifference}
				/>
			</div>
			<div className="bg-card border border-border rounded-lg">
				<AnalyticsCard
					title="Overdue tasks"
					value={data.overdueTaskCount}
					variant={data.overdueTaskDifference > 0 ? "up" : "down"}
					increaseValue={data.overdueTaskDifference}
					inverted
				/>
			</div>
			<div className="bg-card border border-border rounded-lg col-span-2 lg:col-span-1">
				<AnalyticsCard
					title="Incomplete tasks"
					value={data.incompleteTaskCount}
					variant={data.incompleteTaskDifference > 0 ? "up" : "down"}
					increaseValue={data.incompleteTaskDifference}
					inverted
				/>
			</div>
		</div>
	);
};
