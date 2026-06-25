#!/bin/bash
# Register OAuth2 client in Hydra for the Test App ("Login with Nova ID").
# Run after Hydra is up. Redirect URIs must match exactly what the app sends (no trailing slash).
#
# For app at http://app.ory.localhost  → app sends redirect_uri=http://app.ory.localhost/callback
# For app at http://localhost:5175      → app sends redirect_uri=http://localhost:5175/callback

# Hydra admin port (4445) is NOT published to the host in docker-compose.yml — it is
# only reachable inside the Docker network (http://hydra:4445). The old Oathkeeper route
# /api/internal/hydra-admin was removed during the hardening phase (PR #33).
# To run this script from the host you must either:
#   a) Temporarily publish the port: docker compose up -d --no-deps hydra (after adding
#      "4445:4445" under hydra.ports in docker-compose.yml for local use only), or
#   b) Run via docker exec:  docker compose exec hydra \
#        wget -qO- --post-data='...' http://localhost:4445/admin/clients
# The default below matches the pattern used by other scripts in this directory
# (see setup-hydra-test-client.sh, verify-hydra-oauth-client.sh).
HYDRA_ADMIN_URL="${HYDRA_ADMIN_URL:-http://localhost:4445}"
# Allowed callback URLs; the app uses (VITE_APP_URL || origin)/callback
CALLBACK_APP="http://app.ory.localhost/callback"
CALLBACK_LOCAL="http://localhost:5175/callback"

echo "Test App OAuth client"
echo "  HYDRA_ADMIN_URL: $HYDRA_ADMIN_URL"
echo "  Redirect URIs: $CALLBACK_APP, $CALLBACK_LOCAL"
echo ""

CLIENT_DATA=$(cat <<EOF
{
  "client_id": "nova-id-test-app",
  "client_name": "Nova ID Test App",
  "redirect_uris": ["$CALLBACK_APP", "$CALLBACK_LOCAL"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "openid profile email offline_access",
  "token_endpoint_auth_method": "none",
  "pkce_required": true,
  "skip_consent": true
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HYDRA_ADMIN_URL/admin/clients" \
  -H "Content-Type: application/json" \
  -d "$CLIENT_DATA")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ OAuth client 'nova-id-test-app' created/updated."
  echo "  Client ID: nova-id-test-app"
  echo "  Redirect URIs: $CALLBACK_APP, $CALLBACK_LOCAL"
elif [ "$HTTP_CODE" = "409" ] || echo "$BODY" | grep -qi "already exists\|exists already\|Conflict"; then
  echo "ℹ️  Client 'nova-id-test-app' already exists. Updating..."
  UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$HYDRA_ADMIN_URL/admin/clients/nova-id-test-app" \
    -H "Content-Type: application/json" \
    -d "$CLIENT_DATA")
  UPDATE_HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
  if [ "$UPDATE_HTTP_CODE" = "200" ]; then
    echo "✓ OAuth client updated (skip_consent applied)."
  else
    echo "✗ Update failed (HTTP $UPDATE_HTTP_CODE)"
    echo "$(echo "$UPDATE_RESPONSE" | head -n-1)"
    exit 1
  fi
else
  echo "✗ Failed (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi
