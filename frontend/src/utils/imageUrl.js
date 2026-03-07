/**
 * Get the API origin (base URL without /api/v1) for building absolute image URLs.
 * Product thumbnails from the API may be relative paths (e.g. /storage/products/xyz.jpg).
 * Browsers resolve relative URLs against the frontend origin (e.g. Vercel), so we must
 * resolve them against the backend origin so images load.
 */
function getApiOrigin() {
  const base =
    (typeof window !== 'undefined' && (window.__API_BASE_URL__ || window.__VITE_API_URL__)) ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:8000/api/v1';
  return String(base).replace(/\/$/, '').replace(/\/api\/v1\/?$/, '');
}

/**
 * Convert a possibly-relative image URL from the API into an absolute URL.
 * - If url is falsy, returns fallback or empty string.
 * - If url already starts with http:// or https://, returns as-is.
 * - Otherwise prepends the API origin so the image loads from the backend.
 * @param {string} url - URL from API (e.g. thumbnail, image path)
 * @param {string} [fallback=''] - Fallback when url is empty
 * @returns {string}
 */
export function toAbsoluteImageUrl(url, fallback = '') {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = getApiOrigin();
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${path}`;
}
