#!/usr/bin/env bash
# Generate a fresh RS256 JWKS for the Oathkeeper id_token mutator, plus the
# matching public PEM for the API's OAUTH_PUBLIC_KEY. Run after cloning and
# whenever rotating. The JWKS file is gitignored — never commit it.
set -euo pipefail
command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OATHKEEPER_IMAGE="oryd/oathkeeper:v25.4.0"
JWKS_PATH="${ROOT}/config/oathkeeper/id_token.jwks.json"

echo "Generating RS256 JWKS -> ${JWKS_PATH}"
tmp="$(mktemp)"
docker run --rm "${OATHKEEPER_IMAGE}" credentials generate --alg RS256 > "${tmp}"
mv "${tmp}" "${JWKS_PATH}"

echo "Extracting public key PEM (set this as OAUTH_PUBLIC_KEY in your .env):"
node -e '
  const fs = require("fs");
  const crypto = require("crypto");
  const jwks = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const jwk = jwks.keys.find(k => k.kty === "RSA");
  const pub = crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: "jwk" });
  process.stdout.write(pub.export({ type: "spki", format: "pem" }));
' "${JWKS_PATH}"
