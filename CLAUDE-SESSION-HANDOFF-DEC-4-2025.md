# CLAUDE SESSION HANDOFF - December 4, 2025

**Created:** December 4, 2025 ~3:22 AM
**Purpose:** Complete context for continuing FlowSphere development
**Status:** 85% production-ready, Secure Messenger features complete

---

## PROJECT OVERVIEW

**FlowSphere** is a family productivity app with:
- Secure Messenger (E2EE QR-based)
- Encrypted Vault (AES-256-GCM)
- Meeting Notes with AI
- Family Management
- Calendar Integration
- And more...

**Tech Stack:**
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Database + Realtime)
- Stripe (Payments)

**Working Directory:** `/Users/abbieatienza/LocalProjects/flowsphere-from-github`

---

## START DEV SERVER

```bash
cd /Users/abbieatienza/LocalProjects/flowsphere-from-github
npx vite --host --port 5000
```
- Local: http://localhost:5000
- Network: http://192.168.8.105:5000 (for phone testing)

---

## WHAT WE COMPLETED IN THIS SESSION

### 1. Message Status Indicators (DONE)
- `...` (sending) - animated three dots
- `.` (sent) - single dot
- `✓` (delivered) - gray check
- `✓✓` (seen) - purple double check

### 2. Online Status & Last Seen (DONE)
- Green dot = online
- Yellow dot = away
- Gray dot = offline
- "Last seen X ago" timestamps
- Updates every minute while messenger is open

### 3. Privacy Settings Dialog (DONE)
- Toggle: Show Online Status
- Toggle: Show Last Seen
- Toggle: Show Unique ID
- Toggle: Allow Screenshots
- Toggle: Allow Saving Media
- Auto-Delete Timer selector (Off, 1min, 5min, 15min, 1hr, 6hrs, 12hrs, 24hrs)

### 4. Auto-Delete Timer (DONE)
- Messages auto-delete X minutes after being seen
- Clock icon shows on messages with timer
- System checks every 10 seconds for expired messages

### 5. ID System Separation (DONE)
- **Device ID**: Internal, tied to device/browser, used for vault & auth
  - Format: `DEV_XXXX_XXXX`
  - NOT shareable
  - Changes only with device/email change
- **User ID**: Shareable messenger identity
  - Format: `FS-XXXXXXXX`
  - Can share with contacts

### 6. Duplicate Contact Prevention (DONE)
- Checks by device ID, user ID, and public key before adding
- Shows "Already connected with X" if duplicate

### 7. Deleted Account Handling (DONE)
- `isDeleted` flag on Contact interface
- Shows "Deleted Account" instead of name
- Grayed out avatar with "?"
- Disables message input with warning
- Can still view old messages (read-only)

### 8. Delete Functionality (DONE)
**Delete Message Dialog:**
- "Delete for me" - local only
- "Delete for everyone" - removes for all (own messages only)
- Shows message preview
- Cancel button

**Delete Conversation Dialog:**
- "Clear chat for me" - keeps contact
- "Clear chat for everyone" - removes all messages
- "Remove contact" - deletes everything
- Shows contact info + message count
- Warning: cannot be undone

**UI:**
- Red trash icon in chat header
- Hover-to-show delete buttons on messages
- Click/tap message opens delete dialog

---

## KEY FILE: secure-messenger.tsx

**Location:** `src/components/secure-messenger.tsx`

### Interfaces Added:
```typescript
interface Contact {
  id: string
  name: string
  publicKey: string
  pairingCode: string
  pairedAt: string
  lastSeen?: string
  lastSeenTimestamp?: string
  status: 'online' | 'offline' | 'away'
  isVerified: boolean
  conversationId?: string
  contactUserId?: string
  contactProfileId?: string
  isDeleted?: boolean  // NEW
}

interface Message {
  id: string
  contactId: string
  text: string
  timestamp: string
  status: 'sending' | 'sent' | 'delivered' | 'seen'  // NEW
  isOwn: boolean
  encrypted: boolean
  seenAt?: string  // NEW
  autoDeleteTimer?: number  // NEW
  deleteAt?: string  // NEW
}

interface MessengerPrivacySettings {
  showOnlineStatus: boolean
  showLastSeen: boolean
  allowScreenshots: boolean
  allowSaveMedia: boolean
  showUniqueId: boolean
  autoDeleteTimer: number
}
```

### Functions Added:
- `getOrCreateDeviceId()` - generates device fingerprint ID
- `getOrCreateUserId()` - generates FS-XXXXXXXX user ID
- `formatLastSeen(timestamp)` - "Just now", "5m ago", etc.
- `renderStatusIndicator(status, isOwn)` - renders status icons
- `deleteMessageForMe(messageId)` - local delete
- `deleteMessageForEveryone(message)` - delete for all
- `deleteConversation(forEveryone)` - clear chat
- `deleteContact(contactId)` - remove contact entirely
- `handleMessageLongPress(message)` - opens delete dialog

### State Added:
```typescript
const [privacySettings, setPrivacySettings] = useKV<MessengerPrivacySettings>('qr-messenger-privacy', DEFAULT_PRIVACY_SETTINGS)
const [lastOnline, setLastOnline] = useKV<string>('qr-messenger-last-online', new Date().toISOString())
const [showSettings, setShowSettings] = useState(false)
const [showDeleteMessageDialog, setShowDeleteMessageDialog] = useState(false)
const [showDeleteConversationDialog, setShowDeleteConversationDialog] = useState(false)
const [messageToDelete, setMessageToDelete] = useState<Message | null>(null)
```

### Effects Added:
- Online status tracking (updates every minute)
- Auto-delete expired messages (checks every 10 seconds)
- Mark messages as seen when viewing chat

---

## DATABASE: Supabase Tables

**Migration file:** `supabase-migrations/messenger-realtime-tables.sql`

### Tables:
1. `messenger_pairings` - QR code invites
2. `messenger_contacts` - bidirectional contacts
3. `messenger_messages` - encrypted messages

### Real-time enabled for:
- messenger_contacts (auto-connect notification)
- messenger_messages (live chat)
- messenger_pairings (invite status)

---

## TYPESCRIPT FIXES APPLIED

1. Renamed `otherUserId` to `otherProfileId` (fixed duplicate declaration)
2. Added `|| []` fallbacks for `messages`, `contacts`
3. Added `|| DEFAULT_PRIVACY_SETTINGS` fallbacks
4. Wrapped Clock icon in span for title attribute
5. Used spread with defaults: `{ ...DEFAULT_PRIVACY_SETTINGS, ...privacySettings, key: value }`

---

## ALL TODOS (FROM FIRST CONVERSATION)

### COMPLETED:
- [x] Message status indicators (sending/sent/delivered/seen)
- [x] Online status and last seen tracking
- [x] Privacy settings (online status, screenshots, save media, show ID)
- [x] Auto-delete timer for messages (1min to 24hrs after seen)
- [x] Fix duplicate contacts and handle deleted accounts
- [x] Add delete conversation and delete message (for me / for everyone)
- [x] E2EE File Encryption (Vault) - AES-256-GCM with PIN
- [x] Biometric Unlock (WebAuthn)
- [x] QR Code Scanning (real jsQR camera)
- [x] Steganographic QR (faint/hidden mode)
- [x] Translation toast bug fix

### PENDING:
- [ ] Add E2EE to Messenger attachments (use encryption.ts module)
- [ ] Implement voice/video calls (Daily.co or Agora)
- [ ] Move permissions to Supabase (from localStorage)
- [ ] Messenger: Send pictures, files, voice recordings
- [ ] Messenger: 3-dot settings menu
- [ ] Messenger: Group QR codes
- [ ] Storage limits by subscription tier
- [ ] AI Assistant sound capabilities (TTS)
- [ ] Internet search for AI

---

## CRITICAL RULES (NEVER BREAK)

1. **NEVER recreate files** - ALWAYS use Edit tool
2. **NEVER add fake/mock data** - Use real backends only
3. **NEVER touch unrelated files** - Feature isolation
4. **ALWAYS keep Vault SEPARATE per user** - Family privacy
5. **ALWAYS log changes** to tracking files
6. **ALWAYS read files before editing**

---

## OTHER KEY FILES

| Purpose | File |
|---------|------|
| E2EE Module | `src/lib/encryption.ts` |
| Vault Component | `src/components/vault.tsx` |
| QR Connection | `src/lib/qr-connection.ts` |
| Secure Messenger | `src/components/secure-messenger.tsx` |
| Real-time Messaging | `src/lib/real-messaging.ts` |
| Session Logs | `merged-FL-DONT-TOUCH/WHAT-WE-SUCCESSFULLY-EDITED-CHANGED.md` |
| Master Todo | `MASTER-TODO-LIST.md` |
| Quick Start | `QUICK-START-NEXT-SESSION.md` |

---

## SECURITY ARCHITECTURE

```
VAULT (PRIVATE - SEPARATE per family member)
├── E2EE Encryption: AES-256-GCM
├── Key Derivation: PBKDF2 (100,000 iterations)
├── PIN: User's PIN = encryption key
├── Zero-Knowledge: FlowSphere cannot read files
├── Biometrics: Convenience layer (PIN still needed for crypto)
└── Future: Custom algorithm ~Dec 2026 (placeholder in code)

MESSENGER
├── QR-based pairing (one-time codes)
├── E2EE messages
├── Auto-delete after seen (configurable)
├── Device ID + User ID separation
└── Supabase Realtime for sync
```

---

## PRODUCTION READINESS: 85/100

| Feature | Status |
|---------|--------|
| E2EE Vault Encryption | ✅ Complete |
| Biometric Unlock | ✅ Complete |
| QR Code Scanning | ✅ Complete |
| Steganographic QR | ✅ Complete |
| Message Status Indicators | ✅ Complete |
| Online Status / Last Seen | ✅ Complete |
| Privacy Settings | ✅ Complete |
| Auto-Delete Timer | ✅ Complete |
| Delete Message/Conversation | ✅ Complete |
| Deleted Account Handling | ✅ Complete |
| Voice/Video Calls | ⚠️ Not started |
| Messenger Attachments E2EE | ⚠️ Pending |

---

## NEXT SESSION: SUGGESTED PRIORITIES

1. **Add E2EE to Messenger attachments**
   - Use `src/lib/encryption.ts` module
   - Encrypt images/files before sending
   - Decrypt on receive

2. **Voice/Video Calls**
   - Choose: Daily.co or Agora
   - Implement WebRTC
   - Add call UI to messenger

3. **Messenger attachments**
   - Photos, files, voice recordings
   - Use Supabase Storage

---

## IF SOMETHING BREAKS

1. Check browser console: `Cmd+Option+J`
2. Check `BUGS-AND-ERRORS-LOG.md`
3. Port conflict: `lsof -i :5000`
4. Backups in `.backup-dec3-qr/`

---

## USER REQUESTS FROM SESSION

1. Message status indicators with specific symbols
2. Auto-delete timer (1min to 24hrs after seen)
3. Device ID separate from User ID
4. Duplicate contact prevention
5. Deleted account handling (read-only view)
6. Delete conversation + delete message (for me / for everyone)

---

**Target:** Millions of real users worldwide
**Platforms:** Web (current), iOS (native-ready), Android (native-ready)

---

*This file contains everything needed to continue development. Read this first before making any changes.*
