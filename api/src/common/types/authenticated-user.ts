import { JwtPayload } from 'jsonwebtoken';

/**
 * Shape of `request.user` as set by AuthenticatedGuard after RS256 id_token
 * verification. All fields come directly from the verified JWT claims.
 *
 * `appRole` is intentionally absent: SQLite is the sole source of truth for
 * per-app roles (ADR-0002); the IdP no longer mints that claim.
 */
export interface AuthenticatedUser {
  /** Kratos identity ID — maps to JWT `sub`. */
  userId: string;
  /** User email from the JWT `email` claim. Undefined when the claim is absent or '<no value>'. */
  email?: string;
  /** Display name from JWT `name` or `full_name` claim. */
  full_name?: string;
  /** Platform role from JWT `role` claim; defaults to `'platform_user'`. */
  role: string;
  /** Always `'jwt'` for requests validated by AuthenticatedGuard. */
  authMethod: 'jwt';
  /** Raw verified JWT payload — available for advanced claim inspection. */
  jwtClaims: JwtPayload;
}
