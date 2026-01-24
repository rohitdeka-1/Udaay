package org.example.ai_backend;

import org.example.ai_backend.security.JwtAuthFilter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AiBackendApplication {
    public static void main(String[] args) {
        System.out.println(new JwtAuthFilter().SECRET);
        SpringApplication.run(AiBackendApplication.class, args);
        System.out.println(new JwtAuthFilter().SECRET);
    }
}
