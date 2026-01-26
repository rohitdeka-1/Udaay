# LakeCity AI Validation System - Complete Integration Guide

## Overview

Your application now has a complete AI-powered ticket validation system:

1. **User submits a civic issue** (with image, title, description, category)
2. **AI validates the issue** (is it a real civic problem?)
3. **Smart routing:**
   - ✅ Valid issues → Status: **LIVE** (visible to officers)
   - ❌ Invalid/spam → Status: **REJECTED** (with AI explanation)
   - ⚠️ Processing errors → Status: **PENDING** (for manual review)

---

## Architecture

### Three-Tier AI System

```
Node.js Server (Express)
    ↓
    ├─→ Gemini API (Direct) - PREFERRED
    │   └─→ Uses Google Vertex AI
    │
    └─→ Spring Boot AI Backend (Fallback)
        └─→ Also uses Gemini API
        └─→ Provides additional security validation
```

### How It Works

1. **Ticket Submission** → Issue created with status: `pending`
2. **AI Validation Starts** (asynchronous):
   - Try Gemini API directly (fast)
   - If fails → Try Spring Boot backend (redundancy)
   - If both fail → Keep as `pending` for manual review
3. **AI Analysis**:
   - Detects if image shows a civic issue
   - Classifies the issue type
   - Assigns priority/severity
   - Returns confidence score
4. **Decision**:
   - If confidence > 60% → Approve as `live`
   - If confidence ≤ 60% → Reject with reason

---

## Setup Instructions

### Prerequisites

- Node.js server running
- Spring Boot AI backend running (optional, for redundancy)
- Google Cloud credentials configured

### 1. Configure Google Cloud Credentials

**Location:** `/home/rhd/Desktop/Resume_Projects/LakeCity/server/config/service-account-key.json`

This file should contain your Google Cloud service account JSON. It's used for:
- Getting OAuth tokens for Gemini API
- Uploading images to GCS (optional)

**Example structure:**
```json
{
  "type": "service_account",
  "project_id": "adroit-lock-485008-d6",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

### 2. Environment Variables

Ensure these are set in `/home/rhd/Desktop/Resume_Projects/LakeCity/server/.env`:

```env
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=adroit-lock-485008-d6
GOOGLE_CLOUD_KEY_FILE=./config/service-account-key.json

# AI Backend (optional, for fallback)
AI_BACKEND_URL=http://localhost:5000
INTERNAL_JWT_SECRET=e192dae9ed918288fa42a4a49f134e02

# Database
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
```

### 3. Start the Services

#### Terminal 1: Start MongoDB (if local)
```bash
mongod
```

#### Terminal 2: Start Spring Boot AI Backend
```bash
cd /home/rhd/Desktop/Resume_Projects/LakeCity/ai_backend
./mvnw spring-boot:run
# Runs on http://localhost:5000
```

#### Terminal 3: Start Node.js Server
```bash
cd /home/rhd/Desktop/Resume_Projects/LakeCity/server
npm run dev
# Runs on http://localhost:8000
```

#### Terminal 4: Start React Frontend
```bash
cd /home/rhd/Desktop/Resume_Projects/LakeCity/client
npm run dev
# Runs on http://localhost:5173
```

---

## API Endpoints

### Submit a Ticket

**POST** `/api/v1/issues/submit`

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: multipart/form-data
```

**Body:**
```json
{
  "title": "Pothole on Main Street",
  "description": "Large pothole blocking half the road",
  "category": "roads",  // roads, garbage, water, electricity, other
  "location": {
    "lat": 12.9352,
    "lng": 77.6245
  },
  "image": <FILE>  // Image file (required)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Issue submitted successfully. AI validation in progress...",
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

### Get Live Issues (Approved)

**GET** `/api/v1/issues/live`

**Query Parameters:**
```
lat=12.9352&lng=77.6245&radius=10000&category=roads
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": {
    "issues": [
      {
        "_id": "6547f...",
        "status": "live",
        "title": "Pothole on Main Street",
        "aiValidation": {
          "validated": true,
          "confidence": 0.92,
          "matchesDescription": true,
          "aiResponse": "Clear pothole damage visible in image"
        },
        "severity": "high"
      }
    ]
  }
}
```

### Get User's Issues

**GET** `/api/v1/issues/my-issues`

**Query Parameters:**
```
status=pending  // pending, live, rejected, resolved
```

---

## Monitoring & Debugging

### Check Ticket Status

Navigate to the **Profile** page in the app to see all your submitted tickets and their validation status.

### Terminal Logs

When a ticket is submitted, you'll see detailed logs:

#### Successful Validation (Gemini)
```
🤖 Starting AI validation for issue 6547f3a2b1c5d8e9f0g1h2i3...
🔄 Attempting Gemini API validation...
✅ Gemini validation successful
✅ Issue 6547f3a2b1c5d8e9f0g1h2i3 APPROVED and set to LIVE by gemini
   - Detected Category: Pothole
   - Confidence: 92.0%
   - Severity: high
```

#### Validation with AI Response
```
🤖 Starting AI validation for issue 6547f3a2b1c5d8e9f0g1h2i3...
🔄 Attempting Gemini API validation...
✅ Gemini validation successful
❌ Issue 6547f3a2b1c5d8e9f0g1h2i3 REJECTED by gemini
   - Reason: Image does not clearly show a civic issue
   - Confidence: 35.0%
```

---

## Supported Issue Categories

The AI can detect and classify:

1. **Roads**
   - Potholes
   - Cracks
   - Damaged asphalt

2. **Garbage**
   - Trash piles
   - Littering
   - Waste management

3. **Water**
   - Drainage issues
   - Water leaks
   - Flooding

4. **Electricity**
   - Broken streetlights
   - Power lines
   - Electrical hazards

5. **Other**
   - Miscellaneous issues

---

## How AI Validation Works

### Gemini Prompt

The AI analyzes images based on this prompt:

```
You are a civic issue verification AI for an urban reporting system.

Analyze the provided image and:
1. Identify if it shows a civic issue (Garbage, Pothole, Drainage, Streetlight, WaterLeak, etc.)
2. Classify the issue type
3. Assess the severity/priority
4. Determine if this appears to be a legitimate public issue

If the image does NOT show a clear civic issue or appears to be spam/invalid, respond with "INVALID".
```

### Response Format

```json
{
  "issue": "Pothole",
  "confidence_reason": "Clear pothole damage visible in road surface",
  "priority": "High"
}
```

### Mapping to Database

| Gemini | DB Field | Confidence | Severity |
|--------|----------|-----------|----------|
| High | severity | 0.9 | high |
| Medium | severity | 0.75 | medium |
| Low | severity | 0.6 | low |
| INVALID | matchesDescription | 0.2 | low |

---

## Troubleshooting

### Issue stays "pending"

**Possible causes:**
1. Google Cloud credentials invalid
2. Spring Boot backend not running
3. Network connectivity issue

**Fix:**
- Check `/home/rhd/Desktop/Resume_Projects/LakeCity/server/config/service-account-key.json`
- Verify `GOOGLE_CLOUD_PROJECT_ID` in `.env`
- Check server logs for errors

### AI rejecting legitimate issues

**Solutions:**
1. **Clear image**: Ensure image clearly shows the issue
2. **Good lighting**: Dark/blurry images may be rejected
3. **Relevant category**: Select correct category matching the issue
4. **Accurate description**: Description should match what's in the image

### Spring Boot backend not responding

```bash
# Check if running
curl http://localhost:5000/actuator/health

# Restart it
cd ai_backend
./mvnw spring-boot:run
```

---

## Testing the System

### Manual Test Flow

1. **Open the app** at `http://localhost:5173`
2. **Login** with your OTP
3. **Go to Report Issue** page
4. **Fill details:**
   - Title: "Broken Streetlight"
   - Description: "Streetlight not working on Main St"
   - Category: "electricity"
   - Location: Pick from map
   - Image: Take/upload photo
5. **Submit**
6. **Check terminal logs** to see AI validation
7. **Refresh page** after ~30 seconds to see status update
8. **Check Profile page** to see all your tickets

### Expected Results

- ✅ **Valid civic issue** → Status changes to "LIVE"
- ❌ **Spam/invalid** → Status changes to "REJECTED" with AI explanation
- ⚠️ **Error** → Stays "PENDING" for manual review

---

## Advanced Configuration

### Adjust AI Confidence Threshold

In [issue.controller.js](./src/controllers/issue.controller.js), line ~135:

```javascript
// Current threshold: 60%
if (validation.matchesDescription && validation.confidence > 0.6) {
    updateData.status = "live";
}

// Change to stricter (80%)
if (validation.matchesDescription && validation.confidence > 0.8) {
    updateData.status = "live";
}
```

### Add Custom AI Validators

Create additional validators in `/src/services/`:

```javascript
// src/services/custom-validator.service.js
export const customValidation = async (imageBuffer) => {
  // Your custom validation logic
  return {
    validated: true,
    confidence: 0.95,
    // ...
  };
};
```

Then use in the validation chain (issue.controller.js).

---

## Production Considerations

1. **Token Caching**: Access tokens are cached and refreshed automatically
2. **Rate Limiting**: Consider adding to avoid API quota issues
3. **Error Handling**: All AI failures fallback to manual review
4. **Monitoring**: Use logs to track validation success rate
5. **Cost**: Monitor Gemini API usage in Google Cloud console

---

## Support & Next Steps

- 📊 **Analytics**: Track validation success rate and common rejection reasons
- 🔔 **Notifications**: Alert users when their ticket status changes
- 👮 **Officer Dashboard**: Show pending validation tickets to officers
- 📱 **Mobile**: Test on mobile devices for image capture quality

---

## Files Modified

- ✅ `/server/src/controllers/issue.controller.js` - Added AI validation
- ✅ `/server/src/services/gemini.service.js` - NEW: Gemini API integration
- ✅ `/server/src/services/ai-backend.service.js` - Enhanced with better logging
- ✅ `/ai_backend/src/main/resources/application.yaml` - Added default configs
- ✅ `/ai_backend/src/main/java/.../JwtAuthFilter.java` - Added default JWT secret

---

**Last Updated:** January 26, 2026
**Status:** ✅ Complete and Ready for Testing
