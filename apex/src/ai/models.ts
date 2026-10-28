import type {
  AIAgentRole,
  AIModelConfig,
  AIModelTier,
  AIProvider,
} from './types';

const provider = (import.meta.env.VITE_AI_PROVIDER || 'custom') as AIProvider;

const model = (
  role: AIAgentRole,
  tier: AIModelTier,
): AIModelConfig => ({
  id: `apex-${role}`,
  provider,
  model:
    import.meta.env[`VITE_AI_MODEL_${role.toUpperCase()}`] ||
    `${tier}-model`,
  tier,
});

export const AI_MODELS: Record<AIAgentRole, AIModelConfig> = {
  orchestrator: model('orchestrator', 'reasoning'),
  discovery: model('discovery', 'balanced'),
  sales: model('sales', 'fast'),
  ux: model('ux', 'balanced'),
  copy: model('copy', 'fast'),
  technical: model('technical', 'reasoning'),
  support: model('support', 'fast'),
  research: model('research', 'balanced'),
};

export function getModelForAgent(
  agent: AIAgentRole,
): AIModelConfig {
  return AI_MODELS[agent];
}
