export interface ResponseMetadata {
  timestamp: string;
  data_as_of: string;
  filters_applied: Record<string, unknown>;
  execution_time_ms: number;
}

export interface PaginationMetadata {
  page: number;
  per_page: number;
  total_count: number;
  has_more: boolean;
}

export interface ColumnDefinition {
  id: string;
  label: string;
  type: string;
  format?: string;
  description?: string;
}

export interface Metric {
  id: string;
  label: string;
  type: string;
  value: unknown;
  format?: string;
  description?: string;
}

export interface SummariesData {
  metrics: Metric[];
}

export interface TabularData {
  columns: ColumnDefinition[];
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
}

export interface UserListItem {
  id: string;
  name: string;
}

export interface UsersListData {
  users: UserListItem[];
  total_count: number;
}

export interface SummariesResponse {
  data: SummariesData;
  metadata: ResponseMetadata;
}

export interface TabularResponse {
  data: TabularData;
  metadata: ResponseMetadata;
  pagination?: PaginationMetadata;
}

export interface UsersListResponse {
  data: UsersListData;
  metadata: ResponseMetadata;
}
