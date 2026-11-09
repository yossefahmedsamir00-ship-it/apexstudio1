import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

function mountPage(fileName) {
  const html = readFileSync(resolve(process.cwd(), 'vanilla', fileName), 'utf8');
  document.open();
  document.write(html);
  document.close();
}

describe('standalone APEX pages', () => {
  it('boots the About page and supports Arabic direction switching', async () => {
    mountPage('about.html');
    await import('./page.js?smoke-about');

    expect(document.body.dataset.page).toBe('about');
    expect(document.querySelector('#language-toggle')).not.toBeNull();

    document.querySelector('#language-toggle').click();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('renders the Services page without requiring a Supabase connection', async () => {
    mountPage('services.html');
    await import('./page.js?smoke-services');

    expect(document.body.dataset.page).toBe('services');
    expect(document.querySelectorAll('#services-page-grid .service-page-card').length).toBeGreaterThan(0);
  });

  it('renders the Work page and its initial project collection', async () => {
    mountPage('work.html');
    await import('./page.js?smoke-work');

    expect(document.body.dataset.page).toBe('work');
    expect(document.querySelectorAll('#work-page-grid .project-card').length).toBeGreaterThan(0);
  });

  it('renders a safe unavailable state for an unpublished or missing project slug', async () => {
    mountPage('project.html');
    await import('./project.js?smoke-project');

    expect(document.querySelector('#project-detail-state').hidden).toBe(false);
    expect(document.querySelector('#project-detail-state h1').textContent.length).toBeGreaterThan(0);
  });

  it('uses a service-specific unavailable state for missing service slugs', async () => {
    mountPage('service.html');
    await import('./project.js?smoke-service');

    expect(document.body.dataset.contentType).toBe('service');
    expect(document.querySelector('#project-detail-state').hidden).toBe(false);
    expect(document.querySelector('#project-detail-state h1').textContent).toContain('service');
  });
});
