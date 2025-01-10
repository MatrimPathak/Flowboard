import Image from "next/image";
import Link from "next/link";
import { DottedSeperator } from "./dotted-seperator";
import { Navigation } from "./navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { Projects } from "./projects";

export const Sidebar = () => {
	return (
		<aside className="h-full bg-neutral-100 p-4 w-full">
			<Link href="/">
				<Image
					src="/logo.svg"
					alt="Logo"
					width={0}
					height={0}
					sizes="100vw"
					style={{ width: "100%", height: "40px" }}
					className="object-cover w-fit h-12 -ml-4"
				/>
			</Link>
			<DottedSeperator className="my-4" />
			<WorkspaceSwitcher />
			<DottedSeperator className="my-4" />
			<Navigation />
			<DottedSeperator className="my-4" />
			<Projects />
		</aside>
	);
};
