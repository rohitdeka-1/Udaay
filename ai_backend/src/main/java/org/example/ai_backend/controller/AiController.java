package org.example.ai_backend.controller;

import org.example.ai_backend.dto.IssueResponse;
import org.example.ai_backend.service.GeminiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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
        IssueResponse response = geminiService.analyze(image);
        System.out.println(response.toString());
        return ResponseEntity.ok(response);
    }
}
