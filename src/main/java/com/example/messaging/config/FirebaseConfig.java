package com.example.messaging.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            if (!FirebaseApp.getApps().isEmpty()) {
                return;
            }

            InputStream serviceAccount;
            String envCreds = System.getenv("FIREBASE_CREDENTIALS");

            if (envCreds != null && !envCreds.trim().isEmpty()) {
                serviceAccount = new ByteArrayInputStream(envCreds.getBytes(StandardCharsets.UTF_8));
            } else {
                serviceAccount = getClass().getClassLoader().getResourceAsStream("firebase-service-account.json");
            }

            if (serviceAccount == null) {
                System.err.println("Firebase credentials not found! Ensure FIREBASE_CREDENTIALS env var is set or firebase-service-account.json is in src/main/resources");
                return;
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp.initializeApp(options);
            System.out.println("Firebase Admin SDK initialized successfully.");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
