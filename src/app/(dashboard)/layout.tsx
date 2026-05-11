import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { CreateProjectModal } from "@/features/projects/components/create-project-modal";
import { CreateTaskModal } from "@/features/tasks/components/create-task-model";
import { EditTaskModal } from "@/features/tasks/components/edit-task-model";
import { CreateWorkspaceModal } from "@/features/workspaces/components/create-workspace-modal";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { CreateSprintModal } from "@/features/sprints/components/create-sprint-modal";


interface DashBoardLayoutProps {
	children?: React.ReactNode;
}

const DashBoardLayout = ({ children }: DashBoardLayoutProps) => {
	return (
		<SidebarProvider>
			<CreateWorkspaceModal />
			<CreateProjectModal />
			<CreateTaskModal />
			<EditTaskModal />
			<CreateSprintModal />
			<div className="flex w-full h-full">
				<div className="fixed left-0 top-0 hidden lg:block lg:w-[264px] h-full overflow-y-auto">
					<Sidebar />
				</div>
				<div className="lg:pl-[264px] w-full">
					<div className="mx-auto max-w-screen-2xl h-full">
						<Navbar />
						<main className="h-full py-8 px-6 flex flex-col">
							{children}
						</main>
					</div>
				</div>
			</div>
		</SidebarProvider>
	);
};

export default DashBoardLayout;