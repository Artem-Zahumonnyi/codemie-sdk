import type { PaginatedResponse } from "../models/common";
import type { WorkflowExecutionState, WorkflowExecutionStateOutput } from "../models/workflow";
import {
  WorkflowExecutionStateListParamsSchema,
  type WorkflowExecutionStateListParams,
} from "../schemas/workflow";
import type { ApiRequestHandler } from "../utils/http";

export class WorkflowExecutionStateService {
  private api: ApiRequestHandler;
  private workflowId: string;
  private executionId: string;

  constructor(api: ApiRequestHandler, workflowId: string, executionId: string) {
    this.api = api;
    this.workflowId = workflowId;
    this.executionId = executionId;
  }

  /**
   * List states for the workflow execution with filtering and pagination support.
   */
  async list(_params: WorkflowExecutionStateListParams = {}): Promise<WorkflowExecutionState[]> {
    const params = WorkflowExecutionStateListParamsSchema.parse(_params);

    const queryParams = {
      page: params.page,
      per_page: params.per_page,
    };

    const response = await this.api.get<PaginatedResponse<WorkflowExecutionState>>(
      `/v1/workflows/${this.workflowId}/executions/${this.executionId}/states`,
      queryParams,
    );

    return response.data;
  }

  /**
   * Get output for a specific execution state.
   */
  async getOutput(stateId: string): Promise<WorkflowExecutionStateOutput> {
    return this.api.get(
      `/v1/workflows/${this.workflowId}/executions/${this.executionId}/states/${stateId}/output`,
    );
  }
}
