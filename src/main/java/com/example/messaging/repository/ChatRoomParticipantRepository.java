package com.example.messaging.repository;

import com.example.messaging.model.ChatRoomParticipantEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRoomParticipantRepository extends JpaRepository<ChatRoomParticipantEntity, String> {
    List<ChatRoomParticipantEntity> findByUserId(String userId);
    List<ChatRoomParticipantEntity> findByRoomId(String roomId);
}
