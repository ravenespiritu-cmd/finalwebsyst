/** Fallback image for products with no thumbnail or when image fails to load. */
export const PLACEHOLDER_PRODUCT = '/placeholder-product.svg';

const getApiBaseURL = () => {
  const raw =
    (typeof window !== 'undefined' && (window.__API_BASE_URL__ || window.__VITE_API_URL__)) ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:8000/api/v1';
  return String(raw).replace(/\/$/, '');
};

/**
 * If the SPA is on HTTPS, upgrade http:// links to our API host to https:// (mixed content).
 */
function upgradeHttpForApiHost(absUrl) {
  if (!absUrl || typeof absUrl !== 'string' || !/^http:\/\//i.test(absUrl)) {
    return absUrl;
  }
  let apiHost = '';
  try {
    apiHost = new URL(getApiOrigin()).hostname;
  } catch {
    return absUrl;
  }
  let urlHost = '';
  try {
    urlHost = new URL(absUrl).hostname;
  } catch {
    return absUrl;
  }
  if (apiHost && urlHost && urlHost.toLowerCase() === apiHost.toLowerCase()) {
    return `https://${absUrl.slice(7)}`;
  }
  return absUrl;
}

/**
 * Get the API origin (base URL without /api/v1) for building absolute image URLs.
 */
export function getApiOrigin() {
  return getApiBaseURL().replace(/\/api\/v1\/?$/, '');
}

/**
 * If thumbnail is a full URL to our storage, return the path part (e.g. /storage/products/xxx.jpg).
 * Otherwise return as-is. Use this before sending to API so the DB stores a short path.
 */
export function thumbnailToPath(thumbnail) {
  if (!thumbnail || typeof thumbnail !== 'string') return thumbnail;
  const trimmed = thumbnail.trim();
  const origin = getApiOrigin();
  if (trimmed.startsWith(origin + '/storage/')) {
    return trimmed.slice(origin.length); // "/storage/products/xxx.jpg"
  }
  if (trimmed.startsWith(origin) && trimmed.includes('/storage/')) {
    const i = trimmed.indexOf('/storage/');
    return trimmed.slice(i);
  }
  return trimmed;
}

/**
 * Convert a possibly-relative image URL from the API into an absolute URL.
 * Uses the API /storage/serve endpoint so images always load from the same app.
 */
export function toAbsoluteImageUrl(url, fallback = PLACEHOLDER_PRODUCT) {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (/^https?:\/\//i.test(trimmed)) return upgradeHttpForApiHost(trimmed);
  if (/^blob:/i.test(trimmed)) return trimmed;
  const pathForServe = trimmed.startsWith('/storage/') ? trimmed.slice(9) : trimmed;
  const pathNorm = pathForServe.startsWith('/') ? pathForServe.slice(1) : pathForServe;
  const base = getApiBaseURL();
  return base + '/storage/serve?path=' + encodeURIComponent(pathNorm);
}
