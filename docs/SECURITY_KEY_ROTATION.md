# Security: id_token signing key rotation (2026-06-02)

The Oathkeeper id_token RSA **private** key was committed to git at
`config/oathkeeper/id_token.jwks.json` (kid `da3b6279-9433-4a45-b660-b2fab0c3256e`),
and its public half was hardcoded in `api/src/guards/authenticated.guard.ts`.

**Any environment that ever used that keypair is compromised** — anyone with repo
access could forge a signed id_token and impersonate `platform_admin`.

## Actions taken
- Removed the hardcoded public key from the guard; it now verifies tokens against Oathkeeper's JWKS endpoint via `OAUTH_JWKS_URL` (e.g. `http://oathkeeper:4456/.well-known/jwks.json`) — no PEM is embedded or configured in the API.
- Untracked the JWKS file from git and gitignored it.
- Added `scripts/generate-jwks.sh` to generate a fresh keypair per environment.

## Required for any deployment that used the old key
- Regenerate the JWKS (`scripts/generate-jwks.sh`) and restart Oathkeeper so it serves the new key.
- No API env change or redeploy is needed for the public key: the guard fetches the current public key from `OAUTH_JWKS_URL` (Oathkeeper's JWKS), so a rotated key is picked up automatically once Oathkeeper restarts.
- Invalidate any tokens issued under the old key (they fail validation automatically once the key is rotated, since the old `kid` no longer appears in the JWKS).

The old key remains in git history; treat it as permanently public.
