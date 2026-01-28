#!/bin/bash

# Deployment script for Google Cloud VM
# This script is executed by GitHub Actions on the VM

set -e

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cd ~/lakecity

# Check if docker-compose exists
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found. Please install it first.${NC}"
    exit 1
fi

# Check if .env file exists

if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

echo -e "${YELLOW}⬇️  Pulling latest images...${NC}"
docker-compose pull

echo -e "${YELLOW}🛑 Stopping old containers...${NC}"
docker-compose down

echo -e "${YELLOW}🚀 Starting new containers...${NC}"
docker-compose up -d

echo -e "${YELLOW}🧹 Cleaning up old images...${NC}"
docker image prune -af

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

echo ""
echo "Container status:"
docker-compose ps

echo ""
echo "Recent logs:"
docker-compose logs --tail=50
