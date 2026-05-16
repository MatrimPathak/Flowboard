"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
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
import { registerSchema } from "../schemas";
import { useRegister } from "../api/use-register";

const LINK_CLS = "text-primary hover:text-primary/80 font-medium";

export const SignUpCard = () => {
	const { mutate, isPending } = useRegister();
	const form = useForm<z.infer<typeof registerSchema>>({
		resolver: zodResolver(registerSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
		},
	});

	const onSubmit = (values: z.infer<typeof registerSchema>) => {
		mutate({ json: values });
	};

	return (
		<div className="w-full">
			<div className="mb-8">
				<h2 className="text-2xl font-bold text-foreground">
					Create your account
				</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					Join Chronicle and start building with context.
				</p>
			</div>

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-4"
				>
					<FormField
						name="name"
						control={form.control}
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input
										type="text"
										placeholder="Enter your name"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
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
						Create account
					</Button>
				</form>
			</Form>

			<p className="text-center text-sm text-muted-foreground mt-6">
				By signing up, you agree to our{" "}
				<Link href="/privacy" className={LINK_CLS}>
					Privacy Policy
				</Link>{" "}
				and{" "}
				<Link href="/terms" className={LINK_CLS}>
					Terms of Service
				</Link>
				.
			</p>

			<div className="h-px bg-border my-6" />

			<p className="text-center text-sm text-muted-foreground">
				Already have an account?{" "}
				<Link
					href="/sign-in"
					className={LINK_CLS}
				>
					Sign in
				</Link>
			</p>
		</div>
	);
};
