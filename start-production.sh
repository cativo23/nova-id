#!/bin/bash

# Script to start Nova ID stack in production mode
# Connects to existing Traefik network

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Nova ID Stack (Production)${NC}"
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production file not found${NC}"
    echo "Please create .env.production with production configuration"
    exit 1
fi

# Check if Traefik network exists
echo -e "${BLUE}📋 Checking Traefik network...${NC}"
if ! docker network ls | grep -q "space-server_web"; then
    echo -e "${YELLOW}⚠️  Traefik network 'space-server_web' not found${NC}"
    echo "Make sure Traefik is running in the space-server stack"
    exit 1
fi

echo -e "${GREEN}✅ Traefik network found${NC}"
echo ""

# Check DNS configuration
echo -e "${BLUE}📋 Checking DNS configuration...${NC}"
DOMAINS=("auth.cativo.dev" "admin.cativo.dev" "api.cativo.dev")
echo "Make sure these domains point to this server:"
for domain in "${DOMAINS[@]}"; do
    echo "  - ${domain}"
done
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Load environment variables from .env.production
export $(cat .env.production | grep -v '^#' | xargs)
export ENVIRONMENT=production

# Start services
echo -e "${BLUE}🐳 Starting Docker Compose services...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

echo ""
echo -e "${GREEN}✅ Nova ID Stack started successfully!${NC}"
echo ""
echo -e "${BLUE}📍 Available URLs:${NC}"
echo "  - Auth UI:     https://auth.cativo.dev"
echo "  - Admin:       https://admin.cativo.dev"
echo "  - API Gateway: https://api.cativo.dev"
echo ""
echo -e "${BLUE}🔍 View logs:${NC}"
echo "  docker-compose -f docker-compose.yml -f docker-compose.production.yml logs -f"
echo ""
echo -e "${BLUE}🛑 Stop services:${NC}"
echo "  docker-compose -f docker-compose.yml -f docker-compose.production.yml down"
echo ""
