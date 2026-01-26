#!/bin/bash
cd /home/rhd/Desktop/Resume_Projects/LakeCity/ai_backend
export INTERNAL_JWT_SECRET="e192dae9ed918288fa42a4a49f134e02"
export GEMINI_SERVICE_ACCOUNT_FILE="/home/rhd/Desktop/Resume_Projects/LakeCity/ai_backend/config/service-account-key.json"
./mvnw spring-boot:run
