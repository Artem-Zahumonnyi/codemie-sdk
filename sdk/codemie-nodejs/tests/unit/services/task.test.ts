import { jest, describe, expect, it, beforeEach } from "@jest/globals";
import { TaskService } from "../../../src/services/task";
import { ApiRequestHandler } from "../../../src/utils/http";
import { BackgroundTaskEntity, BackgroundTaskStatus, TaskUser } from "../../../src/models/task";
import { ApiError, NotFoundError } from "../../../src/exceptions";

jest.mock("../../../src/utils/http", () => ({
  ApiRequestHandler: jest.fn(),
}));

describe("TaskService", () => {
  const domain = "https://api.example.com";
  const token = "test-token";
  let service: TaskService;
  let apiHandler: jest.Mocked<ApiRequestHandler>;

  const mockTaskUser: TaskUser = {
    user_id: "123",
    username: "testuser",
    name: "Test User",
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

    service = new TaskService({ apiDomain: domain, token });
    (ApiRequestHandler as jest.Mock).mockImplementation(() => apiHandler);
  });

  describe("constructor", () => {
    it("should initialize with default SSL verification", () => {
      const service = new TaskService({ apiDomain: domain, token });
      expect(ApiRequestHandler).toHaveBeenCalledWith({ apiDomain: domain, token });
    });

    it("should initialize with SSL verification disabled", () => {
      const service = new TaskService({ apiDomain: domain, token, verifySSL: false });
      expect(ApiRequestHandler).toHaveBeenCalledWith({
        apiDomain: domain,
        token,
        verifySSL: false,
      });
    });
  });

  describe("get", () => {
    const completedTask: BackgroundTaskEntity = {
      id: "123",
      task: "Process items",
      user: mockTaskUser,
      final_output: "Successfully processed 42 items",
      current_step: "Completed processing",
      status: BackgroundTaskStatus.COMPLETED,
      date: "2025-01-06T00:41:38.000Z",
      update_date: "2025-01-06T00:41:38.000Z",
    };

    const failedTask: BackgroundTaskEntity = {
      id: "456",
      task: "Process invalid items",
      user: mockTaskUser,
      final_output: "Processing failed due to invalid input",
      current_step: "Error encountered",
      status: BackgroundTaskStatus.FAILED,
      date: "2025-01-06T00:41:38.000Z",
      update_date: "2025-01-06T00:41:38.000Z",
    };

    const inProgressTask: BackgroundTaskEntity = {
      id: "789",
      task: "Long running process",
      user: mockTaskUser,
      current_step: "Processing items",
      status: BackgroundTaskStatus.STARTED,
      date: "2025-01-06T00:41:38.000Z",
      update_date: "2025-01-06T00:41:38.000Z",
    };

    it("should get a completed background task by ID", async () => {
      apiHandler.get.mockResolvedValue(completedTask);

      const result = await service.get("123");

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/tasks/123");
      expect(result).toEqual(completedTask);
    });

    it("should get a failed background task by ID", async () => {
      apiHandler.get.mockResolvedValue(failedTask);

      const result = await service.get("456");

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/tasks/456");
      expect(result).toEqual(failedTask);
      expect(result.status).toBe(BackgroundTaskStatus.FAILED);
      expect(result.final_output).toBeDefined();
    });

    it("should get an in-progress background task by ID", async () => {
      apiHandler.get.mockResolvedValue(inProgressTask);

      const result = await service.get("789");

      expect(apiHandler.get).toHaveBeenCalledWith("/v1/tasks/789");
      expect(result).toEqual(inProgressTask);
      expect(result.status).toBe(BackgroundTaskStatus.STARTED);
      expect(result.current_step).toBeDefined();
      expect(result.final_output).toBeUndefined();
    });

    it("should handle not found error", async () => {
      const error = new NotFoundError("Task", "non-existent");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.get("non-existent")).rejects.toThrow(error);
    });

    it("should handle API error", async () => {
      const error = new ApiError("Failed to fetch task");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.get("123")).rejects.toThrow(error);
    });

    it("should handle network error", async () => {
      const error = new Error("Network error");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.get("123")).rejects.toThrow(error);
    });
  });
});
