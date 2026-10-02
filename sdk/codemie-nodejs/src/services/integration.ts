import { NotFoundError } from "../exceptions";
import type { AnyJson, PaginatedResponse, AuthConfig } from "../models/common";
import { type Integration, IntegrationType, type IntegrationTypeType } from "../models/integration";
import {
  IntegrationCreateParamsSchema,
  type IntegrationCreateParams,
  IntegrationGetByAliasParamsSchema,
  type IntegrationGetByAliasParams,
  IntegrationGetParamsSchema,
  type IntegrationGetParams,
  IntegrationListParamsSchema,
  type IntegrationListParams,
  IntegrationUpdateParamsSchema,
  type IntegrationUpdateParams,
} from "../schemas/integration";
import { ApiRequestHandler } from "../utils/http";

export class IntegrationService {
  private api: ApiRequestHandler;

  constructor(config: AuthConfig) {
    this.api = new ApiRequestHandler(config);
  }

  /**
   * Get base API path based on setting type.
   */
  private getBasePath(settingType: IntegrationTypeType): string {
    return `/v1/settings/${settingType === IntegrationType.USER ? "user" : "project"}`;
  }

  /**
   * Get list of available integrations.
   */
  async list(_params: IntegrationListParams = {}): Promise<Integration[]> {
    const params = IntegrationListParamsSchema.parse(_params);
    const settingType = params.setting_type;

    const queryParams = {
      page: params.page,
      per_page: params.per_page,
      ...(params.filters ? { filters: JSON.stringify(params.filters) } : {}),
    };

    const response = await this.api.get<PaginatedResponse<Integration>>(
      this.getBasePath(settingType),
      queryParams,
    );

    return Array.isArray(response?.data) ? response.data : [];
  }

  /**
   * Get integration by ID.
   */
  async get(_params: IntegrationGetParams): Promise<Integration> {
    const params = IntegrationGetParamsSchema.parse(_params);
    const settingType = params.setting_type;
    const integrationId = params.integration_id;

    const integrations = await this.list({
      per_page: 100,
      setting_type: settingType,
    });

    const integration = integrations.find((i) => i.id === integrationId);
    if (!integration) {
      throw new NotFoundError("Integration", integrationId);
    }

    return integration;
  }

  /**
   * Get integration by alias.
   */
  async getByAlias(_params: IntegrationGetByAliasParams): Promise<Integration> {
    const params = IntegrationGetByAliasParamsSchema.parse(_params);
    const settingType = params.setting_type;
    const alias = params.alias;

    const integrations = await this.list({
      per_page: 100,
      setting_type: settingType,
    });

    const integration = integrations.find((i) => i.alias === alias);
    if (!integration) {
      throw new NotFoundError("Integration", alias);
    }

    return integration;
  }

  /**
   * Create a new integration.
   */
  async create(_params: IntegrationCreateParams): Promise<AnyJson> {
    const params = IntegrationCreateParamsSchema.parse(_params);
    const settingType = params.setting_type;

    return this.api.post(this.getBasePath(settingType), {
      ...params,
      setting_type: settingType,
      default: false,
    });
  }

  /**
   * Update an existing integration.
   */
  async update(settingId: string, _params: IntegrationUpdateParams): Promise<AnyJson> {
    const params = IntegrationUpdateParamsSchema.parse(_params);
    const settingType = params.setting_type;

    return this.api.put(`${this.getBasePath(settingType)}/${settingId}`, {
      ...params,
      setting_type: settingType,
      default: false,
    });
  }

  /**
   * Delete an integration by ID.
   */
  async delete(
    settingId: string,
    settingType: IntegrationTypeType = IntegrationType.USER,
  ): Promise<AnyJson> {
    return this.api.delete(`${this.getBasePath(settingType)}/${settingId}`);
  }
}
