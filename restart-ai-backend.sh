#!/bin/bash

# Stop any running Spring Boot process
echo "🛑 Stopping existing Spring Boot process..."
pkill -f "spring-boot:run" || echo "No existing process found"
pkill -f "ai_backend" || true

sleep 2

# Navigate to ai_backend directory
cd /home/rhd/Desktop/Resume_Projects/LakeCity/ai_backend || exit 1

# Export all environment variables
echo "🚀 Starting Spring Boot AI Backend with configuration..."
export SERVER_PORT=5000
export GEMINI_PROJECT_ID="adroit-lock-485008-d6"
export GEMINI_LOCATION="us-central1"
export GEMINI_MODEL="gemini-2.0-flash"
export GEMINI_SERVICE_ACCOUNT_FILE="/home/rhd/Desktop/Resume_Projects/LakeCity/ai_backend/config/service-account-key.json"
export INTERNAL_JWT_SECRET="e192dae9ed918288fa42a4a49f134e02"

echo "✅ Configuration set:"
echo "   - SERVER_PORT: ${SERVER_PORT}"
echo "   - GEMINI_PROJECT_ID: ${GEMINI_PROJECT_ID}"
echo "   - GEMINI_MODEL: ${GEMINI_MODEL}"
echo "   - INTERNAL_JWT_SECRET: ${INTERNAL_JWT_SECRET}"
echo "📦 Building and starting Spring Boot..."
echo "📍 Working directory: $(pwd)"

./mvnw clean spring-boot:run
