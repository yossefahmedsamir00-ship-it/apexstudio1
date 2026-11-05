import type { LocalizedText } from '../lib/site';
import type {
  CmsPageDocument,
  CmsSectionType,
  MenuItem,
  NavigationDocument,
  PageSection,
  ThemeDocument,
} from './types';

const sectionTypes = new Set<CmsSectionType>([
  'hero', 'statement', 'projects', 'services', 'process', 'about', 'cta', 'payments', 'footer',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return isRecord(value) && typeof value.en === 'string' && typeof value.ar === 'string';
}

function parseSection(value: unknown): PageSection | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.type !== 'string') return null;
  if (!sectionTypes.has(value.type as CmsSectionType) || !isRecord(value.content)) return null;
  const enabled = typeof value.enabled === 'boolean' ? value.enabled : true;
  const order = typeof value.order === 'number' && Number.isFinite(value.order) ? value.order : 0;
  return { id: value.id, type: value.type as CmsSectionType, enabled, order, content: value.content };
}

export function parseCmsPage(value: unknown): CmsPageDocument | null {
  if (!isRecord(value) || typeof value.key !== 'string' || value.key.trim().length === 0 || !Array.isArray(value.sections)) return null;
  return { key: value.key, sections: value.sections.map(parseSection).filter((section): section is PageSection => section !== null) };
}

function parseMenuItem(value: unknown): MenuItem | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !isLocalizedText(value.label) || typeof value.href !== 'string') return null;
  if (value.children !== undefined && !Array.isArray(value.children)) return null;
  const children = Array.isArray(value.children)
    ? value.children.map(parseMenuItem).filter((item): item is MenuItem => item !== null)
    : [];
  return {
    id: value.id,
    label: value.label,
    href: value.href,
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    children,
  };
}

export function parseCmsNavigation(value: unknown): NavigationDocument | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items.map(parseMenuItem);
  if (items.some((item) => item === null)) return null;
  return { items: items.filter((item): item is MenuItem => item !== null) };
}

export function parseCmsTheme(value: unknown): ThemeDocument | null {
  if (!isRecord(value) || !isRecord(value.tokens)) return null;
  const tokens: Record<string, string> = {};
  for (const [key, token] of Object.entries(value.tokens)) {
    if (typeof token !== 'string') return null;
    tokens[key] = token;
  }
  const motion = isRecord(value.motion) ? value.motion : {};
  return {
    tokens,
    motion: {
      enabled: typeof motion.enabled === 'boolean' ? motion.enabled : true,
      blurBackground: typeof motion.blurBackground === 'boolean' ? motion.blurBackground : true,
      buttonGlow: typeof motion.buttonGlow === 'boolean' ? motion.buttonGlow : true,
    },
  };
}
