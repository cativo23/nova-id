#!/usr/bin/env bash
# Generate .env file with high-entropy secrets for Nova ID.
#
# Output matches .env.example EXACTLY (same keys, same order).
# Secrets are alphanumeric-only (no /+=) so they are safe inside DSN URLs.
# KRATOS_SECRETS_CIPHER is exactly 32 chars (xchacha20-poly1305 requirement).

set -euo pipefail

# Produce N alphanumeric chars using openssl for entropy, stripping non-alnum.
# Usage: generate_secret [N]   (default: 40, satisfies ≥16 and ≥32 requirements)
generate_secret() {
    local n="${1:-40}"
    # Pull enough base64 bytes to guarantee we have n alnum chars after stripping.
    # `|| true` guards against SIGPIPE killing the pipeline under `set -o pipefail`
    # when `head -c` closes the stream early (notably on bash 3.2 / macOS).
    openssl rand -base64 96 | tr -dc 'A-Za-z0-9' | head -c "${n}" || true
}

# Exactly 32 alphanumeric chars for KRATOS_SECRETS_CIPHER (xchacha20-poly1305).
generate_cipher_secret() {
    generate_secret 32
}

cat > .env << EOF
# Nova ID Environment Configuration
# Generated on $(date)
# NEVER commit this file — it contains real secrets.
#
# Re-generate at any time with: ./scripts/generate-env.sh
# After (re-)generating, run once:  ./scripts/generate-jwks.sh
# (generate-jwks.sh writes config/oathkeeper/id_token.jwks.json, which is
# gitignored. Oathkeeper needs it to mint RS256 id_tokens.)

# Environment
ENVIRONMENT=local
NODE_ENV=development

# Database passwords (alphanumeric; safe inside DSN URLs)
POSTGRES_PASSWORD=$(generate_secret)
ORY_PASSWORD=$(generate_secret)
KRATOS_DB_PASSWORD=$(generate_secret)
HYDRA_DB_PASSWORD=$(generate_secret)
KETO_DB_PASSWORD=$(generate_secret)

# Kratos Secrets
# cookie:  ≥16 chars — signs session cookies
# cipher:  EXACTLY 32 chars — xchacha20-poly1305 data encryption
# default: ≥16 chars — fallback signing key
KRATOS_SECRETS_COOKIE=$(generate_secret)
KRATOS_SECRETS_CIPHER=$(generate_cipher_secret)
KRATOS_SECRETS_DEFAULT=$(generate_secret)

# Hydra System Secret (≥32 chars; key name MUST be HYDRA_SYSTEM_SECRET)
HYDRA_SYSTEM_SECRET=$(generate_secret)

# Hydra Admin URL (internal Docker network; never expose publicly)
HYDRA_ADMIN_URL=http://hydra:4445

# OAuth / JWT validation
OAUTH_ISSUER=http://api.local/
OAUTH_JWKS_URL=http://oathkeeper:4456/.well-known/jwks.json

# CORS allowed origins
CORS_ALLOWED_ORIGINS=http://auth.ory.localhost,http://admin.ory.localhost,http://app.ory.localhost

# Service URLs
API_URL=http://api.local
KRATOS_BROWSER_URL=http://auth.local
ADMIN_URL=http://admin.local

# SMTP (Mailpit for local dev; ?disable_starttls=true required by Kratos courier)
SMTP_CONNECTION_URI=smtp://mailpit:1025/?disable_starttls=true
SMTP_FROM_ADDRESS=noreply@cativo.dev
EOF

echo ""
echo ".env generated successfully."
echo ""
echo "Next step — generate Oathkeeper JWKS signing keys (required once per environment):"
echo "  ./scripts/generate-jwks.sh"
echo ""
echo "Then start the stack:"
echo "  docker compose up -d"
