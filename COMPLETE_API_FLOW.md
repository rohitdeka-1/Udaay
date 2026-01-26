# Complete API Flow & Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND                              │
│                  (http://localhost:5173)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/REST
                         │
┌─────────────────────────▼────────────────────────────────────────┐
│                   NODE.JS SERVER                                 │
│              (http://localhost:8000)                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Routes (Express):                                       │   │
│  │ • POST /api/v1/auth/send-otp                            │   │
│  │ • POST /api/v1/auth/verify-otp                          │   │
│  │ • POST /api/v1/issues/submit  ←── IMAGE UPLOAD          │   │
│  │ • GET  /api/v1/issues/live                              │   │
│  │ • GET  /api/v1/issues/my-issues                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Services:                                               │   │
│  │ • issue.controller.js    ← IMAGE PROCESSING             │   │
│  │ • gemini.service.js      ← AI VALIDATION (PRIMARY)      │   │
│  │ • ai-backend.service.js  ← AI VALIDATION (FALLBACK)     │   │
│  │ • storage.service.js     ← IMAGE STORAGE (GCS)          │   │
│  │ • ai.service.js          ← LEGACY AI                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└────┬────────────────────────────────────────────┬────────────────┘
     │                                            │
     │ Google OAuth Token                        │ JWT Token (internal)
     │                                            │
┌────▼──────────────────────────┐    ┌──────────▼──────────────────┐
│   GEMINI API                  │    │ SPRING BOOT AI BACKEND       │
│  (Vertex AI)                  │    │  (http://localhost:5000)     │
│  (Primary Validator)          │    │  (Fallback Validator)        │
│                               │    │                              │
│ • Image Analysis              │    │ • Security Check             │
│ • Issue Classification        │    │ • Image Validation           │
│ • Priority Assessment         │    │ • Category Detection         │
│ • Confidence Scoring          │    │ • Also uses Gemini           │
│                               │    │                              │
│ Returns JSON:                 │    │ Returns JSON:                │
│ {                             │    │ {                            │
│   issue: "Pothole",           │    │   issue: "Pothole",          │
│   confidence_reason: "...",   │    │   confidence_reason: "...",  │
│   priority: "High"            │    │   priority: "High"           │
│ }                             │    │ }                            │
└────┬──────────────────────────┘    └──────────┬───────────────────┘
     │                                          │
     └──────────────────┬───────────────────────┘
                        │ Validation Response
                        │
┌───────────────────────▼───────────────────┐
│         MONGODB DATABASE                  │
│  ┌─────────────────────────────────────┐ │
│  │ Issues Collection                   │ │
│  │ {                                   │ │
│  │   _id: ObjectId,                    │ │
│  │   title: "Pothole on Main St",      │ │
│  │   description: "...",               │ │
│  │   status: "live",  ← UPDATED!       │ │
│  │   aiValidation: {                   │ │
│  │     validated: true,                │ │
│  │     confidence: 0.92,               │ │
│  │     matchesDescription: true,       │ │
│  │     aiResponse: "...",              │ │
│  │     service: "gemini"               │ │
│  │   },                                │ │
│  │   severity: "high",                 │ │
│  │   detectedCategory: "roads"         │ │
│  │ }                                   │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
         │
         │ Geo-Spatial Index
         │
┌────────▼─────────────────────────┐
│ Map Query Results                │
│ (2DSphere Geospatial Index)      │
│                                  │
│ GET /issues/live?lat=X&lng=Y     │
│ Returns: Issues within radius    │
└──────────────────────────────────┘
```

---

## Detailed Flow: Submitting a Civic Issue

### Step 1: User Submits Issue with Image

```
CLIENT (React)
    │
    ├─→ Captures/Selects Image
    ├─→ Fills Form (title, description, category, location)
    ├─→ POST /api/v1/issues/submit
    │
    └─→ Headers:
        Authorization: Bearer eyJhbGci...
        Content-Type: multipart/form-data
        
    Body:
    {
      title: "Pothole on Main Street",
      description: "Large pothole blocking half the road",
      category: "roads",
      location: {lat: 12.9352, lng: 77.6245},
      image: <BINARY FILE DATA>
    }
```

### Step 2: Node.js Server Receives & Processes Image

```
SERVER (Node.js)
    │
    ├─→ Middleware: uploadSingle('image')
    │   • Stores image buffer
    │   • Validates file type (jpeg, png, gif)
    │   • Checks file size
    │
    ├─→ Controller: submitIssue()
    │   • Extracts request data
    │   • Parses location coordinates
    │   • Uploads image to GCS (if configured)
    │   │  └─→ Falls back to base64 if GCS fails
    │   │
    │   • Creates Issue document in MongoDB:
    │     {
    │       userId: ObjectId,
    │       title: "...",
    │       description: "...",
    │       category: "roads",
    │       imageUrl: "gs://..." or "data:image/jpeg;base64,...",
    │       location: {
    │         type: "Point",
    │         coordinates: [77.6245, 12.9352],  // [lng, lat]
    │         lat: 12.9352,
    │         lng: 77.6245,
    │         address: "Main Street, India",
    │         city: "City Name"
    │       },
    │       status: "pending",  ← PENDING VALIDATION
    │       aiValidation: {
    │         validated: false
    │       }
    │     }
    │
    └─→ Returns to Client:
        {
          success: true,
          message: "Issue submitted. AI validation in progress...",
          data: {issue: {...}}
        }
```

### Step 3: Asynchronous AI Validation (Happens in Background)

```
SERVER - VALIDATION FLOW (Asynchronous)
    │
    ├─→ Function: validateIssueWithAI()
    │
    ├─→ ATTEMPT 1: Try Gemini API (Primary)
    │   │
    │   ├─→ Service: gemini.service.js
    │   │
    │   ├─→ Step 1: Get OAuth Token
    │   │   • Reads service-account-key.json
    │   │   • Calls Google Auth API
    │   │   • Gets OAuth token (cached)
    │   │
    │   ├─→ Step 2: Prepare Image
    │   │   • Convert image buffer to base64
    │   │   • Check image size (validate not corrupted)
    │   │
    │   ├─→ Step 3: Call Gemini API (Vertex AI)
    │   │   • Endpoint: https://us-central1-aiplatform.googleapis.com/v1/projects/...
    │   │   • Method: POST
    │   │   • Headers: Authorization: Bearer <OAuth_TOKEN>
    │   │   • Body: 
    │   │     {
    │   │       contents: [{
    │   │         role: "user",
    │   │         parts: [
    │   │           {text: "Analyze this civic issue..."},
    │   │           {inlineData: {mimeType: "image/jpeg", data: "base64..."}}
    │   │         ]
    │   │       }],
    │   │       generationConfig: {temperature: 0.2}
    │   │     }
    │   │
    │   ├─→ Step 4: Parse Response
    │   │   Response:
    │   │   {
    │   │     candidates: [{
    │   │       content: {
    │   │         parts: [{
    │   │           text: "{\"issue\":\"Pothole\",\"confidence_reason\":\"...\",\"priority\":\"High\"}"
    │   │         }]
    │   │       }
    │   │     }]
    │   │   }
    │   │
    │   │   Extract text:
    │   │   "{\"issue\":\"Pothole\",\"confidence_reason\":\"Clear pothole...\",\"priority\":\"High\"}"
    │   │
    │   └─→ Step 5: Parse & Map Response
    │       mapGeminiResponse():
    │       {
    │         validated: true,
    │         matchesDescription: true,
    │         confidence: 0.9,       // High = 0.9
    │         aiResponse: "Clear pothole...",
    │         detectedCategory: "Pothole",
    │         severity: "high"
    │       }
    │
    ├─→ IF Gemini FAILS → ATTEMPT 2: Try Spring Boot Backend
    │   │
    │   ├─→ Service: ai-backend.service.js
    │   │
    │   ├─→ Generate JWT Token (internal)
    │   │   jwt.sign({role: "INTERNAL_SERVICE"}, INTERNAL_JWT_SECRET)
    │   │   → Token valid for 1 hour
    │   │
    │   ├─→ Call Spring Boot AI Backend
    │   │   • URL: http://localhost:5000/ai/verify
    │   │   • Method: POST
    │   │   • Headers: Authorization: Bearer <JWT_TOKEN>
    │   │   • Body: FormData with image file
    │   │
    │   ├─→ Spring Boot Process:
    │   │   1. JwtAuthFilter verifies token
    │   │   2. AiController receives image
    │   │   3. GeminiService analyzes (same as above)
    │   │   4. Returns IssueResponse JSON
    │   │
    │   └─→ mapAIResponse(): Convert to standard format
    │
    └─→ IF BOTH FAIL: Keep as "pending" for manual review
        (Officer must review and approve/reject manually)
```

### Step 4: Update Issue Status Based on AI Response

```
DECISION LOGIC:
    │
    ├─→ IF confidence > 0.6 AND matchesDescription = true
    │   │
    │   └─→ ✅ APPROVE & SET TO "LIVE"
    │       Update MongoDB:
    │       {
    │         status: "live",  ← NOW VISIBLE TO OFFICERS
    │         aiValidation: {
    │           validated: true,
    │           confidence: 0.92,
    │           matchesDescription: true,
    │           aiResponse: "Clear pothole damage visible",
    │           service: "gemini"
    │         },
    │         severity: "high",
    │         detectedCategory: "roads",
    │         confidenceScore: 0.92
    │       }
    │
    ├─→ ELSE IF confidence ≤ 0.6 OR matchesDescription = false
    │   │
    │   └─→ ❌ REJECT
    │       Update MongoDB:
    │       {
    │         status: "rejected",
    │         aiValidation: {
    │           validated: true,
    │           confidence: 0.35,
    │           matchesDescription: false,
    │           aiResponse: "Image does not show a civic issue"
    │         }
    │       }
    │
    └─→ ELSE (error occurred)
        │
        └─→ ⚠️ KEEP AS "PENDING"
            Update MongoDB:
            {
              status: "pending",
              aiValidation: {
                validated: false,
                aiResponse: "AI validation failed - pending manual review"
              }
            }
```

### Step 5: User Sees Updated Status

```
CLIENT (React)
    │
    ├─→ Polls /api/v1/issues/my-issues
    │
    └─→ Receives:
        {
          _id: "6547f...",
          status: "live",        ← STATUS CHANGED!
          title: "Pothole...",
          aiValidation: {
            validated: true,
            confidence: 0.92,
            matchesDescription: true,
            aiResponse: "Clear pothole damage visible"
          }
        }
    
    ├─→ UI Updates:
    │   • Green check mark (Approved)
    │   • Shows on map in "Live Issues"
    │   • Shows in Profile → My Issues
    │   • Shows in Live Issues page
    │
    └─→ OR (if rejected)
        • Red X mark (Rejected)
        • Shows rejection reason
        • NOT visible in live issues
        • Still visible in "My Issues" with status
```

---

## API Endpoints

### Authentication

#### Send OTP
```
POST /api/v1/auth/send-otp
Content-Type: application/json

{
  "phone": "9876543210"
}

Response:
{
  "success": true,
  "message": "OTP sent successfully...",
  "data": {
    "phone": "9876543210",
    "expiresIn": "10 minutes"
  }
}

// OTP printed in server logs:
// 🔐 OTP Code: 123456
```

#### Verify OTP
```
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
  "phone": "9876543210",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "6547f...",
      "name": "User",
      "phone": "9876543210",
      "role": "citizen"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "30d"
  }
}
```

### Issues

#### Submit Issue (with Image)
```
POST /api/v1/issues/submit
Authorization: Bearer {TOKEN}
Content-Type: multipart/form-data

Form Data:
- title: "Pothole on Main Street"
- description: "Large pothole blocking half the road"
- category: "roads"
- location: {"lat": 12.9352, "lng": 77.6245}
- image: <FILE>

Response:
{
  "success": true,
  "message": "Issue submitted. AI validation in progress...",
  "data": {
    "issue": {
      "_id": "6547f...",
      "status": "pending",
      "title": "Pothole on Main Street",
      "aiValidation": {
        "validated": false
      }
    }
  }
}
```

#### Get Live Issues (Approved & Visible)
```
GET /api/v1/issues/live?lat=12.9352&lng=77.6245&radius=10000&category=roads

Response:
{
  "success": true,
  "count": 5,
  "data": {
    "issues": [
      {
        "_id": "6547f...",
        "status": "live",
        "title": "Pothole on Main Street",
        "category": "roads",
        "severity": "high",
        "aiValidation": {
          "validated": true,
          "confidence": 0.92,
          "matchesDescription": true,
          "aiResponse": "Clear pothole damage visible"
        },
        "detectedCategory": "roads",
        "location": {
          "lat": 12.9352,
          "lng": 77.6245,
          "address": "Main Street, City"
        },
        "upvotes": 15,
        "createdAt": "2026-01-26T15:30:00Z"
      }
    ]
  }
}
```

#### Get User's Issues
```
GET /api/v1/issues/my-issues?status=pending

Headers: Authorization: Bearer {TOKEN}

Response:
{
  "success": true,
  "count": 3,
  "data": {
    "issues": [
      {
        "_id": "6547f...",
        "status": "pending",  // or "live", "rejected"
        "title": "...",
        "aiValidation": {...}
      }
    ]
  }
}
```

---

## Data Models

### Issue Schema (MongoDB)

```javascript
{
  _id: ObjectId,
  
  // User Info
  userId: ObjectId,  // ref: User
  
  // Issue Details
  title: String,
  description: String,
  category: String,  // roads, garbage, water, electricity, other
  imageUrl: String,
  
  // Location
  location: {
    type: String,      // "Point"
    coordinates: [Number],  // [lng, lat]
    lat: Number,
    lng: Number,
    address: String,
    city: String,
    state: String,
    country: String
  },
  
  // Status
  status: String,  // pending, live, in-progress, resolved, rejected
  
  // AI Validation
  aiValidation: {
    validated: Boolean,
    confidence: Number,    // 0.0 - 1.0
    validatedAt: Date,
    matchesDescription: Boolean,
    aiResponse: String,    // AI explanation
    service: String        // "gemini" or "springboot"
  },
  
  // AI Results
  detectedCategory: String,
  confidenceScore: Number,
  severity: String,  // low, medium, high, critical
  
  // Engagement
  upvotes: Number,
  
  // Assignment
  assignedDepartment: String,
  assignedOfficer: ObjectId,  // ref: User
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling

### Graceful Degradation

```
Primary: Gemini API
    ├─→ Success: Use AI response
    └─→ Fail: Try Fallback
    
Fallback: Spring Boot Backend
    ├─→ Success: Use AI response
    └─→ Fail: Keep Pending
    
Pending: Manual Review
    └─→ Officer reviews & approves/rejects manually
```

### Common Errors

| Error | HTTP Code | Meaning |
|-------|-----------|---------|
| "Invalid or expired token" | 401 | JWT expired, need new login |
| "Phone number required" | 400 | Missing phone in OTP request |
| "All fields are required" | 400 | Missing issue details |
| "Invalid image file" | 400 | File not image/corrupted |
| "User not found" | 404 | User doesn't exist |
| "Issue not found" | 404 | Issue doesn't exist |
| Internal server error | 500 | Server-side exception |

---

## Performance Optimizations

1. **Token Caching**
   - Google OAuth tokens cached in memory
   - Automatically refreshed 5 min before expiry

2. **Asynchronous Processing**
   - Issue creation returns immediately
   - AI validation happens in background
   - Client polls for status updates

3. **Database Indexing**
   ```javascript
   // 2DSphere for geospatial queries
   location: '2dsphere'
   
   // Faster filtering
   status: 1, createdAt: -1
   userId: 1
   category: 1
   ```

4. **Image Storage**
   - GCS if configured (fast CDN)
   - Base64 fallback (instant)
   - No blocking uploads

---

## Security

1. **Authentication**
   - OTP-based (phone verification)
   - JWT tokens (30-day expiry)
   - Token refresh on each request

2. **Authorization**
   - Issue owner can only delete own issues
   - Officers can manage assignments
   - Public can view live issues

3. **Data Protection**
   - Service account key secured in `/config/`
   - INTERNAL_JWT_SECRET never exposed
   - Credentials in environment variables

---

**Last Updated:** January 26, 2026
**Status:** ✅ Complete Architecture & Flow Documented
