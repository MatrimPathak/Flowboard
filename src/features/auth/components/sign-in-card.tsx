"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@/components/ui/form";
import Link from "next/link";
import { loginSchema } from "../schemas";
import { useLogin } from "../api/use-login";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { client } from "@/lib/rpc";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export const SignInCard = () => {
	const queryClient = useQueryClient();
	const router = useRouter();
	const { mutate, isPending } = useLogin();
	const form = useForm<z.infer<typeof loginSchema>>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const onSubmit = (values: z.infer<typeof loginSchema>) => {
		mutate({ json: values });
	};

	const signInWithOAuthProvider = async (provider: any, providerName: string) => {
		try {
			const result = await signInWithPopup(auth, provider);
			const idToken = await result.user.getIdToken();
			const response = await client.api.auth.session.$post({ json: { idToken } });
			if (response.ok) {
				toast.success("Logged in successfully");
				queryClient.invalidateQueries({ queryKey: ["current"] });
				router.refresh();
			} else {
				toast.error("Failed to create session");
			}
		} catch (error) {
			console.error(error);
			toast.error(`Failed to log in with ${providerName}`);
		}
	};

	const onGoogleSignIn = () => signInWithOAuthProvider(googleProvider, "Google");
	const onGithubSignIn = () => signInWithOAuthProvider(githubProvider, "Github");

	return (
		<div className="w-full">
			<div className="mb-8">
				<h2 className="text-2xl font-bold text-foreground">
					Welcome back
				</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					Sign in to continue to Chronicle
				</p>
			</div>

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-4"
				>
					<FormField
						name="email"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input
										type="email"
										placeholder="Enter your email address"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						name="password"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input
										type="password"
										placeholder="Enter your password"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button disabled={isPending} size="lg" className="w-full">
						Sign In
					</Button>
				</form>
			</Form>

			<div className="relative my-6">
				<div className="absolute inset-0 flex items-center">
					<div className="w-full border-t border-border" />
				</div>
				<div className="relative flex justify-center text-xs">
					<span className="bg-surface px-2 text-muted-foreground">
						or continue with
					</span>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				<Button
					onClick={() => onGoogleSignIn()}
					disabled={isPending}
					variant="secondary"
					size="lg"
					className="w-full"
				>
					<FcGoogle className="mr-2 size-5" />
					Continue with Google
				</Button>
				<Button
					onClick={() => onGithubSignIn()}
					disabled={isPending}
					variant="secondary"
					size="lg"
					className="w-full"
				>
					<FaGithub className="mr-2 size-5" />
					Continue with GitHub
				</Button>
			</div>

			<p className="text-center text-sm text-muted-foreground mt-6">
				Don&apos;t have an account?{" "}
				<Link
					href="/sign-up"
					className="text-primary hover:text-primary/80 font-medium"
				>
					Sign up
				</Link>
			</p>
		</div>
	);
};
