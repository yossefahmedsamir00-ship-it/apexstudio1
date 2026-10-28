import type {
  AIClient,
  AIRequest,
  AIResponse,
} from './types';

const API_URL = import.meta.env.VITE_AI_API_URL;

export class RemoteAIClient implements AIClient {
  async generate(request: AIRequest): Promise<AIResponse> {
    if (!API_URL) {
      throw new Error(
        'AI API is not configured. Set VITE_AI_API_URL.'
      );
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent: request.agent,
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        maxOutputTokens: request.maxOutputTokens,
      }),
    });

    if (!response.ok) {
      const message = await response.text();

      throw new Error(
        `AI request failed (${response.status}): ${message}`
      );
    }

    const data = (await response.json()) as AIResponse;

    if (!data?.content) {
      throw new Error('AI API returned an invalid response.');
    }

    return data;
  }
}

export const aiClient = new RemoteAIClient();
