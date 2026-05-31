import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildTaskUpdatePayload } from "./task-update-payload";

describe("buildTaskUpdatePayload", () => {
	it("preserves linkedDocs arrays, including an empty array used to clear links", () => {
		assert.deepEqual(
			buildTaskUpdatePayload({
				name: undefined,
				linkedDocs: [],
			}),
			{ linkedDocs: [] }
		);
	});

	it("keeps intentional null clears while dropping untouched undefined fields", () => {
		assert.deepEqual(
			buildTaskUpdatePayload({
				assigneeId: null,
				assigneeName: null,
				sprintId: null,
				fixVersionId: undefined,
				linkedDocs: ["DOC-12345678", "DOC-87654321"],
			}),
			{
				assigneeId: null,
				assigneeName: null,
				sprintId: null,
				linkedDocs: ["DOC-12345678", "DOC-87654321"],
			}
		);
	});

	it("serializes dueDate without adding absent optional fields", () => {
		assert.deepEqual(
			buildTaskUpdatePayload({
				dueDate: new Date("2026-05-26T07:30:00.000Z"),
				description: "Updated description",
			}),
			{
				dueDate: "2026-05-26T07:30:00.000Z",
				description: "Updated description",
			}
		);
	});
});
