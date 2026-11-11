import { describe, expect, it } from 'vitest';
import { getSafeProjectPreview } from './project-preview.js';

describe('project preview configuration', () => {
  it('accepts an HTTPS preview URL and preserves the explicit demo mode', () => {
    expect(getSafeProjectPreview({ preview_url: 'https://demo.example.com', demo_mode: true })).toEqual({
      url: 'https://demo.example.com/',
      demoMode: true,
    });
  });

  it('rejects non-HTTPS and malformed preview URLs', () => {
    expect(getSafeProjectPreview({ preview_url: 'http://demo.example.com', demo_mode: true })).toEqual({
      url: null,
      demoMode: true,
    });
    expect(getSafeProjectPreview({ preview_url: 'javascript:alert(1)' })).toEqual({
      url: null,
      demoMode: false,
    });
  });

  it('does not enable demo mode for truthy non-boolean values', () => {
    expect(getSafeProjectPreview({ preview_url: 'https://demo.example.com', demo_mode: 'yes' }).demoMode).toBe(false);
  });
});
