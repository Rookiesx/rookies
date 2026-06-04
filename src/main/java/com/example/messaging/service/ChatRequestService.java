package com.example.messaging.service;

import com.example.messaging.model.ChatRequestEntity;
import com.example.messaging.model.UserEntity;
import com.example.messaging.repository.ChatRequestRepository;
import com.example.messaging.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ChatRequestService {

    private final ChatRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final RoomService roomService;

    public ChatRequestService(ChatRequestRepository requestRepository, UserRepository userRepository, RoomService roomService) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.roomService = roomService;
    }

    public ChatRequestEntity sendRequest(String senderId, String receiverId, String type, String targetRoomId) {
        // Check for existing pending request
        List<ChatRequestEntity> existing = requestRepository.findBySenderIdAndReceiverIdAndTypeAndStatus(senderId, receiverId, type, "PENDING");
        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        ChatRequestEntity req = new ChatRequestEntity(senderId, receiverId, type, targetRoomId);
        return requestRepository.save(req);
    }

    public List<Map<String, Object>> getPendingRequests(String receiverId) {
        List<ChatRequestEntity> requests = requestRepository.findByReceiverIdAndStatus(receiverId, "PENDING");
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (ChatRequestEntity req : requests) {
            Map<String, Object> data = new HashMap<>();
            data.put("id", req.getId());
            data.put("senderId", req.getSenderId());
            data.put("type", req.getType());
            data.put("targetRoomId", req.getTargetRoomId());
            data.put("createdAt", req.getCreatedAt().toString());

            Optional<UserEntity> senderOpt = userRepository.findById(req.getSenderId());
            if (senderOpt.isPresent()) {
                data.put("senderName", senderOpt.get().getDisplayName());
            } else {
                data.put("senderName", "Unknown User");
            }
            
            result.add(data);
        }
        return result;
    }

    public ChatRequestEntity respondToRequest(Long requestId, String receiverId, boolean accept) {
        Optional<ChatRequestEntity> opt = requestRepository.findById(requestId);
        if (opt.isEmpty()) return null;
        
        ChatRequestEntity req = opt.get();
        if (!req.getReceiverId().equals(receiverId) || !"PENDING".equals(req.getStatus())) {
            return null;
        }

        if (accept) {
            req.setStatus("ACCEPTED");
        } else {
            req.setStatus("REJECTED");
        }
        
        return requestRepository.save(req);
    }
}
