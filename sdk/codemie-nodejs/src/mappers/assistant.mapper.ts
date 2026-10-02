import type { BaseModelApiResponse, BaseModelResponse } from "../models";
import { omitUndefined } from "../utils/helpers";

export class AssistantMapper {
  static mapBaseModelApiResponse(response: BaseModelApiResponse): BaseModelResponse {
    return omitUndefined({
      generated: response.generated,
      time_elapsed: response.timeElapsed,
      tokens_used: response.tokensUsed,
      thoughts: response.thoughts,
      task_id: response.taskId,
      success: response.success,
      agent_error: response.agentError,
      tool_errors: response.toolErrors,
    });
  }
}
