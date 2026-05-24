export function assetUrl(url?: string): string {
  if (!url) return '';
  if (/^(https?:|blob:|data:)/.test(url)) return url;

  const base =
    localStorage.getItem('echo-server-url') ||
    (import.meta as any).env?.VITE_API_BASE ||
    '';

  return base ? `${base.replace(/\/$/, '')}${url.startsWith('/') ? url : '/' + url}` : url;
}
