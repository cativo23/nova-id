#!/bin/bash

# Script to setup local domains in /etc/hosts
# Adds: auth.ory.localhost, admin.ory.localhost, api.ory.localhost, app.ory.localhost -> 127.0.0.1
# Note: localhost subdomains work better with cookies than .local domains

set -e

DOMAINS=("auth.ory.localhost" "admin.ory.localhost" "api.ory.localhost" "app.ory.localhost")
HOSTS_FILE="/etc/hosts"
TEMP_FILE=$(mktemp)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔧 Setting up local domains in /etc/hosts..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ This script requires sudo privileges to edit /etc/hosts${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

# Read current /etc/hosts
cat "$HOSTS_FILE" > "$TEMP_FILE"

# Check and add each domain
for domain in "${DOMAINS[@]}"; do
    if grep -q "^127.0.0.1.*${domain}" "$HOSTS_FILE" || grep -q "^127.0.0.1.*${domain}" "$HOSTS_FILE"; then
        echo -e "${YELLOW}⚠️  ${domain} already exists in /etc/hosts${NC}"
    else
        echo "127.0.0.1    ${domain}" >> "$TEMP_FILE"
        echo -e "${GREEN}✅ Added ${domain}${NC}"
    fi
done

# Backup original hosts file
cp "$HOSTS_FILE" "${HOSTS_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Write updated hosts file
cp "$TEMP_FILE" "$HOSTS_FILE"
rm "$TEMP_FILE"

echo ""
echo -e "${GREEN}✅ Local domains configured successfully!${NC}"
echo ""
echo "Configured domains:"
for domain in "${DOMAINS[@]}"; do
    echo "  - ${domain} -> 127.0.0.1"
done
echo ""
echo "You can now access:"
echo "  - http://auth.ory.localhost (Kratos Self-Service UI)"
echo "  - http://admin.ory.localhost (Admin Dashboard)"
echo "  - http://api.ory.localhost (Gateway/Oathkeeper)"
echo "  - http://app.ory.localhost (Test Application)"
echo ""
