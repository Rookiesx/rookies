package com.example.messaging.model;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class ChatMessage {

    private String type;
    private String email; // new email field
    private String sender;
    private String content;
    private String clientId;
    private boolean self = false;
    private boolean replay = false;
    private String messageId;
    private String reaction;
    private Map<String, String> userReactions = new HashMap<>();
    private Map<String, Integer> reactions = new HashMap<>();
    private boolean edited;
    private Instant editedAt;
    private boolean deleted;
    private Instant sentAt;
    private String replyToId;
    private String replyToClientId;
    private String targetClientId;
    private String roomId;
    private String attachmentUrl;
    private String attachmentType;
    private String attachmentName;

    public ChatMessage() {
    }

    public ChatMessage(String type, String sender, String content, Instant sentAt) {
        this.type = type;
        this.sender = sender;
        this.content = content;
        this.sentAt = sentAt;
    }

    public String getMessageId() {
        return messageId;
    }

    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public boolean isSelf() {
        return self;
    }

    public void setSelf(boolean self) {
        this.self = self;
    }


    public String getReaction() {
        return reaction;
    }

    public void setReaction(String reaction) {
        this.reaction = reaction;
    }

    public Map<String, Integer> getReactions() {
        return reactions;
    }

    public void setReactions(Map<String, Integer> reactions) {
        this.reactions = reactions;
    }

    public Map<String, String> getUserReactions() {
        return userReactions;
    }

    public void setUserReactions(Map<String, String> userReactions) {
        this.userReactions = userReactions;
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

    public Instant getSentAt() {
        return sentAt;
    }

    public void setSentAt(Instant sentAt) {
        this.sentAt = sentAt;
    }

    public String getReplyToId() {
        return replyToId;
    }

    public void setReplyToId(String replyToId) {
        this.replyToId = replyToId;
    }

    public String getReplyToClientId() {
        return replyToClientId;
    }

    public void setReplyToClientId(String replyToClientId) {
        this.replyToClientId = replyToClientId;
    }

    public String getTargetClientId() {
        return targetClientId;
    }

    public void setTargetClientId(String targetClientId) {
        this.targetClientId = targetClientId;
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
