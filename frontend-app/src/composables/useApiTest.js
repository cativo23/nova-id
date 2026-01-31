/**
 * Base URL for the Test API (Oathkeeper rule: /api-test -> api:8080).
 * Use this for all calls to the test API: /me, /logs, /roles/*, etc.
 * Do NOT use getOathkeeperUrl() for these - that is for Kratos/Hydra paths under /api.
 */
export function getApiTestBaseUrl() {
  const env = import.meta.env.VITE_API_TEST_URL
  if (env) return String(env).replace(/\/$/, '')
  if (typeof window !== 'undefined') return window.location.origin + '/api-test'
  return '/api-test'
}
