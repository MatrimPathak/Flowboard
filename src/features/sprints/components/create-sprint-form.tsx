"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DottedSeperator } from "@/components/dotted-seperator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/date-picker";
import { createSprintSchema } from "../schemas";
import { useCreateSprint } from "../api/use-create-sprint";

interface CreateSprintFormProps {
  onCancel?: () => void;
  workspaceId: string;
  projectId: string;
}

export const CreateSprintForm = ({
  onCancel,
  workspaceId,
  projectId,
}: CreateSprintFormProps) => {
  const { mutate, isPending } = useCreateSprint();

  const form = useForm<z.infer<typeof createSprintSchema>>({
    resolver: zodResolver(createSprintSchema),
    defaultValues: {
      workspaceId,
      projectId,
      name: "",
      goal: "",
      startDate: undefined,
      endDate: undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof createSprintSchema>) => {
    mutate(
      { json: { ...values, workspaceId, projectId } },
      {
        onSuccess: () => {
          form.reset();
          onCancel?.();
        },
      }
    );
  };

  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">Create a new sprint</CardTitle>
      </CardHeader>
      <div className="px-7">
        <DottedSeperator />
      </div>
      <CardContent className="p-7">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sprint Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Sprint 1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sprint Goal (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="What is the goal of this sprint?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (optional)</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (optional)</FormLabel>
                    <FormControl>
                      <DatePicker {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DottedSeperator className="py-7" />
            <div className="flex items-center justify-between">
              <Button
                type="button"
                size="lg"
                onClick={onCancel}
                variant="secondary"
                disabled={isPending}
                className={cn(!onCancel && "invisible")}
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={isPending} variant="primary">
                Create Sprint
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
