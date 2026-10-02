import { UserMapper } from "../mappers/user.mapper";
import type { AuthConfig } from "../models/common";
import type { AboutUser, AboutUserResponse, UserData } from "../models/user";
import { ApiRequestHandler } from "../utils/http";

export class UserService {
  private api: ApiRequestHandler;

  constructor(config: AuthConfig) {
    this.api = new ApiRequestHandler(config);
  }

  /**
   * Get current user profile.
   */
  async aboutMe(): Promise<AboutUser> {
    const response = await this.api.get<AboutUserResponse>("/v1/user");
    return UserMapper.mapAboutUserResponse(response);
  }

  /**
   * Get user data and preferences.
   */
  async getData(): Promise<UserData> {
    return this.api.get("/v1/user/data");
  }
}
