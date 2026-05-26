import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createTicketBaseSchema, updateTicketBaseSchema } from "./mcp-schemas";

describe("MCP ticket schemas", () => {
	it("coerces JSON-stringified linkedDocs on update_ticket input", () => {
		const parsed = updateTicketBaseSchema.parse({
			workspaceId: "WKSP-123456",
			projectId: "PRJ-123456",
			taskId: "US-123456",
			linkedDocs: '["DOC-12345678","DOC-87654321"]',
		});

		assert.deepEqual(parsed.linkedDocs, ["DOC-12345678", "DOC-87654321"]);
	});

	it("coerces JSON-stringified labels on create_ticket input", () => {
		const parsed = createTicketBaseSchema.parse({
			name: "Investigate flaky import",
			status: "TODO",
			workspaceId: "WKSP-123456",
			projectId: "PRJ-123456",
			dueDate: "2026-05-26",
			assigneeId: "member-1",
			labels: '["import","regression"]',
		});

		assert.deepEqual(parsed.labels, ["import", "regression"]);
	});

	it("rejects JSON strings that do not contain arrays", () => {
		assert.throws(() =>
			updateTicketBaseSchema.parse({
				workspaceId: "WKSP-123456",
				projectId: "PRJ-123456",
				taskId: "US-123456",
				linkedDocs: '{"docId":"DOC-12345678"}',
			})
		);
	});
});
