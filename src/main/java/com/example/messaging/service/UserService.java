package com.example.messaging.service;

import com.example.messaging.model.UserEntity;
import com.example.messaging.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserEntity saveOrUpdate(String id, String displayName, String profilePictureUrl, String email) {
        UserEntity user = userRepository.findById(id)
                .orElse(new UserEntity(id, displayName, profilePictureUrl, email));
        user.setDisplayName(displayName);
        if (profilePictureUrl != null) {
            user.setProfilePictureUrl(profilePictureUrl);
        }
        if (email != null) {
            user.setEmail(email);
        }
        return userRepository.save(user);
    }

    public List<UserEntity> getAllUsers() {
        return userRepository.findAll();
    }
    
    public Optional<UserEntity> getUser(String id) {
        return userRepository.findById(id);
    }
}
