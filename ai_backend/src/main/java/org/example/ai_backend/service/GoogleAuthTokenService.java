package org.example.ai_backend.service;

import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.util.List;

@Service
public class GoogleAuthTokenService {

    @Value("${gemini.service-account-file}")
    private String serviceAccountFile;

    public String getAccessToken() throws Exception {

        GoogleCredentials credentials = GoogleCredentials
                .fromStream(new FileInputStream(serviceAccountFile))
                .createScoped(List.of("https://www.googleapis.com/auth/cloud-platform"));

        credentials.refreshIfExpired();

        return credentials.getAccessToken().getTokenValue();
    }
}
