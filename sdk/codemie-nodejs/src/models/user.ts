/** Models for user service. */

/** User API response. */
export interface AboutUserResponse {
  user_id: string;
  name: string;
  username: string;
  email: string;
  is_admin: boolean;
  applications: string[];
  applications_admin: string[];
  picture: string;
  knowledge_bases: string[];
}

/** User model. */
export interface AboutUser {
  user_id: string;
  name: string;
  username: string;
  email: string;
  is_admin: boolean;
  applications: string[];
  applications_admin: string[];
  picture: string;
  knowledge_bases: string[];
}

/** User data and preferences model. */
export interface UserData {
  id?: string;
  date?: string;
  update_date?: string;
  user_id?: string;
}
