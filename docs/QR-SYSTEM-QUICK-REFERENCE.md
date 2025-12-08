# FlowSphere QR System - Quick Reference

**Last Updated:** December 4, 2025

---

## 🎯 Quick Summary

- **Current Algorithm:** Reed-Solomon (Standard QR)
- **Future Algorithm:** Custom FlowSphere Encryption (~1 month)
- **Modular Design:** Algorithm can be swapped without touching messenger code
- **Single File Update:** Only `src/lib/flowsphere-qr.ts` needs changes

---

## 📁 Key Files

```
src/
├── lib/
│   └── flowsphere-qr.ts          ← UPDATE THIS when changing algorithm
└── components/
    └── secure-messenger.tsx      ← NO CHANGES NEEDED (uses the module)

docs/
└── QR-ALGORITHM-REPLACEMENT-GUIDE.md  ← Full replacement instructions
```

---

## 🔑 Key Functions (flowsphere-qr.ts)

| Function | Purpose | Update Needed? |
|----------|---------|----------------|
| `generateQRCode()` | Creates QR image | ✅ YES - Add custom encryption |
| `parseQRData()` | Reads scanned QR | ✅ YES - Add custom decryption |
| `generateStealthQR()` | Creates faint QR | ✅ YES - Use custom algorithm |
| `isValidQRFormat()` | Quick validation | ✅ YES - Match new format |
| `getCurrentVersion()` | Returns version | ⚠️ Update version string |

---

## 🎨 ID Architecture

```
Email/Gmail
   ↓
Shadow ID (permanent, backend only)
   ↓
Device ID (vault encryption key)
   ↓
Profile IDs (unique per contact interaction)
```

### Example:
```
john@gmail.com
   ↓
SHADOW_a8f3d9e2c1b4 (never changes, backend)
   ↓
DEV_abc123_xyz789 (vault key)
   ↓
FS-A2B4C6D8 (with User 1)
FS-X9Y7Z5W3 (with User 2) ← Different!
```

---

## 🔐 QR Data Structure

```typescript
{
  code: "1234567890-ABCDEFGH",     // Unique invite code
  publicKey: "PK_...",              // Encryption key
  name: "John",                     // Display name
  expiresAt: "2025-12-05T...",     // ISO timestamp
  deviceId: "DEV_abc123",          // Vault key (tied to Shadow ID)
  userId: "FS-A2B4C6D8",           // Profile ID (changes per contact)
  version: "v1.0-reed-solomon"     // Algorithm version
}
```

---

## ⚡ How to Replace Algorithm

1. **Open:** `src/lib/flowsphere-qr.ts`
2. **Update:** `generateQRCode()` function (line ~40)
3. **Update:** `parseQRData()` function (line ~70)
4. **Change:** `QR_VERSION` to `'v2.0-flowsphere-custom'`
5. **Test:** Generate & scan QR codes
6. **Done!** Messenger keeps working

---

## 🛡️ Making QR Codes Unreadable

**Goal:** Only FlowSphere can decode the QR codes.

**Simple Approach:**
```typescript
// Encrypt BEFORE creating QR
const encrypted = await customEncrypt(data, secretKey)
const qrCode = await QRCode.toDataURL(encrypted)
```
External scanners will see gibberish.

**Advanced Approach:**
- Create custom dot pattern (not standard QR format)
- External scanners won't even recognize it

---

## 📝 Notes for Future

- **Shadow ID:** Add to QR data when backend is ready
- **Profile ID Generation:** Make unique per contact pair
- **Scanner:** May need custom scanner if QR format changes drastically
- **Backward Compatibility:** Optional, but good for transition period
- **Testing:** Test that external scanners get nothing/gibberish

---

## 🚀 Current Status (Dec 4, 2025)

✅ Name input bug fixed
✅ Privacy settings bug fixed
✅ QR system is modular and replaceable
✅ Reed-Solomon error correction active
⏳ Waiting for custom algorithm (~1 month)
⏳ Shadow ID system design in progress

---

**For detailed instructions, see:** `docs/QR-ALGORITHM-REPLACEMENT-GUIDE.md`
