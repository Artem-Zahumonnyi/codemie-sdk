import type { AboutUser, AboutUserResponse } from "../models";
import { omitUndefined } from "../utils/helpers";

export class UserMapper {
  static mapAboutUserResponse(response: AboutUserResponse): AboutUser {
    return omitUndefined({
      user_id: response.user_id,
      name: response.name,
      username: response.username,
      email: response.email,
      is_admin: response.is_admin,
      applications: response.applications,
      applications_admin: response.applications_admin,
      picture: response.picture,
      knowledge_bases: response.knowledge_bases,
    });
  }
}
