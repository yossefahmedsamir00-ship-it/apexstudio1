export type AIProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'custom';

export type AIAgentRole =
  | 'orchestrator'
  | 'discovery'
  | 'sales'
  | 'ux'
  | 'copy'
  | 'technical'
  | 'support'
  | 'research';

export type AIModelTier = 'reasoning' | 'balanced' | 'fast';

export interface AIModelConfig {
  id: string;
  provider: AIProvider;
  model: string;
  tier: AIModelTier;
  maxOutputTokens: number;
  temperature: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  agent: AIAgentRole;
  messages: AIMessage[];
  locale: 'en' | 'ar';
  modelId?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AIResponse {
  text: string;
  modelId: string;
  provider: AIProvider;
  requestId?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface AIClient {
  complete(request: AIRequest): Promise<AIResponse>;
}
