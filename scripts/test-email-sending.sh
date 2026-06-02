#!/bin/bash

# Test Email Sending for Nova ID
# This script tests all email sending functionality in Kratos

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration (use Oathkeeper for Kratos – Zero Trust)
OATHKEEPER_URL="${OATHKEEPER_URL:-http://localhost:4455}"
KRATOS_PUBLIC_URL="${KRATOS_PUBLIC_URL:-${OATHKEEPER_URL}}"
KRATOS_ADMIN_URL="${KRATOS_ADMIN_URL:-http://localhost:4434}"
MAILHOG_URL="${MAILHOG_URL:-http://localhost:8025}"

echo -e "${BLUE}=== Nova ID Email Sending Test ===${NC}\n"

# Check if services are running
echo -e "${YELLOW}Checking services...${NC}"
if ! curl -sf "${KRATOS_PUBLIC_URL}/self-service/recovery/api" -H "Accept: application/json" | jq -e '.id' > /dev/null 2>&1; then
    echo -e "${RED}✗ Kratos via Oathkeeper not reachable at ${KRATOS_PUBLIC_URL}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Kratos (via Oathkeeper) is running${NC}"

MAILPIT_URL="${MAILPIT_URL:-${MAILHOG_URL:-http://localhost:8025}}"
if ! curl -s "${MAILPIT_URL}/api/v1/info" > /dev/null; then
    echo -e "${RED}✗ Mailpit is not running${NC}"
    echo -e "${YELLOW}  Start Mailpit: docker-compose up -d mailpit${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Mailpit is running${NC}\n"

# Clear Mailpit messages (v1 API)
echo -e "${YELLOW}Clearing existing Mailpit messages...${NC}"
curl -s -X DELETE "${MAILPIT_URL}/api/v1/messages" -H "Content-Type: application/json" -d '{}' > /dev/null || true
echo -e "${GREEN}✓ Mailpit cleared${NC}\n"

# Test 1: Registration with Email Verification
echo -e "${BLUE}Test 1: Registration with Email Verification${NC}"
echo -e "${YELLOW}Creating test user for verification...${NC}"

TEST_EMAIL="test-verification-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

# Create registration flow
REG_FLOW=$(curl -s -X GET "${KRATOS_PUBLIC_URL}/self-service/registration/api" \
    -H "Accept: application/json" | jq -r '.id')

if [ -z "$REG_FLOW" ] || [ "$REG_FLOW" = "null" ]; then
    echo -e "${RED}✗ Failed to create registration flow${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Registration flow created: ${REG_FLOW}${NC}"

# Submit registration
REG_RESPONSE=$(curl -s -X POST "${KRATOS_PUBLIC_URL}/self-service/registration?flow=${REG_FLOW}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "{
        \"method\": \"password\",
        \"password\": \"${TEST_PASSWORD}\",
        \"traits\": {
            \"email\": \"${TEST_EMAIL}\",
            \"full_name\": \"Test User\",
            \"rank\": \"Private\"
        }
    }")

# Check if registration was successful and verification was triggered
HAS_VERIFICATION=$(echo "$REG_RESPONSE" | jq -r '.continue_with[]? | select(.action == "show_verification_ui")' 2>/dev/null)

if [ -n "$HAS_VERIFICATION" ] && [ "$HAS_VERIFICATION" != "null" ]; then
    echo -e "${GREEN}✓ Registration successful, verification triggered${NC}"
else
    echo -e "${YELLOW}⚠ Registration response: $(echo "$REG_RESPONSE" | jq -r '.state // .error // "unknown"' 2>/dev/null)${NC}"
fi

# Check if verification email was triggered
# Wait a bit longer for email to be sent
echo -e "${YELLOW}Waiting for email to be sent...${NC}"
sleep 5
MP_MSGS=$(curl -s "${MAILPIT_URL}/api/v1/messages?limit=1")
MAIL_COUNT=$(echo "$MP_MSGS" | jq -r '.total // 0')

if [ "$MAIL_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Verification email sent!${NC}"
    LATEST_EMAIL=$(echo "$MP_MSGS" | jq '.messages[0]')
    SUBJECT=$(echo "$LATEST_EMAIL" | jq -r '.Subject // ""')
    TO=$(echo "$LATEST_EMAIL" | jq -r '.To[0].Address // .To[0] // ""')
    echo -e "  Subject: ${SUBJECT}"
    echo -e "  To: ${TO}"
else
    echo -e "${RED}✗ No verification email sent${NC}"
    echo -e "${YELLOW}  Check Kratos logs: docker-compose logs kratos | grep -i courier${NC}"
fi

echo ""

# Test 2: Password Recovery (Self-Service)
echo -e "${BLUE}Test 2: Password Recovery (Self-Service)${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT: Recovery only works for existing users!${NC}"
echo -e "${YELLOW}Kratos does NOT send emails for non-existent addresses (security feature)${NC}"
echo -e "${YELLOW}Using the test user we just created (if registration succeeded)...${NC}"

# Clear Mailpit again
curl -s -X DELETE "${MAILPIT_URL}/api/v1/messages" -H "Content-Type: application/json" -d '{}' > /dev/null || true

# Create recovery flow
RECOVERY_FLOW=$(curl -s -X GET "${KRATOS_PUBLIC_URL}/self-service/recovery/api" \
    -H "Accept: application/json" | jq -r '.id')

if [ -z "$RECOVERY_FLOW" ] || [ "$RECOVERY_FLOW" = "null" ]; then
    echo -e "${RED}✗ Failed to create recovery flow${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Recovery flow created: ${RECOVERY_FLOW}${NC}"

# Submit recovery request (using the email from registration)
RECOVERY_RESPONSE=$(curl -s -X POST "${KRATOS_PUBLIC_URL}/self-service/recovery?flow=${RECOVERY_FLOW}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "{
        \"email\": \"${TEST_EMAIL}\",
        \"method\": \"code\"
    }")

# Check if recovery was triggered
WAS_NOTIFIED=$(echo "$RECOVERY_RESPONSE" | jq -r '.ui.messages[]? | select(.type == "info") | .text' 2>/dev/null | grep -i "recovery\|email" || echo "")

if [ -n "$WAS_NOTIFIED" ]; then
    echo -e "${GREEN}✓ Recovery request processed${NC}"
else
    # Check Kratos response for errors
    ERROR_MSG=$(echo "$RECOVERY_RESPONSE" | jq -r '.ui.messages[]? | select(.type == "error") | .text' 2>/dev/null | head -1)
    if [ -n "$ERROR_MSG" ]; then
        echo -e "${YELLOW}⚠ Recovery response: ${ERROR_MSG}${NC}"
    fi
fi

# Check if recovery email was sent
# Wait a bit longer for email to be sent
echo -e "${YELLOW}Waiting for email to be sent...${NC}"
sleep 5
MP_MSGS=$(curl -s "${MAILPIT_URL}/api/v1/messages?limit=1")
MAIL_COUNT=$(echo "$MP_MSGS" | jq -r '.total // 0')

if [ "$MAIL_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Recovery email sent!${NC}"
    LATEST_EMAIL=$(echo "$MP_MSGS" | jq '.messages[0]')
    SUBJECT=$(echo "$LATEST_EMAIL" | jq -r '.Subject // ""')
    TO=$(echo "$LATEST_EMAIL" | jq -r '.To[0].Address // .To[0] // ""')
    echo -e "  Subject: ${SUBJECT}"
    echo -e "  To: ${TO}"
    
    # Extract recovery code from snippet if present
    SNIP=$(echo "$LATEST_EMAIL" | jq -r '.Snippet // ""')
    CODE=$(echo "$SNIP" | grep -oE '[0-9]{6,8}' | head -1)
    if [ -n "$CODE" ]; then
        echo -e "  ${GREEN}Recovery code found: ${CODE}${NC}"
    fi
else
    echo -e "${RED}✗ No recovery email sent${NC}"
    echo -e "${YELLOW}  Check Kratos logs: docker-compose logs kratos | grep -i courier${NC}"
fi

echo ""

# Test 3: Admin-Triggered Recovery
echo -e "${BLUE}Test 3: Admin-Triggered Recovery${NC}"
echo -e "${YELLOW}This requires an authenticated admin session${NC}"
echo -e "${YELLOW}You can test this manually from the Users Management page${NC}"
echo -e "${YELLOW}Or use the frontend 'Send Recovery Password' button${NC}\n"

# Test 4: Check Mailpit Web UI
echo -e "${BLUE}Test 4: Mailpit Web UI${NC}"
echo -e "${GREEN}✓ Mailpit Web UI available at: ${MAILPIT_URL}${NC}"
echo -e "${YELLOW}  Open in browser to view all emails${NC}\n"

# Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
TOTAL_MAILS=$(curl -s "${MAILPIT_URL}/api/v1/messages?limit=1" | jq -r '.total // 0')
echo -e "Total emails in Mailpit: ${TOTAL_MAILS}"

if [ "$TOTAL_MAILS" -gt 0 ]; then
    echo -e "${GREEN}✓ Email sending is working!${NC}"
    echo -e "\n${YELLOW}View emails at: ${MAILPIT_URL}${NC}"
else
    echo -e "${RED}✗ No emails were sent${NC}"
    echo -e "\n${YELLOW}Troubleshooting:${NC}"
    echo -e "1. Check Kratos courier: docker compose logs kratos | grep -iE 'courier|smtp'"
    echo -e "2. Mailpit on same network as Kratos (default)"
    echo -e "3. kratos.local.yml: connection_uri smtp://mailpit:1025/?disable_starttls=true"
    echo -e "4. docker-compose: kratos command includes --watch-courier"
fi

echo ""
