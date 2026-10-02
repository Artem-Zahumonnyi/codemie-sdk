import type { AuthConfig } from "../models/common";
import type {
  Category,
  CategoryCreateParams,
  CategoryListResponse,
  CategoryResponse,
  CategoryUpdateParams,
} from "../models/category";
import { ApiRequestHandler } from "../utils/http";

export class CategoryService {
  private api: ApiRequestHandler;

  constructor(config: AuthConfig) {
    this.api = new ApiRequestHandler(config);
  }

  /**
   * Get all available assistant categories (legacy, non-paginated).
   * Public endpoint — no admin access required.
   * GET /v1/assistants/categories
   */
  async getCategories(): Promise<Category[]> {
    return this.api.get<Category[]>("/v1/assistants/categories");
  }

  /**
   * Get paginated list of categories with marketplace/project assistant counts.
   * Admin access required.
   * GET /v1/assistants/categories/list
   */
  async listCategories(page = 0, perPage = 10): Promise<CategoryListResponse> {
    return this.api.get<CategoryListResponse>("/v1/assistants/categories/list", {
      page,
      per_page: perPage,
    });
  }

  /**
   * Get a specific category by ID with assistant counts.
   * Admin access required.
   * GET /v1/assistants/categories/{id}
   */
  async getCategory(categoryId: string): Promise<CategoryResponse> {
    return this.api.get<CategoryResponse>(`/v1/assistants/categories/${categoryId}`);
  }

  /**
   * Create a new category. The ID is auto-generated from the name.
   * Admin access required.
   * POST /v1/assistants/categories
   */
  async createCategory(params: CategoryCreateParams): Promise<CategoryResponse> {
    return this.api.post<CategoryResponse>("/v1/assistants/categories", params);
  }

  /**
   * Update an existing category.
   * Admin access required.
   * PUT /v1/assistants/categories/{id}
   */
  async updateCategory(categoryId: string, params: CategoryUpdateParams): Promise<CategoryResponse> {
    return this.api.put<CategoryResponse>(`/v1/assistants/categories/${categoryId}`, params);
  }

  /**
   * Delete a category. Fails with 409 if any assistants are assigned to it.
   * Admin access required.
   * DELETE /v1/assistants/categories/{id}
   */
  async deleteCategory(categoryId: string): Promise<void> {
    return this.api.delete<void>(`/v1/assistants/categories/${categoryId}`);
  }
}
