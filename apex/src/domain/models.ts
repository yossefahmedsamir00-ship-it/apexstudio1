/** Proposed domain contracts for APEX STUDIO MVP. */

export type Locale = 'ar' | 'en';

export interface LocalizedText {
  ar: string;
  en: string;
}

export type ServiceCategory = 'web' | 'ecommerce' | 'ai' | 'apps' | 'custom';
export type ServiceStatus = 'draft' | 'published' | 'paused';
export type PricingMode = 'fixed' | 'starting_at' | 'quote_only';

export interface ServiceDocument {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  category: ServiceCategory;
  status: ServiceStatus;
  isPublic: boolean;
  pricingMode: PricingMode;
  priceLabel?: LocalizedText;
  features: LocalizedText[];
  sortOrder: number;
  updatedAt: unknown; // Firestore Timestamp at runtime
}

export type ProjectKind = 'concept' | 'client';
export type ProjectStatus = 'draft' | 'published' | 'archived';
export type ProjectVisibility = 'private' | 'public';

export interface ProjectDocument {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  category: ServiceCategory;
  projectKind: ProjectKind;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  coverImagePath?: string;
  coverImageUrl?: string;
  liveUrl?: string;
  sourceUrl?: string;
  technologies: string[];
  sortOrder: number;
  updatedAt: unknown; // Firestore Timestamp at runtime
}

export type RequestServiceType =
  | 'website'
  | 'ecommerce'
  | 'ai_solution'
  | 'web_app'
  | 'mobile_app'
  | 'custom_system'
  | 'not_sure';

export type RequestStatus =
  | 'new'
  | 'reviewing'
  | 'contacted'
  | 'quoted'
  | 'negotiating'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'closed_lost';

export interface PublicProjectRequestInput {
  name: string;
  email: string;
  whatsapp: string;
  serviceType: RequestServiceType;
  description: string;
  budgetRange: 'not_sure' | 'small' | 'medium' | 'large';
  timeline: 'asap' | '1_2_weeks' | '1_month' | '1_3_months' | 'flexible';
  source: string;
  consentToContact: true;
  // createdAt is set with Firestore serverTimestamp(), never by the client clock.
  status: 'new';
}

export type ProjectRequestDocument = Omit<PublicProjectRequestInput, 'status'> & {
  createdAt: unknown; // Firestore Timestamp at runtime
  status: RequestStatus;
};
