import { jest, describe, expect, it, beforeEach } from "@jest/globals";
import { DatasourceService } from "../../../src/services/datasource";
import { ApiRequestHandler } from "../../../src/utils/http";
import {
  DataSourceType,
  DataSourceStatus,
  DataSourceResponse,
  DataSourceUpdateParams,
  DataSourceCreateParams,
} from "../../../src/models/datasource";
import { ApiError, NotFoundError } from "../../../src/exceptions";
import { omitKeys } from "../helpers";

jest.mock("../../../src/utils/http", () => ({
  ApiRequestHandler: jest.fn(),
}));

describe("DatasourceService", () => {
  const domain = "https://api.example.com";
  const token = "test-token";
  let service: DatasourceService;
  let apiHandler: jest.Mocked<ApiRequestHandler>;

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

    service = new DatasourceService({ apiDomain: domain, token });
    (ApiRequestHandler as jest.Mock).mockImplementation(() => apiHandler);
  });

  describe("constructor", () => {
    it("should initialize with default SSL verification", () => {
      const service = new DatasourceService({ apiDomain: domain, token });
      expect(ApiRequestHandler).toHaveBeenCalledWith({ apiDomain: domain, token });
    });

    it("should initialize with SSL verification disabled", () => {
      const service = new DatasourceService({ apiDomain: domain, token, verifySSL: false });
      expect(ApiRequestHandler).toHaveBeenCalledWith({
        apiDomain: domain,
        token,
        verifySSL: false,
      });
    });
  });

  describe("create", () => {
    it("should create a code datasource", async () => {
      const mockRequest: DataSourceCreateParams = {
        type: DataSourceType.CODE,
        link: "https://github.com/example/repo",
        project_name: "test-project",
        name: "test-repo",
        description: "Test code repository",
        setting_id: null,
        shared_with_project: true,
        branch: "main",
        index_type: "code",
      };

      const mockResponse = { id: "123", success: true };
      apiHandler.post.mockResolvedValue(mockResponse);

      const result = await service.create(mockRequest);

      expect(apiHandler.post).toHaveBeenCalledWith(
        `/v1/application/${mockRequest.project_name}/index`,
        {
          ...omitKeys(mockRequest, ["index_type", "shared_with_project"]),
          docsGeneration: false,
          indexType: mockRequest.index_type,
          projectSpaceVisible: mockRequest.shared_with_project,
          project_space_visible: mockRequest.shared_with_project,
          settingId: mockRequest.setting_id,
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should create a confluence datasource", async () => {
      const mockRequest: DataSourceCreateParams = {
        type: DataSourceType.CONFLUENCE,
        name: "test-confluence",
        project_name: "test-project",
        description: "Test confluence",
        setting_id: null,
        cql: "type=page",
        include_restricted_content: false,
        include_archived_content: false,
        include_attachments: true,
        include_comments: false,
        shared_with_project: true,
      };

      const mockResponse = { id: "123", success: true };
      apiHandler.post.mockResolvedValue(mockResponse);

      const result = await service.create(mockRequest);

      expect(apiHandler.post).toHaveBeenCalledWith(`/v1/index/knowledge_base/confluence`, {
        ...omitKeys(mockRequest, ["shared_with_project"]),
        project_space_visible: mockRequest.shared_with_project,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should create a jira datasource", async () => {
      const mockRequest: DataSourceCreateParams = {
        type: DataSourceType.JIRA,
        name: "test-jira",
        project_name: "test-project",
        description: "Test JIRA",
        shared_with_project: false,
        setting_id: null,
        jql: "project = TEST",
      };

      const mockResponse = { id: "123", success: true };
      apiHandler.post.mockResolvedValue(mockResponse);

      const result = await service.create(mockRequest);

      expect(apiHandler.post).toHaveBeenCalledWith(`/v1/index/knowledge_base/jira`, {
        ...omitKeys(mockRequest, ["shared_with_project"]),
        project_space_visible: mockRequest.shared_with_project,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle API errors during creation", async () => {
      const mockRequest: DataSourceCreateParams = {
        type: DataSourceType.CODE,
        link: "https://github.com/example/repo",
        project_name: "test-project",
        name: "test-repo",
        description: "Test code repository",
        setting_id: null,
        shared_with_project: true,
        branch: "main",
        index_type: "code",
      };

      const error = new ApiError("Creation failed");
      apiHandler.post.mockRejectedValue(error);

      await expect(service.create(mockRequest)).rejects.toThrow(error);
    });
  });

  describe("update", () => {
    it("should update a code datasource", async () => {
      const mockRequest: DataSourceUpdateParams = {
        type: DataSourceType.CODE,
        project_name: "test-project",
        name: "test-repo",
        description: "Test code repository",
        setting_id: null,
        link: "https://github.com/example/repo",
        branch: "main",
        shared_with_project: true,
        full_reindex: true,
        skip_reindex: false,
        resume_indexing: false,
        incremental_reindex: false,
      };

      const mockResponse = { success: true };
      apiHandler.put.mockResolvedValue(mockResponse);

      const result = await service.update(mockRequest);

      const { full_reindex, skip_reindex, resume_indexing, incremental_reindex, ...data } =
        mockRequest;

      expect(apiHandler.put).toHaveBeenCalledWith(
        `/v1/application/${mockRequest.project_name}/index/${mockRequest.name}`,
        {
          ...omitKeys(data, ["index_type", "shared_with_project", "type"]),
          docsGeneration: false,
          projectSpaceVisible: mockRequest.shared_with_project,
          project_space_visible: mockRequest.shared_with_project,
          settingId: mockRequest.setting_id,
        },
        {
          params: {
            full_reindex,
            skip_reindex,
            resume_indexing,
            incremental_reindex,
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle API errors during update", async () => {
      const mockRequest: DataSourceUpdateParams = {
        type: DataSourceType.CODE,
        project_name: "test-project",
        name: "test-repo",
        description: "Updated description",
        shared_with_project: false,
        setting_id: null,
        link: "https://github.com/example/repo",
        branch: "main",
        full_reindex: true,
      };

      const error = new ApiError("Update failed");
      apiHandler.put.mockRejectedValue(error);

      await expect(service.update(mockRequest)).rejects.toThrow(error);
    });
  });

  describe("list", () => {
    const mockDatasource: DataSourceResponse = {
      id: "1",
      repo_name: "test-repo",
      index_type: DataSourceType.CODE,
      project_name: "test-project",
      description: "Test repository",
      completed: true,
      created_by: {
        username: "user1",
        name: "User One",
      },
      project_space_visible: false,
      date: "2023-01-01",
      update_date: "2023-01-02",
      user_abilities: [],
    };

    it("should list datasources with default parameters", async () => {
      const mockDatasources = [mockDatasource];
      apiHandler.get.mockResolvedValue({ data: mockDatasources });

      const result = await service.list({});

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/index", {
        page: 0,
        per_page: 10,
        sort_key: "update_date",
        sort_order: "desc",
      });
      expect(result).toEqual([
        {
          ...omitKeys(mockDatasource, ["date", "index_type", "project_space_visible", "repo_name", "completed"]),
          created_date: mockDatasource.date,
          type: mockDatasource.index_type,
          shared_with_project: mockDatasource.project_space_visible,
          name: mockDatasource.repo_name,
          status: DataSourceStatus.COMPLETED,
          code: {
            docsGeneration: false,
            indexType: "code",
            projectSpaceVisible: false,
          },
        },
      ]);
    });

    it("should list datasources with all filter parameters", async () => {
      const mockDatasources = [mockDatasource];
      apiHandler.get.mockResolvedValue({ data: mockDatasources });

      const params = {
        page: 1,
        per_page: 20,
        sort_key: "date" as const,
        sort_order: "asc" as const,
        datasource_types: [DataSourceType.CODE, DataSourceType.CONFLUENCE],
        projects: ["test-project", "other-project"],
        status: DataSourceStatus.COMPLETED,
        owner: "user1",
      };

      const result = await service.list(params);

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/index", {
        page: 1,
        per_page: 20,
        sort_key: "date",
        sort_order: "asc",
        filters: JSON.stringify({
          index_type: [DataSourceType.CODE, DataSourceType.CONFLUENCE],
          project: ["test-project", "other-project"],
          status: DataSourceStatus.COMPLETED,
          created_by: "user1",
        }),
      });
      expect(result).toEqual([
        {
          ...omitKeys(mockDatasource, ["date", "index_type", "project_space_visible", "repo_name", "completed"]),
          created_date: mockDatasource.date,
          type: mockDatasource.index_type,
          shared_with_project: mockDatasource.project_space_visible,
          name: mockDatasource.repo_name,
          status: DataSourceStatus.COMPLETED,
          code: {
            docsGeneration: false,
            indexType: "code",
            projectSpaceVisible: false,
          },
        },
      ]);
    });

    it("should list datasources with search filter", async () => {
      const mockDatasources = [mockDatasource];
      apiHandler.get.mockResolvedValue({ data: mockDatasources });

      const result = await service.list({ search: "my-repo" });

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/index", {
        page: 0,
        per_page: 10,
        sort_key: "update_date",
        sort_order: "desc",
        filters: JSON.stringify({ name: "my-repo" }),
      });
      expect(result[0].name).toEqual(mockDatasource.repo_name);
    });

    it("should handle empty response", async () => {
      apiHandler.get.mockResolvedValue({ data: [] });
      const result = await service.list({});
      expect(result).toEqual([]);
    });

    it("should handle API errors during listing", async () => {
      const error = new ApiError("Listing failed");
      apiHandler.get.mockRejectedValue(error);
      await expect(service.list({})).rejects.toThrow(error);
    });
  });

  describe("get", () => {
    it("should get a datasource by ID", async () => {
      const mockDatasource: DataSourceResponse = {
        id: "123",
        repo_name: "test-repo",
        index_type: DataSourceType.CODE,
        project_name: "test-project",
        description: "Test repository",
        completed: true,
        created_by: {
          username: "user1",
          name: "User One",
        },
        project_space_visible: false,
        date: "2023-01-01",
        update_date: "2023-01-02",
        user_abilities: [],
      };

      apiHandler.get.mockResolvedValue(mockDatasource);
      const result = await service.get("123");

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/index/123");
      expect(result).toEqual({
        ...omitKeys(mockDatasource, ["date", "index_type", "project_space_visible", "repo_name", "completed"]),
        created_date: mockDatasource.date,
        type: mockDatasource.index_type,
        shared_with_project: mockDatasource.project_space_visible,
        name: mockDatasource.repo_name,
        status: DataSourceStatus.COMPLETED,
        code: {
          docsGeneration: false,
          indexType: "code",
          projectSpaceVisible: false,
        },
      });
    });

    it("should derive status FAILED from error flag", async () => {
      const mockWithError: DataSourceResponse = {
        id: "123",
        repo_name: "test-repo",
        index_type: DataSourceType.CODE,
        project_name: "test-project",
        description: "Test repository",
        error: true,
        created_by: { username: "user1", name: "User One" },
        project_space_visible: false,
        date: "2023-01-01",
        update_date: "2023-01-02",
        user_abilities: [],
      };
      apiHandler.get.mockResolvedValue(mockWithError);
      const result = await service.get("123");
      expect(result.status).toEqual(DataSourceStatus.FAILED);
    });

    it("should derive status COMPLETED from completed flag", async () => {
      const mockCompleted: DataSourceResponse = {
        id: "123",
        repo_name: "test-repo",
        index_type: DataSourceType.CODE,
        project_name: "test-project",
        description: "Test repository",
        completed: true,
        created_by: { username: "user1", name: "User One" },
        project_space_visible: false,
        date: "2023-01-01",
        update_date: "2023-01-02",
        user_abilities: [],
      };
      apiHandler.get.mockResolvedValue(mockCompleted);
      const result = await service.get("123");
      expect(result.status).toEqual(DataSourceStatus.COMPLETED);
    });

    it("should derive status FETCHING from is_fetching flag", async () => {
      const mockFetching: DataSourceResponse = {
        id: "123",
        repo_name: "test-repo",
        index_type: DataSourceType.CODE,
        project_name: "test-project",
        description: "Test repository",
        is_fetching: true,
        created_by: { username: "user1", name: "User One" },
        project_space_visible: false,
        date: "2023-01-01",
        update_date: "2023-01-02",
        user_abilities: [],
      };
      apiHandler.get.mockResolvedValue(mockFetching);
      const result = await service.get("123");
      expect(result.status).toEqual(DataSourceStatus.FETCHING);
    });

    it("should default status to IN_PROGRESS when no flags are set", async () => {
      const mockInProgress: DataSourceResponse = {
        id: "123",
        repo_name: "test-repo",
        index_type: DataSourceType.CODE,
        project_name: "test-project",
        description: "Test repository",
        created_by: { username: "user1", name: "User One" },
        project_space_visible: false,
        date: "2023-01-01",
        update_date: "2023-01-02",
        user_abilities: [],
      };
      apiHandler.get.mockResolvedValue(mockInProgress);
      const result = await service.get("123");
      expect(result.status).toEqual(DataSourceStatus.IN_PROGRESS);
    });

    it("should handle not found error", async () => {
      const error = new NotFoundError("Datasource", "123");
      apiHandler.get.mockRejectedValue(error);
      await expect(service.get("123")).rejects.toThrow(error);
    });
  });

  describe("delete", () => {
    it("should delete a datasource by ID", async () => {
      const mockResponse = { success: true };
      apiHandler.delete.mockResolvedValue(mockResponse);

      const result = await service.delete("123");

      expect(apiHandler.delete).toHaveBeenCalledWith("/v1/index/123");
      expect(result).toEqual(mockResponse);
    });

    it("should handle API errors during deletion", async () => {
      const error = new ApiError("Deletion failed");
      apiHandler.delete.mockRejectedValue(error);
      await expect(service.delete("123")).rejects.toThrow(error);
    });
  });
});
