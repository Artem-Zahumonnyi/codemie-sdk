import { WorkflowMapper } from "../mappers/workflow.mapper";
import type { AnyJson, PaginatedResponse, AuthConfig } from "../models/common";
import type { Workflow, WorkflowResponse } from "../models/workflow";
import {
  WorkflowCreateParamsSchema,
  type WorkflowCreateParams,
  WorkflowEvaluationParamsSchema,
  type WorkflowEvaluationParams,
  WorkflowListParamsSchema,
  type WorkflowListParams,
  WorkflowUpdateParamsSchema,
  type WorkflowUpdateParams,
} from "../schemas/workflow";
import { ApiRequestHandler } from "../utils/http";
import { WorkflowExecutionService } from "./workflow_execution";

export class WorkflowService {
  private api: ApiRequestHandler;

  constructor(config: AuthConfig) {
    this.api = new ApiRequestHandler(config);
  }

  /**
   * Get list of prebuilt workflows.
   */
  async getPrebuilt(): Promise<Workflow[]> {
    const response = await this.api.get<WorkflowResponse[]>("/v1/workflows/prebuilt");
    const prebuiltItems = Array.isArray(response) ? response : [];
    return prebuiltItems.map(WorkflowMapper.mapWorkflowResponse);
  }

  /**
   * Create a new workflow.
   */
  async create(_params: WorkflowCreateParams): Promise<AnyJson> {
    const params = WorkflowCreateParamsSchema.parse(_params);
    return this.api.post("/v1/workflows", params);
  }

  /**
   * Update an existing workflow.
   */
  async update(workflowId: string, _params: WorkflowUpdateParams): Promise<AnyJson> {
    const params = WorkflowUpdateParamsSchema.parse(_params);
    return this.api.put(`/v1/workflows/${workflowId}`, params);
  }

  /**
   * List workflows with filtering and pagination support.
   */
  async list(_params: WorkflowListParams = {}): Promise<Workflow[]> {
    const params = WorkflowListParamsSchema.parse(_params);

    const queryParams: Record<string, number | string> = {
      page: params.page,
      per_page: params.per_page,
    };

    const filters: Record<string, string | string[]> = {};
    if (params.projects?.length) filters.project = params.projects;
    if (params.search) filters.name = params.search;
    if (Object.keys(filters).length)
      queryParams.filters = JSON.stringify(filters);

    const workflows = await this.api.get<PaginatedResponse<WorkflowResponse>>(
      "/v1/workflows",
      queryParams,
    );

    const items = Array.isArray(workflows?.data) ? workflows.data : [];
    return items.map(WorkflowMapper.mapWorkflowResponse);
  }

  /**
   * Get workflow by ID.
   */
  async get(workflowId: string): Promise<Workflow> {
    const response = await this.api.get<WorkflowResponse>(`/v1/workflows/id/${workflowId}`);
    return WorkflowMapper.mapWorkflowResponse(response);
  }

  /**
   * Delete a workflow by ID.
   */
  async delete(workflowId: string): Promise<AnyJson> {
    return this.api.delete(`/v1/workflows/${workflowId}`);
  }

  /**
   * Run a workflow by ID.
   */
  async run(
    workflowId: string,
    userInput?: string | Record<string, unknown> | unknown[] | number | boolean,
    fileName?: string,
    sessionId?: string,
    propagateHeaders?: boolean,
    headers?: Record<string, string>,
    tags?: string[],
  ): Promise<AnyJson> {
    return this.executions(workflowId).create(
      userInput,
      fileName,
      sessionId,
      propagateHeaders,
      headers,
      tags,
    );
  }

  /**
   * Evaluate a workflow with a dataset.
   */
  async evaluate(workflowId: string, _params: WorkflowEvaluationParams): Promise<AnyJson> {
    const params = WorkflowEvaluationParamsSchema.parse(_params);
    return this.api.post(`/v1/workflows/${workflowId}/evaluate`, params);
  }

  /**
   * Get workflow execution service for the specified workflow.
   */
  executions(workflowId: string): WorkflowExecutionService {
    return new WorkflowExecutionService(this.api, workflowId);
  }
}
