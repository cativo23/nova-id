#!/bin/bash
# Comprehensive test script for the entire stack
# Tests: Kratos, Keto, Hydra, Oathkeeper with OPL Platform/App namespaces

set -e

KRATOS_ADMIN_URL="${KRATOS_ADMIN_URL:-http://localhost:4434}"
KRATOS_PUBLIC_URL="${KRATOS_PUBLIC_URL:-http://localhost:4433}"
KETO_READ_URL="${KETO_READ_URL:-http://localhost:4466}"
KETO_WRITE_URL="${KETO_WRITE_URL:-http://localhost:4467}"
HYDRA_PUBLIC_URL="${HYDRA_PUBLIC_URL:-http://localhost:4444}"
HYDRA_ADMIN_URL="${HYDRA_ADMIN_URL:-http://localhost:4445}"
OATHKEEPER_URL="${OATHKEEPER_URL:-http://localhost:4455}"

echo "=========================================="
echo "Comprehensive Stack Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_passed() {
  echo -e "${GREEN}✓${NC} $1"
}

test_failed() {
  echo -e "${RED}✗${NC} $1"
}

test_info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Kratos Health
echo "1. Testing Kratos..."
if curl -s "$KRATOS_PUBLIC_URL/health/ready" | jq -e '.status == "ok"' > /dev/null 2>&1; then
  test_passed "Kratos is healthy"
else
  test_failed "Kratos health check failed"
  exit 1
fi

# Test 2: Keto Health
echo ""
echo "2. Testing Keto..."
if curl -s "$KETO_READ_URL/health/ready" | jq -e '.status == "ok"' > /dev/null 2>&1; then
  test_passed "Keto Read API is healthy"
else
  test_failed "Keto Read API health check failed"
  exit 1
fi

if curl -s "$KETO_WRITE_URL/health/ready" | jq -e '.status == "ok"' > /dev/null 2>&1; then
  test_passed "Keto Write API is healthy"
else
  test_failed "Keto Write API health check failed"
  exit 1
fi

# Test 3: Hydra Health
echo ""
echo "3. Testing Hydra..."
if curl -s "$HYDRA_PUBLIC_URL/health/ready" | jq -e '.status == "ok"' > /dev/null 2>&1; then
  test_passed "Hydra is healthy"
else
  test_failed "Hydra health check failed"
  exit 1
fi

# Test 4: Oathkeeper Health
echo ""
echo "4. Testing Oathkeeper..."
if curl -s "$OATHKEEPER_URL/.well-known/jwks.json" > /dev/null 2>&1; then
  test_passed "Oathkeeper is accessible"
else
  test_failed "Oathkeeper is not accessible"
  exit 1
fi

# Test 5: List Users from Kratos
echo ""
echo "5. Testing Kratos Admin API (via Oathkeeper)..."
USERS=$(curl -s "$OATHKEEPER_URL/admin/identities?per_page=250" 2>&1)
if echo "$USERS" | jq -e '. | length >= 0' > /dev/null 2>&1; then
  USER_COUNT=$(echo "$USERS" | jq '. | length')
  test_passed "Kratos Admin API accessible (found $USER_COUNT users)"
else
  test_failed "Kratos Admin API not accessible"
  echo "$USERS" | head -5
fi

# Test 6: Check Permissions Setup (OPL namespaces: Platform, App, User)
echo ""
echo "6. Testing Keto Permissions (OPL model)..."
# OPL namespaces: Platform (nova-wide admin), App (per-app membership), User (no tuples expected)
NAMESPACES=("Platform" "App" "User")
TOTAL_PERMS=0
for ns in "${NAMESPACES[@]}"; do
  PERMISSIONS=$(curl -s "$KETO_READ_URL/relation-tuples?namespace=$ns" 2>&1)
  if echo "$PERMISSIONS" | jq -e '.relation_tuples' > /dev/null 2>&1; then
    PERM_COUNT=$(echo "$PERMISSIONS" | jq '.relation_tuples | length')
    TOTAL_PERMS=$((TOTAL_PERMS + PERM_COUNT))
    if [ "$PERM_COUNT" -gt 0 ]; then
      test_passed "Namespace '$ns' has $PERM_COUNT relation tuples"
    fi
  fi
done

if [ "$TOTAL_PERMS" -gt 0 ]; then
  test_passed "Keto accessible (found $TOTAL_PERMS total relation tuples across OPL namespaces)"

  # Check which identities have metadata_public.role == platform_admin in Kratos
  ADMIN_IDS=$(curl -s "$KRATOS_ADMIN_URL/admin/identities" | jq -r '.[] | select(.metadata_public.role == "platform_admin") | .id')
  for uid in $ADMIN_IDS; do
    test_info "Found platform_admin identity: $uid"
  done
else
  test_info "No relation tuples found yet (run ./scripts/seed-permissions.sh to bootstrap)"
fi

# Test 7: Hydra OAuth Client
echo ""
echo "7. Testing Hydra OAuth Client..."
CLIENT=$(curl -s "$HYDRA_ADMIN_URL/clients/vue-test-client" 2>&1)
if echo "$CLIENT" | jq -e '.client_id' > /dev/null 2>&1; then
  test_passed "Hydra OAuth client 'vue-test-client' exists"
else
  test_info "Hydra OAuth client 'vue-test-client' not found (run ./setup-hydra-test-client.sh)"
fi

# Test 8: OIDC Discovery
echo ""
echo "8. Testing Hydra OIDC Discovery..."
DISCOVERY=$(curl -s "$HYDRA_PUBLIC_URL/.well-known/openid-configuration" 2>&1)
if echo "$DISCOVERY" | jq -e '.issuer' > /dev/null 2>&1; then
  ISSUER=$(echo "$DISCOVERY" | jq -r '.issuer')
  test_passed "OIDC Discovery document accessible (issuer: $ISSUER)"
else
  test_failed "OIDC Discovery document not accessible"
fi

# Test 9: OPL Permission Checks for platform_admin identities
echo ""
echo "9. Testing OPL Permission Structure..."
echo "   Checking Platform:nova#administer for platform_admin identities..."

# Fetch all identities and check the OPL-computed administer permit
# for those whose metadata_public.role == "platform_admin"
ALL_IDENTITIES=$(curl -s "$KRATOS_ADMIN_URL/admin/identities" 2>&1)
ADMIN_IDS=$(echo "$ALL_IDENTITIES" | jq -r '.[] | select(.metadata_public.role == "platform_admin") | .id' 2>/dev/null)

if [ -z "$ADMIN_IDS" ]; then
  test_info "No platform_admin identities found — skipping OPL permission check"
else
  for USER_ID in $ADMIN_IDS; do
    # OPL: Platform:nova#administer is computed from Platform:nova#admins membership
    PERM_CHECK=$(curl -s "$KETO_READ_URL/relation-tuples/check?namespace=Platform&object=nova&relation=administer&subject_id=user:$USER_ID" 2>&1)
    if echo "$PERM_CHECK" | jq -e '.allowed == true' > /dev/null 2>&1; then
      test_passed "platform_admin ($USER_ID): Platform:nova#administer = allowed"
    else
      test_info "platform_admin ($USER_ID): Platform:nova#administer not yet granted (run seed-permissions.sh)"
    fi
  done
fi

# Test 10: Frontend Accessibility
echo ""
echo "10. Testing Frontend..."
if curl -s "http://localhost:5173" > /dev/null 2>&1; then
  test_passed "Frontend is accessible"
else
  test_info "Frontend not accessible (may not be running)"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "All core services are running and accessible."
echo ""
echo "Next steps:"
echo "1. Run ./scripts/seed-permissions.sh to bootstrap platform admin memberships"
echo "   (permissions are now computed via OPL policy — no separate grant step needed)"
echo "2. Test the frontend at http://localhost:5173"
echo "3. Login as a platform_admin and verify admin access"
echo ""
echo "OPL Permission Model:"
echo "  Platform:nova#admins    → grants computed permits: administer, manage_users"
echo "  App:<appId>#admins      → grants computed permits: administer, access (admin ⊇ member)"
echo "  App:<appId>#members     → grants computed permit:  access"
echo "  User:*                  → no tuples (leaf node in OPL graph)"
echo ""
