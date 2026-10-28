import type { AIAgentRole } from './types';

const technicalKeywords = [
  'code',
  'coding',
  'bug',
  'error',
  'api',
  'database',
  'backend',
  'frontend',
  'react',
  'typescript',
  'javascript',
  'firebase',
  'supabase',
  'برمجة',
  'كود',
  'خطأ',
  'باك اند',
  'فرونت اند',
];

const uxKeywords = [
  'ui',
  'ux',
  'design',
  'interface',
  'layout',
  'responsive',
  'تصميم',
  'واجهة',
  'تجربة المستخدم',
];

const salesKeywords = [
  'price',
  'pricing',
  'cost',
  'quote',
  'service',
  'buy',
  'سعر',
  'تكلفة',
  'خدمة',
  'اشتراك',
];

const copyKeywords = [
  'copy',
  'content',
  'headline',
  'caption',
  'marketing',
  'محتوى',
  'عنوان',
  'إعلان',
  'تسويق',
];

const researchKeywords = [
  'search',
  'research',
  'latest',
  'current',
  'today',
  'ابحث',
  'بحث',
  'آخر',
  'حالي',
  'اليوم',
];

function containsKeyword(
  text: string,
  keywords: string[],
): boolean {
  const normalized = text.toLowerCase();

  return keywords.some((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  );
}

export function routeAIRequest(
  message: string,
): AIAgentRole {
  if (containsKeyword(message, technicalKeywords)) {
    return 'technical';
  }

  if (containsKeyword(message, uxKeywords)) {
    return 'ux';
  }

  if (containsKeyword(message, salesKeywords)) {
    return 'sales';
  }

  if (containsKeyword(message, copyKeywords)) {
    return 'copy';
  }

  if (containsKeyword(message, researchKeywords)) {
    return 'research';
  }

  return 'discovery';
}
export const routeAgent = routeAIRequest;
