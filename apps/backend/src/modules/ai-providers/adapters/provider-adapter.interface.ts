export interface AIMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

export interface AIExecutionOptions {
  systemPrompt?: string;
  messages?: AIMessageInput[];
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  tools?: any[];
  ragContext?: string[];
  memories?: string[];
  promptTemplate?: string;
  timeoutMs?: number;
}

export interface AIExecutionResult {
  content: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  toolsExecuted?: string[];
  finishReason?: string;
  isMockFallback?: boolean;
}

export interface ProviderAdapter {
  readonly providerType: string;
  execute(
    model: string,
    apiKey: string | null,
    baseUrl: string | null,
    options: AIExecutionOptions,
  ): Promise<AIExecutionResult>;
  executeStream?(
    model: string,
    apiKey: string | null,
    baseUrl: string | null,
    options: AIExecutionOptions,
    onChunk: (chunk: string) => void,
  ): Promise<AIExecutionResult>;
}
