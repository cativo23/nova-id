#!/bin/bash
# Script to create a user via Kratos Admin API
# This requires authentication - use the admin dashboard UI or run from browser console

set -e

OATHKEEPER_URL="${OATHKEEPER_URL:-http://localhost:4455}"
EMAIL="${1:-cativo23.kt@gmail.com}"
FULL_NAME="${2:-Carlos Cativo}"
ROLE="${3:-platform_admin}"
PASSWORD="${4:-Cacpac2323$}"

echo "Creating user with the following details:"
echo "  Email: $EMAIL"
echo "  Name: $FULL_NAME"
echo "  Role: $ROLE"
echo ""

# Create user
echo "Creating user in Kratos..."
USER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$OATHKEEPER_URL/admin/identities" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"schema_id\": \"default\",
    \"traits\": {
      \"email\": \"$EMAIL\",
      \"full_name\": \"$FULL_NAME\"
    },
    \"metadata_public\": {
      \"role\": \"$ROLE\"
    },
    \"credentials\": {
      \"password\": {
        \"config\": {
          \"password\": \"$PASSWORD\"
        }
      }
    }
  }")

HTTP_CODE=$(echo "$USER_RESPONSE" | tail -n1)
USER_BODY=$(echo "$USER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
  echo "✗ Failed to create user (HTTP $HTTP_CODE)"
  echo "$USER_BODY" | jq '.' 2>/dev/null || echo "$USER_BODY"
  exit 1
fi

USER_ID=$(echo "$USER_BODY" | jq -r '.id')
echo "✓ User created successfully!"
echo "  User ID: $USER_ID"
echo ""

# Write the Platform:nova#admins tuple only for platform_admin.
# Non-admin roles (platform_user, etc.) have no platform-level Keto tuple;
# app-level membership (App:<id>#members/#admins) is handled by the BFF in A1, not here.
#
# NOTE: This script routes writes through the Oathkeeper gateway (/keto/write/...),
# which is itself admin-gated. This works when a platform admin session is already active.
# For bootstrapping the FIRST admin (before any admin exists), use seed-permissions.sh
# or write directly to keto:4467 — the gateway path requires an existing admin to authorize.
if [ "$ROLE" = "platform_admin" ]; then
  echo "Granting Platform:nova#admins membership in Keto for platform_admin user..."
  KETO_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$OATHKEEPER_URL/keto/write/admin/relation-tuples" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "{
      \"namespace\": \"Platform\",
      \"object\": \"nova\",
      \"relation\": \"admins\",
      \"subject_id\": \"user:$USER_ID\"
    }")

  KETO_HTTP_CODE=$(echo "$KETO_RESPONSE" | tail -n1)

  if [ "$KETO_HTTP_CODE" = "200" ] || [ "$KETO_HTTP_CODE" = "201" ] || [ "$KETO_HTTP_CODE" = "204" ]; then
    echo "✓ User added to Platform:nova#admins in Keto"
  else
    echo "⚠ Warning: Failed to write Platform:nova#admins tuple in Keto (HTTP $KETO_HTTP_CODE)"
    echo "  If this is the first admin, use seed-permissions.sh to bootstrap via direct Keto access."
  fi
else
  echo "ℹ Role '$ROLE' requires no Keto platform tuple (app membership is handled by the BFF)."
fi

echo ""
echo "✓ User creation complete!"
echo ""
echo "Login credentials:"
echo "  Email: $EMAIL"
echo "  Password: $PASSWORD"
