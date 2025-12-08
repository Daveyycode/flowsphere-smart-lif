# Advanced Privacy Features - Implementation Plan
## December 4, 2025

---

## 🎯 Overview

Complete overhaul of Secure Messenger with advanced privacy controls that make FlowSphere unique in the market.

---

## 📐 Part 1: UI Restructuring (Non-Overlapping Layout)

### Current Problem
- Contact list and chat overlap on small screens
- Limited visibility
- Confusing navigation

### Solution
**Full-Screen Conversation View**
```
[Contact List View]          [Conversation View]
┌─────────────────┐          ┌─────────────────┐
│ ← Secure Msgr   │          │ ← Back  [Name]  │
│                 │   →      │                 │
│ Contact 1       │  Tap     │ [Messages...]   │
│ Contact 2       │          │                 │
│ Contact 3       │          │ [Input + Send]  │
└─────────────────┘          └─────────────────┘
```

### Implementation
1. Remove sidebar layout
2. Use view state: `contacts` | `conversation`
3. Full screen for each view
4. Back button in conversation view
5. Smooth transitions

---

## 🔐 Part 2: Per-User Privacy Settings

### Current Problem
- Privacy settings are global (affect everyone)
- User 1 toggles "hide online" → hides from everyone including User 2
- Not granular enough

### Solution
**Each User Controls What OTHERS See About THEM**

```typescript
// OLD (Global - WRONG)
const [privacySettings, setPrivacySettings] = useState({
  showOnlineStatus: true,  // Affects MY view of EVERYONE
  showLastSeen: true
})

// NEW (Per-User - CORRECT)
interface Contact {
  id: string
  name: string
  // ... other fields
  privacySettings: {
    showOnlineStatus: boolean  // What THIS contact wants me to see
    showLastSeen: boolean
    allowScreenshots: boolean
    allowForwarding: boolean
  }
}

// MY privacy settings (what others see about ME)
const [myPrivacySettings, setMyPrivacySettings] = useState({
  showOnlineStatus: true,  // Do others see my online status?
  showLastSeen: true,      // Do others see my last seen?
  allowScreenshots: false, // Can others screenshot my messages?
  allowForwarding: false   // Can others forward my messages?
})
```

### How It Works
1. **User 1** sets their privacy:
   - `showOnlineStatus = false`
   - This syncs to Supabase

2. **User 2** opens messenger:
   - Fetches User 1's privacy settings
   - Cannot see User 1's online status
   - Can still see other contacts' status (if they allow it)

3. **User 1** can still see User 2's status (if User 2 allows it)

### Database Structure
```sql
-- New table: user_privacy_settings
CREATE TABLE user_privacy_settings (
  user_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  show_online_status BOOLEAN DEFAULT true,
  show_last_seen BOOLEAN DEFAULT true,
  allow_screenshots BOOLEAN DEFAULT false,
  allow_forwarding BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_user_privacy_device ON user_privacy_settings(device_id);
```

### Implementation Steps
1. Create `user_privacy_settings` table in Supabase
2. Update Contact interface to include `privacySettings`
3. Fetch privacy settings when loading contacts
4. Apply privacy rules when displaying status
5. Real-time sync when privacy changes

---

## 📎 Part 3: Advanced Attachment Controls

### Feature: Per-Attachment Expiry Options

**Before Sending Attachment:**
```
┌──────────────────────────────────┐
│  Send Photo Options              │
│                                  │
│  ⚫ View Once (disappears)       │
│  ⚪ 30 seconds                   │
│  ⚪ 1 minute                     │
│  ⚪ 5 minutes                    │
│  ⚪ 1 hour                       │
│  ⚪ Allow Save (Vault only)     │
│                                  │
│  [Cancel]           [Send]       │
└──────────────────────────────────┘
```

### Attachment Metadata (Updated)
```typescript
export interface AttachmentMetadata {
  id: string
  type: AttachmentType
  fileName: string
  fileSize: number
  mimeType: string
  encryptionMeta: Omit<EncryptionResult, 'encryptedData'>
  encryptedData: string
  storageLocation: 'database' | 'indexeddb'
  uploadedAt: string
  encryptedBy: string

  // NEW: Expiry & Control Settings
  expiryType: 'view-once' | 'timer' | 'never'
  expiryDuration?: number  // seconds (30, 60, 300, 3600)
  expiresAt?: string       // ISO timestamp
  viewCount: number        // How many times viewed
  maxViews: number         // Max views allowed (1 for view-once)
  allowSave: boolean       // Can recipient save to vault?
  allowForward: boolean    // Can recipient forward? (always false for now)
  deviceFingerprint: string // Device ID that can view it
}
```

### View Once Logic
```typescript
// When attachment is opened:
1. Check if viewCount >= maxViews
   - If yes: Show "This attachment has expired"
   - If no: Decrypt and show

2. Increment viewCount in database

3. If expiryType === 'view-once':
   - After view, delete encrypted data
   - Keep metadata with "expired" flag
```

### Timer-Based Expiry Logic
```typescript
// When attachment is opened:
1. Check if now > expiresAt
   - If yes: Show "This attachment has expired"
   - If no: Decrypt and show

2. Start countdown timer in UI

3. When timer expires:
   - Delete encrypted data
   - Remove from view
```

---

## 🔒 Part 4: Device Fingerprint Validation

### Purpose
**Prevent forwarding/sharing attachments to other devices**

### How It Works
```typescript
// When User 1 sends attachment to User 2:
1. Attachment is encrypted with User 2's public key
2. Attachment includes deviceFingerprint = User 2's device ID
3. Stored in Supabase

// When User 2 opens attachment:
1. Check attachment.deviceFingerprint === currentDeviceId
   - If match: Decrypt and show
   - If mismatch: Show junk data or error

// If User 2 tries to forward to User 3:
1. Attachment.deviceFingerprint still = User 2's device ID
2. User 3's device ID ≠ User 2's device ID
3. Attachment shows as corrupted/junk
```

### Implementation
```typescript
export function validateDeviceFingerprint(
  attachment: AttachmentMetadata,
  currentDeviceId: string
): boolean {
  return attachment.deviceFingerprint === currentDeviceId
}

export async function decryptAttachment(
  metadata: AttachmentMetadata,
  encryptionKey: string,
  currentDeviceId: string  // NEW parameter
): Promise<Blob> {
  // Validate device fingerprint FIRST
  if (!validateDeviceFingerprint(metadata, currentDeviceId)) {
    // Return junk data or throw error
    throw new Error('This attachment cannot be opened on this device')
  }

  // ... rest of decryption logic
}
```

---

## 💾 Part 5: Vault-Only Saving

### Feature
**Attachments can only be saved to FlowSphere Vault (never to device)**

### UI Flow
```
User views photo → Clicks "Save" button
   ↓
Save Options Dialog:
┌──────────────────────────────────┐
│  Save Photo                      │
│                                  │
│  ✓ Save to FlowSphere Vault     │
│    (encrypted, device-locked)    │
│                                  │
│  ✗ Save to Device (Not Allowed) │
│    Sender disabled this          │
│                                  │
│  [Cancel]           [Save]       │
└──────────────────────────────────┘
```

### Implementation
```typescript
export async function saveAttachmentToVault(
  attachment: AttachmentMetadata,
  encryptionKey: string,
  deviceId: string,
  vaultPin: string  // User's vault PIN
): Promise<void> {
  // 1. Decrypt attachment
  const blob = await decryptAttachment(attachment, encryptionKey, deviceId)

  // 2. Re-encrypt with vault PIN (double encryption)
  const vaultEncrypted = await encryptFile(
    new File([blob], attachment.fileName),
    vaultPin
  )

  // 3. Store in vault with device fingerprint
  const vaultEntry = {
    id: `vault_${Date.now()}`,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    mimeType: attachment.mimeType,
    encryptedData: vaultEncrypted,
    deviceFingerprint: deviceId,  // Lock to this device
    savedAt: new Date().toISOString(),
    source: 'messenger'
  }

  // 4. Save to Supabase vault table
  await saveToVault(vaultEntry)
}
```

### MAC Address Binding
```typescript
// When saving to vault:
const deviceFingerprint = getOrCreateDeviceId()  // Already has MAC-like fingerprint

// When opening from vault on different device:
if (vaultEntry.deviceFingerprint !== currentDeviceId) {
  throw new Error('This file is locked to another device')
}
```

---

## 🗑️ Part 6: Delete for Everyone

### Feature
**Two delete options:**
1. **Delete for Me** - Removes from my device only
2. **Delete for Everyone** - Removes from all devices (both sender and recipient)

### UI
```
Long press message → Delete Options:
┌──────────────────────────────────┐
│  Delete Message                  │
│                                  │
│  ⚪ Delete for Me                │
│     (Only removes from my side)  │
│                                  │
│  ⚪ Delete for Everyone          │
│     (Removes for both sides)     │
│                                  │
│  [Cancel]           [Delete]     │
└──────────────────────────────────┘
```

### Implementation
```typescript
// Message interface (updated)
interface Message {
  // ... existing fields
  deletedForAll: boolean       // NEW: Marked as deleted for everyone
  deletedForUserIds: string[]  // NEW: List of users who deleted for themselves
}

// Delete for Me
export async function deleteMessageForMe(
  messageId: string,
  userId: string
): Promise<void> {
  // Update message in Supabase
  await supabase
    .from('messages')
    .update({
      deletedForUserIds: sql`array_append(deleted_for_user_ids, ${userId})`
    })
    .eq('id', messageId)

  // Remove from local state
  setMessages(prev => prev.filter(m => m.id !== messageId))
}

// Delete for Everyone
export async function deleteMessageForEveryone(
  messageId: string,
  senderId: string
): Promise<void> {
  // Only sender can delete for everyone
  const message = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single()

  if (message.sender_id !== senderId) {
    throw new Error('Only sender can delete for everyone')
  }

  // Mark as deleted for all
  await supabase
    .from('messages')
    .update({
      deletedForAll: true,
      content: '[This message was deleted]'
    })
    .eq('id', messageId)

  // Delete attachment if exists
  if (message.attachment) {
    await deleteAttachment(message.attachment)
  }

  // Real-time will sync to recipient
}

// Display logic
function shouldShowMessage(message: Message, currentUserId: string): boolean {
  if (message.deletedForAll) return false
  if (message.deletedForUserIds.includes(currentUserId)) return false
  return true
}
```

---

## 🗄️ Database Schema Updates

### New Tables

```sql
-- User Privacy Settings
CREATE TABLE user_privacy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  show_online_status BOOLEAN DEFAULT true,
  show_last_seen BOOLEAN DEFAULT true,
  allow_screenshots BOOLEAN DEFAULT false,
  allow_forwarding BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_privacy_user_id ON user_privacy_settings(user_id);
CREATE INDEX idx_user_privacy_device_id ON user_privacy_settings(device_id);
```

### Updated Tables

```sql
-- Messages table (add new columns)
ALTER TABLE messages
ADD COLUMN deleted_for_all BOOLEAN DEFAULT false,
ADD COLUMN deleted_for_user_ids TEXT[] DEFAULT '{}',
ADD COLUMN attachment_expiry_type TEXT,
ADD COLUMN attachment_expires_at TIMESTAMP,
ADD COLUMN attachment_view_count INTEGER DEFAULT 0,
ADD COLUMN attachment_max_views INTEGER DEFAULT 999,
ADD COLUMN attachment_allow_save BOOLEAN DEFAULT true,
ADD COLUMN attachment_device_fingerprint TEXT;
```

---

## 📋 Implementation Checklist

### Phase 1: UI Restructuring ✅ (Start Here)
- [ ] Remove dialog sidebar layout
- [ ] Implement full-screen view switching
- [ ] Add back button in conversation view
- [ ] Test on mobile and desktop
- [ ] Add smooth transitions

### Phase 2: Per-User Privacy
- [ ] Create privacy settings table in Supabase
- [ ] Update Contact interface
- [ ] Implement privacy settings UI
- [ ] Fetch and apply privacy rules
- [ ] Real-time sync privacy changes
- [ ] Test privacy across multiple users

### Phase 3: Attachment Expiry
- [ ] Update AttachmentMetadata interface
- [ ] Add expiry options dialog before send
- [ ] Implement view-once logic
- [ ] Implement timer-based expiry
- [ ] Update UI to show expiry status
- [ ] Test expiry across devices

### Phase 4: Device Fingerprint
- [ ] Add device validation to decryption
- [ ] Implement junk data generation for invalid devices
- [ ] Test forwarding prevention
- [ ] Add user-friendly error messages

### Phase 5: Vault-Only Saving
- [ ] Implement save-to-vault function
- [ ] Update vault UI to show messenger attachments
- [ ] Add device fingerprint validation in vault
- [ ] Disable device photo gallery save
- [ ] Test cross-device vault access

### Phase 6: Delete for Everyone
- [ ] Add delete options UI
- [ ] Implement delete for me logic
- [ ] Implement delete for everyone logic
- [ ] Add real-time sync for deletions
- [ ] Test cross-device deletion
- [ ] Add sender-only validation

---

## 🎯 Success Criteria

### UI
- ✅ No overlapping views
- ✅ Clean, full-screen conversation experience
- ✅ Easy back navigation
- ✅ Beautiful and simple (as requested)

### Privacy
- ✅ Each user controls what others see about them
- ✅ Privacy settings work per-contact
- ✅ Settings sync in real-time
- ✅ Toggle buttons are responsive to their function

### Attachments
- ✅ View-once works (auto-deletes after view)
- ✅ Timer-based expiry works (auto-deletes after time)
- ✅ Device fingerprint prevents forwarding
- ✅ Junk data shows on unauthorized devices
- ✅ Vault-only saving works
- ✅ MAC address binding prevents cross-device access

### Deletion
- ✅ Delete for me works (local only)
- ✅ Delete for everyone works (both sides)
- ✅ Real-time sync works
- ✅ Only sender can delete for everyone

---

## 🚀 Ready to Implement!

Starting with Phase 1: UI Restructuring...
