package com.example.messaging.repository;

import com.example.messaging.model.MessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<MessageEntity, String> {
    List<MessageEntity> findTop50ByOrderBySentAtDesc();
    
    List<MessageEntity> findTop50ByRoomIdOrderBySentAtDesc(String roomId);
}
