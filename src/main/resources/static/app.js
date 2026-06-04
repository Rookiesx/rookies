(function () {
    const firebaseConfig = {
        apiKey: "AIzaSyARsY2G-k66D-ohBwRcAL_VVUtfLb_Pau0",
        authDomain: "mye-commerce-8a1ed.firebaseapp.com",
        projectId: "mye-commerce-8a1ed",
        storageBucket: "mye-commerce-8a1ed.firebasestorage.app",
        messagingSenderId: "290497631025",
        appId: "1:290497631025:web:a8aef7d94b9607fffc5610",
        measurementId: "G-K2ZQGX6B2B"
    };
    firebase.initializeApp(firebaseConfig);

    // Set persistence to SESSION so that each tab requires its own login
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);

    var socket = null;
    var clientId = localStorage.getItem('clientId') || null; // retrieve persisted ID
    var idToken = null;

    var connectButton = document.getElementById("connectButton");
    var connectionStatus = document.getElementById("connectionStatus");
    var currentUserDisplay = document.getElementById("currentUser");
    var messageForm = document.getElementById("messageForm");
    var messageInput = document.getElementById("messageInput");
    var messages = document.getElementById("messages");
    var actionButton = document.getElementById("actionButton");
    var micIcon = document.getElementById("micIcon");
    var sendIcon = document.getElementById("sendIcon");
    var isSendMode = false;
    var emojiButton = document.getElementById("emojiButton");
    var emojiPicker = document.getElementById("emojiPicker");
    var clearChatButton = document.getElementById('clearChatButton') || document.getElementById('clearChatOption');
    var menuButton = document.getElementById('menuButton');
    var menuDropdown = document.getElementById('menuDropdown');
    var scrollButton = document.getElementById("scrollButton");
    var scrollCount = document.getElementById("scrollCount");
    var authModal = document.getElementById("authModal");
    var senderName = "";
    var authUsername = document.getElementById("authUsername");
    var authNickname = document.getElementById("authNickname");
    var authPassword = document.getElementById("authPassword");
    var authLoginBtn = document.getElementById("authLoginBtn");
    var authRegisterBtn = document.getElementById("authRegisterBtn");
    var authToggleText = document.getElementById("authToggleText");
    var authToggleLink = document.getElementById("authToggleLink");
    var authGoogleBtn = document.getElementById("authGoogleBtn");
    var authError = document.getElementById("authError");
    var confirmModal = document.getElementById("confirmModal");
    var confirmCancelBtn = document.getElementById("confirmCancelBtn");
    var confirmYesBtn = document.getElementById("confirmYesBtn");
    var settingsModal = document.getElementById('settingsModal');
    var closeSettingsBtn = document.getElementById('closeSettingsBtn');
    var settingsOptionHeader = document.getElementById('settingsOptionHeader');
    var settingsOptionSidebar = document.getElementById('settingsOptionSidebar');
    var themeSelectors = document.getElementsByName('themeSelector');

    var userProfileModal = document.getElementById("userProfileModal");
    var closeUserProfileBtn = document.getElementById("closeUserProfileBtn");
    var userProfileAvatarDisplay = document.getElementById("userProfileAvatarDisplay");
    var userProfileNameDisplay = document.getElementById("userProfileNameDisplay");
    var userProfileEmailDisplay = document.getElementById("userProfileEmailDisplay");

    if (closeUserProfileBtn) {
        closeUserProfileBtn.addEventListener("click", function () {
            if (userProfileModal) {
                userProfileModal.classList.add("hidden");
                userProfileModal.setAttribute("aria-hidden", "true");
            }
        });
    }

    function showUserProfile(userId) {
        if (!userProfileModal) return;
        var user = knownUsers.find(function (u) { return u.id === userId; });
        if (!user) return; // Cannot find user

        if (user.profilePictureUrl) {
            userProfileAvatarDisplay.innerHTML = '<img src="' + user.profilePictureUrl + '" style="width: 100%; height: 100%; object-fit: cover;">';
            userProfileAvatarDisplay.style.background = 'transparent';
        } else {
            userProfileAvatarDisplay.innerHTML = '';
            userProfileAvatarDisplay.textContent = getInitials(user.displayName);
            try { userProfileAvatarDisplay.style.background = getColorForName(user.displayName); } catch (e) { }
        }

        if (userProfileNameDisplay) userProfileNameDisplay.textContent = user.displayName;
        if (userProfileEmailDisplay) userProfileEmailDisplay.textContent = user.email || "";

        userProfileModal.classList.remove("hidden");
        userProfileModal.setAttribute("aria-hidden", "false");
    }

    var currentTheme = localStorage.getItem('appTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    for (var i = 0; i < themeSelectors.length; i++) {
        if (themeSelectors[i].value === currentTheme) {
            themeSelectors[i].checked = true;
        }
        themeSelectors[i].addEventListener('change', function (e) {
            currentTheme = e.target.value;
            localStorage.setItem('appTheme', currentTheme);
            document.documentElement.setAttribute('data-theme', currentTheme);
        });
    }

    function openSettings() {
        if (settingsModal) {
            settingsModal.classList.remove('hidden');
            settingsModal.setAttribute('aria-hidden', 'false');
        }
        if (headerDropdown) headerDropdown.style.display = 'none';
        var sidebarMenuDropdown = document.getElementById('sidebarMenuDropdown');
        if (sidebarMenuDropdown) sidebarMenuDropdown.classList.add('hidden');
    }

    if (settingsOptionHeader) settingsOptionHeader.addEventListener('click', openSettings);
    if (settingsOptionSidebar) settingsOptionSidebar.addEventListener('click', openSettings);

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', function () {
            settingsModal.classList.add('hidden');
            settingsModal.setAttribute('aria-hidden', 'true');
        });
    }

    var sidebarPanel = document.getElementById('sidebarPanel');
    var newChatBtn = document.getElementById('newChatBtn');
    var newChatModal = document.getElementById('newChatModal');
    var cancelNewChatBtn = document.getElementById('cancelNewChatBtn');
    var confirmNewChatBtn = document.getElementById('confirmNewChatBtn');
    var userSelectionList = document.getElementById('userSelectionList');
    var roomList = document.getElementById('roomList');
    var chatTypeRadios = document.getElementsByName('chatType');
    var groupNameContainer = document.getElementById('groupNameContainer');
    var newGroupName = document.getElementById('newGroupName');

    var activeReplyToId = null;
    var activeRoomId = null;
    var knownUsers = [];
    var knownRooms = [];
    var isSelectMode = false;
    var selectedRooms = new Set();
    var replyContextBanner = document.getElementById("replyContextBanner");
    var replyToName = document.getElementById("replyToName");
    var replyToText = document.getElementById("replyToText");
    var cancelReplyBtn = document.getElementById("cancelReplyBtn");

    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener("click", cancelReply);
    }

    function cancelReply() {
        activeReplyToId = null;
        if (replyContextBanner) {
            replyContextBanner.classList.add('hidden');
            replyContextBanner.setAttribute('aria-hidden', 'true');
        }
    }

    // Helper to fully reset the message input field when switching rooms
    function clearMessageInput() {
        if (!messageInput) return;
        // Enable the input if it was disabled
        messageInput.disabled = false;
        // Clear any existing value and residual attribute
        messageInput.value = '';
        messageInput.setAttribute('value', '');
        // Reset placeholder and focus for user convenience
        messageInput.placeholder = "Write a message";
        messageInput.focus();
        console.log('clearMessageInput: input cleared');
    }

    function startReply(messageId, name, text) {
        activeReplyToId = messageId;
        if (replyContextBanner && replyToName && replyToText) {
            replyToName.textContent = "Replying to " + name;
            replyToText.textContent = text;
            replyContextBanner.classList.remove('hidden');
            replyContextBanner.setAttribute('aria-hidden', 'false');
        }
        if (messageInput) messageInput.focus();
    }

    function showError(msg) {
        if (!msg) return;
        if (authError) {
            authError.textContent = msg;
            authError.classList.remove('hidden');
        }
    }

    function clearError() {
        if (authError) {
            authError.textContent = "";
            authError.classList.add('hidden');
        }
    }

    if (authUsername) authUsername.addEventListener('input', clearError);
    if (authNickname) authNickname.addEventListener('input', clearError);
    if (authPassword) authPassword.addEventListener('input', clearError);

    var isLoginMode = true;

    function toggleAuthMode(e) {
        if (e) e.preventDefault();
        isLoginMode = !isLoginMode;
        clearError();
        if (isLoginMode) {
            if (authNickname) authNickname.classList.add('hidden');
            if (authLoginBtn) authLoginBtn.classList.remove('hidden');
            if (authRegisterBtn) authRegisterBtn.classList.add('hidden');
            if (authToggleText) authToggleText.textContent = "Don't have an account?";
            if (authToggleLink) authToggleLink.textContent = "Register here";
        } else {
            if (authNickname) authNickname.classList.remove('hidden');
            if (authLoginBtn) authLoginBtn.classList.add('hidden');
            if (authRegisterBtn) authRegisterBtn.classList.remove('hidden');
            if (authToggleText) authToggleText.textContent = "Already have an account?";
            if (authToggleLink) authToggleLink.textContent = "Login here";
        }
    }

    if (authToggleLink) authToggleLink.addEventListener("click", toggleAuthMode);

    function showAuthModal() {
        if (!authModal) return;
        authModal.classList.remove('hidden');
        authModal.setAttribute('aria-hidden', 'false');
        clearError();
        if (authUsername) authUsername.value = "";
        if (authNickname) authNickname.value = "";
        if (authPassword) authPassword.value = "";

        // Always reset to Login mode when opening
        if (!isLoginMode) toggleAuthMode();
    }

    function hideAuthModal() {
        if (!authModal) return;
        authModal.classList.add('hidden');
        authModal.setAttribute('aria-hidden', 'true');
    }

    function updateUserDisplay() {
        if (!currentUserDisplay) return;
        if (senderName) {
            currentUserDisplay.hidden = false;
            currentUserDisplay.textContent = "Connected as " + senderName;
        } else {
            currentUserDisplay.hidden = true;
            currentUserDisplay.textContent = "";
        }
    }

    function getInitials(name) {
        if (!name) return "";
        var parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function getColorForName(name) {
        if (!name) return '#ccc';
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        var h = Math.abs(hash) % 360;
        var h2 = (h + 30) % 360;
        return 'linear-gradient(135deg, hsl(' + h + ', 70%, 65%), hsl(' + h2 + ', 65%, 60%))';
    }

    var isRegistering = false;

    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            if (isRegistering) return; // Wait for registration to complete updating the profile
            clientId = user.uid;
            localStorage.setItem('clientId', clientId);
            senderName = user.displayName || user.phoneNumber || "Anonymous";
            user.getIdToken().then(function (token) {
                idToken = token;
                updateUserDisplay();
                hideAuthModal();
                connect();
            });
        } else {
            clientId = null;
            localStorage.removeItem('clientId');
            senderName = "";
            idToken = null;
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
            showAuthModal();
        }
    });

    // Unified logout: close WebSocket + sign out Firebase
    function doLogout() {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close();
        }
        firebase.auth().signOut();
        if (sidebarMenuDropdown) sidebarMenuDropdown.classList.add('hidden');
        if (menuDropdown) menuDropdown.style.display = 'none';
    }

    // Sidebar Logout button
    var logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', doLogout);
    }

    // Chat header Logout button
    var chatLogoutButton = document.getElementById('chatLogoutButton');
    if (chatLogoutButton) {
        chatLogoutButton.addEventListener('click', doLogout);
    }

    // Sidebar three-dot menu toggle
    var sidebarMenuBtn = document.getElementById('sidebarMenuBtn');
    var sidebarMenuDropdown = document.getElementById('sidebarMenuDropdown');
    if (sidebarMenuBtn && sidebarMenuDropdown) {
        sidebarMenuBtn.addEventListener('click', function (ev) {
            ev.stopPropagation();
            sidebarMenuDropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', function () {
            if (!sidebarMenuDropdown.classList.contains('hidden')) {
                sidebarMenuDropdown.classList.add('hidden');
            }
        });
    }

    function getFakeEmail(username) {
        var safePrefix = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!safePrefix) safePrefix = "user";
        return safePrefix + "@chat.local";
    }

    function getFriendlyErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email': return "Invalid username format. Please use only letters and numbers.";
            case 'auth/user-not-found': return "Username or password are incorrect.";
            case 'auth/wrong-password': return "Username or password are incorrect.";
            case 'auth/invalid-credential': return "Username or password are incorrect.";
            case 'auth/email-already-in-use': return "This username is already taken. Please choose another or click Login.";
            case 'auth/weak-password': return "Password should be at least 6 characters.";
            case 'auth/popup-closed-by-user': return "";
            default:
                var msg = error.message.replace(/email/g, 'username');
                // Strip "Firebase: " and "(auth/...)" from the message
                msg = msg.replace(/^Firebase:\s*/i, '');
                msg = msg.replace(/\s*\(auth\/[^\)]+\)\.?$/, '');
                return msg;
        }
    }

    if (authLoginBtn) {
        authLoginBtn.addEventListener("click", function () {
            var username = authUsername.value.trim();
            var password = authPassword.value;
            if (!username || !password) {
                showError("Please enter both username and password.");
                return;
            }
            clearError();
            firebase.auth().signInWithEmailAndPassword(getFakeEmail(username), password)
                .catch(function (error) {
                    showError(getFriendlyErrorMessage(error));
                });
        });
    }

    if (authRegisterBtn) {
        authRegisterBtn.addEventListener("click", function () {
            var username = authUsername.value.trim();
            var nickname = authNickname ? authNickname.value.trim() : "";
            var password = authPassword.value;
            if (!username || !password || !nickname) {
                showError("Please fill out Username, Display Name, and Password to register.");
                return;
            }
            clearError();
            isRegistering = true;
            firebase.auth().createUserWithEmailAndPassword(getFakeEmail(username), password)
                .then(function (userCredential) {
                    return userCredential.user.updateProfile({
                        displayName: nickname
                    }).then(function () {
                        // Force refresh token so the backend sees the new Display Name
                        return userCredential.user.getIdToken(true);
                    }).then(function (token) {
                        isRegistering = false;
                        clientId = userCredential.user.uid;
                        senderName = userCredential.user.displayName || nickname;
                        idToken = token;
                        updateUserDisplay();
                        hideAuthModal();
                        connect();
                    });
                })
                .catch(function (error) {
                    isRegistering = false;
                    showError(getFriendlyErrorMessage(error));
                });
        });
    }

    if (authGoogleBtn) {
        authGoogleBtn.addEventListener("click", function () {
            clearError();
            var provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            firebase.auth().signInWithPopup(provider)
                .catch(function (error) {
                    showError(getFriendlyErrorMessage(error));
                });
        });
    }

    if (messageInput) {
        messageInput.addEventListener("input", function() {
            var hasText = messageInput.value.trim().length > 0;
            if (hasText !== isSendMode) {
                isSendMode = hasText;
                if (isSendMode) {
                    if (micIcon) micIcon.classList.add('hidden');
                    if (sendIcon) sendIcon.classList.remove('hidden');
                } else {
                    if (sendIcon) sendIcon.classList.add('hidden');
                    if (micIcon) micIcon.classList.remove('hidden');
                }
            }
        });
    }

    messageForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (isSendMode) {
            sendMessage();
        }
    });

    if (menuButton && menuDropdown) {
        menuButton.addEventListener('click', function (ev) {
            ev.stopPropagation();
            menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', function () {
            if (menuDropdown.style.display !== 'none') {
                menuDropdown.style.display = 'none';
            }
        });
    }

    if (clearChatButton) {
        clearChatButton.addEventListener('click', function () {
            if (confirmModal) {
                confirmModal.classList.remove('hidden');
                confirmModal.setAttribute('aria-hidden', 'false');
            } else if (confirm("Are you sure you want to clear the chat on this device?")) {
                localStorage.setItem('chatClearedAt_' + clientId + '_' + activeRoomId, Date.now());
                if (messages) {
                    messages.innerHTML = '';
                }
                var roomObj = knownRooms.find(function (r) { return r.id === activeRoomId; });
                if (roomObj) {
                    roomObj.latestMessage = '';
                    renderRoomList();
                }
            }
        });
    }

    var selectChatsBtn = document.getElementById('selectChatsBtn');
    var selectModeHeader = document.getElementById('selectModeHeader');
    var cancelSelectModeBtn = document.getElementById('cancelSelectModeBtn');
    var selectModeTitle = document.getElementById('selectModeTitle');
    var clearSelectedChatsBtn = document.getElementById('clearSelectedChatsBtn');
    var defaultSidebarHeader = document.querySelector('.sidebar-panel > .sidebar-header:not(#selectModeHeader)');

    function updateSelectModeHeader() {
        if (!selectModeTitle || !clearSelectedChatsBtn) return;
        selectModeTitle.textContent = selectedRooms.size + ' selected';
        clearSelectedChatsBtn.disabled = selectedRooms.size === 0;
    }

    if (selectChatsBtn) {
        selectChatsBtn.addEventListener('click', function () {
            isSelectMode = true;
            selectedRooms.clear();
            if (defaultSidebarHeader) defaultSidebarHeader.style.display = 'none';
            if (selectModeHeader) {
                selectModeHeader.classList.remove('hidden');
                selectModeHeader.style.display = 'flex';
            }
            updateSelectModeHeader();
            renderRoomList();
        });
    }

    if (cancelSelectModeBtn) {
        cancelSelectModeBtn.addEventListener('click', function () {
            isSelectMode = false;
            selectedRooms.clear();
            if (defaultSidebarHeader) defaultSidebarHeader.style.display = 'flex';
            if (selectModeHeader) {
                selectModeHeader.classList.add('hidden');
                selectModeHeader.style.display = 'none';
            }
            renderRoomList();
        });
    }

    if (clearSelectedChatsBtn) {
        clearSelectedChatsBtn.addEventListener('click', function () {
            if (selectedRooms.size === 0) return;
            if (!confirm('Clear ' + selectedRooms.size + ' selected chat(s)?')) return;

            selectedRooms.forEach(function (rId) {
                localStorage.setItem('chatClearedAt_' + clientId + '_' + rId, Date.now());
                var rObj = knownRooms.find(function (r) { return r.id === rId; });
                if (rObj) rObj.latestMessage = '';

                if (rId === activeRoomId && messages) {
                    messages.innerHTML = '';
                }
            });

            isSelectMode = false;
            selectedRooms.clear();
            if (defaultSidebarHeader) defaultSidebarHeader.style.display = 'flex';
            if (selectModeHeader) {
                selectModeHeader.classList.add('hidden');
                selectModeHeader.style.display = 'none';
            }
            renderRoomList();
        });
    }

    var unfriendButton = document.getElementById('unfriendButton');
    if (unfriendButton) {
        unfriendButton.addEventListener('click', function () {
            if (!activeRoomId) return;
            var room = knownRooms.find(function (r) { return r.id === activeRoomId; });
            var isGroup = room && room.type === 'GROUP';
            var msg = isGroup
                ? 'Are you sure you want to leave this group?'
                : 'Are you sure you want to unfriend? This will remove the chat for both users.';
            if (!confirm(msg)) return;
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'unfriend',
                    roomId: activeRoomId
                }));
            }
            if (menuDropdown) menuDropdown.style.display = 'none';
        });
    }

    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', function () {
            confirmModal.classList.add('hidden');
            confirmModal.setAttribute('aria-hidden', 'true');
        });
    }

    if (confirmYesBtn) {
        confirmYesBtn.addEventListener('click', function () {
            localStorage.setItem('chatClearedAt_' + clientId + '_' + activeRoomId, Date.now());
            if (messages) {
                messages.innerHTML = '';
            }
            var roomObj = knownRooms.find(function (r) { return r.id === activeRoomId; });
            if (roomObj) {
                roomObj.latestMessage = '';
                renderRoomList();
            }
            confirmModal.classList.add('hidden');
            confirmModal.setAttribute('aria-hidden', 'true');
        });
    }

    if (newChatBtn) {
        newChatBtn.addEventListener('click', function () {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'fetch_users' }));
            }
            newChatModal.classList.remove('hidden');
            newChatModal.setAttribute('aria-hidden', 'false');
            renderUserSelection();
        });
    }

    if (cancelNewChatBtn) {
        cancelNewChatBtn.addEventListener('click', function () {
            newChatModal.classList.add('hidden');
            newChatModal.setAttribute('aria-hidden', 'true');
        });
    }

    if (chatTypeRadios) {
        chatTypeRadios.forEach(function (r) {
            r.addEventListener('change', function () {
                groupNameContainer.style.display = r.value === 'GROUP' ? 'block' : 'none';
                renderUserSelection();
            });
        });
    }

    if (confirmNewChatBtn) {
        // Update button text to reflect new behavior
        confirmNewChatBtn.textContent = "Send Request";

        confirmNewChatBtn.addEventListener('click', function () {
            var chatTypeElement = document.querySelector('input[name="chatType"]:checked');
            if (!chatTypeElement) return;
            var isGroup = chatTypeElement.value === 'GROUP';
            var selectedUsers = [];
            document.querySelectorAll('input[name="selectedUsers"]:checked').forEach(function (cb) {
                selectedUsers.push(cb.value);
            });

            if (selectedUsers.length === 0) {
                alert("Please select at least one user to send a request to.");
                return;
            }

            if (isGroup && !newGroupName.value.trim()) {
                alert("Please enter a group name.");
                return;
            }

            var payload = {
                type: 'send_request',
                content: JSON.stringify({
                    type: isGroup ? 'GROUP' : 'INDIVIDUAL',
                    userId: !isGroup ? selectedUsers[0] : null,
                    userIds: isGroup ? selectedUsers : null,
                    name: isGroup ? newGroupName.value.trim() : null
                })
            };

            socket.send(JSON.stringify(payload));
            newChatModal.classList.add('hidden');
            newChatModal.setAttribute('aria-hidden', 'true');
        });
    }

    function renderUserSelection() {
        if (!userSelectionList) return;
        userSelectionList.innerHTML = '';
        var chatTypeElement = document.querySelector('input[name="chatType"]:checked');
        if (!chatTypeElement) return;
        var isGroup = chatTypeElement.value === 'GROUP';
        var inputType = isGroup ? 'checkbox' : 'radio';

        var otherUsers = knownUsers.filter(function (u) { return u.id !== clientId; });

        if (otherUsers.length === 0) {
            userSelectionList.innerHTML = '<div class="empty-users-msg">No other users found.<br><br><small>Open a new browser tab or device and register another user to start chatting.</small></div>';
            return;
        }

        otherUsers.forEach(function (u) {
            var lbl = document.createElement('label');
            lbl.style.display = 'flex';
            lbl.style.alignItems = 'center';
            lbl.style.padding = '12px 16px';
            lbl.style.cursor = 'pointer';
            lbl.style.borderBottom = '1px solid var(--border-color)';
            lbl.style.transition = 'background 0.2s';
            lbl.onmouseover = function () { lbl.style.background = 'rgba(255, 255, 255, 0.05)'; };
            lbl.onmouseout = function () { lbl.style.background = 'transparent'; };

            var initial = getInitials(u.displayName);
            var bg = getColorForName(u.displayName);
            var onlineHtml = u.online ? '<div class="online-indicator"></div>' : '';
            var avatarHtml = u.profilePictureUrl
                ? '<div class="avatar-container" style="margin-right: 12px;"><div class="room-avatar" style="width: 40px; height: 40px; border-radius: 50%; overflow: hidden;"><img src="' + u.profilePictureUrl + '" style="width: 100%; height: 100%; object-fit: cover;"></div>' + onlineHtml + '</div>'
                : '<div class="avatar-container" style="margin-right: 12px;"><div class="room-avatar" style="width: 40px; height: 40px; font-size: 1rem; background: ' + bg + '; color: white; display: flex; align-items: center; justify-content: center; border-radius: 50%;">' + initial + '</div>' + onlineHtml + '</div>';

            lbl.innerHTML = `
                <input type="${inputType}" name="selectedUsers" value="${u.id}" style="margin-right: 16px; transform: scale(1.2);">
                ${avatarHtml}
                <div style="font-weight: 600; color: var(--text-primary);">${u.displayName}</div>
            `;
            userSelectionList.appendChild(lbl);
        });
    }

    function renderRoomList() {
        if (!roomList) return;
        roomList.innerHTML = '';
        knownRooms.forEach(function (r) {
            var div = document.createElement('div');
            div.className = 'room-item';
            if (r.id === activeRoomId) div.classList.add('active');
            div.dataset.roomId = r.id;

            var roomName = r.name || 'Chat';
            var initial = getInitials(roomName);
            var bg = getColorForName(roomName);
            var otherUser = knownUsers.find(function (u) { return u.displayName === roomName; });
            var onlineHtml = (otherUser && otherUser.online) ? '<div class="online-indicator"></div>' : '';
            var avatarHtml = (otherUser && otherUser.profilePictureUrl)
                ? '<div class="avatar-container"><div class="room-avatar" style="background: transparent; overflow: hidden;"><img src="' + otherUser.profilePictureUrl + '" style="width: 100%; height: 100%; object-fit: cover;"/></div>' + onlineHtml + '</div>'
                : '<div class="avatar-container"><div class="room-avatar" style="background: ' + bg + ';">' + initial + '</div>' + onlineHtml + '</div>';

            // Determine latest message preview (assumes server provides r.latestMessage)
            var preview = r.latestMessage ? getMessageSnippet(r.latestMessage) : '';

            var unreadCount = window.unreadCounts && window.unreadCounts[r.id] ? window.unreadCounts[r.id] : 0;
            var unreadBadgeHtml = unreadCount > 0 ? '<div class="unread-badge">' + unreadCount + '</div>' : '';
            var fontWeight = unreadCount > 0 ? '700' : '500';
            var previewColor = unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)';
            var previewWeight = unreadCount > 0 ? '600' : 'normal';

            var checkboxHtml = '';
            if (isSelectMode) {
                var isSelected = selectedRooms.has(r.id);
                var checkboxClass = isSelected ? 'chat-checkbox selected' : 'chat-checkbox';
                checkboxHtml = '<div class="' + checkboxClass + '"></div>';
            }

            div.innerHTML = `
            ${checkboxHtml}
            ${avatarHtml}
            <div class="room-info" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div class="room-name" style="font-weight: ${fontWeight};">${r.name}</div>
                    ${unreadBadgeHtml}
                </div>
                <div class="room-preview" style="color: ${previewColor}; font-weight: ${previewWeight}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${preview}</div>
            </div>
        `;

            div.addEventListener('click', function () {
                if (isSelectMode) {
                    if (selectedRooms.has(r.id)) {
                        selectedRooms.delete(r.id);
                    } else {
                        selectedRooms.add(r.id);
                    }
                    updateSelectModeHeader();
                    renderRoomList();
                } else {
                    joinRoom(r.id);
                }
            });
            roomList.appendChild(div);
        });
    }

    var pendingRequests = [];

    function renderRequests() {
        var requestsContainer = document.getElementById('requestsContainer');
        var requestList = document.getElementById('requestList');
        if (!requestsContainer || !requestList) return;

        if (pendingRequests.length === 0) {
            requestsContainer.style.display = 'none';
            return;
        }

        requestsContainer.style.display = 'block';
        requestList.innerHTML = '';

        pendingRequests.forEach(function (req) {
            var item = document.createElement('div');
            item.className = 'request-item';

            var text = req.type === 'GROUP_INVITE'
                ? `<b>${req.senderName}</b> invited you to a group.`
                : `<b>${req.senderName}</b> wants to chat with you.`;

            var info = document.createElement('div');
            info.className = 'request-info';
            info.innerHTML = text;

            var actions = document.createElement('div');
            actions.className = 'request-actions';

            var acceptBtn = document.createElement('button');
            acceptBtn.className = 'btn-accept';
            acceptBtn.innerHTML = '✅ Accept';
            acceptBtn.onclick = function () { respondToRequest(req.id, true); };

            var declineBtn = document.createElement('button');
            declineBtn.className = 'btn-decline';
            declineBtn.innerHTML = '❌ Decline';
            declineBtn.onclick = function () { respondToRequest(req.id, false); };

            actions.appendChild(acceptBtn);
            actions.appendChild(declineBtn);

            item.appendChild(info);
            item.appendChild(actions);
            requestList.appendChild(item);
        });
    }

    function respondToRequest(requestId, accept) {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'respond_request',
                content: JSON.stringify({ requestId: requestId, accept: accept })
            }));
        }
    }

    var backToSidebarBtn = document.getElementById('backToSidebarBtn');
    if (backToSidebarBtn) {
        backToSidebarBtn.addEventListener('click', function () {
            document.body.classList.remove('chat-active');
            activeRoomId = null;
            backToSidebarBtn.classList.add('hidden');
            var chatHeaderTitle = document.getElementById('chatHeaderTitle');
            if (chatHeaderTitle) chatHeaderTitle.textContent = "Rookies";
            var chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
            if (chatHeaderAvatar) chatHeaderAvatar.classList.add('hidden');
        });
    }

    function joinRoom(roomId) {
        var room = knownRooms.find(function (r) { return r.id === roomId; });
        var chatHeaderTitle = document.getElementById('chatHeaderTitle');
        var chatHeaderAvatar = document.getElementById('chatHeaderAvatar');

        if (room) {
            if (chatHeaderTitle) chatHeaderTitle.textContent = room.name;
            var otherUserForHeader = knownUsers.find(function (u) { return u.displayName === room.name; });
            if (chatHeaderAvatar) {
                var otherUser = knownUsers.find(function (u) { return u.displayName === room.name; });
                var onlineHtml = (otherUser && otherUser.online && room.type !== 'GROUP') ? '<div class="online-indicator" style="bottom: 0; right: 0;"></div>' : '';
                if (otherUser && otherUser.profilePictureUrl) {
                    chatHeaderAvatar.innerHTML = '<div class="avatar-container" style="width: 100%; height: 100%;"><img src="' + otherUser.profilePictureUrl + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">' + onlineHtml + '</div>';
                    chatHeaderAvatar.style.backgroundColor = 'transparent';
                } else {
                    chatHeaderAvatar.innerHTML = '<div class="avatar-container" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">' + room.name.charAt(0).toUpperCase() + onlineHtml + '</div>';
                    try {
                        chatHeaderAvatar.style.backgroundColor = getColorForName(room.name);
                    } catch (e) { }
                }
                chatHeaderAvatar.classList.remove('hidden');
            }

            // Update unfriend/leave button label based on room type
            var unfriendBtn = document.getElementById('unfriendButton');
            if (unfriendBtn) {
                unfriendBtn.textContent = room.type === 'GROUP' ? 'Leave Group' : 'Unfriend';
            }
            if (otherUserForHeader && room.type !== 'GROUP') {
                if (chatHeaderTitle) {
                    chatHeaderTitle.style.cursor = 'pointer';
                    chatHeaderTitle.onclick = function () { showUserProfile(otherUserForHeader.id); };
                }
                if (chatHeaderAvatar) {
                    chatHeaderAvatar.style.cursor = 'pointer';
                    chatHeaderAvatar.onclick = function () { showUserProfile(otherUserForHeader.id); };
                }
            } else {
                if (chatHeaderTitle) {
                    chatHeaderTitle.style.cursor = 'default';
                    chatHeaderTitle.onclick = null;
                }
                if (chatHeaderAvatar) {
                    chatHeaderAvatar.style.cursor = 'default';
                    chatHeaderAvatar.onclick = null;
                }
            }
        }

        activeRoomId = roomId;
        if (!window.unreadCounts) window.unreadCounts = {};
        window.unreadCounts[roomId] = 0;
        renderRoomList();
        messages.innerHTML = '';
        cancelReply();

        // Switch to chat view
        document.body.classList.add('chat-active');
        if (backToSidebarBtn) {
            backToSidebarBtn.classList.remove('hidden');
        }

        var chatEmptyState = document.getElementById('chatEmptyState');
        var chatInterface = document.getElementById('chatInterface');
        if (chatEmptyState) chatEmptyState.classList.add('hidden');
        if (chatInterface) chatInterface.classList.remove('hidden');

        var callButton = document.getElementById('callButton');
        if (callButton) callButton.classList.remove('hidden');

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'join_room', roomId: roomId }));
            // Reset the message input using the helper to guarantee a clean state
            clearMessageInput();
        }

        // Ensure emoji picker is hidden and reset when switching rooms
        if (emojiPicker) {
            emojiPicker.setAttribute('hidden', '');
            emojiPicker.setAttribute('aria-hidden', 'true');
        }
        if (actionButton) actionButton.disabled = false;
    }

    function connect() {
        if (messages) {
            messages.innerHTML = '';
        }
        unreadCount = 0;
        if (scrollCount) {
            scrollCount.hidden = true;
        }
        if (scrollButton) {
            scrollButton.hidden = true;
        }

        var protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        socket = new WebSocket(protocol + "//" + window.location.host + "/chat");

        setConnected(false, "Connecting...");

        socket.onopen = function () {
            // Register first so the backend authenticates us
            var registerPayload = {
                type: "register",
                sender: senderName,
                content: idToken,
                clientId: clientId
            };
            socket.send(JSON.stringify(registerPayload));
            // Then update UI and fetch data
            setConnected(true, "Connected");
            if (messageInput) messageInput.focus();
        };

        socket.onmessage = function (event) {
            try {
                var message = JSON.parse(event.data);
                console.log('Socket message received:', message);

                if (message.type === 'users_list') {
                    knownUsers = JSON.parse(message.content);
                    renderUserSelection();
                    return;
                }

                if (message.type === 'update_profile') {
                    var userIdx = knownUsers.findIndex(function (u) { return u.id === message.clientId; });
                    if (userIdx >= 0) {
                        knownUsers[userIdx].displayName = message.sender;
                        knownUsers[userIdx].profilePictureUrl = message.content;
                    }

                    if (typeof renderUserSelection === 'function') renderUserSelection();
                    if (typeof renderRoomList === 'function') renderRoomList();

                    if (activeRoomId && activeRoomId !== 'global' && !activeRoomId.startsWith('group_')) {
                        var otherUserId = activeRoomId.replace(clientId, '').replace('_', '');
                        if (otherUserId === message.clientId) {
                            var chatHeaderTitle = document.getElementById('chatHeaderTitle');
                            if (chatHeaderTitle) chatHeaderTitle.textContent = message.sender;
                            var chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
                            if (chatHeaderAvatar) {
                                if (message.content) {
                                    chatHeaderAvatar.innerHTML = '<img src="' + message.content + '" style="width: 100%; height: 100%; object-fit: cover;">';
                                } else {
                                    chatHeaderAvatar.innerHTML = '';
                                    chatHeaderAvatar.textContent = getInitials(message.sender);
                                    try { chatHeaderAvatar.style.background = getColorForName(message.sender); } catch (e) { }
                                }
                            }
                        }
                    }

                    var chatMsgs = document.querySelectorAll('.message[data-sender-id="' + message.clientId + '"]');
                    chatMsgs.forEach(function (msgEl) {
                        var nameEl = msgEl.querySelector('.message-meta strong');
                        if (nameEl) nameEl.textContent = message.sender;

                        var avatarEl = msgEl.querySelector('.avatar');
                        if (avatarEl) {
                            if (message.content) {
                                avatarEl.innerHTML = '<img src="' + message.content + '" style="width: 100%; height: 100%; object-fit: cover;">';
                                avatarEl.style.background = 'transparent';
                            } else {
                                avatarEl.innerHTML = '';
                                avatarEl.textContent = getInitials(message.sender);
                                try { avatarEl.style.background = getColorForName(message.sender); } catch (e) { }
                            }
                        }
                    });
                    return;
                }

                if (message.type === 'rooms_list') {
                    // Initialize rooms with preview and timestamp fields
                    knownRooms = JSON.parse(message.content).map(function (r) {
                        var msgTime = r.latestMessageTimestamp ? new Date(r.latestMessageTimestamp).getTime() : 0;
                        var clearedAt = parseInt(localStorage.getItem('chatClearedAt_' + clientId + '_' + r.id) || '0', 10);

                        if (msgTime > 0 && msgTime <= clearedAt) {
                            r.latestMessage = '';
                        } else {
                            r.latestMessage = r.latestMessage || '';
                        }
                        r.lastUpdated = msgTime;
                        return r;
                    });
                    // Sort rooms so most recent appears first
                    knownRooms.sort(function (a, b) { return b.lastUpdated - a.lastUpdated; });
                    renderRoomList();
                    return;
                }
                if (message.type === 'room_created') {
                    joinRoom(message.content);
                    return;
                }

                // WebRTC Signaling
                var webrtcTypes = ['webrtc_request_call', 'webrtc_ringing', 'webrtc_accept', 'webrtc_decline', 'webrtc_end', 'webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate'];
                if (webrtcTypes.includes(message.type)) {
                    if (message.clientId === clientId) return; // ignore our own
                    if (message.targetClientId && message.targetClientId !== clientId) return; // intended for someone else

                    if (message.type === 'webrtc_request_call' && typeof handleWebRTCRequestCall === 'function') handleWebRTCRequestCall(message);
                    if (message.type === 'webrtc_ringing' && typeof handleWebRTCRinging === 'function') handleWebRTCRinging(message);
                    if (message.type === 'webrtc_accept' && typeof handleWebRTCAccept === 'function') handleWebRTCAccept(message);
                    if (message.type === 'webrtc_decline' && typeof handleWebRTCDecline === 'function') handleWebRTCDecline(message);
                    if (message.type === 'webrtc_end' && typeof handleWebRTCEnd === 'function') handleWebRTCEnd(message);
                    if (message.type === 'webrtc_offer' && typeof handleWebRTCOffer === 'function') handleWebRTCOffer(message);
                    if (message.type === 'webrtc_answer' && typeof handleWebRTCAnswer === 'function') handleWebRTCAnswer(message);
                    if (message.type === 'webrtc_ice_candidate' && typeof handleWebRTCIceCandidate === 'function') handleWebRTCIceCandidate(message);
                    return;
                }

                if (message.type === 'unfriend_ack') {
                    var removedRoomId = message.content;
                    // If we're currently viewing the unfriended room, go back to sidebar
                    if (activeRoomId === removedRoomId) {
                        activeRoomId = null;
                        document.body.classList.remove('chat-active');
                        var backToSidebarBtn = document.getElementById('backToSidebarBtn');
                        if (backToSidebarBtn) backToSidebarBtn.classList.add('hidden');
                        var chatHeaderTitle = document.getElementById('chatHeaderTitle');
                        if (chatHeaderTitle) chatHeaderTitle.textContent = 'Rookies';
                        var chatHeaderAvatar = document.getElementById('chatHeaderAvatar');
                        if (chatHeaderAvatar) chatHeaderAvatar.classList.add('hidden');
                        if (messages) messages.innerHTML = '';
                        var chatInterface = document.getElementById('chatInterface');
                        if (chatInterface) chatInterface.classList.add('hidden');
                        var chatEmptyState = document.getElementById('chatEmptyState');
                        if (chatEmptyState) chatEmptyState.style.display = 'flex';
                    }
                    return;
                }

                if (message.type === 'requests_list') {
                    pendingRequests = JSON.parse(message.content);
                    renderRequests();
                    return;
                }
                if (message.type === 'request_sent') {
                    alert(message.content);
                    return;
                }

                // If the message belongs to a room that is not currently active, update its preview and move the room to the top
                if (message.roomId && message.roomId !== activeRoomId && message.type === 'chat') {
                    var roomObj = knownRooms.find(function (r) { return r.id === message.roomId; });
                    if (roomObj) {
                        roomObj.latestMessage = message.content || (message.attachmentType === 'image' ? '📷 Image' : (message.attachmentType === 'video' ? '🎥 Video' : (message.attachmentType === 'audio' ? '🎤 Audio' : (message.attachmentUrl ? '📎 Attachment' : ''))));
                        roomObj.lastUpdated = Date.now();
                        if (message.clientId !== clientId) {
                            if (!window.unreadCounts) window.unreadCounts = {};
                            window.unreadCounts[message.roomId] = (window.unreadCounts[message.roomId] || 0) + 1;
                        }
                        // Re-sort rooms by lastUpdated descending
                        knownRooms.sort(function (a, b) { return b.lastUpdated - a.lastUpdated; });
                        renderRoomList();
                    }

                    if (message.replyToClientId === clientId && message.clientId !== clientId) {
                        var roomNameStr = roomObj ? roomObj.name : "Chat";
                        showNotification(message.sender + ' replied to your message in ' + roomNameStr, function () {
                            joinRoom(message.roomId);
                        });
                    }
                    return; // Prevent rendering in active room DOM
                }
                // For messages not relevant to the UI (system, lists, etc.) we can ignore
                if (message.roomId && message.roomId !== activeRoomId && message.type !== 'chat') {
                    return; // Ignore other non-chat messages for inactive rooms
                }

                if (message.type === 'chat' && message.replyToClientId === clientId && message.clientId !== clientId) {
                    var actRoom = knownRooms.find(function (r) { return r.id === activeRoomId; });
                    var actRoomName = actRoom ? actRoom.name : "Chat";
                    showNotification(message.sender + ' replied to your message in ' + actRoomName, null);
                }

                if (message.type === 'chat' && message.roomId === activeRoomId) {
                    updateRoomPreview(activeRoomId, message.content || (message.attachmentType === 'image' ? '📷 Image' : (message.attachmentType === 'video' ? '🎥 Video' : (message.attachmentType === 'audio' ? '🎤 Audio' : (message.attachmentUrl ? '📎 Attachment' : '')))));
                }

                renderMessage(message);
            } catch (e) {
                console.error(e);
            }
        };

        socket.onclose = function () {
            setConnected(false, "Disconnected");
        };

        socket.onerror = function () {
            setConnected(false, "Connection error");
        };
    }

    function makeMessageId() {
        return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    }

    // Helper to get a short snippet of a message for preview purposes
    function getMessageSnippet(msg) {
        if (!msg) return '';
        const max = 40; // characters
        return msg.length > max ? msg.substring(0, max) + '…' : msg;
    }

    function updateRoomPreview(roomId, content) {
        var room = knownRooms.find(function (r) { return r.id === roomId; });
        if (room) {
            room.latestMessage = content;
            room.lastUpdated = Date.now();
            knownRooms.sort(function (a, b) { return b.lastUpdated - a.lastUpdated; });
            renderRoomList();
        }
    }

    function sendMessage() {
        var content = messageInput.value.trim();
        if (!socket || socket.readyState !== WebSocket.OPEN || !content) {
            return;
        }

        var message = {
            type: "chat",
            sender: senderName || "Anonymous",
            content: content,
            clientId: clientId,
            messageId: makeMessageId(),
            replyToId: activeReplyToId,
            roomId: activeRoomId
        };

        socket.send(JSON.stringify(message));
        updateRoomPreview(activeRoomId, content);
        messageInput.value = "";
        messageInput.dispatchEvent(new Event("input"));
        cancelReply();

        var emojiPicker = document.getElementById("emojiPicker");
        if (emojiPicker) {
            emojiPicker.setAttribute('hidden', '');
            emojiPicker.setAttribute('aria-hidden', 'true');
        }
    }

    var attachmentButton = document.getElementById("attachmentButton");
    var fileInput = document.getElementById("fileInput");

    if (attachmentButton && fileInput) {
        attachmentButton.addEventListener('click', function () {
            fileInput.click();
        });

        fileInput.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;

            if (file.size > 50 * 1024 * 1024) {
                alert("File is too large (max 50MB).");
                return;
            }

            var formData = new FormData();
            formData.append("file", file);

            var originalHtml = attachmentButton.innerHTML;
            attachmentButton.innerHTML = "⌛";
            attachmentButton.disabled = true;

            fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
                .then(function (response) {
                    if (!response.ok) throw new Error("Upload failed");
                    return response.json();
                })
                .then(function (data) {
                    if (!socket || socket.readyState !== WebSocket.OPEN) return;

                    var attachmentType = 'document';
                    if (file.type.startsWith('image/')) attachmentType = 'image';
                    else if (file.type.startsWith('video/')) attachmentType = 'video';

                    var message = {
                        type: "chat",
                        sender: senderName || "Anonymous",
                        content: messageInput.value.trim(),
                        clientId: clientId,
                        messageId: makeMessageId(),
                        replyToId: activeReplyToId,
                        roomId: activeRoomId,
                        attachmentUrl: data.fileDownloadUri,
                        attachmentType: attachmentType,
                        attachmentName: data.fileName
                    };

                    socket.send(JSON.stringify(message));
                    updateRoomPreview(activeRoomId, message.content || (attachmentType === 'image' ? '📷 Image' : (attachmentType === 'video' ? '🎥 Video' : (attachmentType === 'audio' ? '🎤 Audio' : '📎 Attachment'))));
                    messageInput.value = "";
                    cancelReply();
                })
                .catch(function (err) {
                    alert("Could not upload file: " + err.message);
                })
                .finally(function () {
                    attachmentButton.innerHTML = originalHtml;
                    attachmentButton.disabled = false;
                    fileInput.value = "";
                });
        });
    }

    var mediaRecorder = null;
    var audioChunks = [];
    var isRecording = false;
    var recordingInterval = null;
    var recordingIndicator = document.getElementById("recordingIndicator");
    var recordingTime = document.getElementById("recordingTime");

    if (actionButton) {
        actionButton.addEventListener("click", function () {
            if (!activeRoomId) return;

            if (isSendMode) {
                sendMessage();
                return;
            }

            if (isRecording) {
                if (mediaRecorder && mediaRecorder.state !== "inactive") {
                    mediaRecorder.stop();
                }
                isRecording = false;
                actionButton.classList.remove('recording');
                
                if (recordingInterval) clearInterval(recordingInterval);
                if (recordingIndicator) recordingIndicator.classList.add('hidden');
                if (messageInput) messageInput.classList.remove('hidden');
            } else {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(function (stream) {
                        mediaRecorder = new MediaRecorder(stream);
                        mediaRecorder.start();
                        isRecording = true;
                        actionButton.classList.add('recording');
                        audioChunks = [];

                        if (recordingIndicator && messageInput && recordingTime) {
                            messageInput.classList.add('hidden');
                            recordingIndicator.classList.remove('hidden');
                            var seconds = 0;
                            recordingTime.textContent = "0:00";
                            recordingInterval = setInterval(function() {
                                seconds++;
                                var m = Math.floor(seconds / 60);
                                var s = seconds % 60;
                                recordingTime.textContent = m + ":" + (s < 10 ? "0" : "") + s;
                            }, 1000);
                        }

                        mediaRecorder.addEventListener("dataavailable", function (event) {
                            audioChunks.push(event.data);
                        });

                        mediaRecorder.addEventListener("stop", function () {
                            var audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                            var formData = new FormData();
                            var fileName = "audio_" + Date.now() + ".webm";
                            formData.append("file", audioBlob, fileName);

                            actionButton.disabled = true;

                            fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                            })
                            .then(function (response) {
                                if (!response.ok) throw new Error("Upload failed");
                                return response.json();
                            })
                            .then(function (data) {
                                if (!socket || socket.readyState !== WebSocket.OPEN) return;
                                var message = {
                                    type: 'chat',
                                    roomId: activeRoomId,
                                    clientId: clientId,
                                    sender: senderName,
                                    content: "",
                                    attachmentUrl: data.fileDownloadUri,
                                    attachmentType: 'audio',
                                    attachmentName: data.fileName
                                };

                                socket.send(JSON.stringify(message));
                                updateRoomPreview(activeRoomId, '🎤 Audio');
                            })
                            .catch(function (err) {
                                alert("Could not upload audio: " + err.message);
                            })
                            .finally(function () {
                                actionButton.disabled = false;
                                stream.getTracks().forEach(function(track) { track.stop(); });
                            });
                        });
                    })
                    .catch(function (err) {
                        alert("Could not access microphone: " + err.message);
                    });
            }
        });
    }

    function showNotification(text, onClick) {
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }
        if (Notification.permission === "granted") {
            var n = new Notification("New Reply", { body: text });
            if (onClick) {
                n.onclick = function () { window.focus(); onClick(); n.close(); };
            }
        }

        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = '<strong>Reply:</strong> ' + text;
        if (onClick) {
            toast.onclick = onClick;
        }
        container.appendChild(toast);

        requestAnimationFrame(function () {
            toast.classList.add('show');
        });

        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 300);
        }, 5000);
    }

    function updateScrollButton() {
        if (!messages || !scrollButton) {
            return;
        }
        var bottomDistance = messages.scrollHeight - messages.clientHeight - messages.scrollTop;
        var atBottom = bottomDistance <= 40;
        if (atBottom) {
            scrollButton.hidden = true;
            unreadCount = 0;
            if (scrollCount) {
                scrollCount.hidden = true;
            }
        } else {
            scrollButton.hidden = false;
            if (scrollCount) {
                scrollCount.hidden = unreadCount === 0;
                scrollCount.textContent = unreadCount > 0 ? unreadCount : "";
            }
        }
    }

    function scrollToBottom() {
        if (!messages) {
            return;
        }
        messages.scrollTop = messages.scrollHeight;
        unreadCount = 0;
        if (scrollCount) {
            scrollCount.hidden = true;
        }
        if (scrollButton) {
            scrollButton.hidden = true;
        }
    }

    if (messages) {
        messages.addEventListener('scroll', function () {
            updateScrollButton();
        });
    }

    if (scrollButton) {
        scrollButton.addEventListener('click', function () {
            scrollToBottom();
        });
    }

    function parseEmojis(element) {
        if (window.twemoji) {
            window.twemoji.parse(element, {
                callback: function (icon, options, variant) {
                    return 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/' + icon + '.svg';
                }
            });
        }
    }

    function renderMessage(message) {
        var chatClearedAt = parseInt(localStorage.getItem('chatClearedAt_' + clientId + '_' + activeRoomId) || '0', 10);
        if (message.sentAt) {
            var msgTime = new Date(message.sentAt).getTime();
            if (msgTime <= chatClearedAt) {
                return;
            }
        }

        var deletedIds = JSON.parse(localStorage.getItem('deletedForMe_' + clientId) || '[]');
        if (message.messageId && deletedIds.indexOf(message.messageId) !== -1) {
            var existing = document.querySelector('.message[data-message-id="' + message.messageId + '"]');
            if (existing) existing.remove();
            return; // skip rendering
        }

        if (message.type === "clear") {
            messages.innerHTML = '';
            if (message.sender) {
                var sysItem = document.createElement("article");
                sysItem.className = "message system";
                sysItem.textContent = message.sender + " cleared the chat globally.";
                messages.appendChild(sysItem);
            }
            return;
        }

        var existingItem = null;
        if (message.messageId) {
            existingItem = document.querySelector('.message[data-message-id="' + message.messageId + '"]');
        }

        var item = existingItem || document.createElement("article");
        var isMine = message.clientId && message.clientId === clientId;

        if (!existingItem) {
            item.className = "message";
            if (message.type === "system") {
                item.className += " system";
            } else {
                if (isMine) {
                    item.className += " mine";
                }

                item.addEventListener('click', function (e) {
                    if (!e.target.closest('.message-reactions') && !e.target.closest('.reaction-trigger') && !e.target.closest('.reply-trigger') && !e.target.closest('.reply-preview')) {
                        showContextMenu(e, item.messageData || message);
                    }
                });

                if (message.messageId) {
                    item.dataset.messageId = message.messageId;
                }
                if (message.clientId) {
                    item.dataset.senderId = message.clientId;
                }

                item.addEventListener('dblclick', function (e) {
                    if (!e.target.closest('.message-reactions') && !e.target.closest('.reaction-trigger')) {
                        sendReaction(item.dataset.messageId || message.messageId, '❤️');
                    }
                });
            }
        }

        if (message.type === "system") {
            item.textContent = message.content;
        } else if (message.deleted === true) {
            item.innerHTML = '';
            var senderName = message.sender || "Anonymous";
            var senderUser = knownUsers.find(function (u) { return u.id === message.clientId; });

            var avatar = document.createElement('div');
            avatar.className = 'avatar';
            if (senderUser && senderUser.profilePictureUrl) {
                avatar.innerHTML = '<img src="' + senderUser.profilePictureUrl + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">';
                avatar.style.background = 'transparent';
            } else {
                avatar.textContent = getInitials(senderName);
                try { avatar.style.background = getColorForName(senderName); } catch (e) { }
            }
            avatar.style.cursor = 'pointer';
            avatar.addEventListener('click', function (e) {
                e.stopPropagation();
                if (message.clientId) showUserProfile(message.clientId);
            });

            var body = document.createElement('div');
            body.className = 'message-body';

            var meta = document.createElement("div");
            meta.className = "message-meta";
            var sender = document.createElement("strong");
            sender.textContent = senderName;
            sender.style.cursor = 'pointer';
            sender.addEventListener('click', function (e) {
                e.stopPropagation();
                if (message.clientId) showUserProfile(message.clientId);
            });
            meta.appendChild(sender);

            var text = document.createElement('div');
            text.className = 'message-text deleted-text';
            text.innerHTML = '🚫 <i>This message was deleted</i>';

            var time = document.createElement("div");
            time.className = "message-time";
            time.textContent = formatTime(message.sentAt);

            body.appendChild(meta);
            body.appendChild(text);
            body.appendChild(time);
            item.appendChild(avatar);
            item.appendChild(body);
        } else {
            item.innerHTML = ''; // Clear previous content if updating

            var senderName = message.sender || "Anonymous";
            var senderUser = knownUsers.find(function (u) { return u.id === message.clientId; });

            var avatar = document.createElement('div');
            avatar.className = 'avatar';
            if (senderUser && senderUser.profilePictureUrl) {
                avatar.innerHTML = '<img src="' + senderUser.profilePictureUrl + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">';
                avatar.style.background = 'transparent';
            } else {
                avatar.textContent = getInitials(senderName);
                try { avatar.style.background = getColorForName(senderName); } catch (e) { }
            }
            avatar.style.cursor = 'pointer';
            avatar.addEventListener('click', function (e) {
                e.stopPropagation();
                if (message.clientId) showUserProfile(message.clientId);
            });

            var body = document.createElement('div');
            body.className = 'message-body';

            var meta = document.createElement("div");
            meta.className = "message-meta";

            var sender = document.createElement("strong");
            sender.textContent = senderName;
            sender.style.cursor = 'pointer';
            sender.addEventListener('click', function (e) {
                e.stopPropagation();
                if (message.clientId) showUserProfile(message.clientId);
            });

            var time = document.createElement("div");
            time.className = "message-time";
            time.textContent = formatTime(message.sentAt);

            var text = document.createElement("div");
            text.className = "message-text";

            // ----- Reply preview (above the message) -----
            if (message.replyToId) {
                // Find original message in DOM
                var origMsg = messages.querySelector('.message[data-message-id="' + message.replyToId + '"]');
                var origName = "Someone";
                var origText = "Message";
                if (origMsg) {
                    var nameEl = origMsg.querySelector('.message-meta strong');
                    var textEl = origMsg.querySelector('.message-text');
                    if (nameEl) origName = nameEl.textContent;
                    if (textEl) {
                        var clone = textEl.cloneNode(true);
                        var nested = clone.querySelector('.quoted-message');
                        if (nested) nested.remove();
                        origText = clone.textContent;
                    }
                }

                var replyPreview = document.createElement('div');
                replyPreview.className = 'reply-preview';
                replyPreview.innerHTML = '<div class="quoted-message"><div class="quoted-name">' + origName + '</div><div class="quoted-text">' + origText + '</div></div>';
                replyPreview.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (origMsg) {
                        origMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        var oldBg = origMsg.style.background;
                        origMsg.style.background = 'rgba(66, 133, 244, 0.2)';
                        setTimeout(function () { origMsg.style.background = oldBg; }, 1000);
                    }
                });
            }

            var actualContent = document.createElement("div");
            if (message.content) {
                actualContent.textContent = message.content;
                text.appendChild(actualContent);

                try {
                    parseEmojis(actualContent);
                    var nonWhitespaceNodes = Array.prototype.filter.call(actualContent.childNodes, function (node) {
                        return (node.nodeType === Node.ELEMENT_NODE) || (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
                    });
                    if (nonWhitespaceNodes.length === 1 && nonWhitespaceNodes[0].tagName === 'IMG' && nonWhitespaceNodes[0].classList.contains('emoji')) {
                        var img = nonWhitespaceNodes[0];
                        img.classList.add('jumbo-emoji');
                        var iconMatch = img.src.match(/\/([a-z0-9\-]+)\.svg/);
                        if (iconMatch && iconMatch[1]) {
                            var icon = iconMatch[1];
                            var formattedIcon = icon.replace(/-/g, '_');
                            img.src = 'https://fonts.gstatic.com/s/e/notoemoji/latest/' + formattedIcon + '/512.gif';
                            img.onerror = function () {
                                this.onerror = null;
                                this.src = 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/' + icon + '.svg';
                            };
                        }
                    }
                } catch (e) { }
            }

            if (message.attachmentUrl) {
                var attachmentContainer = document.createElement("div");
                attachmentContainer.className = "message-attachment";

                if (message.attachmentType === 'image') {
                    var img = document.createElement("img");
                    img.src = message.attachmentUrl;
                    img.alt = message.attachmentName || "Attached Image";
                    img.className = "attachment-image";
                    img.style.cursor = "pointer";
                    // Left-click opens image directly in modal
                    img.addEventListener("click", function (e) {
                        e.stopPropagation();
                        if (typeof openMediaModal === 'function') {
                            openMediaModal(message.attachmentUrl, 'image');
                        } else {
                            window.open(message.attachmentUrl, '_blank');
                        }
                    });
                    // Right-click shows context menu with additional actions
                    // img.addEventListener("contextmenu", function (e) {
                    //     e.preventDefault();
                    //     e.stopPropagation();
                    //     showImageContextMenu(e.clientX, e.clientY, message.attachmentUrl);
                    // });
                    attachmentContainer.appendChild(img);
                } else if (message.attachmentType === 'video') {
                    var video = document.createElement("video");
                    video.src = message.attachmentUrl;
                    video.controls = true;
                    video.className = "attachment-video";
                    video.style.cursor = "pointer";
                    // Only open on click if the controls are not clicked, but simple approach is to open on click
                    video.addEventListener("click", function (e) {
                        e.stopPropagation();
                        if (typeof openMediaModal === 'function') {
                            openMediaModal(message.attachmentUrl, 'video');
                        } else {
                            window.open(message.attachmentUrl, '_blank');
                        }
                    });
                    attachmentContainer.appendChild(video);
                } else if (message.attachmentType === 'audio') {
                    var audioContainer = document.createElement("div");
                    audioContainer.className = "custom-audio-player";
                    
                    var playBtn = document.createElement("button");
                    playBtn.className = "audio-play-btn";
                    playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
                    
                    var timeline = document.createElement("div");
                    timeline.className = "audio-timeline";
                    
                    var progressContainer = document.createElement("div");
                    progressContainer.className = "audio-progress-container";
                    var progressBar = document.createElement("input");
                    progressBar.type = "range";
                    progressBar.min = 0;
                    progressBar.max = 100;
                    progressBar.value = 0;
                    progressBar.className = "audio-progress";
                    
                    var fakeWaveform = document.createElement("div");
                    fakeWaveform.className = "audio-waveform";
                    // Static waveform representation matching the picture
                    fakeWaveform.innerHTML = '<div class="wave-bars"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>';
                    
                    progressContainer.appendChild(fakeWaveform);
                    progressContainer.appendChild(progressBar);
                    
                    var timeInfo = document.createElement("div");
                    timeInfo.className = "audio-time-info";
                    var currentTime = document.createElement("span");
                    currentTime.className = "audio-current-time";
                    currentTime.textContent = "0:00";
                    var duration = document.createElement("span");
                    duration.className = "audio-duration";
                    duration.textContent = "0:00";
                    
                    timeInfo.appendChild(currentTime);
                    timeInfo.appendChild(duration);
                    
                    timeline.appendChild(progressContainer);
                    timeline.appendChild(timeInfo);
                    
                    var speedBtn = document.createElement("button");
                    speedBtn.className = "audio-speed-btn";
                    speedBtn.textContent = "1x";
                    
                    var audio = document.createElement("audio");
                    audio.src = message.attachmentUrl;
                    audio.hidden = true;
                    
                    var isPlaying = false;
                    var speeds = [1, 1.5, 2];
                    var currentSpeedIdx = 0;
                    
                    playBtn.addEventListener("click", function(e) {
                        e.stopPropagation();
                        if (isPlaying) {
                            audio.pause();
                        } else {
                            audio.play();
                        }
                    });
                    
                    speedBtn.addEventListener("click", function(e) {
                        e.stopPropagation();
                        currentSpeedIdx = (currentSpeedIdx + 1) % speeds.length;
                        var s = speeds[currentSpeedIdx];
                        audio.playbackRate = s;
                        speedBtn.textContent = s + "x";
                    });
                    
                    audio.addEventListener("play", function() {
                        isPlaying = true;
                        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
                    });
                    
                    audio.addEventListener("pause", function() {
                        isPlaying = false;
                        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
                    });
                    
                    audio.addEventListener("timeupdate", function() {
                        if (audio.duration) {
                            var pct = (audio.currentTime / audio.duration) * 100;
                            progressBar.value = pct;
                            progressBar.style.backgroundSize = pct + '% 100%';
                            currentTime.textContent = formatAudioTime(audio.currentTime);
                        }
                    });
                    
                    progressBar.addEventListener("input", function(e) {
                        e.stopPropagation();
                        if (audio.duration) {
                            var time = (progressBar.value / 100) * audio.duration;
                            audio.currentTime = time;
                            progressBar.style.backgroundSize = progressBar.value + '% 100%';
                        }
                    });
                    
                    audio.addEventListener("loadedmetadata", function() {
                        if (audio.duration === Infinity || isNaN(audio.duration)) {
                            audio.currentTime = 1e101;
                            audio.addEventListener("timeupdate", function getDuration() {
                                this.removeEventListener("timeupdate", getDuration);
                                audio.currentTime = 0;
                                duration.textContent = formatAudioTime(audio.duration);
                            });
                        } else {
                            duration.textContent = formatAudioTime(audio.duration);
                        }
                    });
                    
                    audio.addEventListener("ended", function() {
                        isPlaying = false;
                        playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
                        progressBar.value = 0;
                        progressBar.style.backgroundSize = '0% 100%';
                        currentTime.textContent = "0:00";
                    });
                    
                    function formatAudioTime(seconds) {
                        if (isNaN(seconds)) return "0:00";
                        var m = Math.floor(seconds / 60);
                        var s = Math.floor(seconds % 60);
                        return m + ":" + (s < 10 ? "0" : "") + s;
                    }
                    
                    audioContainer.appendChild(playBtn);
                    audioContainer.appendChild(timeline);
                    audioContainer.appendChild(speedBtn);
                    audioContainer.appendChild(audio);
                    
                    attachmentContainer.appendChild(audioContainer);
                } else {
                    var docLink = document.createElement("a");
                    docLink.href = message.attachmentUrl;
                    docLink.download = message.attachmentName || "document";
                    docLink.className = "attachment-document";
                    docLink.innerHTML = '<span style="font-size: 1.5rem; margin-right: 8px;">📄</span><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + (message.attachmentName || "Download File") + '</span>';
                    attachmentContainer.appendChild(docLink);
                }
                text.appendChild(attachmentContainer);
            }

            meta.appendChild(sender);
            body.appendChild(meta);
            if (typeof replyPreview !== 'undefined') {
                body.appendChild(replyPreview);
            }
            body.appendChild(text);
            body.appendChild(time);

            if (message.reactions && Object.keys(message.reactions).length > 0) {
                var totalCount = 0;
                var reactionEntries = [];
                var userHasReacted = false;

                for (var reaction in message.reactions) {
                    var count = message.reactions[reaction];
                    if (count > 0) {
                        totalCount += count;
                        reactionEntries.push({ emoji: reaction, count: count });
                    }
                }

                if (message.userReactions && message.userReactions[clientId]) {
                    userHasReacted = true;
                }

                if (totalCount > 0) {
                    reactionEntries.sort(function (a, b) {
                        return b.count - a.count;
                    });

                    var topReactions = reactionEntries.slice(0, 4);

                    var summaryBadge = document.createElement('button');
                    summaryBadge.type = 'button';
                    summaryBadge.className = 'reaction-summary-badge';
                    if (userHasReacted) {
                        summaryBadge.classList.add('active');
                    }

                    var emojisContainer = document.createElement('div');
                    emojisContainer.className = 'summary-emojis';

                    topReactions.forEach(function (entry, index) {
                        var emojiSpan = document.createElement('span');
                        emojiSpan.className = 'summary-emoji-item';
                        emojiSpan.style.zIndex = 10 - index;
                        emojiSpan.textContent = entry.emoji;
                        parseEmojis(emojiSpan);
                        emojisContainer.appendChild(emojiSpan);
                    });

                    var countSpan = document.createElement('span');
                    countSpan.className = 'summary-count';
                    countSpan.textContent = totalCount > 1 ? totalCount : '';

                    summaryBadge.appendChild(emojisContainer);
                    if (totalCount > 1) {
                        summaryBadge.appendChild(countSpan);
                    }

                    summaryBadge.dataset.messageId = message.messageId;
                    summaryBadge.addEventListener('click', function (ev) {
                        ev.stopPropagation();
                        if (typeof showReactionPicker === 'function') {
                            showReactionPicker(message.messageId, summaryBadge);
                        }
                    });

                    body.appendChild(summaryBadge);
                }
            }

            var reactionTrigger = document.createElement('button');
            reactionTrigger.type = 'button';
            reactionTrigger.className = 'reaction-trigger';
            reactionTrigger.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>';
            reactionTrigger.setAttribute('aria-label', 'Add reaction');
            reactionTrigger.addEventListener('click', function (ev) {
                ev.stopPropagation();
                if (typeof showReactionPicker === 'function') {
                    showReactionPicker(message.messageId, reactionTrigger);
                }
            });

            var replyTrigger = document.createElement('button');
            replyTrigger.type = 'button';
            replyTrigger.className = 'reply-trigger';
            replyTrigger.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>';
            replyTrigger.setAttribute('aria-label', 'Reply to message');
            replyTrigger.addEventListener('click', function (ev) {
                ev.stopPropagation();
                startReply(message.messageId, message.sender || "Anonymous", message.content || "");
            });

            item.appendChild(avatar);
            item.appendChild(body);
            item.appendChild(replyTrigger);
            item.appendChild(reactionTrigger);

            // --- Swipe to reply logic ---
            var pointerStartX = 0;
            var pointerStartY = 0;
            var currentX = 0;
            var isSwiping = false;
            var isScrolling = false;

            item.addEventListener('pointerdown', function (e) {
                // Ignore if it's a mouse right click
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                // Ignore clicks on reply button, reactions, or audio player
                if (e.target.closest('.message-reactions') || e.target.closest('.reaction-trigger') || e.target.closest('.reply-trigger') || e.target.closest('.reply-preview') || e.target.closest('.custom-audio-player')) return;

                pointerStartX = e.clientX;
                pointerStartY = e.clientY;
                isSwiping = true;
                isScrolling = false;
                item.style.transition = 'none';
                item.setPointerCapture(e.pointerId);
            });

            item.addEventListener('pointermove', function (e) {
                if (!isSwiping) return;
                var dx = e.clientX - pointerStartX;
                var dy = e.clientY - pointerStartY;

                if (!isScrolling && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
                    isScrolling = true;
                }

                if (isScrolling) {
                    item.style.transform = '';
                    return;
                }

                // Allow swiping left (negative dx)
                if (dx < 0 && dx > -120) {
                    item.style.transform = 'translateX(' + dx + 'px)';
                    currentX = dx;
                }
            });

            var handlePointerUp = function (e) {
                if (!isSwiping) return;
                isSwiping = false;
                item.releasePointerCapture(e.pointerId);

                if (!isScrolling && currentX < -60) {
                    startReply(message.messageId, message.sender || "Anonymous", message.content || "");
                }

                item.style.transition = 'transform 0.2s cubic-bezier(0.1, 0.7, 0.1, 1)';
                item.style.transform = 'translateX(0)';

                setTimeout(function () {
                    item.style.transition = '';
                    item.style.transform = '';
                }, 200);

                currentX = 0;
            };

            item.addEventListener('pointerup', handlePointerUp);
            item.addEventListener('pointercancel', handlePointerUp);
            // ----------------------------
        }

        item.messageData = message;

        var nearBottom = messages.scrollHeight - messages.clientHeight - messages.scrollTop <= 80;

        if (!existingItem) {
            messages.appendChild(item);
        }

        if (nearBottom) {
            messages.scrollTop = messages.scrollHeight;
            if (scrollButton) {
                scrollButton.hidden = true;
            }
        } else if (!existingItem) {
            unreadCount += 1;
            if (scrollCount) {
                scrollCount.hidden = false;
                scrollCount.textContent = unreadCount;
            }
            if (scrollButton) {
                scrollButton.hidden = false;
            }
        }

        if (!existingItem) {
            messages.scrollTop = Math.min(messages.scrollTop, messages.scrollHeight);
        }
    }

    function sendJoinRegistration() {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            return;
        }
        if (!senderName) {
            return;
        }

        var registerMessage = {
            type: "register",
            sender: senderName,
            content: senderName,
            clientId: clientId
        };

        socket.send(JSON.stringify(registerMessage));
    }

    // Emoji picker: lightweight built-in palette
    var emojis = [
        "😀", "😄", "😅", "😊", "😍", "😎", "🤔", "😢", "😭", "👍",
        "👎", "🙏", "🎉", "🔥", "💯", "❤️", "😂", "🤩", "😴", "🤖"
    ];

    function renderEmojiPicker() {
        if (!emojiPicker) return;
        if (emojiPicker.childElementCount) return; // already rendered

        emojis.forEach(function (e) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'emoji-cell';
            b.setAttribute('aria-label', 'Insert ' + e);
            b.setAttribute('role', 'menuitem');

            var iconSpan = document.createElement('span');
            iconSpan.textContent = e;
            parseEmojis(iconSpan);
            b.appendChild(iconSpan);

            b.addEventListener('click', function (ev) {
                ev.stopPropagation();
                insertEmoji(e);
            });
            b.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    ev.stopPropagation();
                    insertEmoji(e);
                }
            });
            emojiPicker.appendChild(b);
        });
        emojiPicker.setAttribute('role', 'menu');
    }

    function insertEmoji(emoji) {
        if (!messageInput) return;
        var start = messageInput.selectionStart || messageInput.value.length;
        var end = messageInput.selectionEnd || start;
        var val = messageInput.value;
        messageInput.value = val.slice(0, start) + emoji + val.slice(end);
        var pos = start + emoji.length;
        messageInput.focus();
        messageInput.setSelectionRange(pos, pos);
    }

    if (emojiButton) {
        emojiButton.addEventListener('click', function (ev) {
            ev.stopPropagation();
            if (emojiPicker.hasAttribute('hidden')) {
                renderEmojiPicker();
                // show and anchor above the button
                emojiPicker.removeAttribute('hidden');
                emojiPicker.setAttribute('aria-hidden', 'false');
                // anchor to the right side of the button container
                emojiPicker.style.left = '0';
                emojiPicker.style.right = 'auto';
            } else {
                emojiPicker.setAttribute('hidden', '');
                emojiPicker.setAttribute('aria-hidden', 'true');
            }
        });
    }

    // Close emoji picker when clicking outside
    document.addEventListener('click', function (ev) {
        if (!emojiPicker) return;
        if (!emojiPicker.hasAttribute('hidden')) {
            var target = ev.target;
            var clickedInsidePicker = emojiPicker.contains(target);
            var clickedEmojiButton = target === emojiButton || (target.closest && target.closest('#emojiButton'));
            if (!clickedInsidePicker && !clickedEmojiButton) {
                emojiPicker.setAttribute('hidden', '');
                emojiPicker.setAttribute('aria-hidden', 'true');
            }
        }
    });

    // Close with Escape
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && emojiPicker && !emojiPicker.hasAttribute('hidden')) {
            emojiPicker.setAttribute('hidden', '');
            emojiPicker.setAttribute('aria-hidden', 'true');
        }
    });

    function showContextMenu(e, message) {
        var existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();

        var menu = document.createElement('div');
        menu.className = 'context-menu';


        if (message.attachmentType === "image") {

            var viewImage = document.createElement('div');
            viewImage.className = 'context-menu-item';
            viewImage.textContent = 'View Image';
            viewImage.addEventListener('click', function (ev) {
                ev.stopPropagation();
                window.openMediaModal(message.attachmentUrl, 'image');
                hideImageContextMenu();
            });
            menu.appendChild(viewImage);
        }

        var deleteForMe = document.createElement('div');
        deleteForMe.className = 'context-menu-item';
        deleteForMe.textContent = 'Delete for me';
        deleteForMe.addEventListener('click', function (ev) {
            ev.stopPropagation();
            var deletedIds = JSON.parse(localStorage.getItem('deletedForMe_' + clientId) || '[]');
            if (deletedIds.indexOf(message.messageId) === -1) {
                deletedIds.push(message.messageId);
            }
            localStorage.setItem('deletedForMe_' + clientId, JSON.stringify(deletedIds));
            menu.remove();
            var el = document.querySelector('.message[data-message-id="' + message.messageId + '"]');
            if (el) el.remove();
        });
        menu.appendChild(deleteForMe);

        var minutesElapsed = (Date.now() - new Date(message.sentAt).getTime()) / 60000;
        var isMine = message.clientId && message.clientId === clientId;

        if (!message.deleted && isMine) {
            var deleteForEveryone = document.createElement('div');
            deleteForEveryone.className = 'context-menu-item danger';
            deleteForEveryone.textContent = 'Delete for everyone';
            deleteForEveryone.addEventListener('click', function (ev) {
                ev.stopPropagation();
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'delete',
                        messageId: message.messageId,
                        clientId: clientId,
                        sender: senderName
                    }));
                }
                menu.remove();
            });
            menu.appendChild(deleteForEveryone);
        }

        var cancel = document.createElement('div');
        cancel.className = 'context-menu-item';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', function (ev) {
            ev.stopPropagation();
            menu.remove();
        });
        menu.appendChild(cancel);

        document.body.appendChild(menu);

        // ensure menu stays within screen bounds
        var menuRect = menu.getBoundingClientRect();
        var x = e.pageX;
        var y = e.pageY;
        if (x + menuRect.width > window.innerWidth) x = window.innerWidth - menuRect.width - 10;
        if (y + menuRect.height > window.innerHeight) y = window.innerHeight - menuRect.height - 10;

        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        setTimeout(function () {
            var closeHandler = function () {
                var currentMenu = document.querySelector('.context-menu');
                if (currentMenu) currentMenu.remove();
                document.removeEventListener('click', closeHandler);
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    }

    var headerDropdown = document.getElementById('headerDropdown');

    function setConnected(connected, statusText) {
        if (connected) {
            if (connectButton) {
                connectButton.textContent = "Disconnect";
                connectButton.classList.add("connected");
            }
            if (messageInput) {
                messageInput.disabled = true;
                messageInput.placeholder = "Select a chat to start messaging";
            }
            if (actionButton) actionButton.disabled = true;
            if (connectionStatus) {
                connectionStatus.textContent = statusText || "Connected";
                connectionStatus.style.color = "#00a884";
            }
            if (headerDropdown) headerDropdown.style.display = "block";
            if (clearChatButton) clearChatButton.style.display = "block";
            if (sidebarPanel) sidebarPanel.style.display = "flex";

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'fetch_users' }));
                socket.send(JSON.stringify({ type: 'fetch_rooms' }));
            }
        } else {
            if (connectButton) {
                connectButton.textContent = "Connect";
                connectButton.classList.remove("connected");
            }
            if (messageInput) messageInput.disabled = true;
            if (actionButton) actionButton.disabled = true;
            if (connectionStatus) {
                connectionStatus.textContent = statusText || "Disconnected";
                connectionStatus.style.color = "#ea4335";
            }
            if (currentUserDisplay) currentUserDisplay.hidden = true;
            if (headerDropdown) headerDropdown.style.display = "none";
            if (clearChatButton) clearChatButton.style.display = "none";
            if (sidebarPanel) sidebarPanel.style.display = "none";
            activeRoomId = null;
        }
        if (connectionStatus) connectionStatus.hidden = false;
    }

    function formatTime(value) {
        if (!value) {
            return "";
        }

        return new Date(value).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    // --- Message Reaction Picker ---
    var messageReactionPicker = document.createElement('div');
    messageReactionPicker.className = 'message-reaction-picker hidden';
    messageReactionPicker.setAttribute('aria-hidden', 'true');
    document.body.appendChild(messageReactionPicker);
    var currentReactionMessageId = null;

    emojis.forEach(function (e) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'emoji-cell';

        var iconSpan = document.createElement('span');
        iconSpan.textContent = e;
        parseEmojis(iconSpan);
        b.appendChild(iconSpan);

        b.addEventListener('click', function (ev) {
            ev.stopPropagation();
            if (currentReactionMessageId) {
                sendReaction(currentReactionMessageId, e);
            }
            hideReactionPicker();
        });
        messageReactionPicker.appendChild(b);
    });

    window.showReactionPicker = function (messageId, anchorElement) {
        currentReactionMessageId = messageId;
        messageReactionPicker.classList.remove('hidden');
        messageReactionPicker.setAttribute('aria-hidden', 'false');

        var rect = anchorElement.getBoundingClientRect();
        messageReactionPicker.style.top = (rect.top - messageReactionPicker.offsetHeight - 5) + 'px';

        if (rect.top - messageReactionPicker.offsetHeight < 0) {
            messageReactionPicker.style.top = (rect.bottom + 5) + 'px';
        }

        var left = rect.left;
        // ensure it's not offscreen
        setTimeout(function () {
            var rRect = messageReactionPicker.getBoundingClientRect();
            if (left + rRect.width > window.innerWidth) {
                left = window.innerWidth - rRect.width - 10;
            }
            messageReactionPicker.style.left = left + 'px';
        }, 0);

        messageReactionPicker.style.left = left + 'px';
        messageReactionPicker.style.right = 'auto';
        messageReactionPicker.style.bottom = 'auto';
    };

    function hideReactionPicker() {
        messageReactionPicker.classList.add('hidden');
        messageReactionPicker.setAttribute('aria-hidden', 'true');
        currentReactionMessageId = null;
    }

    window.sendReaction = function (messageId, emoji) {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({
            type: "reaction",
            messageId: messageId,
            reaction: emoji,
            clientId: clientId
        }));
    };

    document.addEventListener('click', function (ev) {
        if (!messageReactionPicker.classList.contains('hidden')) {
            var target = ev.target;
            if (!messageReactionPicker.contains(target) && !(target.closest && target.closest('.reaction-trigger'))) {
                hideReactionPicker();
            }
        }
    });

    document.addEventListener('scroll', function () {
        hideReactionPicker();
    }, true);

    // Profile Modal Logic
    var profileButton = document.getElementById('profileButton');
    var profileModal = document.getElementById('profileModal');
    var cancelProfileBtn = document.getElementById('cancelProfileBtn');
    var saveProfileBtn = document.getElementById('saveProfileBtn');
    var profileNameInput = document.getElementById('profileNameInput');
    var avatarGrid = document.getElementById('avatarGrid');
    var profilePhotoInput = document.getElementById('profilePhotoInput');
    var sidebarMenuDropdown = document.getElementById('sidebarMenuDropdown');
    var currentAvatarDisplay = document.getElementById('currentAvatarDisplay');
    var avatarGridContainer = document.getElementById('avatarGridContainer');

    var animeAvatars = [
        "/avatars/luffy.png",
        "/avatars/naruto.png",
        "/avatars/gojo.png",
        "/avatars/goku.png",
        "/avatars/zoro.png",
        "/avatars/sasuke.png",
        "/avatars/itachi.png",
        "/avatars/kakashi.png"
    ];

    function updateCurrentAvatarDisplay(url) {
        if (!currentAvatarDisplay) return;
        if (url) {
            currentAvatarDisplay.innerHTML = '<img src="' + url + '" style="width: 100%; height: 100%; object-fit: cover;">';
        } else {
            var initial = getInitials(senderName || "Anonymous");
            var bg = getColorForName(senderName || "Anonymous");
            currentAvatarDisplay.innerHTML = '<div style="width: 100%; height: 100%; background: ' + bg + '; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem;">' + initial + '</div>';
        }
    }

    function generateAvatarGrid() {
        if (!avatarGrid) return;
        avatarGrid.innerHTML = '';
        var currentUrl = profilePhotoInput ? profilePhotoInput.value : null;

        animeAvatars.forEach(function (url) {
            var div = document.createElement('div');
            div.style.width = '60px';
            div.style.height = '60px';
            div.style.borderRadius = '50%';
            div.style.cursor = 'pointer';
            div.style.border = '3px solid transparent';
            div.style.overflow = 'hidden';
            div.style.background = 'var(--background-default)';
            div.innerHTML = '<img src="' + url + '" style="width: 100%; height: 100%; object-fit: cover;">';

            if (currentUrl === url) {
                div.style.borderColor = 'var(--primary)';
            }

            div.addEventListener('click', function () {
                Array.from(avatarGrid.children).forEach(function (child) { child.style.borderColor = 'transparent'; });
                div.style.borderColor = 'var(--primary)';
                if (profilePhotoInput) profilePhotoInput.value = url;
                updateCurrentAvatarDisplay(url);
            });

            avatarGrid.appendChild(div);
        });
    }

    if (currentAvatarDisplay) {
        currentAvatarDisplay.addEventListener('click', function () {
            if (avatarGridContainer) {
                avatarGridContainer.classList.toggle('hidden');
                generateAvatarGrid(); // re-generate to ensure selection outline is correct
            }
        });
    }

    if (profileButton) {
        profileButton.addEventListener('click', function () {
            if (sidebarMenuDropdown) sidebarMenuDropdown.classList.add('hidden');
            profileNameInput.value = senderName || "Anonymous";

            var me = knownUsers.find(function (u) { return u.id === clientId; });
            var url = me ? me.profilePictureUrl : null;
            if (profilePhotoInput) profilePhotoInput.value = url || "";

            updateCurrentAvatarDisplay(url);
            if (avatarGridContainer) avatarGridContainer.classList.add('hidden');

            profileModal.classList.remove('hidden');
        });
    }

    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', function () {
            profileModal.classList.add('hidden');
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function () {
            var newName = profileNameInput.value.trim();
            if (!newName) return;

            saveProfileBtn.disabled = true;
            saveProfileBtn.textContent = "Saving...";

            var newPhotoUrl = profilePhotoInput ? profilePhotoInput.value : null;
            finishSaveProfile(newName, newPhotoUrl);
        });
    }

    function finishSaveProfile(newName, newPhotoUrl) {
        senderName = newName;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'update_profile',
                sender: newName,
                content: newPhotoUrl || ""
            }));
        }
        profileModal.classList.add('hidden');
        saveProfileBtn.disabled = false;
        saveProfileBtn.textContent = "Save";
    }

    // --- WebRTC Logic ---
    var localStream = null;
    var peerConnection = null;
    var rtcConfig = {
        'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }]
    };

    var callButton = document.getElementById("callButton");
    var inCallOverlay = document.getElementById("inCallOverlay");
    var endCallBtn = document.getElementById("endCallBtn");
    var muteCallBtn = document.getElementById("muteCallBtn");
    var inCallName = document.getElementById("inCallName");
    var inCallStatus = document.getElementById("inCallStatus");
    var inCallAvatarText = document.getElementById("inCallAvatarText");

    var incomingCallModal = document.getElementById("incomingCallModal");
    var incomingCallText = document.getElementById("incomingCallText");
    var acceptCallBtn = document.getElementById("acceptCallBtn");
    var declineCallBtn = document.getElementById("declineCallBtn");
    var remoteAudio = document.getElementById("remoteAudio");

    var callState = 'idle'; // idle, calling, ringing, in-call
    var currentCallPeerId = null;
    var currentCallPeerName = null;
    var currentCallRoomId = null;
    var callTimerInterval = null;
    var callStartTime = null;
    var isMuted = false;

    var audioCtx = null;
    var ringtoneOscillator = null;
    var ringtoneGain = null;
    var ringtoneInterval = null;

    function playRingtone() {
        if (!audioCtx) {
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();

        var isPlaying = false;
        ringtoneInterval = setInterval(function () {
            if (isPlaying) {
                if (ringtoneOscillator) {
                    try { ringtoneOscillator.stop(); } catch (e) { }
                    ringtoneOscillator.disconnect();
                    ringtoneOscillator = null;
                }
            } else {
                ringtoneGain = audioCtx.createGain();
                ringtoneGain.connect(audioCtx.destination);
                ringtoneGain.gain.value = 0.1;

                ringtoneOscillator = audioCtx.createOscillator();
                ringtoneOscillator.type = 'sine';
                ringtoneOscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
                ringtoneOscillator.frequency.setValueAtTime(480, audioCtx.currentTime + 0.1);
                ringtoneOscillator.connect(ringtoneGain);
                ringtoneOscillator.start();
            }
            isPlaying = !isPlaying;
        }, 1500);
    }

    function stopRingtone() {
        if (ringtoneInterval) {
            clearInterval(ringtoneInterval);
            ringtoneInterval = null;
        }
        if (ringtoneOscillator) {
            try { ringtoneOscillator.stop(); } catch (e) { }
            ringtoneOscillator.disconnect();
            ringtoneOscillator = null;
        }
        if (ringtoneGain) {
            ringtoneGain.disconnect();
            ringtoneGain = null;
        }
    }

    function updateCallTimer() {
        if (!callStartTime) return;
        var diff = Math.floor((Date.now() - callStartTime) / 1000);
        var m = Math.floor(diff / 60).toString().padStart(2, '0');
        var s = (diff % 60).toString().padStart(2, '0');
        if (inCallStatus) inCallStatus.textContent = m + ':' + s;
    }

    if (callButton) callButton.addEventListener("click", initiateCall);
    if (endCallBtn) endCallBtn.addEventListener("click", endCall);
    if (acceptCallBtn) acceptCallBtn.addEventListener("click", acceptCall);
    if (declineCallBtn) declineCallBtn.addEventListener("click", declineCall);
    if (muteCallBtn) muteCallBtn.addEventListener("click", toggleMute);

    function toggleMute() {
        if (!localStream) return;
        isMuted = !isMuted;
        localStream.getAudioTracks().forEach(function (track) {
            track.enabled = !isMuted;
        });
        if (isMuted) {
            muteCallBtn.classList.add('muted');
            muteCallBtn.textContent = '🔇';
        } else {
            muteCallBtn.classList.remove('muted');
            muteCallBtn.textContent = '🎤';
        }
    }

    function getRoomName(roomId) {
        roomId = roomId || activeRoomId;
        var room = knownRooms.find(function (r) { return r.id === roomId; });
        return room ? room.name : "Unknown User";
    }

    async function initiateCall() {
        if (!activeRoomId || callState !== 'idle') return;

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Microphone not supported");
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e) {
            alert("Could not access microphone: " + e.message);
            return;
        }

        callState = 'calling';
        currentCallPeerId = null; // Broadcast request
        currentCallRoomId = activeRoomId;

        inCallOverlay.classList.remove('hidden');
        inCallName.textContent = currentCallPeerName || getRoomName(currentCallRoomId);
        inCallAvatarText.textContent = getInitials(inCallName.textContent);
        inCallStatus.textContent = "Calling...";

        playRingtone();

        socket.send(JSON.stringify({
            type: "webrtc_request_call",
            roomId: currentCallRoomId,
            sender: senderName,
            clientId: clientId
        }));

        // Timeout if nobody answers in 30 seconds
        setTimeout(function () {
            if (callState === 'calling' || callState === 'ringing') {
                endCall();
            }
        }, 30000);
    }

    window.handleWebRTCRequestCall = function (message) {
        if (callState !== 'idle') {
            socket.send(JSON.stringify({
                type: "webrtc_decline",
                roomId: message.roomId,
                sender: senderName,
                clientId: clientId,
                targetClientId: message.clientId
            }));
            return;
        }

        currentCallPeerId = message.clientId;
        currentCallPeerName = message.sender;
        currentCallRoomId = message.roomId;
        callState = 'ringing';

        if (incomingCallText) incomingCallText.textContent = message.sender + " is calling you...";
        incomingCallModal.classList.remove('hidden');
        incomingCallModal.setAttribute('aria-hidden', 'false');

        playRingtone();

        socket.send(JSON.stringify({
            type: "webrtc_ringing",
            roomId: message.roomId,
            sender: senderName,
            clientId: clientId,
            targetClientId: message.clientId
        }));
    };

    window.handleWebRTCRinging = function (message) {
        if (callState === 'calling') {
            callState = 'ringing';
            inCallStatus.textContent = "Ringing...";
            currentCallPeerId = message.clientId;
        }
    };

    async function acceptCall() {
        if (callState !== 'ringing') return;
        stopRingtone();

        incomingCallModal.classList.add('hidden');
        incomingCallModal.setAttribute('aria-hidden', 'true');

        inCallOverlay.classList.remove('hidden');
        inCallName.textContent = currentCallPeerName || getRoomName(currentCallRoomId);
        inCallAvatarText.textContent = getInitials(inCallName.textContent);
        inCallStatus.textContent = "Connecting...";

        callState = 'in-call';

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Microphone not supported");
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e) {
            alert("Could not access microphone: " + e.message);
            endCall();
            return;
        }

        socket.send(JSON.stringify({
            type: "webrtc_accept",
            roomId: currentCallRoomId,
            sender: senderName,
            clientId: clientId,
            targetClientId: currentCallPeerId
        }));
        startWebRTC(false); // Receiver waits for the offer
    }

    function declineCall() {
        stopRingtone();
        incomingCallModal.classList.add('hidden');
        incomingCallModal.setAttribute('aria-hidden', 'true');

        socket.send(JSON.stringify({
            type: "webrtc_decline",
            roomId: currentCallRoomId,
            sender: senderName,
            clientId: clientId,
            targetClientId: currentCallPeerId
        }));

        resetCallState();
    }

    window.handleWebRTCDecline = function (message) {
        if (callState === 'calling' || callState === 'ringing') {
            stopRingtone();
            inCallStatus.textContent = "Call Declined";
            setTimeout(resetCallState, 2000);
        }
    };

    window.handleWebRTCAccept = async function (message) {
        if (callState !== 'calling' && callState !== 'ringing') return;
        stopRingtone();

        currentCallPeerId = message.clientId;
        callState = 'in-call';
        inCallStatus.textContent = "Connecting...";

        startWebRTC(true); // Caller creates the offer
    };

    async function startWebRTC(isCaller) {
        peerConnection = new RTCPeerConnection(rtcConfig);

        localStream.getTracks().forEach(function (track) {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = function (event) {
            if (remoteAudio.srcObject !== event.streams[0]) {
                remoteAudio.srcObject = event.streams[0];
                remoteAudio.play().catch(function (e) { console.error("Audio play failed:", e); });
            }
            if (!callTimerInterval) {
                callStartTime = Date.now();
                callTimerInterval = setInterval(updateCallTimer, 1000);
                updateCallTimer();
            }
        };

        peerConnection.onicecandidate = function (event) {
            if (event.candidate) {
                socket.send(JSON.stringify({
                    type: "webrtc_ice_candidate",
                    roomId: currentCallRoomId,
                    sender: senderName,
                    clientId: clientId,
                    targetClientId: currentCallPeerId,
                    content: JSON.stringify(event.candidate)
                }));
            }
        };

        if (isCaller) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.send(JSON.stringify({
                type: "webrtc_offer",
                roomId: currentCallRoomId,
                sender: senderName,
                clientId: clientId,
                targetClientId: currentCallPeerId,
                content: JSON.stringify(offer)
            }));
        }
    }

    window.handleWebRTCOffer = async function (message) {
        if (callState !== 'in-call') return;
        var offerDesc = new RTCSessionDescription(JSON.parse(message.content));
        await peerConnection.setRemoteDescription(offerDesc);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.send(JSON.stringify({
            type: "webrtc_answer",
            roomId: currentCallRoomId,
            sender: senderName,
            clientId: clientId,
            targetClientId: message.clientId,
            content: JSON.stringify(answer)
        }));
    };

    window.handleWebRTCAnswer = async function (message) {
        if (!peerConnection) return;
        var answerDesc = new RTCSessionDescription(JSON.parse(message.content));
        await peerConnection.setRemoteDescription(answerDesc);
    };

    window.handleWebRTCIceCandidate = async function (message) {
        if (!peerConnection) return;
        var candidate = new RTCIceCandidate(JSON.parse(message.content));
        await peerConnection.addIceCandidate(candidate);
    };

    function endCall() {
        if (callState === 'idle') return;

        socket.send(JSON.stringify({
            type: "webrtc_end",
            roomId: currentCallRoomId,
            sender: senderName,
            clientId: clientId,
            targetClientId: currentCallPeerId
        }));

        inCallStatus.textContent = "Call Ended";
        setTimeout(resetCallState, 1500);
    }

    window.handleWebRTCEnd = function (message) {
        if (callState !== 'idle') {
            inCallStatus.textContent = "Call Ended";
            setTimeout(resetCallState, 1500);
        }
    };

    function resetCallState() {
        stopRingtone();
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        if (localStream) {
            localStream.getTracks().forEach(function (track) { track.stop(); });
            localStream = null;
        }
        if (remoteAudio) remoteAudio.srcObject = null;

        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }

        callState = 'idle';
        currentCallPeerId = null;
        currentCallPeerName = null;
        isMuted = false;

        if (muteCallBtn) {
            muteCallBtn.classList.remove('muted');
            muteCallBtn.textContent = '🎤';
        }

        if (inCallOverlay) inCallOverlay.classList.add('hidden');
        if (incomingCallModal) {
            incomingCallModal.classList.add('hidden');
            incomingCallModal.setAttribute('aria-hidden', 'true');
        }
    }

}());

// Global Media Modal
var mediaModal = document.createElement('div');
mediaModal.id = "mediaModal";
mediaModal.className = "name-modal hidden";
mediaModal.setAttribute("aria-hidden", "true");
mediaModal.style.zIndex = "3000";
mediaModal.style.backgroundColor = "rgba(0,0,0,0.9)";
mediaModal.style.display = "flex";
mediaModal.style.flexDirection = "column";
mediaModal.style.justifyContent = "center";
mediaModal.style.alignItems = "center";

var closeMediaBtn = document.createElement('button');
closeMediaBtn.innerHTML = "✕";
closeMediaBtn.style.position = "absolute";
closeMediaBtn.style.top = "20px";
closeMediaBtn.style.right = "20px";
closeMediaBtn.style.background = "rgba(255,255,255,0.2)";
closeMediaBtn.style.color = "white";
closeMediaBtn.style.border = "none";
closeMediaBtn.style.borderRadius = "50%";
closeMediaBtn.style.width = "40px";
closeMediaBtn.style.height = "40px";
closeMediaBtn.style.fontSize = "20px";
closeMediaBtn.style.cursor = "pointer";
// Close button hides modal
closeMediaBtn.addEventListener('click', function () {
    mediaModal.classList.add('hidden');
    mediaModal.setAttribute('aria-hidden', 'true');
});
// Click on backdrop closes modal
mediaModal.addEventListener('click', function (e) {
    if (e.target === mediaModal) {
        mediaModal.classList.add('hidden');
        mediaModal.setAttribute('aria-hidden', 'true');
    }
});
// Global helper function for easier calls
function openMediaModal(url, type) {
    window.openMediaModal(url, type);
}
closeMediaBtn.style.zIndex = "3001";
mediaModal.appendChild(closeMediaBtn);

var mediaContainer = document.createElement('div');
mediaContainer.style.maxWidth = "90vw";
mediaContainer.style.maxHeight = "90vh";
mediaContainer.style.display = "flex";
mediaContainer.style.justifyContent = "center";
mediaContainer.style.alignItems = "center";
mediaModal.appendChild(mediaContainer);

document.body.appendChild(mediaModal);

window.openMediaModal = function (url, type) {
    mediaContainer.innerHTML = '';
    if (type === 'image') {
        var img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = "100%";
        img.style.maxHeight = "90vh";
        img.style.objectFit = "contain";
        mediaContainer.appendChild(img);
    } else if (type === 'video') {
        var video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.autoplay = true;
        video.style.maxWidth = "100%";
        video.style.maxHeight = "90vh";
        mediaContainer.appendChild(video);
        mediaModal.classList.add('hidden');
        mediaModal.setAttribute('aria-hidden', 'true');
    }
    // Close button also hides modal
    closeMediaBtn.addEventListener('click', function () {
        mediaModal.classList.add('hidden');
        mediaModal.setAttribute('aria-hidden', 'true');
    });

    mediaModal.classList.remove('hidden');
    mediaModal.setAttribute('aria-hidden', 'false');
}

// Helper to show context menu for image
function showImageContextMenu(x, y, url) {
    var menu = document.getElementById('imageContextMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'imageContextMenu';
        menu.style.position = 'absolute';
        menu.style.background = 'rgba(0,0,0,0.85)';
        menu.style.color = '#fff';
        menu.style.padding = '8px';
        menu.style.borderRadius = '4px';
        menu.style.zIndex = '3002';
        menu.style.cursor = 'pointer';
        // Populate menu with multiple actions
        menu.innerHTML = '';
        var openItem = document.createElement('div');
        openItem.textContent = 'Open Image';
        openItem.style.padding = '4px 0';
        openItem.addEventListener('click', function (e) {
            e.stopPropagation();
            window.openMediaModal(url, 'image');
            hideImageContextMenu();
        });
        var deleteMeItem = document.createElement('div');
        deleteMeItem.textContent = 'Delete for me';
        deleteMeItem.style.padding = '4px 0';
        deleteMeItem.addEventListener('click', function (e) {
            e.stopPropagation();
            console.log('Delete for me clicked for', url);
            hideImageContextMenu();
            // TODO: implement delete logic for current user
        });
        var deleteAllItem = document.createElement('div');
        deleteAllItem.textContent = 'Delete for all';
        deleteAllItem.style.padding = '4px 0';
        deleteAllItem.addEventListener('click', function (e) {
            e.stopPropagation();
            console.log('Delete for all clicked for', url);
            hideImageContextMenu();
            // TODO: implement delete logic for all participants
        });
        menu.appendChild(openItem);
        menu.appendChild(deleteMeItem);
        menu.appendChild(deleteAllItem);
        document.body.appendChild(menu);
        // Hide menu when clicking elsewhere
        document.addEventListener('click', hideImageContextMenu);
    }
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.display = 'block';
}

function hideImageContextMenu() {
    var menu = document.getElementById('imageContextMenu');
    if (menu) {
        menu.style.display = 'none';
    }
};

closeMediaBtn.addEventListener('click', function () {
    mediaModal.classList.add('hidden');
    mediaModal.setAttribute('aria-hidden', 'true');
    mediaContainer.innerHTML = ''; // Stop video playback
});
