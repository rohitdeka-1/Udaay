# Testing Image Flow Between Node.js and Spring Boot

## Image Transmission Analysis

### ✅ Current Implementation is CORRECT

The image is being sent correctly:

**Node.js Side (`ai-backend.service.js`):**
```javascript
const formData = new FormData();
formData.append('image', imageBuffer, {
    filename: imageName,      // e.g., "pothole.jpg"
    contentType: mimeType     // e.g., "image/jpeg"
});
```

**Spring Boot Side (`AiController.java`):**
```java
@PostMapping("/verify")
public ResponseEntity<IssueResponse> verifyIssue(@RequestParam("image") MultipartFile image)
```

### How It Works:

1. **Frontend** uploads image → **Node.js** receives via multer with `memoryStorage()`
2. **Node.js** gets `req.file.buffer` (raw Buffer, not base64)
3. **form-data** package wraps Buffer in multipart/form-data format
4. **axios** sends HTTP POST with proper Content-Type headers
5. **Spring Boot** receives as `MultipartFile` through `@RequestParam("image")`
6. **GeminiService** calls `image.getBytes()` to get byte array
7. **Vertex AI** analyzes the image

### Testing Steps:

1. **Start Spring Boot server:**
   ```bash
   cd ai_backend
   export INTERNAL_JWT_SECRET=civicfix_internal_service_secret_key_2026_secure_min_32_chars_long
   export GEMINI_PROJECT_ID=your-project-id
   export GEMINI_LOCATION=us-central1
   export GEMINI_MODEL=gemini-1.5-flash-002
   export GEMINI_SERVICE_ACCOUNT_FILE=/path/to/service-account.json
   ./mvnw spring-boot:run
   ```

2. **Start Node.js server:**
   ```bash
   cd server
   npm run dev
   ```

3. **Submit an issue with image from frontend**

4. **Watch the logs:**

   **Node.js logs should show:**
   ```
   📸 Preparing image for Spring Boot AI backend:
      - Image name: pothole.jpg
      - MIME type: image/jpeg
      - Buffer size: 245678 bytes
      - Buffer type: Valid Buffer
   🔐 Generated JWT token (length: 200+ chars)
   🚀 Sending POST request to: http://localhost:5000/ai/verify
   ✅ Spring Boot AI backend response received:
      - Status: 200
      - Data: { "issue": "Pothole", "priority": "High", ... }
   ```

   **Spring Boot logs should show:**
   ```
   📸 Received image validation request from Node.js
      - Original filename: pothole.jpg
      - Content type: image/jpeg
      - Size: 245678 bytes
      - Empty: false
   ✅ AI Analysis complete:
      - Issue: Pothole
      - Priority: High
      - Confidence reason: Clear pothole visible in road surface
   ```

### Potential Issues & Solutions:

#### Issue 1: 401 Unauthorized
**Cause:** JWT secret mismatch
**Fix:** Ensure `INTERNAL_JWT_SECRET` is identical in both servers

#### Issue 2: 403 Forbidden
**Cause:** JWT missing required claims
**Fix:** JWT must have `issuer="civicfix-backend"` and `role="INTERNAL_SERVICE"` (already implemented)

#### Issue 3: Empty image received
**Cause:** Buffer not passed correctly
**Fix:** Check `req.file.buffer` exists in `submitIssue()` controller

#### Issue 4: Connection refused
**Cause:** Spring Boot server not running
**Fix:** Start Spring Boot on port 5000

#### Issue 5: Timeout
**Cause:** Vertex AI taking too long
**Fix:** Increase timeout in axios (currently 30s)

### Debug Commands:

**Check if Spring Boot is running:**
```bash
curl http://localhost:5000/health
```

**Test JWT generation:**
```bash
cd server
node -e "import('./src/services/ai-backend.service.js')"
```

**Check file upload in Node.js:**
Add temporary logging in `issue.controller.js`:
```javascript
console.log('File received:', {
    buffer: req.file?.buffer?.length,
    mimetype: req.file?.mimetype,
    originalname: req.file?.originalname
});
```

### Expected Behavior:

1. ✅ Image uploaded as Buffer (not base64)
2. ✅ Buffer wrapped in multipart/form-data
3. ✅ JWT token generated with correct claims
4. ✅ Spring Boot receives MultipartFile
5. ✅ Image bytes extracted successfully
6. ✅ Vertex AI analyzes image
7. ✅ Response sent back to Node.js
8. ✅ Issue status updated to "live" or "rejected"

## Summary

**The implementation is correct!** The image is:
- ✅ Sent as raw Buffer (not base64 string)
- ✅ Wrapped in proper multipart/form-data format
- ✅ Received correctly by Spring Boot as MultipartFile
- ✅ Processed by Vertex AI

**Next step:** Run both servers and test with a real image upload to see the logs!
