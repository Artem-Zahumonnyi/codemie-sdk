/** Models for skill-related data structures. */

export enum SkillVisibility {
  PRIVATE = "private",
  PROJECT = "project",
  PUBLIC = "public",
}

export enum SkillScopeFilter {
  MARKETPLACE = "marketplace",
  PROJECT = "project",
  PROJECT_WITH_MARKETPLACE = "project_with_marketplace",
}

export enum SkillSortBy {
  CREATED_DATE = "created_date",
  ASSISTANTS_COUNT = "assistants_count",
  RELEVANCE = "relevance",
}

export enum SkillCategory {
  DEVELOPMENT = "development",
  ENGINEERING = "engineering",
  TESTING = "testing",
  QUALITY_ASSURANCE = "quality_assurance",
  CODE_REVIEW = "code_review",
  DOCUMENTATION = "documentation",
  DEVOPS = "devops",
  SECURITY = "security",
  COMPLIANCE = "compliance",
  MONITORING_ALERTS = "monitoring_alerts",
  ARCHITECTURE = "architecture",
  UI_UX_DESIGN = "ui_ux_design",
  DATA_ANALYSIS = "data_analysis",
  DATA_ANALYTICS = "data_analytics",
  PROJECT_MANAGEMENT = "project_management",
  PRODUCT_MANAGEMENT = "product_management",
  BUSINESS_ANALYSIS = "business_analysis",
  MIGRATION_MODERNIZATION = "migration_modernization",
  SUPPORT = "support",
  CUSTOMER_EXPERIENCE = "customer_experience",
  KNOWLEDGE_MANAGEMENT = "knowledge_management",
  TRAINING = "training",
  PRESALES = "presales",
  INTERVIEW = "interview",
  TALENT_ACQUISITION = "talent_acquisition",
  OTHER = "other",
}

export interface SkillCreatedBy {
  id: string;
  username: string;
  name: string;
}

export interface SkillListItem {
  id: string;
  name: string;
  description: string;
  project: string;
  visibility: SkillVisibility;
  created_by: SkillCreatedBy | null;
  categories: SkillCategory[];
  createdDate: string;
  updatedDate: string | null;
  is_attached: boolean;
  assistants_count: number;
  user_abilities: string[];
  unique_likes_count: number;
  unique_dislikes_count: number;
}

export interface SkillDetail extends SkillListItem {
  display_name?: string | null;
  content: string;
  toolkits: unknown[];
  mcp_servers: unknown[];
  /** Companion files attached to the skill (metadata only; fetch content with `getCompanionFile()`). */
  companion_files?: SkillCompanionFileMetadata[];
}

export interface SkillListPaginatedResponse {
  skills: SkillListItem[];
  page: number;
  perPage: number;
  pages: number;
  total: number;
}

/** Encoding of a companion file's `content`: plain `text` or `base64` (content must be valid base64). */
export type SkillCompanionFileEncoding = "text" | "base64";

/**
 * Metadata of a companion file stored alongside a skill.
 *
 * `path` is a safe relative path: no leading `/`, no drive letter, no `..` segments;
 * backslashes are normalised to `/`. `SKILL.md` is reserved and cannot be used.
 */
export interface SkillCompanionFileMetadata {
  /** Safe relative path of the file within the skill (e.g. "docs/guide.md"). */
  path: string;
  mime_type: string;
  encoding: SkillCompanionFileEncoding;
  size_bytes: number;
}

/** A companion file with its content, returned by `getCompanionFile()`. */
export interface SkillCompanionFile extends SkillCompanionFileMetadata {
  /** File content, encoded as described by `encoding`. */
  content: string;
}

/**
 * A companion file sent on skill create or update.
 *
 * Backend rules: `path` is a safe relative path (no leading `/`, no drive letter, no `..`;
 * backslashes are normalised), `SKILL.md` is reserved, and paths must be unique within one request.
 * `encoding` is `text` or `base64`; base64 content must be valid. The backend sets no limit on the
 * number or size of companion files.
 */
export interface SkillCompanionFilePayload {
  /** Safe relative path, unique within the request. `SKILL.md` is reserved. */
  path: string;
  /** File content: plain text, or base64 when `encoding` is `base64`. */
  content: string;
  mime_type?: string;
  encoding: SkillCompanionFileEncoding;
  size_bytes?: number;
}

/** Skill category API response item. */
export interface SkillCategoryItem {
  value: string;
  label: string;
  description?: string;
}

/** Parameters for creating a skill. */
export interface SkillCreateParams {
  /** Kebab-case identifier, 3–64 chars (e.g. "my-skill"). Must start and end with a letter or number. */
  name: string;
  /** 10–1000 chars. */
  description: string;
  /** Markdown skill instructions, minimum 100 chars. */
  content: string;
  project: string;
  visibility?: SkillVisibility;
  /** Max 3 categories. */
  categories?: string[];
  toolkits?: unknown[];
  mcp_servers?: unknown[];
  /** Companion files to store alongside the skill. See `SkillCompanionFilePayload` for the path rules. */
  companion_files?: SkillCompanionFilePayload[];
}

/** Parameters for updating a skill. */
export interface SkillUpdateParams {
  /** Kebab-case identifier, 3–64 chars. Must start and end with a letter or number. */
  name?: string;
  /** 10–1000 chars. */
  description?: string;
  /** Markdown skill instructions, minimum 100 chars. */
  content?: string;
  project?: string;
  visibility?: SkillVisibility;
  /** Max 3 categories. */
  categories?: string[];
  toolkits?: unknown[];
  mcp_servers?: unknown[];
  /**
   * Companion files that replace the skill's current set. By contract `null` removes all files and
   * omitting the field leaves them unchanged. Note: the current backend treats `null` as unchanged;
   * send `[]` to clear all companion files.
   */
  companion_files?: SkillCompanionFilePayload[] | null;
}

/** Parameters for importing a skill from .md file. */
export interface SkillImportParams {
  /**
   * Base64-encoded markdown file content. The file must include YAML frontmatter
   * with `name` and `description` fields. This matches the format produced by `export()`.
   *
   * @example
   * Buffer.from("---\nname: my-skill\ndescription: What this skill does\n---\n\n# Instructions\n...").toString("base64")
   */
  file_content: string;
  filename: string;
  project: string;
  visibility?: SkillVisibility;
}
/** Platform limits for skills, returned by `GET /v1/skills/config`. */
export interface SkillConfigResponse {
  /** Maximum skill content length in characters. Defaults to 30000 and is configurable per platform. */
  max_content_length: number;
  /** Minimum skill content length in characters (100). */
  min_content_length: number;
}
