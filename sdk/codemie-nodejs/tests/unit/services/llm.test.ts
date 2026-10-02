import { jest, describe, expect, it, beforeEach } from "@jest/globals";
import { LLMService } from "../../../src/services/llm";
import { ApiRequestHandler } from "../../../src/utils/http";
import { LLMModel, LLMProvider, LLMFeatures } from "../../../src/models/llm";
import { ApiError } from "../../../src/exceptions";

jest.mock("../../../src/utils/http", () => ({
  ApiRequestHandler: jest.fn(),
}));

describe("LLMService", () => {
  const domain = "https://api.example.com";
  const token = "test-token";
  let service: LLMService;
  let apiHandler: jest.Mocked<ApiRequestHandler>;

  const defaultFeatures: LLMFeatures = {
    streaming: true,
    tools: true,
    temperature: true,
    parallel_tool_calls: true,
    system_prompt: true,
    max_tokens: true,
  };

  const mockGPT4Model: LLMModel = {
    base_name: "gpt-4",
    deployment_name: "gpt-4",
    label: "GPT-4",
    enabled: true,
    provider: LLMProvider.AZURE_OPENAI,
    default: true,
    features: defaultFeatures,
    cost: {
      input: 0.03,
      output: 0.06,
    },
    max_output_tokens: 4096,
  };

  const mockEmbeddingModel: LLMModel = {
    base_name: "text-embedding-ada-002",
    deployment_name: "text-embedding-ada-002",
    label: "Ada 002",
    enabled: true,
    provider: LLMProvider.AZURE_OPENAI,
    features: defaultFeatures,
    default: true,
    cost: {
      input: 0.0001,
      output: 0.0,
    },
  };

  beforeEach(() => {
    apiHandler = {
      client: {} as any,
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      stream: jest.fn(),
      request: jest.fn(),
      throwIfResponseError: jest.fn(),
    } as unknown as jest.Mocked<ApiRequestHandler>;

    service = new LLMService({ apiDomain: domain, token });
    (ApiRequestHandler as jest.Mock).mockImplementation(() => apiHandler);
  });

  describe("constructor", () => {
    it("should initialize with default SSL verification", () => {
      const service = new LLMService({ apiDomain: domain, token });
      expect(ApiRequestHandler).toHaveBeenCalledWith({ apiDomain: domain, token });
    });

    it("should initialize with SSL verification disabled", () => {
      const service = new LLMService({ apiDomain: domain, token, verifySSL: false });
      expect(ApiRequestHandler).toHaveBeenCalledWith({
        apiDomain: domain,
        token,
        verifySSL: false,
      });
    });
  });

  describe("list", () => {
    it("should get list of available LLM models", async () => {
      const mockModels: LLMModel[] = [
        mockGPT4Model,
        {
          base_name: "claude-2",
          deployment_name: "claude-2",
          label: "Claude 2",
          enabled: true,
          provider: LLMProvider.AWS_BEDROCK,
          features: {
            ...defaultFeatures,
            parallel_tool_calls: false,
            system_prompt: false,
            max_tokens: false,
          },
        },
      ];

      apiHandler.get.mockResolvedValue(mockModels);

      const result = await service.list();

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/llm_models");
      expect(result).toEqual(mockModels);
    });

    it("should handle empty model list", async () => {
      apiHandler.get.mockResolvedValue([]);

      const result = await service.list();

      expect(result).toEqual([]);
    });

    it("should handle disabled models", async () => {
      const mockModels: LLMModel[] = [
        {
          ...mockGPT4Model,
          enabled: false,
        },
      ];

      apiHandler.get.mockResolvedValue(mockModels);

      const result = await service.list();

      expect(result).toEqual(mockModels);
    });

    it("should handle API errors", async () => {
      const error = new ApiError("Failed to fetch LLM models");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.list()).rejects.toThrow(error);
    });
  });

  describe("listEmbeddings", () => {
    it("should get list of available embeddings models", async () => {
      const mockModels: LLMModel[] = [
        mockEmbeddingModel,
        {
          base_name: "embedding-001",
          deployment_name: "embedding-001",
          label: "Embedding 001",
          enabled: true,
          provider: LLMProvider.GOOGLE_VERTEXAI,
          features: defaultFeatures,
        },
      ];

      apiHandler.get.mockResolvedValue(mockModels);

      const result = await service.listEmbeddings();

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/embeddings_models");
      expect(result).toEqual(mockModels);
    });

    it("should handle empty embeddings model list", async () => {
      apiHandler.get.mockResolvedValue([]);

      const result = await service.listEmbeddings();

      expect(result).toEqual([]);
    });

    it("should handle disabled embeddings models", async () => {
      const mockModels: LLMModel[] = [
        {
          ...mockEmbeddingModel,
          enabled: false,
        },
      ];

      apiHandler.get.mockResolvedValue(mockModels);

      const result = await service.listEmbeddings();

      expect(result).toEqual(mockModels);
    });

    it("should handle API errors", async () => {
      const error = new ApiError("Failed to fetch embedding models");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.listEmbeddings()).rejects.toThrow(error);
    });
  });
});
