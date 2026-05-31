type TaskUpdatePayloadInput = {
	name?: string;
	status?: string;
	dueDate?: Date;
	assigneeId?: string | null;
	assigneeName?: string | null;
	description?: string;
	acceptanceCriteria?: string;
	issueType?: string;
	priority?: string;
	parentId?: string;
	labels?: string[];
	sprintId?: string | null;
	storyPoints?: number;
	epicId?: string | null;
	fixVersionId?: string | null;
	originalEstimate?: number;
	remainingEstimate?: number;
	rca?: string;
	linkedDocs?: string[];
};

export function filterDefined(obj: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export function buildTaskUpdatePayload({
	dueDate,
	...rest
}: TaskUpdatePayloadInput): Record<string, unknown> {
	return filterDefined({
		...rest,
		dueDate: dueDate?.toISOString(),
	});
}
