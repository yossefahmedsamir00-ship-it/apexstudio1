import type { Locale, LocalizedText } from '../lib/site';

export type CmsDocumentType = 'page' | 'navigation' | 'theme';
export type CmsRevisionStatus = 'draft' | 'published' | 'archived';

export type CmsSectionType =
  | 'hero'
  | 'statement'
  | 'projects'
  | 'services'
  | 'process'
  | 'about'
  | 'cta'
  | 'payments'
  | 'footer';

export interface CmsDocument {
  id: string;
  document_key: string;
  document_type: CmsDocumentType;
  draft_revision_id: string | null;
  published_revision_id: string | null;
}

export interface CmsRevision {
  id: string;
  document_id: string;
  revision_number: number;
  status: CmsRevisionStatus;
  content: unknown;
  created_at: string;
  created_by: string | null;
}

export interface CmsPageDocument {
  key: string;
  sections: PageSection[];
}

export interface PageSection {
  id: string;
  type: CmsSectionType;
  enabled: boolean;
  order: number;
  content: Record<string, unknown>;
}

export interface MenuItem {
  id: string;
  label: LocalizedText;
  href: string;
  enabled: boolean;
  children: MenuItem[];
}

export interface NavigationDocument {
  items: MenuItem[];
}

export interface ThemeDocument {
  tokens: Record<string, string>;
  motion: {
    enabled: boolean;
    blurBackground: boolean;
    buttonGlow: boolean;
  };
}

export interface MediaAsset {
  id: string;
  bucket: string;
  path: string;
  mimeType: string;
  alt: LocalizedText;
  width: number | null;
  height: number | null;
}

export type CmsLocale = Locale;
