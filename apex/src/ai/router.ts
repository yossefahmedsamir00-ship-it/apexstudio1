import { getModelForAgent } from './models';
import type { AIAgentRole } from './types';

const keywordMap: Array<[AIAgentRole, RegExp]> = [
  ['technical', /code|api|database|firebase|supabase|security|deploy|bug|architecture/i],
  ['ux', /ui|ux|design|layout|mobile|responsive|user flow|واجهة|تصميم|تجربة/i],
  ['sales', /price|cost|quote|budget|client|شراء|سعر|تكلفة|عميل/i],
  ['copy', /copy|caption|headline|text|content|محتوى|نص|إعلان/i],
  ['research', /research|latest|current|compare|بحث|آخر|حالي|قارن/i],
  ['support', /help|how|problem|error|مساعدة|مشكلة|خطأ/i],
];

export function routeAgent(input: string): AIAgentRole {
  for (const [agent, pattern] of keywordMap) {
    if (pattern.test(input)) return agent;
  }
  return 'discovery';
}

export function modelForInput(input: string) {
  return getModelForAgent(routeAgent(input));
}
