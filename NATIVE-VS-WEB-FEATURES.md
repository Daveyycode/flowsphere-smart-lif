# FlowSphere: Native vs Web Feature Compatibility

> **Last Updated:** December 2024
> **Purpose:** Track which features work on web vs require native app testing

---

## Quick Summary

| Category | Web | Native Required |
|----------|-----|-----------------|
| **Works Fully on Web** | 45+ features | - |
| **Limited on Web** | 12 features | Recommended |
| **Blocked on Web** | 8 features | **Required** |

---

## BLOCKED ON WEB (Native Required)

These features **will NOT work** properly on web browsers due to platform restrictions:

| Feature | File Location | Why Blocked | Native Solution |
|---------|---------------|-------------|-----------------|
| **Push Notifications** | `src/lib/browser-permissions.ts` | Web push unreliable, no background | Native push via APNs/FCM |
| **Background Timer Sync** | `src/lib/remote-timer-sync.ts` | Browser kills background tabs | Native background execution |
| **Background Location** | `src/lib/gps-tracking.ts` | Browser stops GPS when inactive | Native location services |
| **Biometric Auth** | `src/lib/vault-security.ts` | Limited WebAuthn support | Face ID / Touch ID native |
| **Local Notifications** | `src/lib/notification-sounds.ts` | Web notifications unreliable | @capacitor/local-notifications |
| **Background Email Monitoring** | `src/lib/email/email-monitor.ts` | Can't run in background | Native background fetch |
| **Phone Calling (Native)** | `src/lib/phone-calling.ts` | Can't access phone dialer | Native call integration |
| **CCTV Camera Stream** | `src/lib/cctv-camera.ts` | Background streaming dies | Native camera access |

### Priority for Native Testing:
1. **Remote Timer** - Core feature, must work across devices
2. **Push Notifications** - Critical for alerts/reminders
3. **Background Location** - Family tracking feature
4. **Biometric Auth** - Vault security

---

## LIMITED ON WEB (Native Recommended)

These features **work partially** on web but have limitations:

| Feature | File Location | Web Limitation | Native Benefit |
|---------|---------------|----------------|----------------|
| **Voice Recording** | `src/lib/native-voice-recorder.ts` | Works but quality varies | Better codec support |
| **Voice Commands** | `src/lib/voice-commands.ts` | Needs tab focus | Always listening option |
| **Video Calling** | `src/lib/webrtc-calling.ts` | Works but battery drain | Optimized native WebRTC |
| **Sleep Tracking** | `src/lib/sleep-tracking.ts` | Manual input only | HealthKit/Google Fit |
| **GPS Tracking** | `src/lib/gps-monitoring.ts` | Only when tab active | Continuous tracking |
| **Offline Mode** | `src/lib/offline-sync.ts` | Service worker limits | Full offline support |
| **File Storage** | `src/lib/use-supabase-storage.ts` | Limited local cache | Native file system |
| **QR Scanner** | `src/components/stegano-qr-scanner.tsx` | Works but slower | Native camera optimized |
| **Haptic Feedback** | N/A | Not available | @capacitor/haptics |
| **App State Detection** | N/A | Limited visibility API | @capacitor/app |
| **Status Bar Control** | N/A | Not available | @capacitor/status-bar |
| **Splash Screen** | N/A | Basic PWA only | @capacitor/splash-screen |

---

## WORKS FULLY ON WEB

These features work **100% on web** - no native testing needed:

### Authentication & Security
- [x] Email/Password Login
- [x] OAuth (Google, Apple, Microsoft)
- [x] Email Verification
- [x] CEO Authentication
- [x] Encryption/Decryption
- [x] Pattern Lock (UI)
- [x] Device Fingerprinting

### Dashboard & UI
- [x] Dashboard View
- [x] Morning Brief
- [x] Settings View
- [x] Theme Switching (Dark/Light)
- [x] Responsive Layout
- [x] Error Boundaries

### AI & Assistants
- [x] AI Assistant (Chat)
- [x] AI Email Drafting
- [x] AI Email Search
- [x] AI Email Classification
- [x] Tutor AI
- [x] Scheduler AI
- [x] CEO AI Assistant
- [x] AI Provider Settings

### Email Management
- [x] Gmail Integration
- [x] Outlook Integration
- [x] Yahoo Integration
- [x] iCloud Integration
- [x] Email Search
- [x] Email Folders
- [x] Subscription Detection

### Calendar & Scheduling
- [x] Calendar View
- [x] Event Creation
- [x] Google Calendar Sync
- [x] AI Scheduling

### Notes & Documents
- [x] Meeting Notes
- [x] Voice Memos (when tab active)
- [x] Note Templates

### Family Features
- [x] Family Member Management
- [x] Family Status Updates
- [x] Map View (when active)

### Productivity
- [x] Focus Timer (foreground)
- [x] Focus Reports
- [x] Study Monitor
- [x] Smart Timer (foreground)

### Vault & Storage
- [x] Vault UI
- [x] File Upload/Download
- [x] Encryption
- [x] Categories

### Communication
- [x] Secure Messenger (foreground)
- [x] QR Code Generation
- [x] Video Call (foreground)

### Learning
- [x] Kids Learning Center
- [x] Educational Content
- [x] Progress Tracking

### Admin & CEO
- [x] CEO Dashboard
- [x] Complaints Management
- [x] Payment Integration
- [x] User Analytics

### Subscription & Payments
- [x] Subscription Management
- [x] Payment Processing
- [x] Plan Selection

### Utilities
- [x] Weather Display
- [x] Traffic Updates
- [x] News Feed
- [x] Web Search

---

## NATIVE PLUGINS INSTALLED

Current Capacitor plugins for native functionality:

```json
{
  "@capacitor/app": "^6.0.0",
  "@capacitor/local-notifications": "^6.0.0",
  "@capacitor/status-bar": "^6.0.0",
  "@capacitor/haptics": "^6.0.0",
  "@capacitor/splash-screen": "^6.0.0",
  "@capacitor/device": "^7.0.2",
  "@capacitor/filesystem": "^7.1.5",
  "@capacitor-community/speech-recognition": "^7.0.1"
}
```

### Plugins Needed (Not Yet Installed)
- `@capacitor/push-notifications` - For push notifications
- `@capacitor/geolocation` - For background GPS
- `@capacitor/camera` - For native camera
- `@capacitor/biometric` - For Face ID/Touch ID
- `@capacitor/background-runner` - For background tasks

---

## TESTING STRATEGY

### Phase 1: Web Testing (Current)
Test all "Works Fully on Web" features on:
- Desktop browsers (Chrome, Safari, Firefox)
- Mobile browsers (Safari iOS, Chrome Android)
- PWA installed mode

### Phase 2: Native Testing (iPhone 15 Pro Max)
Test "Blocked" and "Limited" features:

1. **Remote Timer** - Start on Mac, control from iPhone
2. **Push Notifications** - Send test notifications
3. **Background Location** - Track location with app minimized
4. **Biometric Auth** - Test Face ID for Vault
5. **Local Notifications** - Timer completion alerts
6. **Haptic Feedback** - Button interactions

### Phase 3: Pre-Release
- Full regression test on native
- TestFlight beta testing
- Performance profiling

---

## FEATURE STATUS TRACKER

### Blocked Features - Development Status

| Feature | Web Workaround | Native Implementation | Status |
|---------|---------------|----------------------|--------|
| Push Notifications | Browser notifications | Capacitor Push | Pending |
| Background Timer | Polling every 2s | Native timer service | Pending |
| Background GPS | Manual refresh | Native location | Pending |
| Biometric Auth | Pattern/PIN fallback | Face ID/Touch ID | Pending |
| Local Notifications | Audio + visual alert | Capacitor Local | Pending |
| Background Email | Manual refresh | Background fetch | Pending |
| Phone Calling | WebRTC only | Native dialer | Pending |
| CCTV Streaming | Tab must stay open | Background service | Pending |

---

## COMMANDS REFERENCE

```bash
# Build for web
npm run build

# Sync to native platforms
npx cap sync

# Open iOS in Xcode
npx cap open ios

# Open Android in Android Studio
npx cap open android

# Run on iOS device
npx cap run ios

# Run on Android device
npx cap run android

# Live reload during development
npx cap run ios --livereload --external
```

---

## NOTES

1. **Web-first approach**: Build and test UI on web for fast iteration
2. **Native for background**: Only test native when feature needs background execution
3. **PWA as middle ground**: PWA install gives some native benefits without full native
4. **Free Personal Team**: Use for testing on physical iPhone (expires every 7 days)

---

*This document should be updated as features are developed and tested.*
