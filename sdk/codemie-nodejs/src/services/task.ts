import type { AuthConfig } from "../models/common";
import type { BackgroundTaskEntity } from "../models/task";
import { ApiRequestHandler } from "../utils/http";

export class TaskService {
  private api: ApiRequestHandler;

  constructor(config: AuthConfig) {
    this.api = new ApiRequestHandler(config);
  }

  /**
   * Get a background task by ID.
   */
  async get(taskId: string): Promise<BackgroundTaskEntity> {
    return this.api.get(`/v1/tasks/${taskId}`);
  }
}
