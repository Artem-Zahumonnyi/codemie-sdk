import type { AuthConfig } from "../models/common";
import type { LLMModel } from "../models/llm";
import { ApiRequestHandler } from "../utils/http";

export class LLMService {
  private api: ApiRequestHandler;

  constructor(config: AuthConfig) {
    this.api = new ApiRequestHandler(config);
  }

  /**
   * Get list of available LLM models.
   */
  async list(): Promise<LLMModel[]> {
    return this.api.get<LLMModel[]>("/v1/llm_models");
  }

  /**
   * Get list of available embeddings models.
   */
  async listEmbeddings(): Promise<LLMModel[]> {
    return this.api.get<LLMModel[]>("/v1/embeddings_models");
  }
}
