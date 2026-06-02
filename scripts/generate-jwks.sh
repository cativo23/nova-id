#!/usr/bin/env bash
# Generate a fresh RS256 JWKS for the Oathkeeper id_token mutator. Run after
# cloning and whenever rotating. The Oathkeeper container runs as uid 100 (ory),
# so the file must be world-readable (0644) or Oathkeeper cannot read it to sign
# id_tokens or publish the public key at /.well-known/jwks.json.
# The API verifies tokens against that JWKS endpoint and no longer needs the PEM.
set -euo pipefail
command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OATHKEEPER_IMAGE="oryd/oathkeeper:v25.4.0"
JWKS_PATH="${ROOT}/config/oathkeeper/id_token.jwks.json"

echo "Generating RS256 JWKS -> ${JWKS_PATH}"
tmp="$(mktemp)"
docker run --rm "${OATHKEEPER_IMAGE}" credentials generate --alg RS256 > "${tmp}"
mv "${tmp}" "${JWKS_PATH}"
# mktemp creates 0600; Oathkeeper (uid 100) needs read access.
chmod 644 "${JWKS_PATH}"

echo "JWKS written. Oathkeeper signs id_tokens with it and publishes the public"
echo "key at http://oathkeeper:4456/.well-known/jwks.json — the API verifies"
echo "against that endpoint (OAUTH_JWKS_URL), no PEM needed."
