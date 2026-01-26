# 🔄 Real-Time Data Flow Diagram

## The Complete Request-Response Cycle

```
FRONTEND (React Client)
│
│ User clicks "Report Issue" + Uploads Image
│
▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/v1/issues/submit
{
  title: "Pothole on Main St",
  description: "Large hole in road",
  category: "roads",
  location: {lat: 12.9352, lng: 77.6245},
  image: <BINARY_FILE>
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
▼
NODE.JS SERVER (localhost:8000)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. Validate & Process Request                             │
│     ✓ Check authentication                                 │
│     ✓ Parse multipart form data                           │
│     ✓ Get image buffer                                    │
│                                                             │
│  2. Upload Image (to Google Cloud Storage)                 │
│     ✓ If GCS configured: gs://bucket/image.jpg            │
│     ✓ If not: Use base64 data:image/jpeg;base64,...       │
│                                                             │
│  3. Create Issue in MongoDB                                │
│     ✓ Store title, description, category, location        │
│     ✓ Store image URL/base64                              │
│     ✓ Set status: "pending"                                │
│     ✓ Return issueId: "6547f3a2b1c5d8e9f"                │
│                                                             │
│  4. Send Immediate Response to Client                      │
│     ✓ HTTP 201 Created                                     │
│     ✓ Return issue with status: "pending"                  │
│     ✓ User sees: "AI validation in progress..."           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
│
│ (Async Processing Begins Here - No Blocking!)
│
▼
RESPONSE TO CLIENT (Immediate)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  success: true,
  message: "Issue submitted. AI validation in progress...",
  data: {
    issue: {
      _id: "6547f3a2b1c5d8e9f0g1h2i3",
      status: "pending",
      title: "Pothole on Main St",
      createdAt: "2026-01-26T15:30:00Z"
    }
  }
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│
│ (User sees this and can continue using app)
│
├─────────────────────────────────────────────────────────────┐
│                                                             │
▼                                                             │
BACKEND PROCESSING (Asynchronous)                           │
┌─────────────────────────────────────────────────────────┐  │
│                                                         │  │
│  AI Validation Loop                                    │  │
│  ════════════════════                                  │  │
│                                                         │  │
│  Attempt 1: Try Gemini API (Direct from Node.js)       │  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  ├─ Get Google OAuth Token                             │  │
│  ├─ Convert image to base64                            │  │
│  ├─ Send to Gemini API (Vertex AI)                     │  │
│  └─ Success? → Use Response (Skip Spring Boot)         │  │
│                                                         │  │
│  Attempt 2: Try Spring Boot AI Backend (Fallback)     │  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  ├─ Generate JWT Token                                 │  │
│  ├─ Create FormData with image                        │  │
│  ├─ POST to Spring Boot /ai/verify                    │  │
│  └─ Success? → Process Response                        │  │
│                                                         │  │
│  Attempt 3: Both Failed → Keep Pending                │  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  └─ Mark for manual officer review                     │  │
│                                                         │  │
└─────────────────────────────────────────────────────────┘  │
│                                                             │
│ (Meanwhile, user is checking status...)
│
└─────────────────────────────────────────────────────────────┐
│
▼
ATTEMPT 1: GEMINI API (Primary)
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Node.js calls gemini.service.js                          │
│                                                             │
│  1. Get OAuth Token                                       │
│     └─ GoogleAuth.getAccessToken()                       │
│                                                             │
│  2. Call Gemini API                                       │
│     ├─ Endpoint: https://us-central1-aiplatform...       │
│     ├─ Method: POST                                       │
│     ├─ Headers: Authorization: Bearer {OAUTH_TOKEN}      │
│     └─ Body: {image_base64, prompt}                      │
│                                                             │
│  3. Receive Response                                      │
│     └─ {issue: "Pothole", priority: "High", ...}        │
│                                                             │
│  4. Map Response                                          │
│     └─ mapGeminiResponse() converts to Node.js format   │
│                                                             │
│  5. Success!                                              │
│     └─ Skip Spring Boot, proceed to decision              │
│                                                             │
│  If Failed → Continue to Attempt 2                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
│
│ (Gemini failed, trying fallback...)
│
▼
ATTEMPT 2: SPRING BOOT AI BACKEND (Fallback)
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Node.js calls validateWithAIBackend()                          │
│                                                                  │
│                                                                  │
│  REQUEST TO SPRING BOOT                                        │
│  ══════════════════════════════════════════════════════════════ │
│  POST http://localhost:5000/ai/verify                          │
│  ────────────────────────────────────────────────────────────   │
│  Headers:                                                       │
│    Authorization: Bearer eyJhbGci...   (JWT Token)             │
│    Content-Type: multipart/form-data                           │
│  Body:                                                          │
│    image: <BINARY_FILE_DATA>                                   │
│                                                                  │
▼────────────────────────────────────────────────────────────────▼
SPRING BOOT SERVER (localhost:5000)
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  1. AiController receives request                              │
│     ├─ JwtAuthFilter validates token                          │
│     └─ AiController.verifyIssue() processes                   │
│                                                                  │
│  2. Validate Image                                             │
│     ├─ Check not empty                                         │
│     └─ Log: filename, content-type, size                      │
│                                                                  │
│  3. Call GeminiService.analyze()                               │
│     ├─ Convert image to base64                                │
│     ├─ Build JSON request for Gemini                          │
│     ├─ Get OAuth token from GoogleAuthTokenService            │
│     ├─ POST to Gemini API                                      │
│     ├─ Parse response                                          │
│     └─ Create IssueResponse DTO                               │
│                                                                  │
│  4. Return Response to Node.js                                 │
│     └─ HTTP 200 OK                                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
│
│ (Response coming back to Node.js)
│
▼
RESPONSE FROM SPRING BOOT
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  HTTP/1.1 200 OK                                               │
│  Content-Type: application/json                                │
│                                                                  │
│  {                                                              │
│    "issue": "Pothole",                                         │
│    "confidence_reason": "Clear pothole damage visible in...",  │
│    "priority": "High"                                          │
│  }                                                              │
│                                                                  │
│  ↓ Node.js receives this JSON                                  │
│  ↓ Calls mapAIResponse() to convert format                    │
│  ↓ Extracts: {issue, confidence_reason, priority}            │
│  ↓ Maps to: {validated, confidence, detectedCategory,        │
│             matchesDescription, aiResponse, severity}         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
│
▼
NODE.JS MAKES DECISION
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  const validation = {                                          │
│    validated: true,                                            │
│    matchesDescription: true,                                   │
│    confidence: 0.9,          ← From priority: "High"          │
│    aiResponse: "Clear pothole damage...",                     │
│    detectedCategory: "roads",  ← From issue: "Pothole"        │
│    severity: "high"                                            │
│  };                                                             │
│                                                                  │
│  if (validation.matchesDescription && confidence > 0.6) {     │
│    ✅ APPROVE: Set status = "LIVE"                            │
│    └─ Issue now visible to officers on map                    │
│  } else {                                                       │
│    ❌ REJECT: Set status = "REJECTED"                         │
│    └─ Issue hidden, not shown to officers                     │
│  }                                                              │
│                                                                  │
│  Update MongoDB:                                               │
│  ════════════════════════════════════════════════════════════  │
│  db.issues.updateOne(                                         │
│    { _id: "6547f3a2b1c5d8e9f" },                             │
│    {                                                            │
│      $set: {                                                    │
│        status: "live",              ← UPDATED!               │
│        aiValidation: {                                         │
│          validated: true,                                      │
│          confidence: 0.9,                                      │
│          validatedAt: 2026-01-26T15:35:00Z,                  │
│          matchesDescription: true,                            │
│          aiResponse: "Clear pothole damage...",              │
│          service: "springboot"                                │
│        },                                                       │
│        severity: "high",                                       │
│        detectedCategory: "roads"                              │
│      }                                                          │
│    }                                                            │
│  );                                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
│
▼
USER CHECKS STATUS
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Client polls: GET /api/v1/issues/my-issues                    │
│                                                                  │
│  Response from Node.js:                                        │
│  {                                                              │
│    success: true,                                              │
│    data: {                                                      │
│      issues: [                                                  │
│        {                                                        │
│          _id: "6547f3a2b1c5d8e9f0g1h2i3",                    │
│          status: "live",                 ← STATUS CHANGED!   │
│          title: "Pothole on Main St",                         │
│          description: "Large hole in road",                   │
│          severity: "high",                                     │
│          aiValidation: {                                       │
│            validated: true,                                    │
│            confidence: 0.9,          ← 90% confidence        │
│            matchesDescription: true,                          │
│            aiResponse: "Clear pothole damage...",            │
│            service: "springboot"         ← Which service?   │
│          },                                                     │
│          detectedCategory: "roads",                           │
│          upvotes: 0,                                           │
│          createdAt: "2026-01-26T15:30:00Z",                 │
│          imageUrl: "gs://lakecity-uploads/..."               │
│        }                                                        │
│      ]                                                          │
│    }                                                            │
│  }                                                              │
│                                                                  │
│  ✅ User sees:                                                 │
│     ├─ Green checkmark (Issue approved!)                       │
│     ├─ "90% confidence"                                        │
│     ├─ "Roads issue detected"                                  │
│     └─ Issue appears on Live Issues map                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Alternative Scenario: Invalid Issue

```
User submits photo of RANDOM OBJECT (not a civic issue)
                  │
                  ▼
Node.js creates issue (status: pending)
                  │
                  ▼
Gemini/Spring Boot analyzes
         Image Analysis:
         "This is a tree, not a civic issue"
         priority: "Low"
                  │
                  ▼
Node.js Decision:
  confidence: 0.6 (Low priority)
  matchesDescription: false ← NOT a civic issue!
                  │
                  ▼
        ❌ REJECTED
                  │
                  ▼
Update MongoDB:
  status: "rejected"
  aiValidation.aiResponse: "This is not a civic issue"
                  │
                  ▼
User checks status:
  ❌ Red X mark
  "This image does not show a civic issue"
  Issue NOT visible to officers
```

---

## Timing Breakdown

```
T+0 seconds:    User uploads image
                ↓
T+0.5 seconds:  Node.js stores in MongoDB
                ↓
T+1 second:     Client receives 201 response
                ↓
T+1 second:     AI validation starts (background)
                ↓
T+2-5 seconds:  Get OAuth token
                ↓
T+5-20 seconds: Call Gemini/Spring Boot API
                ↓
T+20-25 seconds: Parse response
                ↓
T+25 seconds:   Update MongoDB with status
                ↓
T+25+ seconds:  User sees updated status (when they refresh)
```

---

## Key Points

✅ **Non-blocking**: User gets response immediately (T+1s)
✅ **Async Processing**: AI validation happens in background
✅ **Fallback Logic**: Gemini → Spring Boot → Pending
✅ **Proper Separation**: Node.js (app) vs Spring Boot (AI)
✅ **Database Updates**: MongoDB updated with AI results
✅ **User Feedback**: Status visible in profile

This is production-ready architecture! 🚀
