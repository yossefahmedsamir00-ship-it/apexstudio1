export function getSafeProjectPreview(body) {
  const candidate = typeof body?.preview_url === 'string' ? body.preview_url.trim() : '';
  let url = null;

  if (candidate) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'https:') url = parsed.href;
    } catch {
      url = null;
    }
  }

  return {
    url,
    demoMode: body?.demo_mode === true,
  };
}
