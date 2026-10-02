import { z } from "zod";

export const ConversationCreateParamsSchema = z
  .object({
    initial_assistant_id: z.string().optional(),
    folder: z.string().optional(),
    mcp_server_single_usage: z.boolean().optional().default(false),
  })
  .readonly();

export type ConversationCreateParams = z.input<typeof ConversationCreateParamsSchema>;
