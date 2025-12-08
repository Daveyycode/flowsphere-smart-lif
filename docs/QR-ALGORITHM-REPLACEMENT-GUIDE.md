# QR Algorithm Replacement Guide

**Date Created:** December 4, 2025
**Target Replacement Date:** ~January 2026 (1 month)
**Current Status:** Using Reed-Solomon (Standard QR)
**Future Status:** Custom FlowSphere Encryption

---

## Overview

FlowSphere's QR code system is designed to be **completely modular and replaceable**. When the custom encryption algorithm is ready, you only need to update **one file** without touching the messenger component.

---

## Current Architecture

### Files Involved:
1. **`src/lib/flowsphere-qr.ts`** - QR generation/parsing logic (UPDATE THIS)
2. **`src/components/secure-messenger.tsx`** - Uses QR module (NO CHANGES NEEDED)
3. **`jsQR`** - Scanner library (MAY NEED TO REPLACE)

### Current Flow:
```
User clicks "Generate QR"
  → secure-messenger.tsx calls generateFlowSphereQR()
  → flowsphere-qr.ts creates standard QR with Reed-Solomon
  → Returns base64 image

User scans QR
  → jsQR library decodes image
  → secure-messenger.tsx calls parseQRData()
  → flowsphere-qr.ts parses JSON
  → Returns invite data
```

---

## How to Replace the Algorithm

### Step 1: Update `flowsphere-qr.ts`

**Replace these functions:**

#### `generateQRCode()` - Line ~40
```typescript
// BEFORE (Reed-Solomon):
const qrDataURL = await QRCode.toDataURL(payload, {
  width: size,
  errorCorrectionLevel: 'H',
  // ...
})

// AFTER (Custom Algorithm):
const encrypted = await yourCustomEncryption(payload)
const qrDataURL = await yourCustomQRGenerator(encrypted, size)
```

#### `parseQRData()` - Line ~70
```typescript
// BEFORE (Standard parse):
const parsed = JSON.parse(rawData)

// AFTER (Custom decryption):
const decrypted = await yourCustomDecryption(rawData)
const parsed = JSON.parse(decrypted)
```

#### `isValidQRFormat()` - Line ~95
```typescript
// Update validation logic to match new format
```

### Step 2: Update Version Number

```typescript
// Change this line:
const QR_VERSION = 'v1.0-reed-solomon'

// To:
const QR_VERSION = 'v2.0-flowsphere-custom'
```

### Step 3: Implement Backward Compatibility (Optional)

If you want old QR codes to still work during transition:

```typescript
export function parseQRData(rawData: string): QRInviteData | null {
  try {
    // Try new algorithm first
    const decrypted = await yourCustomDecryption(rawData)
    const parsed = JSON.parse(decrypted)

    if (parsed.version === 'v2.0-flowsphere-custom') {
      return parsed
    }
  } catch {
    // Fall back to old algorithm
    try {
      const parsed = JSON.parse(rawData) // Old Reed-Solomon
      if (parsed.version === 'v1.0-reed-solomon') {
        console.warn('Using deprecated QR format')
        return parsed
      }
    } catch {
      return null
    }
  }
}
```

### Step 4: Replace Scanner (If Needed)

If `jsQR` can't read your custom QR codes:

**In `secure-messenger.tsx`**, replace jsQR import:
```typescript
// Line 55-56
// OLD:
import jsQR from 'jsqr'

// NEW:
import { scanFlowSphereQR } from '@/lib/flowsphere-qr-scanner'
```

Then update camera scanning logic around line 620:
```typescript
// OLD:
const code = jsQR(imageData.data, imageData.width, imageData.height)

// NEW:
const code = scanFlowSphereQR(imageData.data, imageData.width, imageData.height)
```

---

## Testing Checklist

After replacing the algorithm:

- [ ] Generate new QR code - verify it displays correctly
- [ ] Scan QR code with FlowSphere app - verify parsing works
- [ ] Try scanning with external QR app - verify it shows gibberish/nothing
- [ ] Test stealth QR mode still works
- [ ] Test manual invite data paste still works
- [ ] Test old QR codes (if backward compatibility implemented)
- [ ] Verify version tracking in generated codes
- [ ] Check error handling for corrupted QR codes
- [ ] Test on iOS camera scanner
- [ ] Test on Android camera scanner
- [ ] Test gallery QR scanning

---

## Making QR Codes Unreadable to External Scanners

Your goal: QR codes that only FlowSphere can read.

### Approach 1: Custom Encoding Before QR Generation
```typescript
// Encrypt data BEFORE generating QR
const encrypted = await customEncrypt(inviteData, secretKey)
const qrCode = await QRCode.toDataURL(encrypted) // Looks normal but data is encrypted
```
External scanners will decode the QR but see gibberish.

### Approach 2: Custom QR Format (Advanced)
```typescript
// Don't use standard QR at all
// Create your own dot pattern that looks like QR but isn't
const customQR = await generateCustomPattern(inviteData)
```
External scanners won't even recognize it as a valid QR code.

### Approach 3: Steganography
```typescript
// Hide data in an image that looks like a QR code
const stegoImage = await embedDataInImage(inviteData, qrTemplate)
```
Looks like QR, but standard scanners get nothing or broken data.

---

## Shadow ID Integration (Future)

When Shadow ID system is ready, update the `QRInviteData` interface:

```typescript
export interface QRInviteData {
  code: string
  publicKey: string
  name: string
  expiresAt: string
  shadowId: string        // NEW: Permanent backend ID
  deviceId: string        // Tied to Shadow ID
  userId: string          // Profile ID (unique per contact)
  version?: string
}
```

Then update QR generation to include Shadow ID:

```typescript
const qrInviteData = {
  code: invite.code,
  publicKey: invite.publicKey,
  name: invite.name,
  expiresAt: invite.expiresAt,
  shadowId: getShadowId(email),     // NEW
  deviceId: deviceId,
  userId: generateUniqueProfileId() // NEW: unique per scan
}
```

---

## Files to Update (Summary)

| File | Action | Required? |
|------|--------|-----------|
| `src/lib/flowsphere-qr.ts` | Update encryption/parsing | ✅ YES |
| `src/lib/flowsphere-qr-scanner.ts` | Create custom scanner (if needed) | ⚠️ MAYBE |
| `src/components/secure-messenger.tsx` | Update scanner import (if needed) | ⚠️ MAYBE |
| `package.json` | Add new dependencies (if needed) | ⚠️ MAYBE |

**Messenger logic stays the same!**

---

## Support & Notes

- All QR operations are centralized in `flowsphere-qr.ts`
- Version tracking prevents compatibility issues
- Stealth QR mode already implemented
- Reed-Solomon provides 30% error correction (current)
- Custom algorithm can have any error correction level you want

---

**Questions?** Check the comments in `src/lib/flowsphere-qr.ts` for detailed implementation notes.
