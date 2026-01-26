#!/bin/bash

# LakeCity Complete Stack Runner
# This script starts all services needed for development

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "🚀 LakeCity Development Stack Startup"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"

# Check Java
if ! command -v java &> /dev/null; then
    echo -e "${RED}❌ Java not found${NC}"
    exit 1
fi
JAVA_VERSION=$(java -version 2>&1 | grep version | awk -F'"' '{print $2}')
echo -e "${GREEN}✅ Java: $JAVA_VERSION${NC}"

# Check MongoDB (optional)
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}✅ MongoDB: Found${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB: Not found (assuming Atlas is being used)${NC}"
fi

echo ""
echo "🔧 Starting services..."
echo ""

# Function to start a service
start_service() {
    local name=$1
    local dir=$2
    local command=$3
    local url=$4
    
    echo -e "${YELLOW}Starting $name...${NC}"
    cd "$dir"
    eval "$command" &
    SERVICE_PID=$!
    echo -e "${GREEN}✅ $name started (PID: $SERVICE_PID)${NC}"
    if [ ! -z "$url" ]; then
        echo "   URL: $url"
    fi
    echo ""
}

# Start services
# Export environment variables for Spring Boot
export SERVER_PORT=5000
export GEMINI_PROJECT_ID="adroit-lock-485008-d6"
export GEMINI_LOCATION="us-central1"
export GEMINI_MODEL="gemini-2.0-flash"
export GEMINI_SERVICE_ACCOUNT_FILE="./config/service-account-key.json"
export INTERNAL_JWT_SECRET="e192dae9ed918288fa42a4a49f134e02"

start_service "Spring Boot AI Backend" \
    "ai_backend" \
    "SERVER_PORT=5000 GEMINI_PROJECT_ID=adroit-lock-485008-d6 GEMINI_LOCATION=us-central1 GEMINI_MODEL=gemini-2.0-flash GEMINI_SERVICE_ACCOUNT_FILE=./config/service-account-key.json INTERNAL_JWT_SECRET=e192dae9ed918288fa42a4a49f134e02 ./mvnw spring-boot:run -q" \
    "http://localhost:5000"

sleep 3

start_service "Node.js Server" \
    "server" \
    "npm run dev" \
    "http://localhost:8000"

sleep 2

start_service "React Client" \
    "client" \
    "npm run dev" \
    "http://localhost:5173"

echo ""
echo "════════════════════════════════════════════════════"
echo -e "${GREEN}✅ All services started!${NC}"
echo "════════════════════════════════════════════════════"
echo ""
echo "📍 Service URLs:"
echo "   Frontend:  http://localhost:5173"
echo "   API:       http://localhost:8000"
echo "   AI Backend: http://localhost:5000"
echo ""
echo "📝 Logs:"
echo "   Check terminal tabs for individual service logs"
echo ""
echo "🛑 To stop all services, press Ctrl+C"
echo ""

# Wait for interrupt
wait
