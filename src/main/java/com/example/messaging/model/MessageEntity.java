package com.example.messaging.model;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.Table;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import javax.persistence.Index;

@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_room_sent", columnList = "roomId, sentAt DESC")
})
public class MessageEntity {

    @Id
    private String id;

    private String type;

    private String sender;

    @Lob
    @Column(length = 10240)
    private String content;

    private Instant sentAt;

    private boolean edited;

    private Instant editedAt;

    private boolean deleted;

    @Lob
    @Column(length = 4096)
    private String reactionsJson;

    @Lob
    @Column(length = 10240)
    private String userReactionsJson;

    private String clientId;

    private String replyToId;

    private String roomId;

    private String attachmentUrl;

    private String attachmentType;

    private String attachmentName;

    public MessageEntity() {
    }

    // getters and setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }

    public boolean isEdited() {
        return edited;
    }

    public void setEdited(boolean edited) {
        this.edited = edited;
    }

    public Instant getEditedAt() {
        return editedAt;
    }

    public void setEditedAt(Instant editedAt) {
        this.editedAt = editedAt;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }

    public String getReactionsJson() {
        return reactionsJson;
    }

    public void setReactionsJson(String reactionsJson) {
        this.reactionsJson = reactionsJson;
    }

    public String getUserReactionsJson() {
        return userReactionsJson;
    }

    public void setUserReactionsJson(String userReactionsJson) {
        this.userReactionsJson = userReactionsJson;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getReplyToId() {
        return replyToId;
    }

    public void setReplyToId(String replyToId) {
        this.replyToId = replyToId;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getAttachmentUrl() {
        return attachmentUrl;
    }

    public void setAttachmentUrl(String attachmentUrl) {
        this.attachmentUrl = attachmentUrl;
    }

    public String getAttachmentType() {
        return attachmentType;
    }

    public void setAttachmentType(String attachmentType) {
        this.attachmentType = attachmentType;
    }

    public String getAttachmentName() {
        return attachmentName;
    }

    public void setAttachmentName(String attachmentName) {
        this.attachmentName = attachmentName;
    }
}
