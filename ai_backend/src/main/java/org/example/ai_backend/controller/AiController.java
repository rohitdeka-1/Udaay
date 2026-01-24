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
        System.out.println(" Received image validation request from Node.js");
        System.out.println("   - Original filename: " + image.getOriginalFilename());
        System.out.println("   - Content type: " + image.getContentType());
        System.out.println("   - Size: " + image.getSize() + " bytes");
        System.out.println("   - Empty: " + image.isEmpty());

        if (image.isEmpty()) {
            System.err.println(" ERROR: Received empty image file!");
            throw new Exception("Image file is empty");
        }

        IssueResponse response = geminiService.analyze(image);
        System.out.println(" AI Analysis complete:");
        System.out.println("   - Issue: " + response.getIssue());
        System.out.println("   - Priority: " + response.getPriority());
        System.out.println("   - Confidence reason: " + response.getConfidence_reason());

        return ResponseEntity.ok(response);
    }
}
