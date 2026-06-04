package com.example.messaging.repository;

import com.example.messaging.model.ChatRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRequestRepository extends JpaRepository<ChatRequestEntity, Long> {
    List<ChatRequestEntity> findByReceiverIdAndStatus(String receiverId, String status);
    List<ChatRequestEntity> findBySenderIdAndReceiverIdAndTypeAndStatus(String senderId, String receiverId, String type, String status);
}
