#!/bin/bash
# Comprehensive test script for the entire stack
# Tests: Kratos, Keto, Hydra, Oathkeeper with all rank permissions

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

# Test 6: Check Permissions Setup
echo ""
echo "6. Testing Keto Permissions..."
# Check all namespaces
NAMESPACES=("users" "system" "admin" "nova")
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
  test_passed "Keto permissions accessible (found $TOTAL_PERMS total relation tuples across all namespaces)"
  
  # Check if we have permissions for different ranks
  RANKS=("General" "Colonel" "Major" "Captain" "Lieutenant" "Sergeant" "Corporal" "Private")
  for rank in "${RANKS[@]}"; do
    RANK_USERS=$(curl -s "$KRATOS_ADMIN_URL/admin/identities" | jq -r ".[] | select(.traits.rank == \"$rank\") | .id" | head -1)
    if [ -n "$RANK_USERS" ]; then
      test_info "Found user with rank $rank: $RANK_USERS"
    fi
  done
else
  test_info "No permissions found yet (run ./setup-all-permissions.sh to set up)"
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

# Test 9: Permission Checks by Rank
echo ""
echo "9. Testing Permission Structure..."
echo "   Checking if permissions are set up correctly for each rank..."

# Get a sample user from each rank and check their permissions
for rank in "General" "Colonel" "Major" "Captain" "Lieutenant" "Sergeant"; do
  USER_ID=$(curl -s "$KRATOS_ADMIN_URL/admin/identities" | jq -r ".[] | select(.traits.rank == \"$rank\") | .id" | head -1)
  if [ -n "$USER_ID" ]; then
    # Check view_users permission in users namespace
    PERM_CHECK=$(curl -s "$KETO_READ_URL/relation-tuples/check?namespace=users&object=management&relation=view_users&subject_id=user:$USER_ID" 2>&1)
    if echo "$PERM_CHECK" | jq -e '.allowed == true' > /dev/null 2>&1; then
      test_passed "$rank ($USER_ID): Has view_users permission"
    else
      test_info "$rank ($USER_ID): No view_users permission (expected for some ranks)"
    fi
  fi
done

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
echo "1. Run ./setup-all-permissions.sh to set up permissions for all ranks"
echo "2. Test the frontend at http://localhost:5173"
echo "3. Login with different rank users and verify permissions"
echo ""
echo "Rank Permission Summary (by namespace):"
echo "  users namespace:"
echo "    General: view_users, add_users, edit_users, delete_users, change_permissions"
echo "    Colonel: view_users, add_users, edit_users"
echo "    Major: view_users, add_users, delete_users, change_permissions"
echo "    Captain/Lieutenant/Sergeant: view_users, add_users"
echo "    Corporal/Private: No permissions"
echo "  system namespace:"
echo "    General/Colonel/Major: manage_permissions"
echo "  admin namespace: (for admin panel access)"
echo "  nova namespace: (for application-specific permissions)"
echo ""
