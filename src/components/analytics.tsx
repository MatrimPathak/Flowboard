import { ProjectAnalyticsResponseType } from "@/features/projects/api/use-get-project-analytics";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { AnalyticsCard } from "./analytics-card";
import { DottedSeperator } from "./dotted-seperator";

export const Analytics = ({ data }: ProjectAnalyticsResponseType) => {
	if (!data) return null;
	return (
		<ScrollArea className="border rounded-lg w-full whitespace-nowrap shrink-0">
			<div className="w-full flex flex-row">
				<div className="flex flex-1 items-center">
					<AnalyticsCard
						title="Total tasks"
						value={data.taskCount}
						variant={data.taskDifference > 0 ? "up" : "down"}
						increaseValue={data.taskDifference}
					/>
					<DottedSeperator direction="vertical" />
				</div>
				<div className="flex flex-1 items-center">
					<AnalyticsCard
						title="Assigned tasks"
						value={data.assignedTaskCount}
						variant={
							data.assignedTaskDifference > 0 ? "up" : "down"
						}
						increaseValue={data.assignedTaskDifference}
					/>
					<DottedSeperator direction="vertical" />
				</div>
				<div className="flex flex-1 items-center">
					<AnalyticsCard
						title="Completed tasks"
						value={data.completedTaskCount}
						variant={
							data.completedTaskDifference > 0 ? "up" : "down"
						}
						increaseValue={data.completedTaskDifference}
					/>
					<DottedSeperator direction="vertical" />
				</div>
				<div className="flex flex-1 items-center">
					<AnalyticsCard
						title="Overdue tasks"
						value={data.overdueTaskCount}
						variant={data.overdueTaskDifference > 0 ? "up" : "down"}
						increaseValue={data.overdueTaskDifference}
					/>
					<DottedSeperator direction="vertical" />
				</div>
				<div className="flex flex-1 items-center">
					<AnalyticsCard
						title="Incomplete tasks"
						value={data.incompleteTaskCount}
						variant={
							data.incompleteTaskDifference > 0 ? "up" : "down"
						}
						increaseValue={data.incompleteTaskDifference}
					/>
				</div>
			</div>
			<ScrollBar orientation="horizontal" />
		</ScrollArea>
	);
};
