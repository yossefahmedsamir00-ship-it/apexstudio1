import type { AIAgentRole, AIModelConfig } from './types';

const env = (key: string, fallback: string) =>
  (import.meta.env[key] as string | undefined)?.trim() || fallback;

/*
 * Keep provider model names configurable. Model catalogs change over time;
 * do not hard-code secrets or provider API keys into the frontend.
 */
export const AI_MODELS: Record<string, AIModelConfig> = {
  orchestrator: {
    id: 'orchestrator',
    provider: 'custom',
    model: env('VITE_AI_MODEL_ORCHESTRATOR', 'orchestrator-model'),
    tier: 'reasoning',
    maxOutputTokens: 1800,
    temperature: 0.2,
  },
  discovery: {
    id: 'discovery',
    provider: 'custom',
    model: env('VITE_AI_MODEL_DISCOVERY', 'discovery-model'),
    tier: 'balanced',
    maxOutputTokens: 1400,
    temperature: 0.3,
  },
  sales: {
    id: 'sales',
    provider: 'custom',
    model: env('VITE_AI_MODEL_SALES', 'sales-model'),
    tier: 'balanced',
    maxOutputTokens: 1000,
    temperature: 0.4,
  },
  ux: {
    id: 'ux',
    provider: 'custom',
    model: env('VITE_AI_MODEL_UX', 'ux-model'),
    tier: 'reasoning',
    maxOutputTokens: 1600,
    temperature: 0.35,
  },
  copy: {
    id: 'copy',
    provider: 'custom',
    model: env('VITE_AI_MODEL_COPY', 'copy-model'),
    tier: 'balanced',
    maxOutputTokens: 1200,
    temperature: 0.65,
  },
  technical: {
    id: 'technical',
    provider: 'custom',
    model: env('VITE_AI_MODEL_TECHNICAL', 'technical-model'),
    tier: 'reasoning',
    maxOutputTokens: 1800,
    temperature: 0.2,
  },
  support: {
    id: 'support',
    provider: 'custom',
    model: env('VITE_AI_MODEL_SUPPORT', 'support-model'),
    tier: 'fast',
    maxOutputTokens: 900,
    temperature: 0.3,
  },
  research: {
    id: 'research',
    provider: 'custom',
    model: env('VITE_AI_MODEL_RESEARCH', 'research-model'),
    tier: 'reasoning',
    maxOutputTokens: 1600,
    temperature: 0.25,
  },
};

export function getModelForAgent(agent: AIAgentRole): AIModelConfig {
  return AI_MODELS[agent];
}
