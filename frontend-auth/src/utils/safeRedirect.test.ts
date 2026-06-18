/**
 * Unit tests for safeRedirect.
 *
 * NOTE: frontend-auth has no test runner configured (no vitest.config.ts).
 * These tests are written in Vitest style and will run once vitest is added.
 * To enable: `pnpm add -D vitest` in frontend-auth and add a vitest.config.ts.
 *
 * The jsdom environment is assumed (Vitest's default) so `window.location.origin`
 * resolves to "http://localhost".  `import.meta.env.*` is provided via vi.stubEnv.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { safeRedirect } from './safeRedirect'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('safeRedirect', () => {
  it('allows a same-origin relative path', () => {
    expect(safeRedirect('/dashboard', '/')).toBe('/dashboard')
  })

  it('allows a relative path with query string', () => {
    expect(safeRedirect('/login?return_to=foo', '/')).toBe('/login?return_to=foo')
  })

  it('rejects an off-site absolute URL and returns fallback', () => {
    expect(safeRedirect('https://evil.example.com/steal', '/')).toBe('/')
  })

  it('rejects a javascript: URI and returns fallback', () => {
    expect(safeRedirect('javascript:alert(1)', '/')).toBe('/')
  })

  it('rejects a javascript: URI with leading whitespace', () => {
    expect(safeRedirect('  javascript:alert(1)', '/')).toBe('/')
  })

  it('rejects a data: URI and returns fallback', () => {
    expect(safeRedirect('data:text/html,<script>alert(1)</script>', '/')).toBe('/')
  })

  it('rejects a protocol-relative URL pointing off-site', () => {
    expect(safeRedirect('//evil.example.com/path', '/')).toBe('/')
  })

  it('rejects a backslash bypass /\\evil.com (browsers normalise \\ to /)', () => {
    expect(safeRedirect('/\\evil.com', '/')).toBe('/')
  })

  it('rejects a mixed slash-backslash bypass /\\/evil.com', () => {
    expect(safeRedirect('/\\/evil.com', '/')).toBe('/')
  })

  it('rejects a leading-backslash bypass \\/evil.com', () => {
    expect(safeRedirect('\\/evil.com', '/')).toBe('/')
  })

  it('returns fallback for null input', () => {
    expect(safeRedirect(null, '/home')).toBe('/home')
  })

  it('returns fallback for undefined input', () => {
    expect(safeRedirect(undefined, '/home')).toBe('/home')
  })

  it('returns fallback for empty string', () => {
    expect(safeRedirect('', '/home')).toBe('/home')
  })

  it('allows an extra origin listed in VITE_ALLOWED_REDIRECT_ORIGINS', () => {
    vi.stubEnv('VITE_ALLOWED_REDIRECT_ORIGINS', 'https://app.example.com')
    expect(safeRedirect('https://app.example.com/callback', '/')).toBe('https://app.example.com/callback')
  })

  it('rejects an origin NOT in VITE_ALLOWED_REDIRECT_ORIGINS', () => {
    vi.stubEnv('VITE_ALLOWED_REDIRECT_ORIGINS', 'https://app.example.com')
    expect(safeRedirect('https://other.example.com/path', '/')).toBe('/')
  })
})
