import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { cn } from "@/lib/utils";

import "./globals.css";

import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Chronicle",
	description: "Developer-first project management",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={cn(inter.className, "antialiased min-h-screen")}>
				<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
					<QueryProvider>
						<Toaster />
						{children}
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
