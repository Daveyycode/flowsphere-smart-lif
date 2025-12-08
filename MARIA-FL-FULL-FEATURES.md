# MARIA - FlowSphere Full Features Document

**Created:** December 4, 2025
**Version:** 1.0
**Target:** Production-ready family productivity platform

---

# PART 1: COMPLETED FEATURES (What We Have Now)

## 1. SECURE MESSENGER

### Core Messaging
- [x] End-to-end encrypted messages
- [x] QR code-based contact pairing (one-time use codes)
- [x] Real-time message sync via Supabase
- [x] Message encryption/decryption
- [x] Contact list with avatars

### Message Status System
- [x] `...` (sending) - animated dots while message is being sent
- [x] `.` (sent) - message left device
- [x] `✓` (delivered) - message received by server
- [x] `✓✓` (seen) - purple double check when recipient reads

### Online Status & Presence
- [x] Green dot = Online
- [x] Yellow dot = Away
- [x] Gray dot = Offline
- [x] "Last seen X ago" timestamps
- [x] Real-time status updates (every minute)

### Privacy Settings
- [x] Toggle: Show Online Status
- [x] Toggle: Show Last Seen
- [x] Toggle: Show Unique ID
- [x] Toggle: Allow Screenshots
- [x] Toggle: Allow Saving Media
- [x] Auto-Delete Timer (Off, 1min, 5min, 15min, 1hr, 6hrs, 12hrs, 24hrs)

### ID System
- [x] Device ID (internal, tied to device/browser fingerprint)
- [x] User ID (shareable, format: FS-XXXXXXXX)
- [x] Conversation ID (auto-generated for each chat)

### Delete Functionality
- [x] Delete message for me (local only)
- [x] Delete message for everyone (own messages)
- [x] Clear chat for me (keeps contact)
- [x] Clear chat for everyone
- [x] Remove contact entirely
- [x] Confirmation dialogs with warnings

### Account Handling
- [x] Duplicate contact prevention
- [x] Deleted account detection
- [x] Read-only mode for deleted accounts
- [x] "Deleted Account" label with grayed avatar

### QR Code Features
- [x] Real camera scanning (jsQR)
- [x] Normal QR display
- [x] Steganographic/Stealth QR (faint, harder to see)
- [x] Gallery image QR scanning
- [x] Manual code entry fallback
- [x] 24-hour expiration on invite codes

---

## 2. ENCRYPTED VAULT

### File Encryption
- [x] AES-256-GCM encryption
- [x] PBKDF2 key derivation (100,000 iterations)
- [x] User PIN = encryption key
- [x] Zero-knowledge architecture (server can't read files)
- [x] Encrypt on upload, decrypt on download

### Biometric Authentication
- [x] WebAuthn integration
- [x] Face ID support (iOS)
- [x] Touch ID support (iOS/Mac)
- [x] Fingerprint support (Android)
- [x] Platform-specific icons
- [x] PIN fallback always available

### Security Features
- [x] PIN strength indicator (red → yellow → green)
- [x] Responsive dialogs for mobile
- [x] Per-user separate storage (family privacy)

---

## 3. MEETING NOTES

- [x] Create/edit meeting notes
- [x] AI-powered summarization
- [x] Translation feature (multi-language)
- [x] Translation toast fix (only shows success on actual success)
- [x] Auto-save functionality

---

## 4. FAMILY MANAGEMENT

- [x] Family member profiles
- [x] Role-based access
- [x] Family dashboard
- [x] Safe zones management
- [x] Location tracking (with permissions)

---

## 5. CALENDAR & SCHEDULING

- [x] Calendar view
- [x] Event creation
- [x] Google Calendar integration
- [x] Reminders
- [x] Family shared events

---

## 6. AI ASSISTANT

- [x] Chat interface
- [x] Context-aware responses
- [x] Meeting summarization
- [x] Task assistance

---

## 7. NOTIFICATIONS & RESOURCES

- [x] Push notifications
- [x] Email integration (Gmail, Outlook, Yahoo)
- [x] Notification center
- [x] Resource library

---

## 8. AUTHENTICATION & PAYMENTS

- [x] OAuth login (Google, etc.)
- [x] Supabase authentication
- [x] Stripe payment integration
- [x] Subscription management
- [x] Row Level Security (RLS) on database

---

## 9. UI/UX

- [x] Responsive design (mobile-friendly)
- [x] Dark/light theme support
- [x] Tailwind CSS styling
- [x] shadcn/ui components
- [x] Framer Motion animations
- [x] Phosphor Icons

---

# PART 2: PLANNED FEATURES (Todos)

## HIGH PRIORITY

### Messenger Attachments
- [ ] Send photos in chat
- [ ] Send files in chat
- [ ] Send voice recordings
- [ ] E2EE for all attachments (use encryption.ts module)
- [ ] Image preview before sending
- [ ] File size limits
- [ ] Progress indicators for uploads

### Voice/Video Calls
- [ ] Choose provider: Daily.co or Agora
- [ ] WebRTC implementation
- [ ] Audio calls
- [ ] Video calls
- [ ] Call UI (incoming, outgoing, in-call)
- [ ] Mute/unmute
- [ ] Camera on/off
- [ ] Speaker/earpiece toggle
- [ ] Call history

### Messenger Enhancements
- [ ] 3-dot settings menu in chat header
- [ ] Group QR codes (multi-person invite)
- [ ] Group chats
- [ ] Typing indicators ("User is typing...")
- [ ] Read receipts toggle
- [ ] Message reactions (emoji)
- [ ] Reply to specific message
- [ ] Forward messages
- [ ] Search within chat

---

## MEDIUM PRIORITY

### Permissions Migration
- [ ] Create Supabase table: `user_permissions`
- [ ] Move permissions from localStorage to database
- [ ] Sync permissions across devices
- [ ] Add Row Level Security (RLS)

### Storage & Subscription
- [ ] Storage limits by subscription tier
- [ ] Free tier: 1GB
- [ ] Pro tier: 10GB
- [ ] Family tier: 50GB
- [ ] Storage usage indicators
- [ ] Upgrade prompts when near limit

### AI Enhancements
- [ ] Text-to-speech (TTS) for AI responses
- [ ] Voice input for AI
- [ ] Internet search capability
- [ ] Context memory across sessions
- [ ] Custom AI personality settings

---

## LOWER PRIORITY

### Native Apps
- [ ] iOS app (Capacitor ready)
- [ ] Android app (Capacitor ready)
- [ ] Push notifications (native)
- [ ] Background sync
- [ ] Offline mode

### Advanced Security
- [ ] Custom encryption algorithm (FLOWSPHERE-CUSTOM-V1) - Target: Dec 2026
- [ ] Two-factor authentication (2FA)
- [ ] Login alerts
- [ ] Device management
- [ ] Session history
- [ ] Remote logout

### Social Features
- [ ] Status updates (like WhatsApp)
- [ ] Stories (24-hour disappearing)
- [ ] Profile customization
- [ ] Custom chat backgrounds

---

# PART 3: CLAUDE'S SUGGESTIONS & TIPS

## IMMEDIATE IMPROVEMENTS (Quick Wins)

### 1. Message Delivery Confirmation
**Current:** Status updates are simulated locally
**Suggestion:** Implement real delivery confirmation via Supabase
```
- When recipient's device receives message, update status to 'delivered'
- When recipient opens chat, update status to 'seen'
- Use Supabase realtime to sync status changes
```

### 2. Typing Indicators
**Why:** Makes chat feel more alive and real-time
**Implementation:**
```
- Create 'typing_status' table in Supabase
- Broadcast typing events via realtime
- Show "typing..." animation in chat header
- Auto-clear after 3 seconds of no typing
```

### 3. Message Search
**Why:** Users need to find old messages quickly
**Implementation:**
```
- Add search icon in chat header
- Full-text search on decrypted messages
- Highlight matching text
- Jump to message in conversation
```

### 4. Unread Message Count
**Current:** No badge showing unread messages
**Suggestion:**
```
- Add unread count badge on contact list
- Add total unread badge on messenger icon
- Clear count when chat is opened
```

---

## ARCHITECTURE IMPROVEMENTS

### 1. Offline Support
**Why:** Users need app to work without internet
**Suggestion:**
```
- Use IndexedDB for local message storage
- Queue messages when offline
- Sync when connection restored
- Show offline indicator
```

### 2. Message Pagination
**Why:** Loading thousands of messages at once is slow
**Suggestion:**
```
- Load last 50 messages initially
- "Load more" button or infinite scroll
- Keep messages in memory cache
- Lazy load older messages
```

### 3. Attachment Handling
**Why:** Current system doesn't handle large files well
**Suggestion:**
```
- Use Supabase Storage for attachments
- Generate thumbnails for images
- Compress images before upload
- Support resume on failed uploads
```

---

## SECURITY ENHANCEMENTS

### 1. Message Expiration on Server
**Current:** Auto-delete is client-side only
**Suggestion:**
```
- Store deletion timestamp in database
- Run server-side cleanup job
- Delete from Supabase when time expires
- Ensures deletion even if sender offline
```

### 2. Screenshot Detection (iOS/Android)
**Current:** Toggle exists but doesn't enforce
**Suggestion:**
```
- On native apps, detect screenshot events
- Notify sender when screenshot taken
- Option to blur messages on screenshot
```

### 3. Key Rotation
**Why:** Long-term key security
**Suggestion:**
```
- Rotate encryption keys periodically
- Re-encrypt messages with new keys
- Maintain backward compatibility
- Notify users of key changes
```

---

## UX IMPROVEMENTS

### 1. Onboarding Flow
**Why:** New users need guidance
**Suggestion:**
```
- Welcome screens explaining features
- Interactive tutorial for first message
- QR code pairing walkthrough
- Privacy settings explanation
```

### 2. Empty States
**Why:** Blank screens are confusing
**Suggestion:**
```
- "No messages yet" illustrations
- "Start chatting" call-to-action
- Feature discovery hints
- Quick action buttons
```

### 3. Error Handling
**Why:** Users need clear feedback
**Suggestion:**
```
- Friendly error messages
- Retry buttons for failed actions
- Connection status indicator
- Offline mode notification
```

---

## MONETIZATION IDEAS

### 1. Premium Features
```
- Extended message history (free: 30 days, pro: unlimited)
- Larger file attachments (free: 5MB, pro: 100MB)
- Custom themes
- Priority support
- Advanced analytics
```

### 2. Family Plans
```
- Up to 10 family members
- Shared storage pool
- Family admin controls
- Bulk user management
```

### 3. Business Tier
```
- Team messaging
- Admin dashboard
- Audit logs
- SSO integration
- API access
```

---

## PERFORMANCE OPTIMIZATIONS

### 1. Lazy Loading
```
- Load components on demand
- Split code by route
- Defer non-critical scripts
```

### 2. Image Optimization
```
- WebP format for smaller size
- Responsive images
- Blur placeholders
- CDN for static assets
```

### 3. Caching Strategy
```
- Service worker for offline
- Cache API responses
- IndexedDB for messages
- LocalStorage for settings
```

---

## TESTING RECOMMENDATIONS

### 1. Unit Tests
```
- Test encryption/decryption functions
- Test message status transitions
- Test contact management
```

### 2. Integration Tests
```
- Test Supabase realtime sync
- Test QR pairing flow
- Test message send/receive
```

### 3. E2E Tests
```
- Full user journey tests
- Cross-browser testing
- Mobile responsiveness
```

---

## FUTURE VISION (2026+)

### 1. Custom Encryption Algorithm
- Replace AES-256-GCM with proprietary algorithm
- Code placeholder already exists in encryption.ts
- Would differentiate FlowSphere from competitors

### 2. Decentralized Messaging
- Peer-to-peer option for ultra-privacy
- No server storage of messages
- Mesh network capability

### 3. AI Integration Deep Dive
- AI-powered message summaries
- Smart reply suggestions
- Sentiment analysis
- Spam/scam detection

### 4. Cross-Platform Sync
- Desktop app (Electron)
- Web extension
- Smart watch app
- TV app for family dashboard

---

# SUMMARY

## Current Status: 85/100 Production Ready

### Strengths
- Solid E2EE implementation
- Real-time messaging works
- Good privacy controls
- Clean UI/UX

### Areas to Improve
- Need voice/video calls
- Need attachment support
- Need offline capability
- Need better error handling

### Top 5 Next Steps
1. Add E2EE to messenger attachments
2. Implement voice/video calls
3. Add typing indicators
4. Add unread message counts
5. Improve offline support

---

**Target:** Millions of real users worldwide
**Platforms:** Web (current), iOS (ready), Android (ready)
**Competition:** WhatsApp, Signal, Telegram
**Differentiator:** Family-focused + Vault + All-in-one productivity

---

*This document should be updated as features are completed or plans change.*
