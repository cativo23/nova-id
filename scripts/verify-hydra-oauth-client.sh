#!/bin/bash
# Verify the OAuth2 client "nova-id-test-app" in Hydra (redirect_uris must match what the app sends).
# Run with stack up. Hydra Admin must be reachable (e.g. HYDRA_ADMIN_URL=http://localhost:4445).

HYDRA_ADMIN_URL="${HYDRA_ADMIN_URL:-http://localhost:4445}"
CLIENT_ID="${CLIENT_ID:-nova-id-test-app}"

echo "OAuth client verification"
echo "  HYDRA_ADMIN_URL: $HYDRA_ADMIN_URL"
echo "  Client ID: $CLIENT_ID"
echo ""

BODY=$(curl -s -w "\n%{http_code}" "$HYDRA_ADMIN_URL/clients/$CLIENT_ID")
HTTP_CODE=$(echo "$BODY" | tail -n1)
JSON=$(echo "$BODY" | head -n-1)

if [ "$HTTP_CODE" != "200" ]; then
  echo "✗ Failed to get client (HTTP $HTTP_CODE)"
  echo "$JSON" | head -20
  exit 1
fi

echo "✓ Client found."
echo ""
echo "Redirect URIs registered in Hydra (must match exactly what the app sends):"
echo "$JSON" | jq -r '.redirect_uris[]?' 2>/dev/null || echo "  (install jq or inspect JSON below)"
echo ""
echo "Expected when opening the app at:"
echo "  http://app.ory.localhost  →  redirect_uri = http://app.ory.localhost/callback"
echo "  http://localhost:5175     →  redirect_uri = http://localhost:5175/callback"
echo ""
echo "If your app URL is different, run setup to add it:"
echo "  VITE_APP_URL=http://app.ory.localhost HYDRA_ADMIN_URL=$HYDRA_ADMIN_URL ./scripts/setup-hydra-test-app-client.sh"
echo ""
echo "Full client (jq):"
echo "$JSON" | jq '.' 2>/dev/null || echo "$JSON"
