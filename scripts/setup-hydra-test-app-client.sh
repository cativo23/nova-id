#!/bin/bash
# Register OAuth2 client in Hydra for the Test App ("Login with Nova ID").
# Run after Hydra is up. Redirect URIs must match exactly what the app sends (no trailing slash).
#
# For app at http://app.ory.localhost  → app sends redirect_uri=http://app.ory.localhost/callback
# For app at http://localhost:5175      → app sends redirect_uri=http://localhost:5175/callback

# Hydra admin is reached via Oathkeeper (strip_path /api/internal/hydra-admin -> hydra:4445).
# Path /admin/clients is required by Hydra's admin API.
HYDRA_ADMIN_URL="${HYDRA_ADMIN_URL:-http://localhost:4455/api/internal/hydra-admin/admin}"
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

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HYDRA_ADMIN_URL/clients" \
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
  UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$HYDRA_ADMIN_URL/clients/nova-id-test-app" \
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
