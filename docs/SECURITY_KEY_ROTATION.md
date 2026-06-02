# Security: id_token signing key rotation (2026-06-02)

The Oathkeeper id_token RSA **private** key was committed to git at
`config/oathkeeper/id_token.jwks.json` (kid `da3b6279-9433-4a45-b660-b2fab0c3256e`),
and its public half was hardcoded in `api/src/guards/authenticated.guard.ts`.

**Any environment that ever used that keypair is compromised** — anyone with repo
access could forge a signed id_token and impersonate `platform_admin`.

## Actions taken
- Removed the hardcoded public key from the guard; it now requires `OAUTH_PUBLIC_KEY`.
- Untracked the JWKS file from git and gitignored it.
- Added `scripts/generate-jwks.sh` to generate a fresh keypair per environment.

## Required for any deployment that used the old key
- Regenerate the JWKS (`scripts/generate-jwks.sh`) and redeploy Oathkeeper.
- Set `OAUTH_PUBLIC_KEY` to the new public PEM.
- Invalidate any tokens issued under the old key (they fail validation automatically once the key is rotated).

The old key remains in git history; treat it as permanently public.
