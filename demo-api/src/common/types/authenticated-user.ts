import { JwtPayload } from "jsonwebtoken";

/**
 * Shape of `request.user` as set by DemoAuthenticatedGuard after RS256
 * id_token verification. Copied from the IdP BFF — demo-api must not import
 * from api/ (ADR-0001).
 */
export interface AuthenticatedUser {
  /** Kratos identity ID — maps to JWT `sub`. */
  userId: string;
  /** User email from the JWT `email` claim. */
  email?: string;
  /** Display name from JWT `name` or `full_name` claim. */
  full_name?: string;
  /** Platform role from JWT `role` claim; defaults to `'platform_user'`. */
  role: string;
  /** Always `'jwt'` for requests validated by DemoAuthenticatedGuard. */
  authMethod: "jwt";
  /** Raw verified JWT payload. */
  jwtClaims: JwtPayload;
}
