package com.example.messaging.websocket;

import com.example.messaging.model.ChatMessage;
import com.example.messaging.service.MessageService;
import com.example.messaging.service.RoomService;
import com.example.messaging.service.UserService;
import com.example.messaging.model.UserEntity;
import com.example.messaging.model.ChatRoomEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private static final String USERNAME_ATTRIBUTE = "username";
    private static final String UID_ATTRIBUTE = "UID";

    private final ObjectMapper objectMapper;
    private final Set<WebSocketSession> sessions = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private final Map<String, Set<WebSocketSession>> userSessions = new ConcurrentHashMap<>();
    private final Map<String, java.util.concurrent.ScheduledFuture<?>> disconnectTasks = new ConcurrentHashMap<>();
    private final Map<String, com.example.messaging.model.ChatMessage> messages = new ConcurrentHashMap<>();

    private final MessageService messageService;
    private final UserService userService;
    private final RoomService roomService;
    private final com.example.messaging.service.ChatRequestService requestService;

    public ChatWebSocketHandler(ObjectMapper objectMapper, MessageService messageService, UserService userService,
            RoomService roomService, com.example.messaging.service.ChatRequestService requestService) {
        this.objectMapper = objectMapper;
        this.messageService = messageService;
        this.userService = userService;
        this.roomService = roomService;
        this.requestService = requestService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        ChatMessage chatMessage = objectMapper.readValue(message.getPayload(), ChatMessage.class);
        chatMessage.setType(defaultValue(chatMessage.getType(), "chat"));
        chatMessage.setSender(defaultValue(chatMessage.getSender(), "Anonymous"));
        chatMessage.setContent(defaultValue(chatMessage.getContent(), ""));
        chatMessage.setSentAt(Instant.now());

        if ("register".equals(chatMessage.getType())) {
            handleRegister(session, chatMessage);
            return;
        }

        String uid = (String) session.getAttributes().get(UID_ATTRIBUTE);
        if (uid == null) {
            System.err.println("Unauthenticated message rejected.");
            return;
        }

        chatMessage.setClientId(uid);
        chatMessage.setSender((String) session.getAttributes().get(USERNAME_ATTRIBUTE));

        switch (chatMessage.getType()) {
            case "fetch_users":
                handleFetchUsers(session);
                break;
            case "fetch_rooms":
                handleFetchRooms(session, uid);
                break;
            case "fetch_requests":
                handleFetchRequests(session, uid);
                break;
            case "send_request":
                handleSendRequest(session, uid, chatMessage);
                break;
            case "respond_request":
                handleRespondRequest(session, uid, chatMessage);
                break;
            case "create_room":
                handleCreateRoom(session, uid, chatMessage);
                break;
            case "join_room":
                handleJoinRoom(session, uid, chatMessage);
                break;
            case "reaction":
                handleReaction(uid, chatMessage);
                break;
            case "edit":
                handleEdit(uid, chatMessage);
                break;
            case "delete":
                handleDelete(uid, chatMessage);
                break;
            case "unfriend":
                handleUnfriend(session, uid, chatMessage);
                break;
            case "update_profile":
                handleUpdateProfile(uid, chatMessage);
                break;
            case "webrtc_request_call":
            case "webrtc_ringing":
            case "webrtc_accept":
            case "webrtc_decline":
            case "webrtc_end":
            case "webrtc_offer":
            case "webrtc_answer":
            case "webrtc_ice_candidate":
                handleWebRTC(uid, chatMessage, session);
                break;
            case "chat":
            default:
                handleChat(uid, chatMessage);
                break;
        }
    }

    private void handleUpdateProfile(String uid, ChatMessage chatMessage) {
        if (uid == null)
            return;
        String newName = chatMessage.getSender();
        String newPhotoUrl = chatMessage.getContent();
        String email = chatMessage.getEmail(); // new field
        userService.saveOrUpdate(uid, newName, newPhotoUrl, email);

        // Broadcast users list so everyone gets the new profile photo
        broadcastUsersList();

        try {
            ChatMessage updateMsg = new ChatMessage();
            updateMsg.setType("update_profile");
            updateMsg.setClientId(uid);
            updateMsg.setSender(newName);
            updateMsg.setContent(newPhotoUrl);
            String json = objectMapper.writeValueAsString(updateMsg);
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleRegister(WebSocketSession session, ChatMessage chatMessage) throws Exception {
        String token = chatMessage.getContent();
        try {
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
            String uid = decodedToken.getUid();
            String name = decodedToken.getName();
            String email = (String) decodedToken.getClaims().get("email");
            if (name == null || name.trim().isEmpty()) {
                name = (String) decodedToken.getClaims().get("phone_number");
            }
            if (name == null || name.trim().isEmpty()) {
                name = "User-" + uid.substring(0, 4);
            }

            userService.saveOrUpdate(uid, name, null, email);

            session.getAttributes().put(USERNAME_ATTRIBUTE, name);
            session.getAttributes().put(UID_ATTRIBUTE, uid);

            Set<WebSocketSession> activeUserSessions = userSessions.computeIfAbsent(uid,
                    k -> Collections.newSetFromMap(new ConcurrentHashMap<>()));
            activeUserSessions.add(session);

            java.util.concurrent.ScheduledFuture<?> pendingDisconnect = disconnectTasks.remove(uid);
            if (pendingDisconnect != null) {
                pendingDisconnect.cancel(false);
            }

            // Acknowledge registration
            ChatMessage ack = new ChatMessage("system", "Server", "Registered", Instant.now());
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(ack)));

            // Send pending requests upon registration
            handleFetchRequests(session, uid);

            // Send rooms and users automatically on registration
            handleFetchRooms(session, uid);
            handleFetchUsers(session);
            broadcastUsersList();
        } catch (Exception e) {
            System.err.println("Token verification failed: " + e.getMessage());
        }
    }

    private void handleFetchUsers(WebSocketSession session) throws IOException {
        List<UserEntity> allUsers = userService.getAllUsers();
        for (UserEntity user : allUsers) {
            Set<WebSocketSession> active = userSessions.get(user.getId());
            user.setOnline(active != null && !active.isEmpty());
        }
        ChatMessage response = new ChatMessage("users_list", "Server", "", Instant.now());
        response.setReactions(allUsers.stream().collect(Collectors.toMap(UserEntity::getId, u -> 0))); // using
                                                                                                       // reactions map
                                                                                                       // temporarily
                                                                                                       // for users

        // Let's pass the list of users with their profile pictures using a custom
        // property if needed,
        // or piggyback on the content. The easiest way is JSON serialize the list.
        try {
            response.setContent(objectMapper.writeValueAsString(allUsers));
        } catch (Exception e) {
        }

        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
    }

    private void broadcastUsersList() {
        List<UserEntity> allUsers = userService.getAllUsers();
        for (UserEntity user : allUsers) {
            Set<WebSocketSession> active = userSessions.get(user.getId());
            user.setOnline(active != null && !active.isEmpty());
        }
        ChatMessage response = new ChatMessage("users_list", "Server", "", Instant.now());
        try {
            response.setContent(objectMapper.writeValueAsString(allUsers));
            String payload = objectMapper.writeValueAsString(response);
            TextMessage message = new TextMessage(payload);
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(message);
                }
            }
        } catch (Exception e) {
        }
    }

    private void handleFetchRooms(WebSocketSession session, String uid) throws IOException {
        List<Map<String, Object>> rooms = roomService.getUserRooms(uid);
        // Enrich each room with its latest message content and timestamp for UI preview
        for (Map<String, Object> roomMap : rooms) {
            String roomId = (String) roomMap.get("id");
            try {
                List<com.example.messaging.model.ChatMessage> recent = messageService.recent(roomId);
                if (recent != null && !recent.isEmpty()) {
                    com.example.messaging.model.ChatMessage latest = recent.get(0); // most recent
                    String preview = latest.getContent();
                    if (preview == null || preview.trim().isEmpty()) {
                        String type = latest.getAttachmentType();
                        if ("image".equals(type)) preview = "📷 Image";
                        else if ("video".equals(type)) preview = "🎥 Video";
                        else if ("audio".equals(type)) preview = "🎤 Audio";
                        else if (latest.getAttachmentUrl() != null && !latest.getAttachmentUrl().trim().isEmpty()) preview = "📎 Attachment";
                        else preview = "";
                    }
                    roomMap.put("latestMessage", preview);
                    roomMap.put("latestMessageTimestamp", latest.getSentAt().toString());
                } else {
                    roomMap.put("latestMessage", "");
                    roomMap.put("latestMessageTimestamp", "");
                }
            } catch (Exception ex) {
                // In case of errors, ensure fields exist
                roomMap.put("latestMessage", "");
                roomMap.put("latestMessageTimestamp", "");
            }
        }
        // Sort rooms so the latest chat appears first based on timestamp
        rooms.sort((a, b) -> {
            String tsA = (String) a.get("latestMessageTimestamp");
            String tsB = (String) b.get("latestMessageTimestamp");
            // Treat empty timestamps as older
            if (tsA == null || tsA.isEmpty()) return 1;
            if (tsB == null || tsB.isEmpty()) return -1;
            return tsB.compareTo(tsA); // descending order
        });
        ChatMessage response = new ChatMessage("rooms_list", "Server", "", Instant.now());
        try {
            response.setContent(objectMapper.writeValueAsString(rooms));
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        } catch (Exception e) {
        }
    }

    private void handleFetchRequests(WebSocketSession session, String uid) throws IOException {
        List<Map<String, Object>> requests = requestService.getPendingRequests(uid);
        ChatMessage response = new ChatMessage("requests_list", "Server", "", Instant.now());
        try {
            response.setContent(objectMapper.writeValueAsString(requests));
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(response)));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void notifyReceiverAboutRequests(String receiverId) {
        Set<WebSocketSession> sessions = userSessions.get(receiverId);
        if (sessions != null) {
            for (WebSocketSession s : sessions) {
                if (s.isOpen()) {
                    try {
                        handleFetchRequests(s, receiverId);
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }

    private void notifyReceiverAboutRooms(String receiverId) {
        Set<WebSocketSession> sessions = userSessions.get(receiverId);
        if (sessions != null) {
            for (WebSocketSession s : sessions) {
                if (s.isOpen()) {
                    try {
                        handleFetchRooms(s, receiverId);
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }

    private void handleSendRequest(WebSocketSession session, String uid, ChatMessage req) throws IOException {
        try {
            Map<String, Object> payload = objectMapper.readValue(req.getContent(), Map.class);
            String type = (String) payload.get("type");

            if ("INDIVIDUAL".equals(type)) {
                String otherUserId = (String) payload.get("userId");
                requestService.sendRequest(uid, otherUserId, "INDIVIDUAL", null);
                notifyReceiverAboutRequests(otherUserId);

                // Notify sender that request was sent
                ChatMessage sentAck = new ChatMessage("request_sent", "Server", "Request sent successfully",
                        Instant.now());
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(sentAck)));

            } else if ("GROUP".equals(type)) {
                String name = (String) payload.get("name");
                List<String> userIds = (List<String>) payload.get("userIds");

                // Create room immediately with just the creator
                ChatRoomEntity room = roomService.createGroupRoom(name, List.of(uid));

                ChatMessage createdAck = new ChatMessage("room_created", "Server", room.getId(), Instant.now());
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(createdAck)));
                handleFetchRooms(session, uid);

                // Send invitations
                for (String invitedId : userIds) {
                    if (!invitedId.equals(uid)) {
                        requestService.sendRequest(uid, invitedId, "GROUP_INVITE", room.getId());
                        notifyReceiverAboutRequests(invitedId);
                    }
                }

                ChatMessage sentAck = new ChatMessage("request_sent", "Server", "Group created and invites sent",
                        Instant.now());
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(sentAck)));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleRespondRequest(WebSocketSession session, String uid, ChatMessage req) throws IOException {
        try {
            Map<String, Object> payload = objectMapper.readValue(req.getContent(), Map.class);
            Long requestId = ((Number) payload.get("requestId")).longValue();
            boolean accept = (Boolean) payload.get("accept");

            com.example.messaging.model.ChatRequestEntity processedReq = requestService.respondToRequest(requestId, uid,
                    accept);
            if (processedReq != null && accept) {
                if ("INDIVIDUAL".equals(processedReq.getType())) {
                    ChatRoomEntity room = roomService.createIndividualRoom(processedReq.getSenderId(),
                            processedReq.getReceiverId());
                    notifyReceiverAboutRooms(processedReq.getSenderId());
                    notifyReceiverAboutRooms(processedReq.getReceiverId());
                } else if ("GROUP_INVITE".equals(processedReq.getType())) {
                    roomService.addParticipant(processedReq.getTargetRoomId(), uid);
                    notifyReceiverAboutRooms(uid);

                    // Optional: notify others in the room that someone joined.
                }
            }

            // Update the receiver's request list
            handleFetchRequests(session, uid);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleCreateRoom(WebSocketSession session, String uid, ChatMessage req) throws IOException {
        try {
            Map<String, Object> payload = objectMapper.readValue(req.getContent(), Map.class);
            String type = (String) payload.get("type");
            ChatRoomEntity room = null;
            if ("INDIVIDUAL".equals(type)) {
                String otherUserId = (String) payload.get("userId");
                room = roomService.createIndividualRoom(uid, otherUserId);
            } else if ("GROUP".equals(type)) {
                String name = (String) payload.get("name");
                List<String> userIds = (List<String>) payload.get("userIds");
                if (!userIds.contains(uid))
                    userIds.add(uid);
                room = roomService.createGroupRoom(name, userIds);
            }

            if (room != null) {
                ChatMessage createdAck = new ChatMessage("room_created", "Server", room.getId(), Instant.now());
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(createdAck)));

                // Notify all participants about the new room so their UI can refresh
                List<String> participants = roomService.getParticipants(room.getId());
                for (String pUid : participants) {
                    Set<WebSocketSession> pSessions = userSessions.get(pUid);
                    if (pSessions != null) {
                        for (WebSocketSession pSess : pSessions) {
                            if (pSess.isOpen()) {
                                handleFetchRooms(pSess, pUid);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleJoinRoom(WebSocketSession session, String uid, ChatMessage req) throws IOException {
        String roomId = req.getRoomId();
        if (roomId == null)
            return;
        List<com.example.messaging.model.ChatMessage> recent = messageService.recent(roomId);
        java.util.Collections.reverse(recent);

        for (com.example.messaging.model.ChatMessage m : recent) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(m)));
            if (m.getMessageId() != null) {
                messages.put(m.getMessageId(), m);
            }
        }
    }

    private void handleChat(String uid, ChatMessage chatMessage) throws IOException {
        boolean hasContent = chatMessage.getContent() != null && !chatMessage.getContent().trim().isEmpty();
        boolean hasAttachment = chatMessage.getAttachmentUrl() != null && !chatMessage.getAttachmentUrl().trim().isEmpty();
        if (!(hasContent || hasAttachment) || chatMessage.getRoomId() == null)
            return;
        if (chatMessage.getMessageId() == null || chatMessage.getMessageId().trim().isEmpty()) {
            chatMessage.setMessageId(UUID.randomUUID().toString());
        }
        
        if (chatMessage.getReplyToId() != null) {
            com.example.messaging.model.ChatMessage original = messages.get(chatMessage.getReplyToId());
            if (original != null) {
                chatMessage.setReplyToClientId(original.getClientId());
            }
        }
        com.example.messaging.model.ChatMessage persisted = messageService.save(chatMessage);
        persisted.setClientId(chatMessage.getClientId());
        messages.put(persisted.getMessageId(), persisted);
        broadcastToRoom(chatMessage.getRoomId(), persisted, null);
    }

    private void handleWebRTC(String uid, ChatMessage chatMessage, WebSocketSession session) throws IOException {
        if (chatMessage.getRoomId() == null) return;
        
        if ("webrtc_request_call".equals(chatMessage.getType())) {
            List<String> participants = roomService.getParticipants(chatMessage.getRoomId());
            boolean isAnyOtherOnline = false;
            for (String pUid : participants) {
                if (!pUid.equals(uid)) {
                    Set<WebSocketSession> sess = userSessions.get(pUid);
                    if (sess != null && !sess.isEmpty()) {
                        isAnyOtherOnline = true;
                        break;
                    }
                }
            }
            if (!isAnyOtherOnline) {
                ChatMessage offlineMsg = new ChatMessage();
                offlineMsg.setType("webrtc_offline");
                offlineMsg.setRoomId(chatMessage.getRoomId());
                offlineMsg.setTargetClientId(uid);
                offlineMsg.setContent("User is offline");
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(offlineMsg)));
                }
                return;
            }
        }

        // Do not persist WebRTC signaling messages, just broadcast them to the room
        chatMessage.setClientId(uid);
        broadcastToRoom(chatMessage.getRoomId(), chatMessage, session);
    }

    private void handleReaction(String uid, ChatMessage chatMessage) throws IOException {
        String targetId = chatMessage.getMessageId();
        String reaction = chatMessage.getReaction();
        if (targetId != null && reaction != null) {
            com.example.messaging.model.ChatMessage target = messages.get(targetId);
            if (target != null) {
                Map<String, String> userReactions = target.getUserReactions();
                Map<String, Integer> r = target.getReactions();

                String existingReaction = userReactions.get(uid);
                if (existingReaction != null && existingReaction.equals(reaction)) {
                    userReactions.remove(uid);
                    r.put(reaction, Math.max(0, r.getOrDefault(reaction, 0) - 1));
                } else {
                    if (existingReaction != null) {
                        r.put(existingReaction, Math.max(0, r.getOrDefault(existingReaction, 0) - 1));
                    }
                    userReactions.put(uid, reaction);
                    r.put(reaction, r.getOrDefault(reaction, 0) + 1);
                }

                target.setReactions(r);
                target.setUserReactions(userReactions);

                com.example.messaging.model.ChatMessage update = messageService.save(target);
                update.setClientId(target.getClientId());
                messages.put(update.getMessageId(), update);
                broadcastToRoom(update.getRoomId(), update, null);
            }
        }
    }

    private void handleEdit(String uid, ChatMessage chatMessage) throws IOException {
        String targetId = chatMessage.getMessageId();
        if (targetId != null) {
            com.example.messaging.model.ChatMessage target = messages.get(targetId);
            if (target != null && uid.equals(target.getClientId())) {
                target.setContent(chatMessage.getContent());
                target.setEdited(true);
                target.setEditedAt(Instant.now());
                com.example.messaging.model.ChatMessage updated = messageService.update(target);
                updated.setClientId(target.getClientId());
                messages.put(updated.getMessageId(), updated);
                broadcastToRoom(updated.getRoomId(), updated, null);
            }
        }
    }

    private void handleDelete(String uid, ChatMessage chatMessage) throws IOException {
        String targetId = chatMessage.getMessageId();
        if (targetId != null) {
            com.example.messaging.model.ChatMessage target = messages.get(targetId);
            if (target != null) {
                com.example.messaging.model.ChatMessage deleted = messageService.markDeleted(targetId);
                if (deleted != null) {
                    messages.put(deleted.getMessageId(), deleted);
                    broadcastToRoom(deleted.getRoomId(), deleted, null);
                }
            }
        }
    }

    private void broadcastToRoom(String roomId, ChatMessage message, WebSocketSession excludedSession)
            throws IOException {
        if (roomId == null)
            return;
        String payload = objectMapper.writeValueAsString(message);
        TextMessage textMessage = new TextMessage(payload);

        List<String> participants = roomService.getParticipants(roomId);
        for (String pUid : participants) {
            Set<WebSocketSession> pSessions = userSessions.get(pUid);
            if (pSessions != null) {
                for (WebSocketSession session : pSessions) {
                    if (session.isOpen() && session != excludedSession) {
                        session.sendMessage(textMessage);
                    }
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        sessions.remove(session);
        String uid = (String) session.getAttributes().get(UID_ATTRIBUTE);
        if (uid != null) {
            Set<WebSocketSession> active = userSessions.get(uid);
            if (active != null) {
                active.remove(session);
                if (active.isEmpty()) {
                    broadcastUsersList();
                }
            }
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        sessions.remove(session);
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    private String defaultValue(String value, String fallback) {
        return value == null ? fallback : value;
    }

    private void handleUnfriend(WebSocketSession session, String uid, ChatMessage chatMessage) throws IOException {
        String roomId = chatMessage.getRoomId();
        if (roomId == null || roomId.isEmpty()) {
            roomId = chatMessage.getContent(); // fallback: roomId sent as content
        }
        if (roomId == null || roomId.isEmpty()) {
            return;
        }

        // Remove the room/participant
        List<String> affectedUserIds = roomService.leaveRoom(roomId, uid);

        // Notify all affected users with refreshed room lists
        for (String affectedUid : affectedUserIds) {
            Set<WebSocketSession> userSess = userSessions.get(affectedUid);
            if (userSess != null) {
                List<Map<String, Object>> rooms = roomService.getUserRooms(affectedUid);
                String roomsJson = objectMapper.writeValueAsString(rooms);
                ChatMessage roomsMsg = new ChatMessage();
                roomsMsg.setType("rooms_list");
                roomsMsg.setContent(roomsJson);

                // Also send unfriend_ack so the frontend can navigate away
                ChatMessage ackMsg = new ChatMessage();
                ackMsg.setType("unfriend_ack");
                ackMsg.setContent(roomId);

                String roomsPayload = objectMapper.writeValueAsString(roomsMsg);
                String ackPayload = objectMapper.writeValueAsString(ackMsg);

                for (WebSocketSession s : userSess) {
                    if (s.isOpen()) {
                        s.sendMessage(new TextMessage(ackPayload));
                        s.sendMessage(new TextMessage(roomsPayload));
                    }
                }
            }
        }
    }
}
