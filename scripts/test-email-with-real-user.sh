#!/bin/bash

# Test Email Sending with a Real User
# This script tests email sending using an actual user from the system

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

KRATOS_PUBLIC_URL="${KRATOS_PUBLIC_URL:-http://localhost:4433}"
OATHKEEPER_URL="${OATHKEEPER_URL:-http://localhost:4455}"
MAILPIT_URL="${MAILPIT_URL:-http://localhost:8025}"

echo -e "${BLUE}=== Testing Email with Real User ===${NC}\n"

# Get a real user email from the system
echo -e "${YELLOW}Fetching users from system...${NC}"
USERS=$(curl -s "${OATHKEEPER_URL}/admin/identities?per_page=5" \
  -H "Accept: application/json" \
  --cookie-jar /tmp/kratos_cookies.txt \
  --cookie /tmp/kratos_cookies.txt 2>/dev/null)

if [ -z "$USERS" ] || [ "$USERS" = "null" ] || [ "$USERS" = "[]" ]; then
    echo -e "${RED}✗ No users found. Please create a user first.${NC}"
    echo -e "${YELLOW}  You can register at: http://localhost:5173/registration${NC}"
    exit 1
fi

# Extract first user's email (handle both array and object responses)
if echo "$USERS" | jq -e '. | type == "array"' > /dev/null 2>&1; then
    USER_EMAIL=$(echo "$USERS" | jq -r '.[0].traits.email // empty' | head -1)
else
    # If it's an object, try to get from data array
    USER_EMAIL=$(echo "$USERS" | jq -r '.data[0].traits.email // .[0].traits.email // empty' | head -1)
fi

if [ -z "$USER_EMAIL" ] || [ "$USER_EMAIL" = "null" ]; then
    echo -e "${RED}✗ Could not extract user email${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found user: ${USER_EMAIL}${NC}\n"

# Clear Mailpit
echo -e "${YELLOW}Clearing Mailpit...${NC}"
curl -s -X DELETE "${MAILPIT_URL}/api/v1/messages" > /dev/null
echo -e "${GREEN}✓ Mailpit cleared${NC}\n"

# Test Recovery Email
echo -e "${BLUE}Test: Sending Recovery Email${NC}"
FLOW_ID=$(curl -s "${KRATOS_PUBLIC_URL}/self-service/recovery/api" \
  -H "Accept: application/json" | jq -r '.id')

echo -e "${YELLOW}Recovery flow ID: ${FLOW_ID}${NC}"

# Submit recovery request
RESPONSE=$(curl -s -X POST "${KRATOS_PUBLIC_URL}/self-service/recovery?flow=${FLOW_ID}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"method\":\"code\"}")

STATE=$(echo "$RESPONSE" | jq -r '.state // "unknown"')
WAS_NOTIFIED=$(echo "$RESPONSE" | jq -r '.ui.messages[]? | select(.type == "info") | .text' | grep -i "sent" || echo "")

echo -e "${YELLOW}Flow state: ${STATE}${NC}"

# Wait for email
echo -e "${YELLOW}Waiting for email to be sent...${NC}"
sleep 5

# Check Mailpit
MAIL_COUNT=$(curl -s "${MAILPIT_URL}/api/v1/messages" | jq '.total')

if [ "$MAIL_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Email sent! Total emails in Mailpit: ${MAIL_COUNT}${NC}"
    LATEST_EMAIL=$(curl -s "${MAILPIT_URL}/api/v1/messages" | jq '.messages[0]')
    SUBJECT=$(echo "$LATEST_EMAIL" | jq -r '.Content.Headers.Subject[0]')
    TO=$(echo "$LATEST_EMAIL" | jq -r '.Content.Headers.To[0]')
    echo -e "  Subject: ${SUBJECT}"
    echo -e "  To: ${TO}"
    echo -e "\n${GREEN}View email at: ${MAILPIT_URL}${NC}"
else
    echo -e "${RED}✗ No email sent (Mailpit shows ${MAIL_COUNT} emails)${NC}"
    echo -e "${YELLOW}Checking Kratos logs...${NC}"
    echo -e "${YELLOW}Run: docker-compose logs kratos | grep -i 'courier\|recovery\|was_notified'${NC}"
fi

echo ""
