/** Models for task service. */

/** Background task status constants */
export const BackgroundTaskStatus = {
  STARTED: "STARTED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type BackgroundTaskStatusType =
  (typeof BackgroundTaskStatus)[keyof typeof BackgroundTaskStatus];

/** Model representing task user information */
export interface TaskUser {
  /** Unique identifier of the user */
  user_id: string;
  /** Username of the task owner */
  username: string;
  /** Display name of the task owner */
  name: string;
}

/** Model representing a background task */
export interface BackgroundTaskEntity {
  /** Unique identifier of the task */
  id: string;
  /** Task description or name */
  task: string;
  /** Information about the task owner */
  user: TaskUser;
  /** The final result or output of the task */
  final_output?: string;
  /** Current step or stage of the task */
  current_step?: string;
  /** Task status (STARTED, COMPLETED, or FAILED) */
  status: BackgroundTaskStatusType;
  /** Task creation timestamp */
  date: string;
  /** Last update timestamp */
  update_date: string;
}
