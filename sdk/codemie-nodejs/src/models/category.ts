export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  description?: string;
  marketplaceAssistantCount: number;
  projectAssistantCount: number;
  /** ISO datetime string */
  createdAt: string;
  /** ISO datetime string */
  updatedAt?: string;
}

export interface CategoryListResponse {
  categories: CategoryResponse[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface CategoryCreateParams {
  /** 1–255 chars */
  name: string;
  /** Optional description, max 1000 chars */
  description?: string;
}

export interface CategoryUpdateParams {
  /** 1–255 chars */
  name: string;
  /** Optional description, max 1000 chars */
  description?: string;
}
