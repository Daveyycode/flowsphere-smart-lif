# FlowSphere Deployment - December 8, 2025

## Changes Being Deployed

### 🔐 OAuth Email Integration (FIXED)
- **Gmail OAuth**: Changed provider name from 'gmail' to 'google' in frontend
- **Outlook OAuth**: Added `User.Read` scope for Microsoft Graph API access
- **Backend API**: Improved error logging for OAuth callbacks
- **Files Changed**:
  - `src/components/email-connection.tsx` - Updated to use backend OAuth API
  - `server/src/config.ts` - Added User.Read scope for Outlook
  - `server/src/routes/auth.ts` - Better error messages

### 🔒 Vault Features
- **QR Code Scanner**: Working TOTP generator using 'qrcode' package
- **Password Manager**: Secure credential storage
- **File Attachments**: Upload/download encrypted files
- **Categories**: Organize passwords, notes, files

### 📧 Email Features
- **Connected Accounts**: Gmail, Outlook, Yahoo (Yahoo needs setup)
- **Real-time Monitoring**: AI classification of incoming emails
- **Smart Alerts**: Emergency detection from family, CCTV, security
- **Subscription Tracking**: Automatic billing reminders
- **Unified Search**: Search across all connected accounts

### 👨‍👩‍👧‍👦 Family Management
- **Family Members**: Add/manage family profiles
- **Device Tracking**: Location tracking for family devices
- **Screen Time**: Monitor device usage
- **Alerts**: Notifications for family member activities

### 📝 Meeting Notes
- **Auto Language Detection**: Uses OpenAI Whisper for 200+ languages
- **Mixed Language Support**: Handles Taglish, Spanglish, etc.
- **AI Transcription**: Accurate speech-to-text
- **Fixed**: Import path bug (was `@github/spark/hooks`, now `@/hooks/use-kv`)

### 🎨 UI/Navigation
- **Fixed Navigation Text**: Active tabs now use blue color for visibility
- **Icon Fix**: Replaced `Navigation` with `NavigationArrow` (Phosphor Icons)
- **Responsive Design**: Mobile, tablet, desktop layouts
- **Theme Support**: Light/dark mode with custom themes

### 🚀 Performance & Infrastructure
- **Frontend**: Vite dev server on port 5000
- **Backend**: Express API on port 3001
- **Database**: Supabase
- **Email Service**: Resend API
- **Hosting**: Vercel (auto-deploy from GitHub)

## Environment Variables (Vercel)

### Frontend (.env)
```
VITE_RESEND_API_KEY=re_9CUYvVCT_HVfN2cVVxaBr8rvxHCZfUAuH
VITE_SUPABASE_URL=https://uiuktdwnyuahkfntabjs.supabase.co
VITE_SUPABASE_ANON_KEY=[set in Vercel]
VITE_API_URL=http://localhost:3001
```

### Backend (server/.env)
```
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5000
JWT_SECRET=[REDACTED - set in .env]
ENCRYPTION_KEY=[REDACTED - set in .env]
GOOGLE_CLIENT_ID=[REDACTED - set in .env]
GOOGLE_CLIENT_SECRET=[REDACTED - set in .env]
OUTLOOK_CLIENT_ID=[REDACTED - set in .env]
OUTLOOK_CLIENT_SECRET=[REDACTED - set in .env]
YAHOO_CLIENT_ID=[REDACTED - set in .env]
YAHOO_CLIENT_SECRET=[REDACTED - set in .env]
```

## Testing Checklist

After deployment, test these features on **myflowsphere.com**:

### Priority 1 (Must Work)
- [ ] Gmail OAuth connection
- [ ] Outlook OAuth connection
- [ ] Vault password creation/retrieval
- [ ] Meeting Notes recording
- [ ] Family member management

### Priority 2 (Nice to Have)
- [ ] Yahoo OAuth (needs setup in Yahoo Developer Console)
- [ ] Email monitoring and alerts
- [ ] Subscription tracking
- [ ] Weather widget
- [ ] AI voice assistant

## Known Issues

1. **Yahoo OAuth**: Not configured yet - needs Yahoo Developer app setup
2. **Apple/iCloud**: OAuth not fully implemented (needs JWT signing)
3. **Rate Limiting**: Backend has 15-minute lockout after too many attempts

## OAuth Redirect URIs

Make sure these are configured in OAuth provider consoles:

### Google Cloud Console
- Authorized redirect URI: `http://localhost:3001/auth/google/callback`
- Production URI: `https://myflowsphere.com/auth/google/callback` (add this!)

### Azure Portal (Outlook)
- Redirect URI: `http://localhost:3001/auth/outlook/callback`
- Production URI: `https://myflowsphere.com/auth/outlook/callback` (add this!)

### Yahoo Developer
- Redirect URI: `http://localhost:3001/auth/yahoo/callback`
- Production URI: `https://myflowsphere.com/auth/yahoo/callback` (add this!)

## Deployment Command

```bash
cd /Users/abbieatienza/LocalProjects/flowsphere-from-github
git add .
git commit -m "Deploy OAuth fixes + 2 months of features

- Fixed Gmail OAuth (gmail → google provider name)
- Fixed Outlook OAuth (added User.Read scope)
- Fixed Meeting Notes import path
- Fixed navigation text visibility
- Updated email connection to use backend API
- 2 months of feature development and bug fixes

🤖 Generated with Claude Code"
git push origin main
```

## Rollback Plan

If deployment breaks:
1. Backup location: `/Users/abbieatienza/LocalProjects/flowsphere-DEPLOY-BACKUP-[timestamp]`
2. Revert: `git reset --hard HEAD~1 && git push -f origin main`
3. Vercel will auto-deploy previous version

## Post-Deployment TODO

1. Add production redirect URIs to Google/Microsoft OAuth apps
2. Test email connections on production
3. Monitor Vercel logs for errors
4. Test on multiple devices (mobile, tablet, desktop)
5. Update Yahoo OAuth configuration if needed
