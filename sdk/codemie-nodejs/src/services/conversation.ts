import type { Conversation, ConversationDetails } from "../models/conversation";
import type { AnyJson, AuthConfig } from "../models/common";
import {
  ConversationCreateParamsSchema,
  type ConversationCreateParams,
} from "../schemas/conversation";
import { ApiRequestHandler } from "../utils/http";

export class ConversationService {
  private api: ApiRequestHandler;

  constructor(config: AuthConfig) {
    this.api = new ApiRequestHandler(config);
  }

  /**
   * Get list of all conversations for the current user.
   */
  async list(): Promise<Conversation[]> {
    return this.api.get<Conversation[]>("/v1/conversations");
  }

  /**
   * Get list of all conversations for the current user that include the specified assistant.
   */
  async listByAssistantId(assistantId: string): Promise<Conversation[]> {
    const conversations = await this.list();
    return conversations.filter((conv) => conv.assistant_ids.includes(assistantId));
  }

  /**
   * Get details for a specific conversation by its ID.
   */
  async get(conversationId: string): Promise<ConversationDetails> {
    return this.api.get<ConversationDetails>(`/v1/conversations/${conversationId}`);
  }

  /**
   * Create a new conversation.
   */
  async create(_params: ConversationCreateParams = {}): Promise<AnyJson> {
    const params = ConversationCreateParamsSchema.parse(_params);
    return this.api.post("/v1/conversations", params);
  }

  /**
   * Delete a specific conversation by its ID.
   */
  async delete(conversationId: string): Promise<AnyJson> {
    return this.api.delete(`/v1/conversations/${conversationId}`);
  }
}
