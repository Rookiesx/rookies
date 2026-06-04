package com.example.messaging.service;

import com.example.messaging.model.ChatRoomEntity;
import com.example.messaging.model.ChatRoomParticipantEntity;
import com.example.messaging.model.UserEntity;
import com.example.messaging.repository.ChatRoomParticipantRepository;
import com.example.messaging.repository.ChatRoomRepository;
import com.example.messaging.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RoomService {

    private final ChatRoomRepository roomRepository;
    private final ChatRoomParticipantRepository participantRepository;
    private final UserRepository userRepository;

    public RoomService(ChatRoomRepository roomRepository, ChatRoomParticipantRepository participantRepository, UserRepository userRepository) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
    }

    public List<Map<String, Object>> getUserRooms(String userId) {
        List<ChatRoomParticipantEntity> participations = participantRepository.findByUserId(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (ChatRoomParticipantEntity p : participations) {
            Optional<ChatRoomEntity> roomOpt = roomRepository.findById(p.getRoomId());
            if (roomOpt.isPresent()) {
                ChatRoomEntity room = roomOpt.get();
                Map<String, Object> roomData = new HashMap<>();
                roomData.put("id", room.getId());
                roomData.put("type", room.getType());
                
                if ("INDIVIDUAL".equals(room.getType())) {
                    // Find the other participant's name
                    List<ChatRoomParticipantEntity> roomParts = participantRepository.findByRoomId(room.getId());
                    String otherUserId = roomParts.stream()
                        .map(ChatRoomParticipantEntity::getUserId)
                        .filter(id -> !id.equals(userId))
                        .findFirst()
                        .orElse(userId); // fallback
                    
                    Optional<UserEntity> otherUser = userRepository.findById(otherUserId);
                    roomData.put("name", otherUser.map(UserEntity::getDisplayName).orElse("Unknown User"));
                } else {
                    roomData.put("name", room.getName());
                }
                result.add(roomData);
            }
        }
        return result;
    }

    public ChatRoomEntity createIndividualRoom(String userId1, String userId2) {
        // Check if room already exists
        List<ChatRoomParticipantEntity> user1Rooms = participantRepository.findByUserId(userId1);
        List<ChatRoomParticipantEntity> user2Rooms = participantRepository.findByUserId(userId2);
        
        Set<String> roomIds1 = user1Rooms.stream().map(ChatRoomParticipantEntity::getRoomId).collect(Collectors.toSet());
        Set<String> roomIds2 = user2Rooms.stream().map(ChatRoomParticipantEntity::getRoomId).collect(Collectors.toSet());
        
        roomIds1.retainAll(roomIds2);
        
        for (String sharedRoomId : roomIds1) {
            Optional<ChatRoomEntity> sharedRoom = roomRepository.findById(sharedRoomId);
            if (sharedRoom.isPresent() && "INDIVIDUAL".equals(sharedRoom.get().getType())) {
                return sharedRoom.get(); // Room already exists
            }
        }
        
        // Create new room
        String roomId = UUID.randomUUID().toString();
        ChatRoomEntity room = new ChatRoomEntity(roomId, "", "INDIVIDUAL");
        roomRepository.save(room);
        
        participantRepository.save(new ChatRoomParticipantEntity(roomId, userId1));
        if (!userId1.equals(userId2)) {
            participantRepository.save(new ChatRoomParticipantEntity(roomId, userId2));
        }
        
        return room;
    }

    public ChatRoomEntity createGroupRoom(String name, List<String> userIds) {
        String roomId = UUID.randomUUID().toString();
        ChatRoomEntity room = new ChatRoomEntity(roomId, name, "GROUP");
        roomRepository.save(room);
        
        for (String uid : userIds) {
            participantRepository.save(new ChatRoomParticipantEntity(roomId, uid));
        }
        return room;
    }

    public List<String> getParticipants(String roomId) {
        return participantRepository.findByRoomId(roomId).stream()
                .map(ChatRoomParticipantEntity::getUserId)
                .collect(Collectors.toList());
    }

    public void addParticipant(String roomId, String userId) {
        Optional<ChatRoomEntity> roomOpt = roomRepository.findById(roomId);
        if (roomOpt.isPresent()) {
            List<ChatRoomParticipantEntity> existing = participantRepository.findByRoomId(roomId);
            boolean alreadyIn = existing.stream().anyMatch(p -> p.getUserId().equals(userId));
            if (!alreadyIn) {
                participantRepository.save(new ChatRoomParticipantEntity(roomId, userId));
            }
        }
    }

    /**
     * Remove a user from a room (unfriend).
     * For INDIVIDUAL rooms: removes both participants and deletes the room.
     * For GROUP rooms: removes only the requesting user.
     * Returns the list of affected user IDs (so we can notify them).
     */
    public List<String> leaveRoom(String roomId, String userId) {
        Optional<ChatRoomEntity> roomOpt = roomRepository.findById(roomId);
        if (!roomOpt.isPresent()) {
            return Collections.emptyList();
        }

        ChatRoomEntity room = roomOpt.get();
        List<ChatRoomParticipantEntity> participants = participantRepository.findByRoomId(roomId);
        List<String> affectedUserIds = participants.stream()
                .map(ChatRoomParticipantEntity::getUserId)
                .collect(Collectors.toList());

        if ("INDIVIDUAL".equals(room.getType())) {
            // Remove all participants and delete the room
            for (ChatRoomParticipantEntity p : participants) {
                participantRepository.delete(p);
            }
            roomRepository.delete(room);
        } else {
            // Group: only remove the requesting user
            participants.stream()
                    .filter(p -> p.getUserId().equals(userId))
                    .findFirst()
                    .ifPresent(participantRepository::delete);
            affectedUserIds = Collections.singletonList(userId);
        }

        return affectedUserIds;
    }
}
