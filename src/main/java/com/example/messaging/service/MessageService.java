package com.example.messaging.service;

import com.example.messaging.model.ChatMessage;
import com.example.messaging.model.MessageEntity;
import com.example.messaging.repository.MessageRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository repository;
    private final ObjectMapper objectMapper;

    public MessageService(MessageRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ChatMessage save(ChatMessage message) {
        MessageEntity e = toEntity(message);
        if (e.getSentAt() == null) e.setSentAt(Instant.now());
        repository.save(e);
        return toDto(e);
    }

    @Transactional
    public ChatMessage update(ChatMessage message) {
        MessageEntity e = toEntity(message);
        e.setEdited(true);
        e.setEditedAt(Instant.now());
        repository.save(e);
        return toDto(e);
    }

    @Transactional
    public ChatMessage markDeleted(String messageId) {
        MessageEntity e = repository.findById(messageId).orElse(null);
        if (e == null) return null;
        e.setDeleted(true);
        repository.save(e);
        return toDto(e);
    }

    @Transactional
    public void deleteAll() {
        repository.deleteAll();
    }

    public List<ChatMessage> recent(String roomId) {
        return repository.findTop50ByRoomIdOrderBySentAtDesc(roomId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private MessageEntity toEntity(ChatMessage m) {
        MessageEntity e = new MessageEntity();
        e.setId(m.getMessageId());
        e.setType(m.getType());
        e.setSender(m.getSender());
        e.setContent(m.getContent());
        e.setSentAt(m.getSentAt());
        e.setEdited(m.isEdited());
        e.setEditedAt(m.getEditedAt());
        e.setDeleted(m.isDeleted());
        e.setClientId(m.getClientId());
        e.setReplyToId(m.getReplyToId());
        e.setRoomId(m.getRoomId());
        e.setAttachmentUrl(m.getAttachmentUrl());
        e.setAttachmentType(m.getAttachmentType());
        e.setAttachmentName(m.getAttachmentName());
        try {
            Map<String, Integer> reactions = m.getReactions();
            e.setReactionsJson(reactions == null ? null : objectMapper.writeValueAsString(reactions));
            
            Map<String, String> userReactions = m.getUserReactions();
            e.setUserReactionsJson(userReactions == null ? null : objectMapper.writeValueAsString(userReactions));
        } catch (JsonProcessingException ex) {
            e.setReactionsJson(null);
            e.setUserReactionsJson(null);
        }
        return e;
    }

    private ChatMessage toDto(MessageEntity e) {
        ChatMessage m = new ChatMessage();
        m.setMessageId(e.getId());
        m.setType(e.getType());
        m.setSender(e.getSender());
        m.setContent(e.getContent());
        m.setSentAt(e.getSentAt());
        m.setEdited(e.isEdited());
        m.setEditedAt(e.getEditedAt());
        m.setDeleted(e.isDeleted());
        m.setClientId(e.getClientId());
        m.setReplyToId(e.getReplyToId());
        m.setRoomId(e.getRoomId());
        m.setAttachmentUrl(e.getAttachmentUrl());
        m.setAttachmentType(e.getAttachmentType());
        m.setAttachmentName(e.getAttachmentName());
        try {
            String json = e.getReactionsJson();
            if (json != null) {
                Map<String, Integer> reactions = objectMapper.readValue(json, Map.class);
                m.setReactions(reactions);
            }
            
            String userJson = e.getUserReactionsJson();
            if (userJson != null) {
                Map<String, String> userReactions = objectMapper.readValue(userJson, Map.class);
                m.setUserReactions(userReactions);
            }
        } catch (Exception ex) {
            m.setReactions(null);
            m.setUserReactions(new java.util.HashMap<>());
        }
        if (m.getUserReactions() == null) {
            m.setUserReactions(new java.util.HashMap<>());
        }
        if (m.getReactions() == null) {
            m.setReactions(new java.util.HashMap<>());
        }
        return m;
    }
}
