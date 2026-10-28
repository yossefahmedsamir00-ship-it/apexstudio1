import type { AIClient, AIRequest, AIResponse } from './types';
import { getModelForAgent } from './models';
import { systemPrompt } from './prompts';

const API_URL = (import.meta.env.VITE_AI_API_URL as string | undefined)?.trim();

export class RemoteAIClient implements AIClient {
  async complete(request: AIRequest): Promise<AIResponse> {
    if (!API_URL) {
      throw new Error('AI backend is not configured. Set VITE_AI_API_URL on the server-connected build.');
    }

    const model = getModelForAgent(request.agent);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: request.agent,
        model: request.modelId || model.model,
        messages: [
          { role: 'system', content: systemPrompt(request.agent, request.locale) },
          ...request.messages,
        ],
        temperature: request.temperature ?? model.temperature,
        maxOutputTokens: request.maxOutputTokens ?? model.maxOutputTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI backend returned ${response.status}`);
    }

    return (await response.json()) as AIResponse;
  }
}

export const aiClient = new RemoteAIClient();
