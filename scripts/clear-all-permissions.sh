#!/bin/bash
# Clear all permissions from Keto.
# This script removes all relation tuples from all namespaces.
#
# NETWORK: This script must run on the compose network (nova-id-ory-internal) to reach
# the internal Keto hostnames. Keto read/write ports are NOT exposed to the host by
# default (zero-trust). Recommended usage:
#   docker compose run --rm keto-seed sh /scripts/clear-all-permissions.sh
# For host-exposed setups, override the URLs via env vars:
#   KETO_READ_URL=http://localhost:4466 \
#   KETO_WRITE_URL=http://localhost:4467 \
#   ./scripts/clear-all-permissions.sh

KETO_READ_URL="${KETO_READ_URL:-http://keto:4466}"
KETO_WRITE_URL="${KETO_WRITE_URL:-http://keto:4467}"

echo "Clearing all permissions from Keto..."
echo ""

# OPL namespaces in use (Platform holds nova membership tuples; App holds per-app tuples;
# User is included for safety — no tuples expected but cleared for completeness).
NAMESPACES=("Platform" "App" "User")

TOTAL_DELETED=0

for namespace in "${NAMESPACES[@]}"; do
  echo "Clearing namespace: $namespace"
  
  # Get all relation tuples for this namespace (with pagination if needed)
  RELATIONS_BODY=$(mktemp)
  RELATIONS_CODE=$(curl -s -o "$RELATIONS_BODY" -w "%{http_code}" "$KETO_READ_URL/relation-tuples?namespace=$namespace" 2>/dev/null || echo "000")
  RELATIONS=$(cat "$RELATIONS_BODY"); rm -f "$RELATIONS_BODY"

  if [ "$RELATIONS_CODE" = "000" ]; then
    echo "  Cannot reach Keto at $KETO_READ_URL — run this on the compose network (docker compose run) or expose the port." >&2
    continue
  fi

  if [ -z "$RELATIONS" ] || [ "$RELATIONS" = "null" ]; then
    echo "  No relations found in namespace: $namespace"
    continue
  fi
  
  # Count relations
  COUNT=$(echo "$RELATIONS" | jq -r '.relation_tuples | length' 2>/dev/null || echo "0")
  
  if [ "$COUNT" = "0" ] || [ "$COUNT" = "null" ]; then
    echo "  No relations found in namespace: $namespace"
    continue
  fi
  
  echo "  Found $COUNT relation tuples"
  
  # Delete each relation tuple
  DELETED=0
  echo "$RELATIONS" | jq -c '.relation_tuples[]?' 2>/dev/null | while IFS= read -r perm; do
    if [ -z "$perm" ] || [ "$perm" = "null" ]; then
      continue
    fi
    
    # Extract values and trim whitespace/newlines
    NAMESPACE_VAL=$(echo "$perm" | jq -r '.namespace // empty' | tr -d '\n\r' | xargs)
    OBJECT=$(echo "$perm" | jq -r '.object // empty' | tr -d '\n\r' | xargs)
    RELATION=$(echo "$perm" | jq -r '.relation // empty' | tr -d '\n\r' | xargs)
    
    # Try different ways to get subject
    SUBJECT=$(echo "$perm" | jq -r 'if .subject_id then .subject_id elif .subject_set.subject_id then .subject_set.subject_id elif .subject_set.namespace then (.subject_set.namespace + ":" + .subject_set.object + "#" + .subject_set.relation) else empty end' 2>/dev/null | tr -d '\n\r' | xargs)
    
    if [ -z "$SUBJECT" ] || [ "$SUBJECT" = "null" ] || [ -z "$NAMESPACE_VAL" ] || [ -z "$OBJECT" ] || [ -z "$RELATION" ]; then
      echo "    ⚠ Skipping invalid relation tuple"
      continue
    fi
    
    # URL encode parameters
    NAMESPACE_ENC=$(printf '%s' "$NAMESPACE_VAL" | jq -sRr @uri)
    OBJECT_ENC=$(printf '%s' "$OBJECT" | jq -sRr @uri)
    RELATION_ENC=$(printf '%s' "$RELATION" | jq -sRr @uri)
    SUBJECT_ENC=$(printf '%s' "$SUBJECT" | jq -sRr @uri)
    
    # Delete the relation tuple
    DELETE_URL="$KETO_WRITE_URL/admin/relation-tuples?namespace=$NAMESPACE_ENC&object=$OBJECT_ENC&relation=$RELATION_ENC&subject_id=$SUBJECT_ENC"
    DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$DELETE_URL")
    DELETE_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
    
    if [ "$DELETE_CODE" = "000" ]; then
      echo "    ✗ Cannot reach Keto at $KETO_WRITE_URL — run this on the compose network (docker compose run) or expose the port."
    elif [ "$DELETE_CODE" = "200" ] || [ "$DELETE_CODE" = "204" ]; then
      DELETED=$((DELETED + 1))
      echo "    ✓ Deleted: $NAMESPACE_VAL:$OBJECT#$RELATION@$SUBJECT"
    else
      RESPONSE_BODY=$(echo "$DELETE_RESPONSE" | head -n -1)
      echo "    ✗ Failed to delete: $NAMESPACE_VAL:$OBJECT#$RELATION@$SUBJECT (HTTP $DELETE_CODE)"
      if [ -n "$RESPONSE_BODY" ] && [ "$RESPONSE_BODY" != "null" ]; then
        echo "      Response: $RESPONSE_BODY" | head -c 100
      fi
    fi
  done
  
  echo "  Cleared namespace: $namespace"
  echo ""
done

# Verify all are cleared
echo "Verifying all permissions are cleared..."
for namespace in "${NAMESPACES[@]}"; do
  VERIFY_BODY=$(mktemp)
  VERIFY_CODE=$(curl -s -o "$VERIFY_BODY" -w "%{http_code}" "$KETO_READ_URL/relation-tuples?namespace=$namespace" 2>/dev/null || echo "000")
  if [ "$VERIFY_CODE" = "000" ]; then
    echo "  ⚠ Cannot reach Keto at $KETO_READ_URL — run this on the compose network (docker compose run) or expose the port."
    rm -f "$VERIFY_BODY"
    continue
  fi
  COUNT=$(cat "$VERIFY_BODY" | jq -r '.relation_tuples | length' 2>/dev/null || echo "0")
  rm -f "$VERIFY_BODY"
  if [ "$COUNT" != "0" ] && [ "$COUNT" != "null" ]; then
    echo "  ⚠ Warning: $namespace namespace still has $COUNT relation tuples"
  else
    echo "  ✓ $namespace namespace is clear"
  fi
done

echo ""
echo "✓ Permission clearing complete!"
echo ""
echo "To reseed platform admin memberships, run:"
echo "  ./scripts/seed-permissions.sh"
