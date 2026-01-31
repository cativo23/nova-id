#!/bin/bash

# Script to start Nova ID stack in local development mode
# Sets up local domains and starts all services

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Nova ID Stack (Local Development)${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please update .env with your configuration before continuing${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Check if local domains are configured
echo -e "${BLUE}📋 Checking local domains configuration...${NC}"
DOMAINS=("auth.ory.localhost" "admin.ory.localhost" "api.ory.localhost" "app.ory.localhost")
MISSING_DOMAINS=()

for domain in "${DOMAINS[@]}"; do
    if ! grep -q "^127.0.0.1.*${domain}" /etc/hosts 2>/dev/null; then
        MISSING_DOMAINS+=("${domain}")
    fi
done

if [ ${#MISSING_DOMAINS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing domains in /etc/hosts: ${MISSING_DOMAINS[*]}${NC}"
    echo "Run: sudo ./scripts/setup-local-domains.sh"
    exit 1
fi

echo -e "${GREEN}✅ Local domains configured${NC}"
echo ""

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)
export ENVIRONMENT=local

# Start services
echo -e "${BLUE}🐳 Starting Docker Compose services...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.local.yml up -d

echo ""
echo -e "${GREEN}✅ Nova ID Stack started successfully!${NC}"
echo ""
echo -e "${BLUE}📍 Available URLs:${NC}"
echo "  - Auth UI:     http://auth.ory.localhost (port 80 via nginx proxy)"
echo "  - Admin:       http://admin.ory.localhost (port 80 via nginx proxy)"
echo "  - API Gateway: http://api.ory.localhost (port 80 via nginx proxy)"
echo "  - Test App:    http://app.ory.localhost (port 80 via nginx proxy)"
echo ""
echo -e "${YELLOW}Note: The local-proxy service routes domains to correct ports automatically${NC}"
echo ""
echo -e "${BLUE}🔍 View logs:${NC}"
echo "  docker-compose -f docker-compose.yml -f docker-compose.local.yml logs -f"
echo ""
echo -e "${BLUE}🛑 Stop services:${NC}"
echo "  docker-compose -f docker-compose.yml -f docker-compose.local.yml down"
echo ""
