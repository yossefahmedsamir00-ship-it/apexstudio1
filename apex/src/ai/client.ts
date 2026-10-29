import type {
  AIClient,
  AIRequest,
  AIResponse,
} from './types';
import { ensureAnonymousSession, SUPABASE_PUBLISHABLE_KEY } from '../lib/supabase';

const API_URL = import.meta.env.VITE_AI_API_URL;

export class RemoteAIClient implements AIClient {
  async generate(request: AIRequest): Promise<AIResponse> {
    if (!API_URL) {
      throw new Error('AI API is not configured. Set VITE_AI_API_URL.');
    }

    const accessToken = await ensureAnonymousSession();

    const response = await fetch(API_URL, {
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
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
      // Do not forward backend/proxy response bodies to the UI; they may contain internals.
      throw new Error(`AI request failed (${response.status}). Please retry.`);
    }

    let data: AIResponse;
    try {
      data = (await response.json()) as AIResponse;
    } catch {
      throw new Error('AI service returned an invalid response. Please retry.');
    }

    if (!data?.content) {
      throw new Error('AI API returned an invalid response.');
    }

    return data;
  }
}

export const aiClient = new RemoteAIClient();
