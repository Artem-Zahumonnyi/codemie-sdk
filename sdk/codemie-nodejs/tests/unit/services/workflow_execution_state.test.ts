import { jest, describe, expect, it, beforeEach } from "@jest/globals";
import { WorkflowExecutionStateService } from "../../../src/services/workflow_execution_state";
import { ApiRequestHandler } from "../../../src/utils/http";
import { PaginatedResponse } from "../../../src/models/common";
import {
  WorkflowExecutionState,
  WorkflowExecutionStateOutput,
  ExecutionStatus,
  ExecutionStatusType,
} from "../../../src/models/workflow";
import { ApiError, NotFoundError } from "../../../src/exceptions";

jest.mock("../../../src/utils/http", () => ({
  ApiRequestHandler: jest.fn(),
}));

describe("WorkflowExecutionStateService", () => {
  const domain = "https://api.example.com";
  const token = "test-token";
  const workflowId = "123";
  const executionId = "exec-1";
  let apiHandler: jest.Mocked<ApiRequestHandler>;
  let service: WorkflowExecutionStateService;

  const mockState: WorkflowExecutionState = {
    id: "state-1",
    execution_id: executionId,
    name: "First State",
    task: "Process Data",
    status: ExecutionStatus.SUCCEEDED as ExecutionStatusType,
    started_at: "2023-01-01T10:00:00Z",
    completed_at: "2023-01-01T10:01:00Z",
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

    service = new WorkflowExecutionStateService(apiHandler, workflowId, executionId);
  });

  describe("list", () => {
    const createMockResponse = (
      data: WorkflowExecutionState[],
    ): PaginatedResponse<WorkflowExecutionState> => ({
      data,
      pagination: {
        total: data.length,
        page: 0,
        per_page: 10,
        pages: Math.ceil(data.length / 10),
      },
    });

    const mockStates: WorkflowExecutionState[] = [
      mockState,
      {
        ...mockState,
        id: "state-2",
        name: "Second State",
        task: "Generate Report",
        status: ExecutionStatus.IN_PROGRESS,
        started_at: "2023-01-01T10:01:00Z",
        completed_at: undefined,
      },
    ];

    it("should list execution states with default parameters", async () => {
      const mockResponse = createMockResponse([mockState]);
      apiHandler.get.mockResolvedValue(mockResponse);

      const result = await service.list();

      expect(apiHandler.get).toHaveBeenCalledWith(
        `/v1/workflows/${workflowId}/executions/${executionId}/states`,
        {
          page: 0,
          per_page: 10,
        },
      );
      expect(result).toEqual([mockState]);
    });

    it("should list execution states with custom parameters", async () => {
      const mockResponse = createMockResponse(mockStates);
      apiHandler.get.mockResolvedValue(mockResponse);

      const result = await service.list({
        page: 1,
        per_page: 20,
      });

      expect(apiHandler.get).toHaveBeenCalledWith(
        `/v1/workflows/${workflowId}/executions/${executionId}/states`,
        {
          page: 1,
          per_page: 20,
        },
      );
      expect(result).toEqual(mockStates);
    });

    it("should handle empty state list", async () => {
      const mockResponse = createMockResponse([]);
      apiHandler.get.mockResolvedValue(mockResponse);

      const result = await service.list();

      expect(result).toEqual([]);
    });

    it("should handle API errors during listing", async () => {
      const error = new ApiError("Failed to fetch execution states");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.list()).rejects.toThrow(error);
    });
  });

  describe("getOutput", () => {
    const mockOutput: WorkflowExecutionStateOutput = {
      output: "Processed 42 records successfully",
    };

    it("should get output for a specific execution state", async () => {
      apiHandler.get.mockResolvedValue(mockOutput);

      const result = await service.getOutput("state-1");

      expect(apiHandler.get).toHaveBeenCalledWith(
        `/v1/workflows/${workflowId}/executions/${executionId}/states/state-1/output`,
      );
      expect(result).toEqual(mockOutput);
    });

    it("should handle undefined output", async () => {
      const emptyOutput: WorkflowExecutionStateOutput = {
        output: undefined,
      };

      apiHandler.get.mockResolvedValue(emptyOutput);

      const result = await service.getOutput("state-1");

      expect(result).toEqual(emptyOutput);
    });

    it("should handle not found error", async () => {
      const error = new NotFoundError("Execution State", "non-existent");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.getOutput("non-existent")).rejects.toThrow(error);
    });

    it("should handle API errors", async () => {
      const error = new ApiError("Failed to fetch state output");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.getOutput("state-1")).rejects.toThrow(error);
    });

    it("should handle network errors", async () => {
      const error = new Error("Network error");
      apiHandler.get.mockRejectedValue(error);

      await expect(service.getOutput("state-1")).rejects.toThrow(error);
    });
  });
});
