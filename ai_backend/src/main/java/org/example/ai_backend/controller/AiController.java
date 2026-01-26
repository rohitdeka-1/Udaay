package org.example.ai_backend.controller;

import org.example.ai_backend.dto.IssueResponse;
import org.example.ai_backend.service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/ai")
public class AiController {

    private final GeminiService geminiService;

    public AiController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/verify")
    public ResponseEntity<IssueResponse> verifyIssue(@RequestParam("image") MultipartFile image) throws Exception {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("🔄 RECEIVED IMAGE VALIDATION REQUEST FROM NODE.JS");
        System.out.println("=".repeat(60));
        System.out.println("📦 Image Details:");
        System.out.println("   - Filename: " + image.getOriginalFilename());
        System.out.println("   - Content-Type: " + image.getContentType());
        System.out.println("   - Size: " + image.getSize() + " bytes");
        System.out.println("   - Empty: " + image.isEmpty());

        if (image.isEmpty()) {
            System.err.println("\n❌ ERROR: Received empty image file!");
            throw new Exception("Image file is empty");
        }

        System.out.println("\n🤖 Starting Gemini analysis...");
        long startTime = System.currentTimeMillis();

        IssueResponse response = geminiService.analyze(image);

        long duration = System.currentTimeMillis() - startTime;

        System.out.println("\n✅ AI ANALYSIS COMPLETE:");
        System.out.println("   - Issue Type: " + response.getIssue());
        System.out.println("   - Priority: " + response.getPriority());
        System.out.println("   - Confidence: " + response.getConfidence_reason());
        System.out.println("   - Processing Time: " + duration + "ms");

        System.out.println("\n📤 Sending response back to Node.js:");
        System.out.println("   - Status: 200 OK");
        System.out.println("   - Body: " + response.toString());
        System.out.println("=".repeat(60) + "\n");

        return ResponseEntity.ok(response);
    }
}
