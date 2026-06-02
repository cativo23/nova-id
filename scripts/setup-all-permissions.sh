#!/bin/bash
# Comprehensive RBAC permissions setup using Keto subject sets
# Two global roles: platform_admin (admin dashboard, user mgmt) and platform_user (apps only).
# Permissions are granted to role objects; users are assigned to roles.

KETO_WRITE_URL="${KETO_WRITE_URL:-http://localhost:4467}"
KRATOS_ADMIN_URL="${KRATOS_ADMIN_URL:-http://localhost:4434}"

echo "Setting up RBAC permissions (platform_admin / platform_user)..."
echo ""

# Grant permission to a role (subject set)
grant_permission_to_role() {
  local role=$1
  local relation=$2
  local namespace=${3:-users}
  local object=${4:-management}

  echo "  Granting $namespace:$object#$relation to role: $role"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$KETO_WRITE_URL/admin/relation-tuples" \
    -H "Content-Type: application/json" \
    -d "{
      \"namespace\": \"$namespace\",
      \"object\": \"$object\",
      \"relation\": \"$relation\",
      \"subject_set\": {
        \"namespace\": \"ranks\",
        \"object\": \"$role\",
        \"relation\": \"member\"
      }
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "    ✓ $namespace:$object#$relation granted to $role"
    return 0
  else
    echo "    ✗ Failed to grant $namespace:$object#$relation to $role (HTTP $HTTP_CODE)"
    echo "    Response: $(echo "$RESPONSE" | head -n -1)"
    return 1
  fi
}

# Assign user to role
assign_user_to_role() {
  local user_id=$1
  local role=$2

  echo "  Assigning user:$user_id to role:$role"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$KETO_WRITE_URL/admin/relation-tuples" \
    -H "Content-Type: application/json" \
    -d "{
      \"namespace\": \"ranks\",
      \"object\": \"$role\",
      \"relation\": \"member\",
      \"subject_id\": \"user:$user_id\"
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "    ✓ User assigned to $role"
    return 0
  else
    echo "    ✗ Failed to assign user to $role (HTTP $HTTP_CODE)"
    echo "    Response: $(echo "$RESPONSE" | head -n -1)"
    return 1
  fi
}

# Setup permissions for a role
setup_role_permissions() {
  local role=$1
  shift
  local permissions=("$@")

  echo "Setting up permissions for role: $role"

  for perm_spec in "${permissions[@]}"; do
    if [[ "$perm_spec" == *"#"* ]]; then
      namespace=$(echo "$perm_spec" | cut -d: -f1)
      rest=$(echo "$perm_spec" | cut -d: -f2)
      object=$(echo "$rest" | cut -d# -f1)
      relation=$(echo "$rest" | cut -d# -f2)
    else
      namespace="users"
      object="management"
      relation="$perm_spec"
    fi
    grant_permission_to_role "$role" "$relation" "$namespace" "$object"
  done
  echo ""
}

# Assign existing users to their roles (from Kratos metadata_public.role)
assign_users_to_roles() {
  echo "Assigning existing users to their roles..."
  echo ""

  USERS=$(curl -s "$KRATOS_ADMIN_URL/admin/identities" | jq -r '.[] | "\(.id)|\(.metadata_public.role // "platform_user")"')

  if [ -z "$USERS" ]; then
    echo "  ⚠ No users found"
    return
  fi

  echo "$USERS" | while IFS='|' read -r user_id role; do
    [ -z "$user_id" ] || [ -z "$role" ] && continue
    echo "  User: $user_id -> Role: $role"
    assign_user_to_role "$user_id" "$role"
  done
  echo ""
}

echo "=== Step 1: Granting permissions to roles ==="
echo ""

echo "=== platform_admin: Full permissions ==="
setup_role_permissions "platform_admin" \
  "users:management#view_users" \
  "users:management#add_users" \
  "users:management#edit_users" \
  "users:management#delete_users" \
  "users:management#change_permissions" \
  "system:admin#manage_permissions" \
  "admin:panel#access"

echo "=== platform_user: No admin permissions (app access only) ==="
# platform_user has no Keto permissions; backend validates in-app actions.

echo ""
echo "=== Step 2: Assigning existing users to roles ==="
echo ""
assign_users_to_roles

echo ""
echo "✓ RBAC permissions setup complete!"
echo ""
echo "Roles:"
echo "  platform_admin: view_users, add_users, edit_users, delete_users, change_permissions, manage_permissions, admin panel"
echo "  platform_user: app access only (no admin permissions)"
echo ""
echo "Update user role in Kratos (traits.rank) and run syncRankPermissions() or this script to sync Keto."
echo ""
