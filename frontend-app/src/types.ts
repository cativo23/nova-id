// Local response shapes for the DEMO surface (/api-test/*).
// These are NOT the IdP API; they mirror what the demo controllers return
// and only what this SPA actually reads. Kept local on purpose (ADR-0001):
// the generated @nova-id/api-client excludes the demo endpoints.

/** A user as returned by the demo /api-test/me endpoint. */
export interface DemoUser {
  id?: string
  email?: string
  full_name?: string
  name?: string
  /** Platform role from Kratos metadata_public.role. */
  role?: string | null
  /** App role from the demo SQLite store (ADR-0002): 'app_admin' | 'app_user'. */
  appRole?: string | null
}

/** Envelope returned by /api-test/me — may be { user } or the bare user. */
export interface MeResponse {
  user?: DemoUser
  [key: string]: unknown
}

/** A single access-log entry from /api-test/logs. */
export interface LogEntry {
  timestamp: string
  method: string
  url: string
  statusCode: number
  duration?: string | number
  frontendSource?: string
  user?: { email?: string; role?: string } | null
}

/** Aggregated metrics from /api-test/logs/stats. */
export interface LogStats {
  totalRequests?: number
  byFrontend?: Record<string, number>
  byMethod?: Record<string, number>
  byStatus?: Record<string, number>
}

/** Hydra token endpoint response (subset we read). */
export interface TokenResponse {
  access_token?: string
  id_token?: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  scope?: string
  [key: string]: unknown
}

/** Decoded id_token claims (subset we validate). */
export interface IdTokenClaims {
  exp?: number
  iat?: number
  iss?: string
  /** aud may be a single string or an array per OIDC §2. */
  aud?: string | string[]
  nonce?: string
  [key: string]: unknown
}
