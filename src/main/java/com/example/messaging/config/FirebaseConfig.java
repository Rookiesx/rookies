package com.example.messaging.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void init() {
        try {
            java.io.InputStream serviceAccount = null;
            String envCreds = System.getenv("FIREBASE_CREDENTIALS");
            
            if (envCreds != null && !envCreds.trim().isEmpty()) {
                // Use Environment Variable for Production (Render)
                serviceAccount = new java.io.ByteArrayInputStream(envCreds.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            } else {
                // Fallback to local file for development
                serviceAccount = getClass().getClassLoader().getResourceAsStream("firebase-service-account.json");
            }

            if (serviceAccount == null) {
                System.err.println("Firebase service account file or FIREBASE_CREDENTIALS not found!");
                return;
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                System.out.println("Firebase Admin SDK initialized successfully.");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
