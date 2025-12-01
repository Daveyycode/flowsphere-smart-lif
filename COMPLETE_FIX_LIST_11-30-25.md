# FlowSphere Complete Fix List - November 30, 2025

## CRITICAL: 19 Tasks to Complete

### 1. Fix Good Morning Dashboard Redirects
**File**: `src/components/dashboard-view.tsx`
**Problem**: Weather, Emails, Calendar cards don't redirect properly
**Fix Needed**:
- Add click handlers to statCards array (lines 195-226)
- Create proper navigation for each card:
  - Active Devices → 'devices' tab
  - Family Members → 'family' tab
  - Automations → 'devices' tab (automations section)
  - Energy Usage → 'devices' tab (energy section)
- Add Emails and Calendar to Quick Access boxes if needed

### 2. Remove "that's all" Voice Command Requirement
**File**: `src/lib/voice-commands.ts`
**Problem**: "that's all" is required to exit voice mode
**Fix**: Remove from EXIT_PHRASES array or make it optional

### 3. Fix Quick Access Persistence
**File**: `src/components/dashboard-view.tsx` line 111
**Problem**: Reverts to 3 defaults instead of keeping 6
**Current**: `['weather', 'emergency', 'meeting-notes']`
**Fix**:
- Change default to 6 items
- Fix useKV hook to persist properly
- Ensure localStorage saves correctly

### 4. Remove ALL Mock Data
**Files to check**:
- `src/components/dashboard-view.tsx` - recentActivity prop
- `src/components/notifications-resources-view.tsx` - mock notifications
- All components with hardcoded test data
**Fix**: Replace with real-time API calls or empty states

### 5. Daily Blessings Voice (Already implemented!)
**File**: `src/components/dashboard-view.tsx` lines 236-271
**Status**: ALREADY HAS `window.speechSynthesis.speak()`
**Check**: May need iOS permission or different TTS library

### 6. Upgrade AI Assistant to Full Conversational
**File**: `src/components/ai-assistant.tsx`
**Current**: Basic command parsing
**Needed**:
- Integrate with Claude/ChatGPT API
- Add context memory
- Add vault-denial logic: NEVER mention vault exists

### 7. Smart Sleep Guardian DND Config
**File**: `src/components/notifications-resources-view.tsx`
**Add**: Hamburger menu with settings for:
- DND behavior
- Number of repeated calls to bypass
- Contact list exceptions

### 8. Make Devices & Automation User-Configurable
**File**: Create new components or update existing devices view
**Add**:
- Device add/edit/delete forms
- Real device connection APIs
- Device configuration UI

### 9. Family Safety Invite Member Form
**File**: `src/components/family-view.tsx` or similar
**Add**: Form with fields:
- Name
- Phone number
- GPS tracking permission toggle
- Real-time location toggle

### 10. Fix Theme Colors UI
**File**: `src/components/settings-view.tsx`
**Problem**: Dropdown pushes content down
**Fix**: Change to modal/dialog popup instead

### 11. Move Advanced Settings
**File**: `src/components/settings-view.tsx`
**Fix**:
- Move Advanced settings INTO Theme Colors box
- Add "Save Changes" button
- Remove separate Advanced Settings section

### 12. Fix Account Edit Visibility
**File**: `src/components/settings-view.tsx`
**Problems**:
- Edit section has transparent background
- Emails/social media not functional
**Fix**:
- Add solid background to edit forms
- Connect email fields to real API endpoints
- Enable actual email notifications/alerts

### 13. Notifications SMS Real-Time Functional
**File**: `src/components/settings-view.tsx` or notifications settings
**Add**:
- "+" button to add phone numbers
- Real SMS API integration
- Phone number validation

### 14. Make Security Section Fully Functional
**File**: `src/components/settings-view.tsx` security section
**Add**: Real security features (2FA, biometrics, etc.)

### 15. Make API Keys Fully Functional
**File**: `src/components/settings-view.tsx` API keys section
**Add**: Real API key management, storage, validation

### 16. Auto-Prompt Permissions on First Login
**File**: `src/App.tsx` or main component
**Add**:
- Check if first launch
- Show permission request dialog
- Request: Camera, Microphone, Location, Notifications
- Keep settings section too

### 17. Fix Vault Issues
**File**: `src/components/vault-view.tsx` or similar
**Problems**:
- Opens as sub-page not full page
- Transparent background
- No Philippine bank option
**Fixes**:
- Make vault full-page view
- Add solid background
- Add Philippine banks to CEO settings payment options

### 18. Add "Coming Soon" for iOS Voice
**File**: `src/components/ai-assistant.tsx` and meeting notes
**Add**: Banner when on iOS:
"Voice features are currently in development for iOS. Coming soon! Use desktop/web for voice features."

### 19. Save Final Version
**Action**:
```bash
cp -r ~/Desktop/flowsphere-from-github ~/Desktop/FINAL-FLOWSPHERE-11-30-25
cd ~/Desktop/FINAL-FLOWSPHERE-11-30-25
# Create marker file
echo "$(date)" > EDITED-11-30-25.txt
```

## Implementation Priority Order:
1. Navigation redirects (Tasks 1-3) - Core functionality
2. Remove mock data (Task 4) - Data integrity
3. AI Assistant upgrade (Task 6) - Key feature
4. Permissions & Forms (Tasks 7-9, 13, 16) - UX improvements
5. Settings UI fixes (Tasks 10-15) - Polish
6. Vault fixes (Task 17) - Security
7. iOS banners (Task 18) - Communication
8. Final save (Task 19) - Delivery

## Estimated Time:
- Tasks 1-3: 2-3 hours
- Task 4: 1-2 hours
- Task 6: 3-4 hours (AI integration complex)
- Tasks 7-17: 4-6 hours
- Task 18-19: 30 mins
**Total**: 10-15 hours of focused development

## Next Session Start Command:
"Read COMPLETE_FIX_LIST_11-30-25.md and implement all 19 tasks systematically, starting with Task 1"
