#!/bin/bash
# Script to create a test OAuth client in Hydra for the Vue frontend
# Works in both development and production

HYDRA_ADMIN_URL="${HYDRA_ADMIN_URL:-http://localhost:4445}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

# Detect if we're in production (check for HTTPS or production domain)
if [[ "$FRONTEND_URL" == *"https://"* ]] || [[ "$FRONTEND_URL" == *"cativo.dev"* ]]; then
  REDIRECT_URI="${FRONTEND_URL}/hydra-test/callback"
  echo "Production mode detected"
else
  REDIRECT_URI="${FRONTEND_URL}/hydra-test/callback"
  echo "Development mode"
fi

echo "Setting up Hydra test OAuth client..."
echo "Frontend URL: $FRONTEND_URL"
echo "Redirect URI: $REDIRECT_URI"
echo ""

# Generate a random client secret
CLIENT_SECRET=$(python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32)))")

# Create OAuth client
CLIENT_DATA=$(cat <<EOF
{
  "client_id": "vue-test-client",
  "client_name": "Vue Frontend Test Client",
  "client_secret": "$CLIENT_SECRET",
  "redirect_uris": [
    "$REDIRECT_URI"
  ],
  "grant_types": [
    "authorization_code",
    "refresh_token"
  ],
  "response_types": [
    "code"
  ],
  "scope": "openid profile email offline_access",
  "token_endpoint_auth_method": "client_secret_post",
  "pkce_required": true
}
EOF
)

echo "Creating OAuth client..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$HYDRA_ADMIN_URL/clients" \
  -H "Content-Type: application/json" \
  -d "$CLIENT_DATA")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✓ OAuth client created successfully!"
  echo ""
  echo "Client ID: vue-test-client"
  echo "Client Secret: $CLIENT_SECRET"
  echo ""
  echo "Use these credentials in the Hydra Test page:"
  echo "  - Client ID: vue-test-client"
  echo "  - Redirect URI: $REDIRECT_URI"
  echo ""
  echo "⚠️  Save the client secret - you'll need it if you want to use client_secret_post authentication"
elif echo "$BODY" | grep -q "already exists"; then
  echo "ℹ️  Client already exists. Updating..."
  
  # Try to update instead
  UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$HYDRA_ADMIN_URL/clients/vue-test-client" \
    -H "Content-Type: application/json" \
    -d "$CLIENT_DATA")
  
  UPDATE_HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
  if [ "$UPDATE_HTTP_CODE" = "200" ]; then
    echo "✓ OAuth client updated successfully!"
    echo ""
    echo "Client ID: vue-test-client"
    echo "Client Secret: $CLIENT_SECRET"
    echo "Redirect URI: $REDIRECT_URI"
  else
    echo "✗ Failed to update client (HTTP $UPDATE_HTTP_CODE)"
    echo "$UPDATE_RESPONSE" | head -n-1
  fi
else
  echo "✗ Failed to create client (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

echo ""
echo "Next steps:"
echo "1. Go to $FRONTEND_URL/hydra-test"
echo "2. Enter Client ID: vue-test-client"
echo "3. Enter Redirect URI: $REDIRECT_URI"
echo "4. Click 'Start OAuth Flow'"
echo "5. You'll be redirected to Hydra's login/consent flow"
echo "6. After authentication, you'll get OAuth tokens"
