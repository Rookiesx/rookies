package com.example.messaging.model;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    private String id; // This will map to the Firebase UID
    
    private String displayName;
    
    private String profilePictureUrl;
    private String email; // new email field
    
    @javax.persistence.Transient
    private boolean online;
    
    public UserEntity() {}

    public UserEntity(String id, String displayName, String profilePictureUrl, String email) {
        this.id = id;
        this.displayName = displayName;
        this.profilePictureUrl = profilePictureUrl;
        this.email = email;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getProfilePictureUrl() {
        return profilePictureUrl;
    }

    public void setProfilePictureUrl(String profilePictureUrl) {
        this.profilePictureUrl = profilePictureUrl;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isOnline() {
        return online;
    }

    public void setOnline(boolean online) {
        this.online = online;
    }

}
