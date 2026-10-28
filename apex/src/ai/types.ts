export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'custom';

export type AIAgentRole =
  | 'orchestrator'
  | 'discovery'
  | 'sales'
  | 'ux'
  | 'copy'
  | 'technical'
  | 'support'
  | 'research';

export type AIModelTier =
  | 'reasoning'
  | 'balanced'
  | 'fast';

export interface AIModelConfig {
  id: string;
  provider: AIProvider;
  model: string;
  tier: AIModelTier;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  agent: AIAgentRole;
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIResponse {
  content: string;
  model?: string;
  provider?: AIProvider;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AIClient {
  generate(request: AIRequest): Promise<AIResponse>;
}
