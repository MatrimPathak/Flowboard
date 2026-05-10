"use client";

import { DottedSeperator } from "@/components/dotted-seperator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
		<Card className="w-full h-full md:w-[487px] border-none shadow-none">
			<CardHeader className="flex items-center justify-center text-center p-7">
				<CardTitle className="text-2xl">Welcome Back!</CardTitle>
			</CardHeader>
			<div className="px-7">
				<DottedSeperator />
			</div>
			<CardContent className="p-7">
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
						<Button
							disabled={isPending}
							size="lg"
							className="w-full"
						>
							Login
						</Button>
					</form>
				</Form>
			</CardContent>
			<div className="px-7">
				<DottedSeperator />
			</div>
			<CardContent className="p-7 flex flex-col gap-y-4">
				<Button
					onClick={() => onGoogleSignIn()}
					disabled={isPending}
					variant="secondary"
					size="lg"
					className="w-full"
				>
					<FcGoogle className="mr-2 size-5" />
					Login with Google
				</Button>
				<Button
					onClick={() => onGithubSignIn()}
					disabled={isPending}
					variant="secondary"
					size="lg"
					className="w-full"
				>
					<FaGithub className="mr-2 size-5" />
					Login with Github
				</Button>
			</CardContent>
			<div className="px-7">
				<DottedSeperator />
			</div>
			<CardContent className="p-7 flex items-center justify-center">
				<p>
					Don&apos;t have an account?{" "}
					<Link href="/sign-up" className="text-primary-500">
						<span className="text-blue-700">Sign Up</span>
					</Link>
				</p>
			</CardContent>
		</Card>
	);
};
