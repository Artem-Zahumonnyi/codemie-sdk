import type { AnyJson, AuthConfig } from "../models/common";
import type {
  SkillCategoryItem,
  SkillCompanionFile,
  SkillCompanionFileMetadata,
  SkillConfigResponse,
  SkillCreateParams,
  SkillDetail,
  SkillImportParams,
  SkillListItem,
  SkillListPaginatedResponse,
  SkillUpdateParams,
} from "../models/skill";
import { SkillListParamsSchema, type SkillListParams } from "../schemas/skill";
import { ApiRequestHandler } from "../utils/http";

export class SkillService {
  private api: ApiRequestHandler;

  constructor(config: AuthConfig) {
    this.api = new ApiRequestHandler(config);
  }

  /**
   * Get paginated list of skills accessible to the current user.
   */
  async listPaginated(_params: SkillListParams = {}): Promise<SkillListPaginatedResponse> {
    const { scope, assistant_id, filters: rawFilters, ...rest } = SkillListParamsSchema.parse(_params);

    const mergedFilters = scope || rawFilters ? { ...rawFilters, ...(scope && { scope }) } : undefined;

    return this.api.get<SkillListPaginatedResponse>("/v1/skills", {
      ...rest,
      ...(assistant_id && { assistant_id }),
      ...(mergedFilters && { filters: JSON.stringify(mergedFilters) }),
    });
  }

  /**
   * Get flat list of skills (without pagination metadata).
   */
  async list(_params: SkillListParams = {}): Promise<SkillListItem[]> {
    const response = await this.listPaginated(_params);
    return response.skills;
  }

  /**
   * Get skill details by ID.
   */
  async get(skillId: string): Promise<SkillDetail> {
    return this.api.get<SkillDetail>(`/v1/skills/${skillId}`);
  }

  /**
   * Create a new skill.
   */
  async create(params: SkillCreateParams): Promise<SkillDetail> {
    return this.api.post<SkillDetail>("/v1/skills", params);
  }

  /**
   * Update an existing skill.
   *
   * `companion_files`: by contract `null` removes all files and omitting the field leaves them
   * unchanged. The current backend treats `null` as unchanged; send `[]` to clear all companion files.
   */
  async update(skillId: string, params: SkillUpdateParams): Promise<SkillDetail> {
    return this.api.put<SkillDetail>(`/v1/skills/${skillId}`, params);
  }

  /**
   * Delete a skill by ID.
   */
  async delete(skillId: string): Promise<AnyJson> {
    return this.api.delete<AnyJson>(`/v1/skills/${skillId}`);
  }

  /**
   * Import a skill from .md file content.
   */
  async importSkill(params: SkillImportParams): Promise<SkillDetail> {
    return this.api.post<SkillDetail>("/v1/skills/import", params);
  }

  /**
   * Export a skill as markdown content.
   */
  async export(skillId: string): Promise<string> {
    return this.api.get<string>(`/v1/skills/${skillId}/export`, undefined, { responseType: "text" });
  }

  /**
   * Attach a skill to an assistant.
   */
  async attachToAssistant(assistantId: string, skillId: string): Promise<AnyJson> {
    return this.api.post<AnyJson>(`/v1/assistants/${assistantId}/skills`, { skill_id: skillId });
  }

  /**
   * Detach a skill from an assistant.
   */
  async detachFromAssistant(assistantId: string, skillId: string): Promise<AnyJson> {
    return this.api.delete<AnyJson>(`/v1/assistants/${assistantId}/skills/${skillId}`);
  }

  /**
   * Get all skills attached to an assistant.
   */
  async getAssistantSkills(assistantId: string): Promise<SkillListItem[]> {
    return this.api.get<SkillListItem[]>(`/v1/assistants/${assistantId}/skills`);
  }

  /**
   * Bulk attach a skill to multiple assistants.
   */
  async bulkAttachToAssistants(skillId: string, assistantIds: string[]): Promise<AnyJson> {
    return this.api.post<AnyJson>(`/v1/skills/${skillId}/assistants/bulk-attach`, {
      assistant_ids: assistantIds,
    });
  }

  /**
   * Get all assistants using this skill.
   */
  async getSkillAssistants(skillId: string): Promise<AnyJson[]> {
    return this.api.get<AnyJson[]>(`/v1/skills/${skillId}/assistants`);
  }

  /**
   * List the companion files of a skill (metadata only, without content).
   */
  async listCompanionFiles(skillId: string): Promise<SkillCompanionFileMetadata[]> {
    return this.api.get<SkillCompanionFileMetadata[]>(`/v1/skills/${skillId}/companion-files`);
  }

  /**
   * Get one companion file of a skill, including its content, by its relative path.
   */
  async getCompanionFile(skillId: string, path: string): Promise<SkillCompanionFile> {
    return this.api.get<SkillCompanionFile>(`/v1/skills/${skillId}/companion-files/content`, {
      path,
    });
  }

  /**
   * Publish a skill to the marketplace.
   */
  async publish(skillId: string, categories?: string[]): Promise<AnyJson> {
    const body = categories?.length ? { categories } : undefined;
    return this.api.post<AnyJson>(`/v1/skills/${skillId}/marketplace/publish`, body);
  }

  /**
   * Unpublish a skill from the marketplace.
   */
  async unpublish(skillId: string): Promise<AnyJson> {
    return this.api.post<AnyJson>(`/v1/skills/${skillId}/marketplace/unpublish`);
  }

  /**
   * Get list of available skill categories.
   */
  async listCategories(): Promise<SkillCategoryItem[]> {
    return this.api.get<SkillCategoryItem[]>("/v1/skills/categories");
  }

  /**
   * Get the platform skill limits (content length bounds).
   */
  async getConfig(): Promise<SkillConfigResponse> {
    return this.api.get<SkillConfigResponse>("/v1/skills/config");
  }

  /**
   * Get users with access to skills.
   */
  async getUsers(): Promise<AnyJson[]> {
    return this.api.get<AnyJson[]>("/v1/skills/users");
  }

  /**
   * React to a skill.
   */
  async react(skillId: string, reaction: "like" | "dislike"): Promise<AnyJson> {
    return this.api.post<AnyJson>(`/v1/skills/${skillId}/reactions`, { reaction });
  }

  /**
   * Remove all reactions from a skill.
   */
  async removeReactions(skillId: string): Promise<AnyJson> {
    return this.api.delete<AnyJson>(`/v1/skills/${skillId}/reactions`);
  }
}