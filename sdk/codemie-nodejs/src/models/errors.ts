/**
 * Error models for structured error handling in CodeMie SDK responses.
 *
 * This module provides error classification and structured error details that match
 * the CodeMie API error response format, enabling proper error handling without
 * parsing error messages.
 */

/**
 * High-level categorization of errors in the CodeMie system.
 *
 * Separates errors by their source to enable proper handling and debugging.
 */
export enum ErrorCategory {
  AGENT = "agent", // Agent-level errors (execution, callbacks, etc.)
  TOOL = "tool", // Tool execution errors (HTTP errors, timeouts, etc.)
  LLM = "llm", // LLM provider errors (rate limits, content policy, etc.)
  VALIDATION = "validation", // Input/output validation errors
}

/**
 * Specific error codes for detailed error classification.
 *
 * These codes enable clients to programmatically handle different error scenarios
 * without parsing error messages.
 */
export enum ErrorCode {
  // Agent errors - internal execution issues
  AGENT_TIMEOUT = "agent_timeout",
  AGENT_TOKEN_LIMIT = "agent_token_limit",
  AGENT_BUDGET_EXCEEDED = "agent_budget_exceeded",
  AGENT_CALLBACK_FAILURE = "agent_callback_failure",
  AGENT_NETWORK_ERROR = "agent_network_error",
  AGENT_CONFIGURATION_ERROR = "agent_configuration_error",
  AGENT_INTERNAL_ERROR = "agent_internal_error",

  // Tool errors - external service/integration errors
  TOOL_AUTHENTICATION = "tool_authentication", // 401 Unauthorized
  TOOL_AUTHORIZATION = "tool_authorization", // 403 Forbidden
  TOOL_NOT_FOUND = "tool_not_found", // 404 Not Found
  TOOL_CONFLICT = "tool_conflict", // 409 Conflict
  TOOL_RATE_LIMITED = "tool_rate_limited", // 429 Too Many Requests
  TOOL_SERVER_ERROR = "tool_server_error", // 5xx Server Error
  TOOL_TIMEOUT = "tool_timeout",
  TOOL_VALIDATION = "tool_validation", // Invalid tool input
  TOOL_NETWORK_ERROR = "tool_network_error",
  TOOL_EXECUTION_FAILED = "tool_execution_failed", // Generic tool failure

  // LLM errors - provider-specific errors
  LLM_CONTENT_POLICY = "llm_content_policy",
  LLM_CONTEXT_LENGTH = "llm_context_length",
  LLM_UNAVAILABLE = "llm_unavailable",
  LLM_RATE_LIMITED = "llm_rate_limited",
  LLM_INVALID_REQUEST = "llm_invalid_request",

  // Validation errors - input/output validation
  VALIDATION_INPUT = "validation_input",
  VALIDATION_OUTPUT = "validation_output",
  VALIDATION_SCHEMA = "validation_schema",
}

/**
 * Structured details for a tool execution error.
 *
 * Captures comprehensive information about tool failures to enable proper
 * debugging and error handling without relying on the LLM to interpret errors.
 */
export interface ToolErrorDetails {
  /** Name of the tool that encountered an error */
  tool_name: string;
  /** Unique identifier for the tool call */
  tool_call_id?: string;
  /** Classified error code for programmatic handling */
  error_code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** HTTP status code if applicable (401, 403, 404, 5xx, etc.) */
  http_status?: number;
  /** Additional error context (integration name, action, etc.) */
  details?: Record<string, unknown>;
  /** ISO 8601 timestamp of when error occurred */
  timestamp: string;
}

/**
 * Error verbosity level for API responses.
 *
 * Controls how much detail is included in tool error responses:
 * - Minimal: Only error code and message (for production clients)
 * - Standard: Adds HTTP status and tool_call_id (default, for debugging)
 * - Full: Includes all details including timestamp (for development)
 */
export enum ErrorDetailLevel {
  Minimal = "minimal",
  Standard = "standard",
  Full = "full",
}

/**
 * Structured details for an agent-level error.
 *
 * Captures agent execution failures that are not related to specific tools,
 * such as token limits, budget constraints, or internal errors.
 */
export interface AgentErrorDetails {
  /** Classified error code for programmatic handling */
  error_code: ErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error context */
  details?: Record<string, unknown>;
  /** Full stacktrace for debugging (only in debug mode) */
  stacktrace?: string;
}

/**
 * Complete error response with separated agent and tool errors.
 *
 * This structure ensures that errors from different sources are clearly
 * distinguished and not absorbed by the LLM's response text.
 */
export interface ErrorResponse {
  /** High-level error category */
  category: ErrorCategory;
  /** Agent-level error details (if applicable) */
  agent_error?: AgentErrorDetails;
  /** Tool error details (multiple tools can fail) */
  tool_errors?: ToolErrorDetails[];
  /** Whether the error is recoverable */
  is_recoverable: boolean;
}

/**
 * Format tool error details to minimal format (code + message only).
 */
export function formatToolErrorMinimal(error: ToolErrorDetails): Record<string, unknown> {
  return {
    tool_name: error.tool_name,
    error_code: error.error_code,
    message: error.message,
  };
}

/**
 * Format tool error details to standard format (+ http_status, tool_call_id).
 */
export function formatToolErrorStandard(error: ToolErrorDetails): Record<string, unknown> {
  return {
    tool_name: error.tool_name,
    tool_call_id: error.tool_call_id,
    error_code: error.error_code,
    message: error.message,
    http_status: error.http_status,
  };
}

/**
 * Format tool error details to full format (all fields).
 */
export function formatToolErrorFull(error: ToolErrorDetails): Record<string, unknown> {
  return { ...error };
}

/**
 * Format tool error details based on verbosity level.
 */
export function formatToolErrorForLevel(
  error: ToolErrorDetails,
  level: ErrorDetailLevel,
): Record<string, unknown> {
  switch (level) {
    case ErrorDetailLevel.Minimal:
      return formatToolErrorMinimal(error);
    case ErrorDetailLevel.Standard:
      return formatToolErrorStandard(error);
    case ErrorDetailLevel.Full:
      return formatToolErrorFull(error);
  }
}

/**
 * HTTP status code to error code mapping.
 */
export const HTTP_STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  // Client errors (4xx)
  401: ErrorCode.TOOL_AUTHENTICATION,
  403: ErrorCode.TOOL_AUTHORIZATION,
  404: ErrorCode.TOOL_NOT_FOUND,
  409: ErrorCode.TOOL_CONFLICT,
  429: ErrorCode.TOOL_RATE_LIMITED,
  // Server errors (5xx)
  500: ErrorCode.TOOL_SERVER_ERROR,
  501: ErrorCode.TOOL_SERVER_ERROR,
  502: ErrorCode.TOOL_SERVER_ERROR,
  503: ErrorCode.TOOL_SERVER_ERROR,
  504: ErrorCode.TOOL_SERVER_ERROR,
  505: ErrorCode.TOOL_SERVER_ERROR,
  506: ErrorCode.TOOL_SERVER_ERROR,
  507: ErrorCode.TOOL_SERVER_ERROR,
  508: ErrorCode.TOOL_SERVER_ERROR,
  509: ErrorCode.TOOL_SERVER_ERROR,
  510: ErrorCode.TOOL_SERVER_ERROR,
  511: ErrorCode.TOOL_SERVER_ERROR,
};

/**
 * Error message keywords to error code mapping.
 */
export const ERROR_MESSAGE_PATTERNS: Record<string, ErrorCode> = {
  timeout: ErrorCode.TOOL_TIMEOUT,
  network: ErrorCode.TOOL_NETWORK_ERROR,
  connection: ErrorCode.TOOL_NETWORK_ERROR,
  validation: ErrorCode.TOOL_VALIDATION,
  invalid: ErrorCode.TOOL_VALIDATION,
};

/**
 * Classify error based on HTTP status code only.
 *
 * Uses dictionary mapping for efficient lookup of common HTTP status codes.
 * This is the primary classification method - message-based classification is only
 * used as a fallback when status code classification yields a generic result.
 */
function classifyByHttpStatus(statusCode: number): ErrorCode {
  // Try direct lookup first
  if (statusCode in HTTP_STATUS_TO_ERROR_CODE) {
    return HTTP_STATUS_TO_ERROR_CODE[statusCode];
  }

  // Fallback for any 5xx not in the dict
  if (statusCode >= 500 && statusCode < 600) {
    return ErrorCode.TOOL_SERVER_ERROR;
  }

  // Default for unknown status codes
  return ErrorCode.TOOL_EXECUTION_FAILED;
}

/**
 * Classify error based on error message content.
 *
 * Checks for keywords in the error message to determine error type.
 */
function classifyByMessage(errorMessage: string): ErrorCode {
  const errorLower = errorMessage.toLowerCase();

  // Check each pattern
  for (const [keyword, errorCode] of Object.entries(ERROR_MESSAGE_PATTERNS)) {
    if (errorLower.includes(keyword)) {
      return errorCode;
    }
  }

  // Default for unrecognized error messages
  return ErrorCode.TOOL_EXECUTION_FAILED;
}

/**
 * Classify HTTP status codes into appropriate ErrorCode values.
 *
 * Uses a two-stage classification approach:
 * 1. Primary: Classification by HTTP status code using dictionary mapping
 * 2. Fallback: If status yields generic result, analyze error message content
 */
export function classifyHttpError(statusCode: number, errorMessage = ""): ErrorCode {
  // First, try classification by HTTP status
  let errorCode = classifyByHttpStatus(statusCode);

  // If we got a generic error and have a message, try message-based classification
  if (errorCode === ErrorCode.TOOL_EXECUTION_FAILED && errorMessage) {
    errorCode = classifyByMessage(errorMessage);
  }

  return errorCode;
}

/**
 * Determine if an error is recoverable (can be retried).
 */
export function isRecoverableError(errorCode: ErrorCode): boolean {
  const recoverableErrors = new Set([
    ErrorCode.TOOL_TIMEOUT,
    ErrorCode.TOOL_RATE_LIMITED,
    ErrorCode.TOOL_SERVER_ERROR,
    ErrorCode.TOOL_NETWORK_ERROR,
    ErrorCode.AGENT_NETWORK_ERROR,
    ErrorCode.LLM_RATE_LIMITED,
    ErrorCode.LLM_UNAVAILABLE,
  ]);
  return recoverableErrors.has(errorCode);
}
