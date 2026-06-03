/**
 * E2E test environment bootstrap.
 *
 * Sets the env vars that AppModule requires to compile without hitting the
 * live Ory/Oathkeeper stack. Only the vars the code actually reads are set here:
 *
 *   OAUTH_JWKS_URL  — required by AuthenticatedGuard constructor (jwks-rsa client init).
 *                     A dummy URL is fine: jwks-rsa defers network I/O to canActivate(),
 *                     not to the constructor, so the module compiles in-process.
 *   OAUTH_ISSUER    — required by AuthenticatedGuard constructor (jwt.verify issuer check).
 *
 * Deliberately omitted (no longer in the codebase):
 *   OAUTH_PUBLIC_KEY       — removed in plan-1 (A0.1): key resolution moved to JWKS.
 *   GATEWAY_SHARED_SECRET  — removed in plan-1 (A0.1): gateway-header trust path deleted.
 */
process.env.OAUTH_JWKS_URL = 'http://oathkeeper:4456/.well-known/jwks.json';
process.env.OAUTH_ISSUER = 'http://oathkeeper:4456/';
