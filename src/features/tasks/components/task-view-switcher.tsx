import { DottedSeperator } from "@/components/dotted-seperator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusIcon } from "lucide-react";

export const TaskViewSwitcher = () => {
	return (
		<Tabs className="flex-1 w-full border rounded-lg">
			<div className="h-full flex flex-col overflow-auto p-4">
				<div className="flex flex-col gap-y-2 lg:flex-row justify-between items-center">
					<TabsList className="w-full lg:w-auto">
						<TabsTrigger
							className="h-8 w-full lg:w-auto"
							value="table"
						>
							Table
						</TabsTrigger>
						<TabsTrigger
							className="h-8 w-full lg:w-auto"
							value="kanban"
						>
							Kanban
						</TabsTrigger>
						<TabsTrigger
							className="h-8 w-full lg:w-auto"
							value="calender"
						>
							Calender
						</TabsTrigger>
					</TabsList>
					<Button className="w-full lg:w-auto" size="sm">
						<PlusIcon className="size-4 mr-2" />
						New
					</Button>
				</div>
				<DottedSeperator className="my-4" />
				Data filters
				<DottedSeperator className="my-4" />
				<div>
					<TabsContent className="mt-0" value="table">
						Data Table
					</TabsContent>
					<TabsContent className="mt-0" value="kanban">
						Data Kanban
					</TabsContent>
					<TabsContent className="mt-0" value="calender">
						Data Calender
					</TabsContent>
				</div>
			</div>
		</Tabs>
	);
};
