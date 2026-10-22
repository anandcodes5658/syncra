/**
 * Normalizes media asset URLs so they load properly in all environments:
 * - Strips localhost/127.0.0.1 origins to convert to relative /uploads path
 * - Ensures https/http or relative paths work across Render, local dev, or custom domains
 */
export function normalizeMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://localhost:5000/')) {
    return url.replace('http://localhost:5000', '');
  }
  if (url.startsWith('http://127.0.0.1:5000/')) {
    return url.replace('http://127.0.0.1:5000', '');
  }
  return url;
}
