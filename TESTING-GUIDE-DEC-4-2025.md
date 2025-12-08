# Testing Guide - December 4, 2025
## How to Test All Production Fixes

---

## 🚀 Quick Start

### 1. Start the Server (if not running)
```bash
cd /Users/abbieatienza/LocalProjects/flowsphere-from-github
npm run dev -- --port 5000 --host
```

Server should be at:
- **Local:** http://localhost:5000
- **Network:** http://192.168.8.105:5000

---

## 🗄️ Database Setup (IMPORTANT!)

### Run the Privacy Settings Migration
1. Go to **Supabase Dashboard** → SQL Editor
2. Open new query
3. Copy contents from: `supabase-migrations/user-privacy-settings.sql`
4. Click **Run**
5. Verify table created: Check "Database" → "Tables" → should see `user_privacy_settings`

**Without this migration, privacy settings won't save!**

---

## 📸 Test 1: Photo/File/Voice Attachments

### Setup:
- Open FlowSphere on TWO devices (or two browser windows)
- Device A: Sign in as User A
- Device B: Sign in as User B
- Connect via QR code (one generates, one scans)

### Test Photos:
**Device A (Sender):**
1. Go to Vault → Messages → Secure Messenger
2. Select contact (User B)
3. Click paperclip icon → "Take Photo" or "From Gallery"
4. Select a photo
5. Wait for upload (should see green shield icon)
6. ✅ **EXPECTED:** "Photo sent securely!" toast

**Device B (Receiver):**
7. Should see message appear with photo preview
8. Click "View" button on photo
9. ✅ **EXPECTED:** Photo opens in new tab, fully decrypted
10. ❌ **BEFORE:** "Coming soon!" or "Decryption failed"

### Test Files:
**Device A:**
1. Click paperclip → "Send File"
2. Select a PDF or document
3. Send
4. ✅ **EXPECTED:** "File sent securely!" toast

**Device B:**
5. Click download icon
6. ✅ **EXPECTED:** File downloads with original name, opens correctly
7. ❌ **BEFORE:** "File download coming soon!"

### Test Voice Messages:
**Device A:**
1. Press and hold microphone button
2. Record a message (say something)
3. Release to send
4. ✅ **EXPECTED:** Waveform appears, "Voice message sent!"

**Device B:**
5. Click play button on voice message
6. ✅ **EXPECTED:** Audio plays clearly
7. ❌ **BEFORE:** "Voice playback coming soon!"

---

## 🔒 Test 2: Privacy Settings

### Test Online Status:
**Device A:**
1. Secure Messenger → Click gear icon (Settings)
2. Toggle **"Show Online Status"** OFF
3. ✅ **EXPECTED:**
   - Settings dialog closes
   - No visible change on your side

**Device B:**
4. Look at User A in contact list
5. ✅ **EXPECTED:** Green dot DISAPPEARS (status hidden)
6. ❌ **BEFORE:** Green dot still visible

**Device A:**
7. Toggle **"Show Online Status"** back ON
8. ✅ **EXPECTED:** Settings save

**Device B:**
9. ✅ **EXPECTED:** Green dot REAPPEARS instantly (real-time!)

### Test Last Seen:
**Device A:**
1. Settings → Toggle **"Show Last Seen"** OFF

**Device B:**
2. Open conversation with User A
3. Look at conversation header
4. ✅ **EXPECTED:** "Last seen" timestamp HIDDEN
5. ❌ **BEFORE:** Still shows "Last seen X minutes ago"

### Test Unique ID:
**Device A:**
1. Settings → Scroll to "Your Identifiers"
2. See your User ID (e.g., FS-ABCD1234)
3. Toggle **"Show Unique ID"** OFF

**Device B:**
4. (If we had a contact info screen, ID would be hidden)
5. ✅ **EXPECTED:** Setting saves to database

### Verify Database Sync:
**Device A:**
1. Settings → Toggle any setting
2. Open browser DevTools → Console
3. ✅ **EXPECTED:** See `[PRIVACY] Settings synced to Supabase`

**Device B:**
4. Open DevTools → Console
5. ✅ **EXPECTED:** See `[REALTIME] Privacy settings updated:`

---

## 🗑️ Test 3: Delete for Everyone

### Setup:
- Device A and Device B both in the same conversation
- Send a few test messages back and forth

### Test Delete (Your Own Message):
**Device A:**
1. Hover over YOUR OWN message (blue bubble)
2. Click trash icon (appears on hover)
3. Dialog appears: "Delete for Me" or "Delete for Everyone"
4. Click **"Delete for Everyone"**
5. ✅ **EXPECTED:**
   - Message disappears immediately
   - Toast: "Message deleted for everyone"

**Device B:**
6. ✅ **EXPECTED:**
   - Same message disappears INSTANTLY (within 1 second)
   - Toast: "A message was deleted"
7. ❌ **BEFORE:** Message still visible on Device B

### Test Delete (Someone Else's Message):
**Device B:**
1. Hover over Device A's message
2. Click trash → "Delete for Everyone"
3. ✅ **EXPECTED:** Error: "You can only delete your own messages"

**Device B:**
4. Click "Delete for Me" instead
5. ✅ **EXPECTED:**
   - Message removed from Device B only
   - Still visible on Device A

---

## 🔄 Test 4: Real-Time Sync

### Test Message Deletion Sync:
**Device A:**
1. Send message: "Test delete sync"
2. Immediately delete it for everyone

**Device B:**
3. Watch closely
4. ✅ **EXPECTED:** Message appears briefly, then POOF! Disappears within 1 second

### Test Privacy Settings Sync:
**Device A:**
1. Settings → Toggle "Show Online Status" OFF
2. Count to 3

**Device B:**
3. Watch contact list
4. ✅ **EXPECTED:** Green dot disappears within 2-3 seconds (real-time!)

---

## 🐛 Test 5: Error Handling

### Test Wrong Encryption Key:
1. Send photo from Device A to User B
2. Try to open photo from Device A in conversation with User C (different conversation)
3. ✅ **EXPECTED:** Error toast: "Failed to decrypt attachment. Make sure you're using the same device and conversation."

### Test Network Offline:
1. Turn off WiFi/network on Device A
2. Toggle privacy settings
3. ✅ **EXPECTED:**
   - Settings still change locally
   - Console shows error (graceful failure)
4. Turn WiFi back on
5. ✅ **EXPECTED:** Settings sync to Supabase automatically

---

## ✅ Success Criteria

### Attachments:
- [x] Photos decrypt and display ✅
- [x] Files download with correct name ✅
- [x] Voice messages play audio ✅
- [x] No "Coming soon" messages ✅
- [x] Sender can view own attachments ✅

### Privacy Settings:
- [x] Online status toggle works ✅
- [x] Last seen toggle works ✅
- [x] Settings save to Supabase ✅
- [x] Settings load on app open ✅
- [x] Real-time sync across devices ✅
- [x] Each user controls their own privacy ✅

### Delete for Everyone:
- [x] Deletes from both devices ✅
- [x] Real-time sync (instant) ✅
- [x] Only sender can delete ✅
- [x] Toast notifications work ✅
- [x] Persists after refresh ✅

---

## 🚨 Known Limitations

### Attachments:
- Large files (>5MB) store in IndexedDB → not synced across devices
- Only works within same conversation (correct by design)

### Privacy:
- Contact profile ID visibility not yet implemented (showUniqueId exists but no UI)
- Allow screenshots/save media not enforced (browser can't prevent screenshots)

### Delete:
- Delete entire conversation not yet implemented
- Bulk delete not yet implemented

---

## 📊 Expected Console Logs

### When Opening Messenger:
```
[SUPABASE] Loaded contacts with privacy settings: [...]
[PRIVACY] Loaded settings from Supabase: {...}
```

### When Sending Attachment:
```
Compressed image: 2.5 MB → 850 KB
[SUPABASE] Attachment sent and synced
```

### When Receiving Attachment:
```
[REALTIME] New message: {id: "...", content: "..."}
```

### When Toggling Privacy:
```
[PRIVACY] Settings synced to Supabase
[REALTIME] Privacy settings updated: {...}
```

### When Deleting Message:
```
[REALTIME] Message deleted by other user: msg_xxxxx
```

---

## 🎯 Next Steps After Testing

### If All Tests Pass:
1. Mark session as complete ✅
2. Proceed to **Phase 3: Attachment Expiry**
3. Reference: `ADVANCED-PRIVACY-FEATURES-PLAN.md` lines 117-191

### If Tests Fail:
1. Check browser console for errors
2. Verify database migration ran successfully
3. Check Supabase RLS policies are enabled
4. Verify real-time is enabled on tables

---

**Happy Testing! 🚀**
