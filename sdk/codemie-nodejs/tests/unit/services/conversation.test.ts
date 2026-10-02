import { describe, expect, it } from "@jest/globals";
import { ConversationCreateParamsSchema } from "../../../src/schemas/conversation";

describe("ConversationCreateParamsSchema", () => {
  it("should default mcp_server_single_usage to false when omitted", () => {
    const result = ConversationCreateParamsSchema.parse({});
    expect(result.mcp_server_single_usage).toBe(false);
  });

  it("should preserve mcp_server_single_usage: true when provided", () => {
    const result = ConversationCreateParamsSchema.parse({ mcp_server_single_usage: true });
    expect(result.mcp_server_single_usage).toBe(true);
  });
});
