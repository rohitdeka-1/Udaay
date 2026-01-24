# Node.js + Spring Boot AI Integration

## Architecture Overview

```
Citizen App (Frontend)
        ↓
    [Submit Issue]
        ↓
Node.js Server (Port 8080)
    ↓ (creates issue with "pending" status)
    ↓ (sends image asynchronously)
    ↓
Spring Boot AI Server (Port 5000)
    ↓ (Vertex AI validation)
    ↓
[Returns validation result]
    ↓
Node.js Server
    ↓ (updates issue status to "live" or "rejected")
    ↓
MongoDB (Issue stored)
        ↓
Citizens see validated issues
```

## Workflow

### 1. Issue Submission (Node.js)
- Citizen uploads image with issue details
- Node.js creates issue with `status: "pending"`
- Returns immediately to user
- Image sent asynchronously to Spring Boot AI backend

### 2. AI Validation (Spring Boot)
- Receives image via `/ai/verify` endpoint
- Vertex AI analyzes image
- Returns:
  - `issue`: Type of issue detected
  - `confidence_reason`: Why AI classified this way
  - `priority`: High/Medium/Low

### 3. Status Update (Node.js)
- Receives AI response
- Maps response to issue format
- If confidence > 60%: `status: "live"`
- If confidence < 60%: `status: "rejected"`
- Updates MongoDB

### 4. Display (Frontend)
- Only "live" issues shown to other citizens
- Pending issues shown only to submitter
- Rejected issues not displayed

## Configuration

### Node.js Server (.env)
```env
# AI Backend Configuration
AI_BACKEND_URL=http://localhost:5000
# Shared secret for generating JWT tokens - MUST match Spring Boot secret
INTERNAL_JWT_SECRET=your_shared_secret_min_32_chars
```

**Critical**: The `INTERNAL_JWT_SECRET` must be identical in both Node.js and Spring Boot configurations. This secret is used to:
- Node.js: Sign JWT tokens with `issuer="civicfix-backend"` and `role="INTERNAL_SERVICE"`
- Spring Boot: Verify JWT signature and validate required claims

### Spring Boot Server (application.yaml)
```yaml
server:
  port: 5000

internal:
  jwt:
    secret: ${INTERNAL_JWT_SECRET}  # MUST match Node.js secret

gemini:
  project-id: ${GEMINI_PROJECT_ID}
  location: ${GEMINI_LOCATION}
  model: ${GEMINI_MODEL}
  service-account-file: ${GEMINI_SERVICE_ACCOUNT_FILE}
```

### JWT Authentication Flow

1. **Node.js generates JWT** with claims:
   ```json
   {
     "role": "INTERNAL_SERVICE",
     "iss": "civicfix-backend",
     "exp": 1234567890
   }
   ```

2. **Spring Boot validates**:
   - Token signature matches `INTERNAL_JWT_SECRET`
   - Issuer is exactly `"civicfix-backend"`
   - Role claim is exactly `"INTERNAL_SERVICE"`
   - Token is not expired (1 hour TTL)

3. **Security**:
   - 401 Unauthorized: Missing or invalid token
   - 403 Forbidden: Valid token but wrong issuer/role
   - 200 OK: Token validated, request processed

## API Endpoints

### Node.js → Spring Boot
```http
POST http://localhost:5000/ai/verify
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- image: [File]
```

### Spring Boot Response
```json
{
  "issue": "pothole",
  "confidence_reason": "Detected damaged road surface with visible cracks",
  "priority": "high"
}
```

## Issue Status Flow

```
[PENDING] → AI Validation → [LIVE] ✅
                          ↓
                      [REJECTED] ❌
```

## Database Schema

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  category: "roads" | "garbage" | "water" | "electricity" | "other",
  imageUrl: String,
  status: "pending" | "live" | "rejected" | "in-progress" | "resolved",
  aiValidation: {
    validated: Boolean,
    confidence: Number,
    aiResponse: String,
    matchesDescription: Boolean,
    validatedAt: Date
  },
  detectedCategory: String,
  severity: "low" | "medium" | "high",
  ...
}
```

## Testing

### 1. Start Both Servers

```bash

cd server
npm run dev


cd ai_backend
./mvnw spring-boot:run
```

### 2. Submit Test Issue

```bash
curl -X POST http://localhost:8080/api/issues/submit \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "image=@test-pothole.jpg" \
  -F "title=Road Damage" \
  -F "description=Large pothole on main street" \
  -F "category=roads" \
  -F "location={\"lat\":28.6139,\"lng\":77.2090}"
```

### 3. Check Issue Status

```bash
# Initially: status = "pending"
curl http://localhost:8080/api/issues/live

# After AI validation (2-5 seconds):
# status = "live" (if validated)
# OR
# status = "rejected" (if not validated)
```

## Error Handling

### If Spring Boot AI Server is Down
- Issue stays in "pending" status
- No automatic approval
- Manual review required
- Or auto-approve after timeout (configurable)

### If Validation Fails
- Issue marked as "pending"
- aiValidation.validated = false
- aiValidation.aiResponse = "AI validation failed"
- Admin can manually review

## Production Deployment

### Environment Variables (Production)

**Node.js:**
```env
AI_BACKEND_URL=https://ai-backend.your-domain.com
AI_BACKEND_TOKEN=<secure-token>
```

**Spring Boot:**
```env
SERVER_PORT=5000
INTERNAL_JWT_SECRET=<strong-secret>
GEMINI_PROJECT_ID=<your-gcp-project>
```

### Security Recommendations

1. **Secure Communication**: Use HTTPS in production
2. **Authentication**: Implement JWT token auth between servers
3. **Rate Limiting**: Prevent abuse of AI endpoint
4. **Timeout**: Set appropriate timeouts (30s recommended)
5. **Monitoring**: Log all AI validation attempts
6. **Fallback**: Handle AI service downtime gracefully

## Monitoring

### Key Metrics
- Issue submission rate
- AI validation success rate
- Average validation time
- Pending vs Live issues ratio
- AI confidence score distribution

### Logs to Monitor
```
✅ Issue 123abc approved and set to LIVE
❌ Issue 456def rejected by AI
⚠️ AI backend failed for issue 789ghi, keeping as pending
```

## Future Enhancements

- [ ] Retry mechanism for failed AI calls
- [ ] Webhook for real-time status updates
- [ ] Batch processing for multiple images
- [ ] AI confidence threshold configuration
- [ ] Manual override for rejected issues
- [ ] AI training feedback loop
