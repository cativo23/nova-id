/**
 * safeRedirect — validate a redirect URL before use (H-6: open-redirect prevention).
 *
 * Rules:
 *  1. Relative paths (no host) are always allowed — they resolve to the current origin.
 *  2. Absolute URLs are allowed only if their origin is in the allowlist:
 *     - current window.location.origin (always)
 *     - any origins from VITE_ALLOWED_REDIRECT_ORIGINS (comma-separated, optional)
 *  3. `javascript:` and `data:` scheme URLs are always rejected.
 *  4. Malformed / unparseable URLs fall back to `fallback`.
 *
 * @param url      - Candidate redirect URL (may be null/undefined/empty).
 * @param fallback - Safe fallback path returned when `url` is rejected.
 */
export function safeRedirect(url: string | null | undefined, fallback: string): string {
  if (!url) return fallback

  // Reject dangerous schemes early (before URL parsing normalises them)
  const lower = url.toLowerCase().replace(/\s/g, '')
  if (lower.startsWith('javascript:') || lower.startsWith('data:')) return fallback

  // Relative paths (starting with / but not //) are always safe — they stay on the current origin.
  // Protocol-relative URLs (starting with //) are treated as absolute and must pass origin check.
  if (url.startsWith('/') && !url.startsWith('//')) return url

  // Parse as absolute URL
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    // Not a valid absolute URL — treat as a relative path only if it looks safe
    // (no scheme, no //). For safety, fall back.
    return fallback
  }

  // Reject any scheme that is not http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fallback

  // Build allowlist: current origin + any VITE_ALLOWED_REDIRECT_ORIGINS
  const allowedOrigins = new Set<string>()

  if (typeof window !== 'undefined') {
    allowedOrigins.add(window.location.origin)
  }

  const envOrigins = import.meta.env.VITE_ALLOWED_REDIRECT_ORIGINS
  if (envOrigins) {
    for (const raw of envOrigins.split(',')) {
      const trimmed = raw.trim()
      if (trimmed) allowedOrigins.add(trimmed)
    }
  }

  if (allowedOrigins.has(parsed.origin)) return url

  return fallback
}
