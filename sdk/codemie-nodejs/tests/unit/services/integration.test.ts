import { jest, describe, expect, it, beforeEach } from "@jest/globals";
import { IntegrationService } from "../../../src/services/integration";
import { ApiRequestHandler } from "../../../src/utils/http";
import {
  Integration,
  IntegrationType,
  IntegrationTypeType,
  CredentialTypes,
  CredentialTypesType,
} from "../../../src/models/integration";
import { ApiError, NotFoundError } from "../../../src/exceptions";

jest.mock("../../../src/utils/http", () => ({
  ApiRequestHandler: jest.fn(),
}));

describe("IntegrationService", () => {
  const domain = "https://api.example.com";
  const token = "test-token";
  let service: IntegrationService;
  let apiHandler: jest.Mocked<ApiRequestHandler>;

  const mockIntegration: Integration = {
    id: "1",
    date: "2023-01-01",
    update_date: "2023-01-02",
    user_id: "user1",
    project_name: "test-project",
    alias: "jira-integration",
    default: true,
    credential_type: CredentialTypes.JIRA,
    credential_values: [
      { key: "url", value: "https://jira.example.com" },
      { key: "token", value: "jira-token" },
    ],
    setting_type: IntegrationType.USER,
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

    service = new IntegrationService({ apiDomain: domain, token });
    (ApiRequestHandler as jest.Mock).mockImplementation(() => apiHandler);
  });

  describe("constructor", () => {
    it("should initialize with default SSL verification", () => {
      const service = new IntegrationService({ apiDomain: domain, token });
      expect(ApiRequestHandler).toHaveBeenCalledWith({ apiDomain: domain, token });
    });

    it("should initialize with SSL verification disabled", () => {
      const service = new IntegrationService({ apiDomain: domain, token, verifySSL: false });
      expect(ApiRequestHandler).toHaveBeenCalledWith({
        apiDomain: domain,
        token,
        verifySSL: false,
      });
    });
  });

  describe("list", () => {
    const mockResponse = {
      data: [mockIntegration],
      total: 1,
      page: 0,
      per_page: 10,
    };

    it("should list user integrations with default parameters", async () => {
      apiHandler.get.mockResolvedValue(mockResponse);

      const result = await service.list();

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/settings/user", {
        page: 0,
        per_page: 10,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should list project integrations with custom parameters", async () => {
      apiHandler.get.mockResolvedValue(mockResponse);

      const params = {
        page: 1,
        per_page: 20,
        setting_type: IntegrationType.PROJECT,
        filters: {
          credential_type: CredentialTypes.JIRA,
        },
      };

      const result = await service.list(params);

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/settings/project", {
        page: 1,
        per_page: 20,
        filters: JSON.stringify(params.filters),
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle empty response", async () => {
      apiHandler.get.mockResolvedValue({
        data: [],
        total: 0,
        page: 0,
        per_page: 10,
      });
      const result = await service.list();
      expect(result).toEqual([]);
    });

    it("should handle API errors during listing", async () => {
      const error = new ApiError("Failed to fetch integrations");
      apiHandler.get.mockRejectedValue(error);
      await expect(service.list()).rejects.toThrow(error);
    });
  });

  describe("get", () => {
    const mockResponse = {
      data: [mockIntegration],
      total: 1,
      page: 0,
      per_page: 100,
    };

    it("should get integration by ID", async () => {
      apiHandler.get.mockResolvedValue(mockResponse);

      const result = await service.get({
        integration_id: mockIntegration.id!,
        setting_type: IntegrationType.USER,
      });

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/settings/user", {
        page: 0,
        per_page: 100,
      });
      expect(result).toEqual(mockIntegration);
    });

    it("should handle not found error", async () => {
      apiHandler.get.mockResolvedValue({
        data: [],
        total: 0,
        page: 0,
        per_page: 100,
      });

      await expect(
        service.get({
          integration_id: "non-existent",
          setting_type: IntegrationType.USER,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should handle API errors", async () => {
      const error = new ApiError("Failed to fetch integration");
      apiHandler.get.mockRejectedValue(error);
      await expect(
        service.get({
          integration_id: mockIntegration.id!,
          setting_type: IntegrationType.USER,
        }),
      ).rejects.toThrow(error);
    });
  });

  describe("getByAlias", () => {
    const mockResponse = {
      data: [mockIntegration],
      total: 1,
      page: 0,
      per_page: 100,
    };

    it("should get integration by alias", async () => {
      apiHandler.get.mockResolvedValue(mockResponse);

      const result = await service.getByAlias({
        alias: mockIntegration.alias!,
        setting_type: IntegrationType.USER,
      });

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/settings/user", {
        page: 0,
        per_page: 100,
      });
      expect(result).toEqual(mockIntegration);
    });

    it("should handle not found error", async () => {
      apiHandler.get.mockResolvedValue({
        data: [],
        total: 0,
        page: 0,
        per_page: 100,
      });

      await expect(
        service.getByAlias({
          alias: "non-existent",
          setting_type: IntegrationType.USER,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should handle API errors", async () => {
      const error = new ApiError("Failed to fetch integration");
      apiHandler.get.mockRejectedValue(error);
      await expect(
        service.getByAlias({
          alias: mockIntegration.alias!,
          setting_type: IntegrationType.USER,
        }),
      ).rejects.toThrow(error);
    });
  });

  describe("create", () => {
    it("should create a user integration", async () => {
      const createParams = {
        project_name: "test-project",
        alias: "jira-test",
        credential_type: CredentialTypes.JIRA,
        credential_values: [
          { key: "url", value: "https://jira.example.com" },
          { key: "token", value: "jira-token" },
        ],
        setting_type: IntegrationType.USER,
      };

      const mockResponse = { id: "123", success: true };
      apiHandler.post.mockResolvedValue(mockResponse);

      const result = await service.create(createParams);

      expect(apiHandler.post).toHaveBeenCalledWith(
        "/v1/settings/user",
        expect.objectContaining({
          ...createParams,
          default: false,
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should create a project integration", async () => {
      const createParams = {
        project_name: "test-project",
        alias: "confluence-test",
        credential_type: CredentialTypes.CONFLUENCE,
        credential_values: [
          { key: "url", value: "https://confluence.example.com" },
          { key: "token", value: "confluence-token" },
        ],
        setting_type: IntegrationType.PROJECT,
      };

      const mockResponse = { id: "123", success: true };
      apiHandler.post.mockResolvedValue(mockResponse);

      const result = await service.create(createParams);

      expect(apiHandler.post).toHaveBeenCalledWith(
        "/v1/settings/project",
        expect.objectContaining({
          ...createParams,
          default: false,
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle API errors during creation", async () => {
      const createParams = {
        project_name: "test-project",
        credential_type: CredentialTypes.JIRA,
        credential_values: [],
        setting_type: IntegrationType.USER,
      };

      const error = new ApiError("Creation failed");
      apiHandler.post.mockRejectedValue(error);

      await expect(service.create(createParams)).rejects.toThrow(error);
    });
  });

  describe("update", () => {
    const updateParams = {
      project_name: "test-project",
      credential_type: CredentialTypes.JIRA,
      credential_values: [
        { key: "url", value: "https://jira.example.com" },
        { key: "token", value: "new-token" },
      ],
      setting_type: IntegrationType.USER,
    };

    it("should update a user integration", async () => {
      const mockResponse = { success: true };
      apiHandler.put.mockResolvedValue(mockResponse);

      const result = await service.update("123", updateParams);

      expect(apiHandler.put).toHaveBeenCalledWith(
        "/v1/settings/user/123",
        expect.objectContaining({
          ...updateParams,
          default: false,
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle API errors during update", async () => {
      const error = new ApiError("Update failed");
      apiHandler.put.mockRejectedValue(error);

      await expect(service.update("123", updateParams)).rejects.toThrow(error);
    });
  });

  describe("delete", () => {
    it("should delete a user integration", async () => {
      const mockResponse = { success: true };
      apiHandler.delete.mockResolvedValue(mockResponse);

      const result = await service.delete("123", IntegrationType.USER);

      expect(apiHandler.delete).toHaveBeenCalledWith("/v1/settings/user/123");
      expect(result).toEqual(mockResponse);
    });

    it("should delete a project integration", async () => {
      const mockResponse = { success: true };
      apiHandler.delete.mockResolvedValue(mockResponse);

      const result = await service.delete("123", IntegrationType.PROJECT);

      expect(apiHandler.delete).toHaveBeenCalledWith("/v1/settings/project/123");
      expect(result).toEqual(mockResponse);
    });

    it("should handle API errors during deletion", async () => {
      const error = new ApiError("Deletion failed");
      apiHandler.delete.mockRejectedValue(error);

      await expect(service.delete("123")).rejects.toThrow(error);
    });
  });
});
