# Security Specification for K-Pop Idol Chat Game

## 1. Data Invariants
- **User Ownership**: A player profile `/users/{userId}` can only be accessed (read/write) by the authenticated user whose Firebase UID exactly matches `{userId}`.
- **Chat Privacy**: All chat rooms and messages stored under `/users/{userId}/chats/{idolId}/messages/{messageId}` must inherit access constraints from the parent user document. Only the owner (`request.auth.uid == userId`) has access to read, list, create, update, or delete notifications.
- **Strict Fields & Schema Verification**:
  - The profile must have exactly `name` (string up to 100 chars), `selectedIdolId` (string up to 128 chars), and `affection` (integer between 0 and 100).
  - The chat message must strictly conform to allowed keys and valid sender types (`idol` or `player`).

---

## 2. The "Dirty Dozen" Attack Payloads

### Payload 1: Unauthorized Profile Read
- **Target Path**: `/users/victim_user_123`
- **Actor Auth**: `hacker_456`
- **Operation**: `get`
- **Objective**: Read private profile data of another user.

### Payload 2: Unauthorized Profile Write/Hijack
- **Target Path**: `/users/victim_user_123`
- **Actor Auth**: `hacker_456`
- **Operation**: `create`
- **Data**: `{"name": "Hacker", "selectedIdolId": "idol_1", "affection": 50}`
- **Objective**: Overwrite or create another player's profile data.

### Payload 3: Shadow field injection (Ghost Fields)
- **Target Path**: `/users/hacker_456`
- **Actor Auth**: `hacker_456`
- **Operation**: `create`
- **Data**: `{"name": "Hacker", "selectedIdolId": "idol_1", "affection": 50, "isAdmin": true, "vipStatus": "unlocked"}`
- **Objective**: Bypass strict key constraints and inject fake administrative privileges.

### Payload 4: Invalid Type Poisoning (Denial of Wallet / Type Safety Check)
- **Target Path**: `/users/hacker_456`
- **Actor Auth**: `hacker_456`
- **Operation**: `create`
- **Data**: `{"name": "Scaler", "selectedIdolId": "idol_1", "affection": "one_hundred"}`
- **Objective**: Injected string type where an integer value is required for mathematical/game progress.

### Payload 5: Out of bounds Affection score
- **Target Path**: `/users/hacker_456`
- **Actor Auth**: `hacker_456`
- **Operation**: `create`
- **Data**: `{"name": "Scaler", "selectedIdolId": "idol_1", "affection": 99999}`
- **Objective**: Max out affection level using a data level hack.

### Payload 6: Rogue Sender/Spoofing ID in Chats
- **Target Path**: `/users/victim_user_123/chats/idol_1/messages/msg_999`
- **Actor Auth**: `hacker_456`
- **Operation**: `create`
- **Objective**: Hijack or manipulate a chat history for another victim.

### Payload 7: Sender Spoofing (Impostor Chat Actor)
- **Target Path**: `/users/hacker_456/chats/idol_1/messages/msg_777`
- **Actor Auth**: `hacker_456`
- **Operation**: `create`
- **Data**: `{"id": "msg_777", "sender": "hacker_system", "text": "Hello", "timestamp": 1234567, "type": "text"}`
- **Objective**: Inject an invalid sender entity into their own history to trigger frontend exploits.

### Payload 8: Message Key Flooding
- **Target Path**: `/users/hacker_456/chats/idol_1/messages/msg_888`
- **Actor Auth**: `hacker_456`
- **Operation**: `create`
- **Data**: `{"id": "msg_888", "sender": "player", "text": "Hello", "timestamp": 1234567, "type": "text", "extraField": "malicious_payload", "admin": true}`
- **Objective**: Insert shadow fields inside chat messages.

### Payload 9: Denial of Wallet Character Spray (Gigantic ID format)
- **Target Path**: `/users/hacker_456/chats/idol_1/messages/VERY_LONG_ID_A_A_..._A_1000Chars`
- **Actor Auth**: `hacker_456`
- **Operation**: `create`
- **Data**: `{"id": "msg_888", "sender": "player", "text": "Hello", "timestamp": 1234567, "type": "text"}`
- **Objective**: Crash index entries and inflate project charges by using massive key names.

### Payload 10: Negative Duration Voice Spoofing
- **Target Path**: `/users/hacker_456/chats/idol_1/messages/msg_999`
- **Actor Auth**: `hacker_456`
- **Operation**: `create`
- **Data**: `{"id": "msg_999", "sender": "player", "text": "hello", "timestamp": 1234567, "type": "voice", "audioUrl": "data:audio/webm;base64,...", "audioDuration": -50}`
- **Objective**: Exploit range validations by submitting negative voice clip durations which can break presentation stats.

### Payload 11: Non-authenticated Read Attempt
- **Target Path**: `/users/some_random_id`
- **Actor Auth**: `null` (Anonymous / Not Signed In)
- **Operation**: `get`
- **Objective**: Steal player profile data publicly without signing in.

### Payload 12: Changing Unchangeable Fields during Chat Update
- **Target Path**: `/users/hacker_456/chats/idol_1/messages/msg_100`
- **Actor Auth**: `hacker_456`
- **Operation**: `update`
- **Data**: `{"id": "msg_100_altered", "sender": "idol", "text": "changed text", "timestamp": 1111111, "type": "text"}`
- **Objective**: Rewriting previously logged chatbot conversation history details to disrupt dating game records.
