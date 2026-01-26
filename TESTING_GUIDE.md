# Testing the AI Validation System

## Quick Start Testing

### 1. Start All Services

```bash
cd /home/rhd/Desktop/Resume_Projects/LakeCity

# In Terminal 1:
cd ai_backend
./mvnw spring-boot:run

# In Terminal 2:
cd server
npm run dev

# In Terminal 3:
cd client
npm run dev
```

### 2. Access the Application

- **Frontend**: http://localhost:5173
- **API**: http://localhost:8000
- **AI Backend**: http://localhost:5000

---

## Test Cases

### Test 1: Valid Civic Issue (Should be APPROVED)

**Setup:**
1. Take/find a photo of a clear civic issue (pothole, broken light, trash pile, etc.)
2. Open the app and login (use OTP: check server terminal)

**Steps:**
1. Click "Report Issue" button
2. Fill the form:
   - **Title**: "Large pothole on Main Street"
   - **Description**: "Big pothole in the road, causing water to collect"
   - **Category**: "roads"
   - **Location**: Pick location on map
   - **Image**: Upload the civic issue photo
3. Click "Submit"
4. Check terminal logs (server logs)

**Expected Result:**
```
✅ Issue APPROVED and set to LIVE by gemini
   - Detected Category: Pothole
   - Confidence: 85.0%
   - Severity: high
```

**Verification:**
- Status changes to "LIVE" 
- Visible in "Live Issues" map
- Visible in "Profile" → "My Issues"

---

### Test 2: Invalid/Spam Issue (Should be REJECTED)

**Setup:**
1. Take a photo of something NOT related to civic issues (e.g., food, pet, landscape, building)

**Steps:**
1. Click "Report Issue"
2. Fill the form with fake civic details:
   - **Title**: "Random thing"
   - **Description**: "Just a photo"
   - **Category**: "roads"
   - **Image**: Upload random photo
3. Click "Submit"

**Expected Result:**
```
❌ Issue REJECTED by gemini
   - Reason: Image does not show a civic issue
   - Confidence: 25.0%
```

**Verification:**
- Status changes to "REJECTED"
- AI response explains why it was rejected
- Not visible in "Live Issues"

---

### Test 3: Multiple Issues in Sequence

**Purpose:** Test system stability and concurrent validation

**Steps:**
1. Submit 3-5 different civic issues in quick succession
2. Monitor terminal logs
3. Check status updates for each

**Expected Behavior:**
- All issues process independently
- Each gets validated correctly
- No blocking or timeout errors

---

### Test 4: Edge Cases

#### Test 4a: Very Blurry Image
- **Expected**: Rejected with low confidence
- **Reason**: AI can't clearly identify the issue

#### Test 4b: Multiple Issues in One Photo
- **Expected**: AI detects primary issue
- **Example**: Pothole AND trash nearby → Detects pothole

#### Test 4c: Borderline Cases
- **Example**: Photo of repair in progress (partially fixed)
- **Expected**: May be rejected or approved depending on severity

---

## Monitoring During Testing

### Terminal 1 (AI Backend) - Should Show:
```
[INFO] Tomcat started on port 5000 (http) with context path ''
[INFO] Started AiBackendApplication
```

### Terminal 2 (Node Server) - Should Show:
```
[nodemon] app crashed - waiting for file changes before starting...
[nodemon] restarting due to changes...
Server running on port 8000
```

### Terminal 2 (Node Server) - On Validation:
```
🤖 Starting AI validation for issue 6547f3a2b1c5d8e9f0g1h2i3...
🔄 Attempting Gemini API validation...
✅ Gemini validation successful
   - Issue type: Pothole
   - Priority: High
✅ Issue 6547f3a2b1c5d8e9f0g1h2i3 APPROVED and set to LIVE by gemini
   - Detected Category: roads
   - Confidence: 92.0%
   - Severity: high
```

---

## Debugging

### If Validation Hangs

**Signs:**
- Issue stays "pending" for more than 30 seconds
- No logs in terminal

**Fixes:**
1. Check AI Backend health:
   ```bash
   curl http://localhost:5000/actuator/health
   ```

2. Check Google Cloud credentials:
   ```bash
   # Verify file exists
   ls -la server/config/service-account-key.json
   
   # Check project ID
   grep "project_id" server/config/service-account-key.json
   ```

3. Check environment variables:
   ```bash
   cat server/.env | grep -i google
   cat server/.env | grep -i ai
   ```

---

### If Issues Rejected Incorrectly

**Check:**
1. **Image Quality**
   - Is image clear and well-lit?
   - Does it clearly show the civic issue?

2. **Category Match**
   - Is selected category correct?
   - For example, pothole = "roads"

3. **Description**
   - Is description accurate?
   - Does it match what's in the image?

**Solution:**
- Resubmit with clearer image and accurate description
- Check logs for AI reasoning

---

## API Testing (Using cURL)

### Test OTP Generation

```bash
curl -X POST http://localhost:8000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210"}'

# Response:
# {
#   "success": true,
#   "message": "OTP sent successfully...",
#   "data": {"phone": "9876543210", "expiresIn": "10 minutes"}
# }
```

### Test OTP Verification

```bash
# OTP will be in server terminal logs
curl -X POST http://localhost:8000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9876543210", "otp": "123456"}'

# Response:
# {
#   "success": true,
#   "message": "Login successful",
#   "data": {
#     "user": {...},
#     "token": "eyJhbGciOiJIUzI1NiIs..."
#   }
# }
```

### Test Issue Submission

```bash
# Using JWT token from login
curl -X POST http://localhost:8000/api/v1/issues/submit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "title=Test Pothole" \
  -F "description=Large pothole on road" \
  -F "category=roads" \
  -F "location={\"lat\": 12.9352, \"lng\": 77.6245}" \
  -F "image=@/path/to/image.jpg"
```

### Test Get Live Issues

```bash
curl "http://localhost:8000/api/v1/issues/live?lat=12.9352&lng=77.6245&radius=10000"
```

---

## Checking Database

### View Recent Issues

```bash
# Using MongoDB CLI
mongosh
```

```javascript
use lakecity

// See all issues
db.issues.find().pretty()

// See pending issues
db.issues.find({status: "pending"}).pretty()

// See approved issues
db.issues.find({status: "live"}).pretty()

// See rejected issues
db.issues.find({status: "rejected"}).pretty()

// See issue with validation details
db.issues.findOne({status: "live"}, {aiValidation: 1, title: 1, status: 1})
```

---

## Success Criteria

### AI System is Working Correctly if:

- ✅ Valid civic issues → Status becomes "LIVE"
- ✅ Invalid/spam → Status becomes "REJECTED" with reason
- ✅ Processing errors → Status stays "PENDING" (for manual review)
- ✅ Confidence scores are reasonable (0.0 - 1.0)
- ✅ AI explanations make sense
- ✅ Multiple concurrent submissions work
- ✅ Terminal logs show proper flow

### Performance Expectations:

- **Validation time**: 10-30 seconds per image
- **Success rate**: 90%+ for legitimate issues
- **False positives**: <5% (spam rejected correctly)
- **False negatives**: <10% (legitimate issues rejected)

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 403 Unauthorized | Invalid JWT in Spring Boot | Check `INTERNAL_JWT_SECRET` |
| ECONNREFUSED on :5000 | AI Backend not running | Start Spring Boot backend |
| "Image file is empty" | Upload failed | Retry with valid image |
| Validation takes >1 min | Google Auth slow | Check internet connectivity |
| "INVALID" always returned | Gemini API issues | Check Google Cloud quotas |
| Status never updates | Async validation failed | Check server logs, restart server |

---

## Next Steps After Testing

1. ✅ Verify AI validation works correctly
2. ✅ Test with real civic issue photos
3. ✅ Monitor logs for any errors
4. ✅ Adjust confidence threshold if needed
5. ✅ Set up monitoring/alerting
6. ✅ Deploy to production with proper error handling

---

**Last Updated:** January 26, 2026
**Test Status:** Ready for comprehensive testing
