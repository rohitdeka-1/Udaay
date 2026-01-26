package org.example.ai_backend.service;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.example.ai_backend.dto.IssueResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class GeminiService {

    @Value("${gemini.project-id}")
    private String projectId;

    @Value("${gemini.location}")
    private String location;

    @Value("${gemini.model}")
    private String model;

    // We will get OAuth token using gcloud/service account
    private final GoogleAuthTokenService tokenService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GeminiService(GoogleAuthTokenService tokenService) {
        this.tokenService = tokenService;
    }

    public IssueResponse analyze(MultipartFile image) throws Exception {

        // ✅ Vertex Gemini endpoint
        String endpoint = String.format(
                "https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:generateContent",
                location, projectId, location, model
        );

        // ✅ Convert image to base64
        String base64Image = Base64.getEncoder().encodeToString(image.getBytes());

        // ✅ Prompt (make Gemini return only JSON)
        String prompt = getPrompt();

        // ✅ Build JSON request for Vertex Gemini
        Map<String, Object> inlineData = new HashMap<>();
        inlineData.put("mimeType", image.getContentType() != null ? image.getContentType() : "image/jpeg");
        inlineData.put("data", base64Image);

        Map<String, Object> imagePart = new HashMap<>();
        imagePart.put("inlineData", inlineData);

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);

        Map<String, Object> content = new HashMap<>();
        content.put("role", "user");
        content.put("parts", List.of(textPart, imagePart));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", List.of(content));

        // ✅ Optional: Force safer deterministic output
        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", 0.2);
        requestBody.put("generationConfig", generationConfig);

        // ✅ Authorization
        String accessToken = tokenService.getAccessToken();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        System.out.println("📤 Sending request to Vertex AI endpoint...");

        ResponseEntity<String> response = restTemplate.exchange(
                endpoint,
                HttpMethod.POST,
                entity,
                String.class
        );

        return parseResponse(response);
    }

    private String getPrompt() {
        return """
                You are a civic issue verification AI.

                Based on the detected objects and image description,
                classify the issue as one of:
                [Garbage, Pothole, Drainage, Streetlight, WaterLeak]

                If the image does not clearly show a civic issue,
                respond with: INVALID

                Also assign priority: High / Medium / Low

                Output STRICT JSON ONLY in this format:
                {
                  "issue": "...",
                  "confidence_reason": "...",
                  "priority": "..."
                }
                """;
    }

    private IssueResponse parseResponse(ResponseEntity<String> response) throws Exception {
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Gemini API failed: " + response.getStatusCode());
        }

        // ✅ Extract Gemini returned text from JSON response
        String geminiRaw = response.getBody();
        JsonNode root = objectMapper.readTree(geminiRaw);

        JsonNode textNode = root.at("/candidates/0/content/parts/0/text");
        if (textNode.isMissingNode()) {
            throw new RuntimeException("Gemini response missing text output: " + geminiRaw);
        }

        String modelText = textNode.asText().trim();

        // ✅ Gemini might wrap JSON in ```json ... ```
        modelText = cleanupMarkdown(modelText);

        // ✅ Parse returned JSON into IssueResponse
        IssueResponse issueResponse = objectMapper.readValue(modelText, IssueResponse.class);

        // ✅ Validate allowed categories
        List<String> allowed = List.of("Garbage", "Pothole", "Drainage", "Streetlight", "WaterLeak", "INVALID");
        if (!allowed.contains(issueResponse.getIssue())) {
            issueResponse.setIssue("INVALID");
            issueResponse.setPriority("Low");
            issueResponse.setConfidence_reason("Model returned unexpected issue category");
        }

        System.out.println("✅ Gemini analysis complete: " + issueResponse.getIssue());

        return issueResponse;
    }

    private String cleanupMarkdown(String text) {
        text = text.replace("```json", "");
        text = text.replace("```", "");
        return text.trim();
    }
}
