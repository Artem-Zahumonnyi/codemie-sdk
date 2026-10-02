import FormData from "form-data";
import { DatasourceMapper } from "../mappers/datasource.mapper";
import type { AnyJson, PaginatedResponse, AuthConfig } from "../models/common";
import type {
  DataSource,
  DataSourceCreateParams,
  DataSourceListParams,
  DataSourceResponse,
  DataSourceTypeType,
  DataSourceUpdateParams,
  ElasticsearchStats,
  FileDataSourceCreateParams,
  ProviderDataSourceRequest,
} from "../models/datasource";
import { DataSourceType } from "../models/datasource";
import { ApiRequestHandler } from "../utils/http";

const DATA_SOURCE_TO_PATH_PARAM: Record<string, string> = {
  [DataSourceType.CODE]: "CODE",
  [DataSourceType.CONFLUENCE]: "CONFLUENCE",
  [DataSourceType.JIRA]: "JIRA",
  [DataSourceType.FILE]: "FILE",
  [DataSourceType.GOOGLE]: "GOOGLE",
  [DataSourceType.GIT_FAQ]: "GIT_FAQ",
  [DataSourceType.PROVIDER]: "PROVIDER",
  [DataSourceType.SUMMARY]: "SUMMARY",
  [DataSourceType.CHUNK_SUMMARY]: "CHUNK_SUMMARY",
  [DataSourceType.JSON]: "JSON",
  [DataSourceType.BEDROCK]: "BEDROCK",
  [DataSourceType.XRAY]: "XRAY",
  [DataSourceType.PLATFORM]: "PLATFORM_MARKETPLACE_ASSISTANT",
  [DataSourceType.AZURE_DEVOPS_WIKI]: "AZURE_DEVOPS_WIKI",
  [DataSourceType.AZURE_DEVOPS_WORK_ITEM]: "AZURE_DEVOPS_WORK_ITEM",
  [DataSourceType.SHAREPOINT]: "SHAREPOINT",
};

export class DatasourceService {
  private api: ApiRequestHandler;

  constructor(config: AuthConfig) {
    this.api = new ApiRequestHandler(config);
  }

  /**
   * Create a new datasource.
   */
  async create(params: DataSourceCreateParams): Promise<AnyJson> {
    const dto = DatasourceMapper.mapDatasourceCreateToDto(params);

    if (dto.type === DataSourceType.FILE) {
      return this.createFileDatasource(dto as unknown as FileDataSourceCreateParams);
    }

    return this.api.post(this.getCreateDatasourceUrl(dto.type, dto.project_name), dto);
  }

  /**
   * Create a file datasource.
   */
  private async createFileDatasource({
    files,
    ...datasource
  }: FileDataSourceCreateParams): Promise<AnyJson> {
    const formData = new FormData();

    for (const file of files) {
      formData.append("files", Buffer.from(file.content), {
        filename: file.name,
        contentType: file.mime_type,
      });
    }

    return this.api.postMultipart(
      this.getCreateDatasourceUrl(datasource.type, datasource.project_name),
      formData,
      datasource,
    );
  }

  /**
   * Update an existing datasource.
   */
  async update(params: DataSourceUpdateParams): Promise<AnyJson> {
    this.validateUpdateReindexParams(params);

    const { full_reindex, skip_reindex, resume_indexing, incremental_reindex, ...data } = params;

    const endpoint =
      params.type === DataSourceType.CODE
        ? `/v1/application/${params.project_name}/index/${params.name}`
        : `/v1/index/knowledge_base/${this.getKnowledgeBaseParam(params.type)}`;

    // Extract reindex params
    const queryParams = {
      full_reindex,
      skip_reindex,
      resume_indexing,
      incremental_reindex,
    };

    const { type, ...dto } = DatasourceMapper.mapDatasourceUpdateToDto(data);

    return this.api.put(endpoint, dto, { params: queryParams });
  }

  /**
   * List datasources with pagination and filtering support.
   */
  async list(params: DataSourceListParams = {}): Promise<DataSource[]> {
    const queryParams: Record<string, number | string> = {
      page: params.page || 0,
      per_page: params.per_page || 10,
      sort_key: params.sort_key || "update_date",
      sort_order: params.sort_order || "desc",
    };

    if (params.datasource_types || params.projects || params.status || params.owner || params.search) {
      const filters: Record<string, number | string | string[]> = {};
      if (params.datasource_types) filters.index_type = params.datasource_types;
      if (params.projects) filters.project = params.projects;
      if (params.status) filters.status = params.status;
      if (params.owner) filters.created_by = params.owner;
      if (params.search) filters.name = params.search;
      queryParams.filters = JSON.stringify(filters);
    }

    const response = await this.api.get<PaginatedResponse<DataSourceResponse>>(
      "/v1/index",
      queryParams,
    );

    const items = Array.isArray(response?.data) ? response.data : [];
    return items.map(DatasourceMapper.mapDatasourceResponse);
  }

  /**
   * Get datasource by ID.
   */
  async get(datasourceId: string): Promise<DataSource> {
    const response = await this.api.get<DataSourceResponse>(`/v1/index/${datasourceId}`);
    return DatasourceMapper.mapDatasourceResponse(response);
  }

  /**
   * Delete a datasource by ID.
   */
  async delete(datasourceId: string): Promise<AnyJson> {
    return this.api.delete(`/v1/index/${datasourceId}`);
  }

  /**
   * Get all assistants that use a specific datasource.
   */
  async getAssistantsUsingDatasource(datasourceId: string): Promise<AnyJson[]> {
    return this.api.get<AnyJson[]>(`/v1/index/${datasourceId}/assistants`);
  }

  /**
   * Create a provider datasource (CodeAnalysis or CodeExploration).
   */
  async createProvider(
    toolkitId: string,
    providerName: string,
    params: ProviderDataSourceRequest,
  ): Promise<AnyJson> {
    const { shared_with_project, ...rest } = params as typeof params & { shared_with_project?: boolean };
    return this.api.post(
      "/v1/index/provider",
      { ...rest, project_space_visible: shared_with_project ?? false },
      { params: { toolkit_id: toolkitId, provider_name: providerName } },
    );
  }

  /**
   * Get Elasticsearch index statistics for a datasource.
   */
  async getElasticsearchStats(datasourceId: string): Promise<ElasticsearchStats> {
    return this.api.get<ElasticsearchStats>(`/v1/index/${datasourceId}/elasticsearch`);
  }

  private getCreateDatasourceUrl(type: DataSourceTypeType, projectName: string): string {
    if (type === DataSourceType.CODE) {
      return `/v1/application/${projectName}/index`;
    }
    return `/v1/index/knowledge_base/${this.getKnowledgeBaseParam(type)}`;
  }

  private getKnowledgeBaseParam(type: DataSourceTypeType): string {
    return DATA_SOURCE_TO_PATH_PARAM[type].toLowerCase();
  }

  /**
   * Validates update parameters for reindexing.
   * @throws {Error} If the update parameters are invalid for the given datasource type.
   */
  private validateUpdateReindexParams(updateParams: DataSourceUpdateParams): void {
    if (updateParams.type === DataSourceType.CONFLUENCE && updateParams.incremental_reindex) {
      throw new Error("Confluence data sources only support full_reindex and resume_indexing");
    }
    if (updateParams.type === DataSourceType.JIRA && updateParams.resume_indexing) {
      throw new Error("Jira data sources only support full_reindex and incremental_reindex");
    }
    if (updateParams.type === DataSourceType.CODE && updateParams.incremental_reindex) {
      throw new Error("Code data sources do not support incremental_reindex");
    }
    if (updateParams.type === DataSourceType.GOOGLE && updateParams.incremental_reindex) {
      throw new Error("Google data sources only support full_reindex");
    }
    if (
      updateParams.type === DataSourceType.SHAREPOINT &&
      (updateParams.incremental_reindex || updateParams.resume_indexing)
    ) {
      throw new Error("SharePoint data sources only support full_reindex");
    }
  }
}
