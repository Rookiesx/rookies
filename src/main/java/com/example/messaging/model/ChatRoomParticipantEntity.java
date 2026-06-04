package com.example.messaging.model;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.IdClass;
import javax.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

class ChatRoomParticipantId implements Serializable {
    private String roomId;
    private String userId;

    public ChatRoomParticipantId() {}

    public ChatRoomParticipantId(String roomId, String userId) {
        this.roomId = roomId;
        this.userId = userId;
    }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ChatRoomParticipantId that = (ChatRoomParticipantId) o;
        return Objects.equals(roomId, that.roomId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roomId, userId);
    }
}

@Entity
@Table(name = "chat_room_participants")
@IdClass(ChatRoomParticipantId.class)
public class ChatRoomParticipantEntity {

    @Id
    private String roomId;
    
    @Id
    private String userId;

    public ChatRoomParticipantEntity() {}

    public ChatRoomParticipantEntity(String roomId, String userId) {
        this.roomId = roomId;
        this.userId = userId;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
