/**
 * Base URL for the Test API (Oathkeeper rule: /api-test -> api:8080).
 * Use this for all calls to the test API: /me, /logs, /roles/*, etc.
 * Do NOT use getOathkeeperUrl() for these - that is for Kratos/Hydra paths under /api.
 *
 * Note: frontend-app intentionally does NOT consume the generated @nova-id/api-client.
 * That client is generated from the IdP's OpenAPI (the /api surface). frontend-app is
 * the demo app and talks only to the demo-only /api-test/* endpoints (ADR-0001 boundary),
 * so it calls them directly with fetch rather than pulling in the IdP client.
 */
export function getApiTestBaseUrl() {
  const env = import.meta.env.VITE_API_TEST_URL
  if (env) return String(env).replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin + '/api-test'
  return '/api-test'
}
