/** Models for LLM service. */

/** LLM provider options as constant object */
export const LLMProvider = {
  AZURE_OPENAI: "azure_openai",
  AWS_BEDROCK: "aws_bedrock",
  GOOGLE_VERTEXAI: "google_vertexai",
} as const;

export type LLMProviderType = (typeof LLMProvider)[keyof typeof LLMProvider];

/** Cost configuration for LLM model */
export interface CostConfig {
  /** Cost per input token */
  input: number;
  /** Cost per output token */
  output: number;
}

/** Features supported by LLM model */
export interface LLMFeatures {
  /** Support for streaming responses */
  streaming: boolean;
  /** Support for tool usage */
  tools: boolean;
  /** Support for temperature parameter */
  temperature: boolean;
  /** Support for parallel tool calls */
  parallel_tool_calls: boolean;
  /** Support for system prompt */
  system_prompt: boolean;
  /** Support for max tokens parameter */
  max_tokens: boolean;
}

/** LLM model configuration. */
export interface LLMModel {
  /** Base name of the model */
  base_name: string;
  /** Deployment name */
  deployment_name: string;
  /** Display label */
  label?: string;
  /** Whether model supports multimodal inputs */
  multimodal?: boolean;
  /** Whether model supports react agent pattern */
  react_agent?: boolean;
  /** Whether the model is enabled */
  enabled: boolean;
  /** LLM provider */
  provider?: LLMProviderType;
  /** Whether this is the default model */
  default?: boolean;
  /** Cost configuration */
  cost?: CostConfig;
  /** Maximum output tokens */
  max_output_tokens?: number;
  /** Supported features */
  features: LLMFeatures;
}
