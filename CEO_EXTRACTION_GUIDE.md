# CEO Features Extraction Guide

**Purpose:** This document compiles ALL CEO-related code in FlowSphere for easy extraction before production deployment.

**Last Updated:** December 6, 2025

---

## Quick Summary

| Category | Count | Total Lines |
|----------|-------|-------------|
| CEO-Specific Files | 13 files | ~5,000+ lines |
| Integration Points | 4 files | ~50 lines to modify |
| Admin Dashboard | 1 file | ~500 lines |

---

## SECTION 1: CEO-ONLY FILES (Safe to Delete for Production)

These files are ONLY used for CEO features and can be completely removed:

### Core CEO Files

| File | Purpose | Lines | Delete? |
|------|---------|-------|---------|
| `src/CEOAuth.tsx` | CEO authentication page | ~200 | YES |
| `src/CEODashboard.tsx` | Main CEO dashboard entry | ~400 | YES |
| `src/Admin.tsx` | Admin panel entry | ~100 | YES |

### CEO Components (src/components/)

| File | Purpose | Lines | Delete? |
|------|---------|-------|---------|
| `ceo-dashboard.tsx` | CEO dashboard component | ~800 | YES |
| `ceo-login.tsx` | CEO login interface | ~300 | YES |
| `ceo-auth-setup.tsx` | CEO 2FA setup | ~400 | YES |
| `ceo-dashboard-sections.tsx` | Dashboard modular sections | ~600 | YES |
| `ceo-security-monitor.tsx` | Security monitoring | ~500 | YES |
| `ceo-complaints-dashboard.tsx` | User complaints view | ~400 | YES |
| `ceo-ai-assistant.tsx` | CEO AI features | ~300 | YES |

### CEO Libraries (src/lib/)

| File | Purpose | Lines | Delete? |
|------|---------|-------|---------|
| `ceo-auth.ts` | CEO authentication logic | ~220 | YES |
| `ceo-check.ts` | CEO verification | ~40 | YES |
| `ceo-dashboard.ts` | Dashboard data/API | ~820 | YES |
| `ceo-ai-assistant.ts` | AI assistant for CEO | ~800 | YES |

### Related Files (Delete with CEO)

| File | Purpose | Delete? |
|------|---------|---------|
| `src/components/admin-dashboard.tsx` | Admin panel UI | YES |
| `src/components/user-complaints.tsx` | Complaint submission | OPTIONAL |
| `src/lib/ai-complaint-handler.ts` | AI complaint processing | YES |

---

## SECTION 2: FILES THAT IMPORT CEO CODE (Need Modification)

These files import CEO features and need to be modified when removing CEO:

### 1. src/App.tsx

**Current imports:**
```typescript
// REMOVE THIS FOR PRODUCTION:
import CEOAuth from './CEOAuth'
import CEODashboard from './CEODashboard'
import Admin from './Admin'
```

**Routes to remove:**
```typescript
// REMOVE THESE ROUTES FOR PRODUCTION:
<Route path="/ceo-auth" element={<CEOAuth />} />
<Route path="/ceo-dashboard/*" element={<CEODashboard />} />
<Route path="/admin" element={<Admin />} />
```

---

### 2. src/components/vault.tsx

**Current imports (line 22-23):**
```typescript
// REMOVE FOR PRODUCTION:
import { CEODashboard } from '@/components/ceo-dashboard'
import { isCEOUser } from '@/lib/ceo-check'
```

**CEO access code to remove:**
The vault has a "secret passage" to CEO dashboard via 7 taps. Remove:
- The `isCEOUser()` check
- The CEO dashboard conditional render
- The 7-tap Easter egg functionality

---

### 3. src/components/auth-modal.tsx

**Current imports (line 10):**
```typescript
// REMOVE FOR PRODUCTION:
import { verifyCEOCredentials, storeCEOSession } from '@/lib/ceo-check'
```

**CEO login logic to remove:**
- CEO credential verification in login flow
- CEO session storage

---

### 4. src/components/secure-messenger.tsx

Has references to CEO features that should be removed for production.

---

## SECTION 3: HARDCODED CREDENTIALS (CRITICAL!)

### Current Hardcoded CEO Credentials

**File:** `src/CEOAuth.tsx` (lines 32-33)
```typescript
// SECURITY ISSUE - HARDCODED CREDENTIALS!
const CEO_CREDENTIALS = {
  username: '19780111',
  password: 'papakoEddie@tripzy.international'
}
```

**File:** `src/lib/ceo-check.ts` (lines 8-10)
```typescript
// SECURITY ISSUE - HARDCODED CREDENTIALS!
const CEO_CREDENTIALS = {
  username: '19780111',
  password: 'papakoEddie@tripzy.international'
}
```

### Recommendations for CEO Credentials

**Option 1: Environment Variables (Better)**
```env
# Add to .env (server-side only, NOT VITE_)
CEO_USERNAME=your_secure_username
CEO_PASSWORD_HASH=bcrypt_hash_here
```

**Option 2: Supabase Admin Table (Best)**
```sql
CREATE TABLE ceo_users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Option 3: For Production Deployment**
- Remove all CEO features entirely
- Deploy CEO dashboard as separate admin app
- Use different domain (admin.flowsphere.com)

---

## SECTION 4: CEO ENTRY POINTS

### How Users Access CEO Features

1. **Direct URL:** `/ceo-auth` - CEO login page
2. **Direct URL:** `/ceo-dashboard` - CEO dashboard (if authenticated)
3. **Direct URL:** `/admin` - Admin panel
4. **Secret Passage:** 7 taps on "About" in Vault settings
5. **Auth Modal:** CEO credentials in login form

### Secret Passage Details

**File:** `src/components/vault.tsx`

The vault has a hidden Easter egg:
- User taps "About FlowSphere" 7 times
- If user is CEO, shows CEO dashboard inside vault
- This is a security risk in production

---

## SECTION 5: EXTRACTION SCRIPT

### Quick Removal Commands

```bash
# Navigate to project
cd /Users/abbieatienza/LocalProjects/flowsphere-from-github

# Create backup of CEO files
mkdir -p ../flowsphere-ceo-backup
cp src/CEOAuth.tsx ../flowsphere-ceo-backup/
cp src/CEODashboard.tsx ../flowsphere-ceo-backup/
cp src/Admin.tsx ../flowsphere-ceo-backup/
cp -r src/components/ceo-* ../flowsphere-ceo-backup/
cp -r src/lib/ceo-* ../flowsphere-ceo-backup/
cp src/components/admin-dashboard.tsx ../flowsphere-ceo-backup/
cp src/lib/ai-complaint-handler.ts ../flowsphere-ceo-backup/

# Remove CEO files (ONLY after backup!)
rm src/CEOAuth.tsx
rm src/CEODashboard.tsx
rm src/Admin.tsx
rm src/components/ceo-*.tsx
rm src/lib/ceo-*.ts
rm src/components/admin-dashboard.tsx
rm src/lib/ai-complaint-handler.ts
```

### Files to Manually Edit After Removal

1. **src/App.tsx** - Remove CEO imports and routes
2. **src/components/vault.tsx** - Remove CEO dashboard integration
3. **src/components/auth-modal.tsx** - Remove CEO credential check
4. **src/components/secure-messenger.tsx** - Remove CEO references

---

## SECTION 6: CEO FEATURES OVERVIEW

### What CEO Dashboard Does

1. **Analytics Dashboard**
   - User statistics
   - Revenue tracking
   - System health monitoring
   - Active alerts

2. **User Management**
   - View all users
   - Subscription management
   - Account status

3. **Security Monitoring**
   - Login attempt tracking
   - API key management
   - Security alerts

4. **Complaint Handling**
   - View user complaints
   - AI-powered responses
   - Escalation system

5. **AI Assistant**
   - Market trends analysis
   - Feature suggestions
   - Executive reports

---

## SECTION 7: DEPLOYMENT CHECKLIST

### Before Production Deploy

- [ ] Backup all CEO files
- [ ] Remove CEO-specific files (13 files)
- [ ] Edit App.tsx to remove CEO routes
- [ ] Edit vault.tsx to remove secret passage
- [ ] Edit auth-modal.tsx to remove CEO login
- [ ] Run `npm run build` to verify no errors
- [ ] Test that CEO URLs return 404
- [ ] Verify vault doesn't show CEO option
- [ ] Deploy to production

### After Production Deploy

- [ ] Verify CEO URLs don't work
- [ ] Monitor for any CEO-related errors
- [ ] Consider deploying CEO as separate admin app

---

## SECTION 8: SEPARATE CEO APP (Recommended)

For better security, deploy CEO features as a separate application:

### Benefits
- Completely separate codebase
- Different authentication system
- Can use different hosting
- Better security isolation
- Easier to manage access

### Suggested Architecture
```
flowsphere.com           → Main user app (no CEO code)
admin.flowsphere.com     → CEO/Admin dashboard (separate deploy)
api.flowsphere.com       → Shared backend API
```

---

## SECTION 9: ALL CEO FILE PATHS

### Complete List (Copy-Paste Ready)

```
src/CEOAuth.tsx
src/CEODashboard.tsx
src/Admin.tsx
src/components/ceo-dashboard.tsx
src/components/ceo-login.tsx
src/components/ceo-auth-setup.tsx
src/components/ceo-dashboard-sections.tsx
src/components/ceo-security-monitor.tsx
src/components/ceo-complaints-dashboard.tsx
src/components/ceo-ai-assistant.tsx
src/components/admin-dashboard.tsx
src/lib/ceo-auth.ts
src/lib/ceo-check.ts
src/lib/ceo-dashboard.ts
src/lib/ceo-ai-assistant.ts
src/lib/ai-complaint-handler.ts
```

### Files That Reference CEO (Need Editing)

```
src/App.tsx
src/components/vault.tsx
src/components/auth-modal.tsx
src/components/secure-messenger.tsx
src/components/user-complaints.tsx
src/components/meeting-notes.tsx
src/lib/vault-security.ts
```

---

## SECTION 10: SECURITY NOTES

### Current Security Issues with CEO Code

1. **Hardcoded credentials** in source code
2. **Password stored as Base64** (not hashed)
3. **No rate limiting** on CEO login
4. **Secret passage** through vault
5. **No IP restrictions** for CEO access
6. **Credentials in git history** forever

### Security Fixes Needed Before Any Deploy

1. Move credentials to environment variables
2. Implement proper password hashing (bcrypt)
3. Add rate limiting (3 attempts/15 min)
4. Remove secret passage Easter egg
5. Add IP allowlist for CEO access
6. Clean git history with BFG Repo-Cleaner

---

*This document should be updated whenever CEO features change.*
*Keep this file PRIVATE - it contains sensitive architecture information.*

---

## SECTION 11: PRODUCTION UPDATES (December 8, 2025)

### OAuth Backend Implemented

A production-ready Express backend server has been added at `/server/` to handle OAuth authentication securely.

**What was built:**
- Express server with TypeScript
- OAuth proxy for Google, Outlook, Yahoo (keeps secrets server-side)
- AES-256 token encryption
- JWT for secure frontend communication
- Rate limiting (100 requests / 15 min)
- CORS configuration
- Security headers (helmet)

### OAuth Provider Configuration Complete

| Provider | Client ID | Redirect URI | Status |
|----------|-----------|--------------|--------|
| Google | `153926706146-...` | `localhost:3001/auth/google/callback` | ✅ Works |
| Outlook | `5a79ab29-9aca-4a88-8eec-57f98752ca38` | `localhost:3001/auth/outlook/callback` | ✅ Works |
| Yahoo | `dj0yJmk9...` | `https://myflowsphere.com/api/auth/yahoo/callback` | ⚠️ Prod only |
| Apple | - | - | ❌ Needs $99 dev account |

### Files Added

```
server/
├── package.json
├── tsconfig.json
├── .env                    # OAuth credentials
├── src/
│   ├── app.ts              # Express app setup
│   ├── config.ts           # Environment config
│   ├── routes/
│   │   └── auth.ts         # OAuth routes
│   ├── services/
│   │   ├── oauth.ts        # OAuth token exchange
│   │   └── encryption.ts   # AES-256 encryption
│   ├── middleware/
│   │   └── security.ts     # Rate limiting, headers
│   └── utils/
│       └── logger.ts       # Logging utility
```

### Before Production Deploy

**Critical security tasks:**
1. Generate new JWT_SECRET (32+ chars, random)
2. Generate new ENCRYPTION_KEY (exactly 32 bytes)
3. Update all OAuth redirect URIs to production domain
4. Enable HTTPS on production server
5. Consider Redis for session/rate limit storage

### Current Credentials Location

**WARNING:** These files contain OAuth secrets:
- `server/.env` - Backend OAuth secrets (KEEP SECRET)
- `.env` - Frontend env vars (safe, only VITE_ prefix)

### AI Email Assistant Fix

The "AI unavailable" error in the AI Email Assistant is caused by:
1. Groq API key not loaded (solution: restart dev server)
2. OR Groq API rate limit exceeded

The Groq API key is valid and working - tested via curl on Dec 8, 2025.
