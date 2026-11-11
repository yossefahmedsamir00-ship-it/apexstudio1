import { describe, expect, it } from 'vitest';
import { getDetailNotFoundCopy } from './detail-translations.js';

describe('detail page not-found copy', () => {
  it('uses project-specific copy in English', () => {
    expect(getDetailNotFoundCopy('project', 'en')).toEqual({
      title: 'This project is not available.',
      description: 'It may be unpublished or the link may be incorrect.',
    });
  });

  it('uses service-specific copy in English and Arabic', () => {
    expect(getDetailNotFoundCopy('service', 'en')).toEqual({
      title: 'This service is not available.',
      description: 'It may be unpublished or the link may be incorrect.',
    });
    expect(getDetailNotFoundCopy('service', 'ar')).toEqual({
      title: 'الخدمة غير متاحة.',
      description: 'قد تكون غير منشورة أو أن الرابط غير صحيح.',
    });
  });
});
