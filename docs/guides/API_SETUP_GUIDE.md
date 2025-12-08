# API Setup Guide for FlowSphere Email Integration

This guide will walk you through setting up all necessary API credentials for FlowSphere's email and AI features.

## Required API Credentials

1. **Gmail API** - For Gmail email integration
2. **Yahoo Mail API** - For Yahoo Mail integration
3. **Outlook/Microsoft Graph API** - For Outlook integration
4. **Groq API** - For AI email classification

---

## 1. Gmail API Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `FlowSphere Email`
4. Click **"Create"**

### Step 2: Enable Gmail API

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Gmail API"**
3. Click on **"Gmail API"** → Click **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** → Click **"Create"**
3. Fill in the form:
   - **App name**: FlowSphere
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **"Save and Continue"**
5. On **"Scopes"** page, click **"Add or Remove Scopes"**
6. Add these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
7. Click **"Save and Continue"**
8. Add test users (your email addresses)
9. Click **"Save and Continue"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Configure:
   - **Name**: FlowSphere Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5000` (development)
     - `https://myflowsphere.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:5000/auth/gmail/callback` (development)
     - `https://myflowsphere.com/auth/gmail/callback` (production)
5. Click **"Create"**
6. **Copy** the **Client ID** and **Client Secret**

### Step 5: Add to Environment Variables

Add to your `.env` file:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_client_secret_here
```

---

## 2. Yahoo Mail API Setup

### Step 1: Create Yahoo Developer Account

1. Go to [Yahoo Developer Network](https://developer.yahoo.com/)
2. Sign in with your Yahoo account
3. Accept Terms of Service

### Step 2: Create New App

1. Click **"My Apps"** → **"Create an App"**
2. Fill in the form:
   - **Application Name**: FlowSphere
   - **Application Type**: Web Application
   - **Description**: Personal email management system
   - **Home Page URL**: `https://myflowsphere.com`
   - **Redirect URI(s)**:
     - `http://localhost:5000/auth/yahoo/callback`
     - `https://myflowsphere.com/auth/yahoo/callback`

### Step 3: Select API Permissions

1. Under **"API Permissions"**, select:
   - **Mail**: Read/Write access
2. Click **"Create App"**

### Step 4: Get Credentials

1. On the app page, find:
   - **Client ID** (App ID)
   - **Client Secret** (App Secret)
2. **Copy** both values

### Step 5: Add to Environment Variables

Add to your `.env` file:
```env
VITE_YAHOO_CLIENT_ID=your_yahoo_client_id_here
VITE_YAHOO_CLIENT_SECRET=your_yahoo_client_secret_here
```

---

## 3. Outlook/Microsoft Graph API Setup

### Step 1: Register App in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **"Azure Active Directory"** → **"App registrations"**
3. Click **"New registration"**
4. Fill in the form:
   - **Name**: FlowSphere Email
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**:
     - Platform: **Web**
     - URI: `http://localhost:5000/auth/outlook/callback`
5. Click **"Register"**

### Step 2: Add Additional Redirect URIs

1. In your app, go to **"Authentication"**
2. Under **"Platform configurations"** → **"Web"**, click **"Add URI"**
3. Add: `https://myflowsphere.com/auth/outlook/callback`
4. Click **"Save"**

### Step 3: Add API Permissions

1. Go to **"API permissions"**
2. Click **"Add a permission"** → **"Microsoft Graph"**
3. Select **"Delegated permissions"**
4. Add these permissions:
   - `Mail.Read`
   - `Mail.Send`
   - `Mail.ReadWrite`
   - `User.Read`
   - `offline_access`
5. Click **"Add permissions"**
6. Click **"Grant admin consent"** (if you have admin rights)

### Step 4: Create Client Secret

1. Go to **"Certificates & secrets"**
2. Click **"New client secret"**
3. Description: `FlowSphere Email Secret`
4. Expires: Choose duration (24 months recommended)
5. Click **"Add"**
6. **Copy the secret VALUE immediately** (it won't be shown again)

### Step 5: Get Application ID

1. Go to **"Overview"**
2. Copy the **Application (client) ID**

### Step 6: Add to Environment Variables

Add to your `.env` file:
```env
VITE_OUTLOOK_CLIENT_ID=your_outlook_client_id_here
VITE_OUTLOOK_CLIENT_SECRET=your_outlook_client_secret_here
```

---

## 4. Groq API Setup (For AI Classification)

### Step 1: Create Groq Account

1. Go to [Groq Console](https://console.groq.com/)
2. Sign up with email or GitHub
3. Verify your email

### Step 2: Get API Key

1. Go to **"API Keys"** in the dashboard
2. Click **"Create API Key"**
3. Name it: `FlowSphere Email AI`
4. **Copy the API key** (store it securely)

### Step 3: Add to Environment Variables

Add to your `.env` file:
```env
VITE_GROQ_API_KEY=your_groq_api_key_here
```

### Groq API Details

- **Model used**: `llama-3.3-70b-versatile`
- **Free tier**: 14,400 requests/day
- **Rate limit**: 30 requests/minute
- **Cost**: Free tier is sufficient for personal use

---

## Complete .env File Template

Create a `.env` file in your project root with all credentials:

```env
# Gmail API Credentials
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Yahoo Mail API Credentials
VITE_YAHOO_CLIENT_ID=your_yahoo_client_id_here
VITE_YAHOO_CLIENT_SECRET=your_yahoo_client_secret_here

# Outlook/Microsoft Graph API Credentials
VITE_OUTLOOK_CLIENT_ID=your_outlook_client_id_here
VITE_OUTLOOK_CLIENT_SECRET=your_outlook_client_secret_here

# Groq AI API Key
VITE_GROQ_API_KEY=your_groq_api_key_here

# Zapier Webhook Secret (optional, for security)
ZAPIER_WEBHOOK_SECRET=generate_random_secret_here
```

---

## Security Best Practices

### 1. Never Commit .env to Git

Add to `.gitignore`:
```
.env
.env.local
.env.production
```

### 2. Use Different Credentials for Development and Production

Create separate apps/projects for:
- Development (localhost)
- Production (myflowsphere.com)

### 3. Rotate Secrets Regularly

- Outlook secrets expire (set reminder to renew)
- Rotate API keys every 6-12 months
- Immediately rotate if compromised

### 4. Restrict API Permissions

Only request the minimum permissions needed:
- ✅ Gmail: readonly, send, modify
- ❌ Don't request full account access

### 5. Monitor API Usage

Set up monitoring:
- Google Cloud: Set up billing alerts
- Groq: Monitor request count
- Check for unusual activity

---

## Testing Your Setup

### 1. Verify Environment Variables

Add this to a test file:
```typescript
console.log('API Keys Status:')
console.log('Gmail:', import.meta.env.VITE_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing')
console.log('Yahoo:', import.meta.env.VITE_YAHOO_CLIENT_ID ? '✅ Set' : '❌ Missing')
console.log('Outlook:', import.meta.env.VITE_OUTLOOK_CLIENT_ID ? '✅ Set' : '❌ Missing')
console.log('Groq:', import.meta.env.VITE_GROQ_API_KEY ? '✅ Set' : '❌ Missing')
```

### 2. Test Gmail Connection

1. Go to Settings in FlowSphere
2. Click **"Connect Gmail"**
3. Should redirect to Google OAuth
4. Grant permissions
5. Should redirect back with success

### 3. Test AI Classification

Create a test email and verify AI classification works:
```typescript
import { EmailAIClassifier } from '@/lib/email/email-ai-classifier'

const classifier = new EmailAIClassifier()
const testEmail = {
  id: 'test-1',
  provider: 'gmail',
  from: { email: 'test@example.com', name: 'Test User' },
  to: [],
  subject: 'URGENT: Security Alert',
  body: 'Your account has been compromised. Please take immediate action.',
  snippet: 'Your account has been compromised...',
  timestamp: new Date().toISOString(),
  read: false
}

const classification = await classifier.classifyEmail(testEmail)
console.log('Classification:', classification)
// Should return: category: 'emergency', priority: 'high', isUrgent: true
```

---

## Troubleshooting

### Gmail OAuth Error: "redirect_uri_mismatch"

**Solution**:
- Verify redirect URI in Google Cloud Console matches exactly
- Check for trailing slashes
- Ensure URI includes protocol (http:// or https://)

### Yahoo: "Invalid client credentials"

**Solution**:
- Double-check Client ID and Client Secret
- Ensure no extra spaces when copying
- Regenerate credentials if needed

### Outlook: "AADSTS50011: redirect URI mismatch"

**Solution**:
- Add redirect URI in Azure Portal under Authentication
- Wait 5-10 minutes for changes to propagate
- Clear browser cache

### Groq: "Invalid API key"

**Solution**:
- Verify API key is correct
- Check if key was revoked
- Generate new API key if needed

### Environment Variables Not Loading

**Solution**:
```bash
# Restart dev server
npm run dev

# Or force reload
pkill -f vite
npm run dev
```

---

## Production Deployment

### Vercel Environment Variables

1. Go to Vercel project settings
2. Navigate to **"Environment Variables"**
3. Add all variables from `.env`
4. Select environment: **Production**
5. Click **"Save"**

### Netlify Environment Variables

1. Go to Site settings → Build & deploy → Environment
2. Click **"Edit variables"**
3. Add all variables from `.env`
4. Click **"Save"**

### Update Redirect URIs

After deployment, update OAuth redirect URIs to use production domain:
- Gmail: Add `https://myflowsphere.com/auth/gmail/callback`
- Yahoo: Add `https://myflowsphere.com/auth/yahoo/callback`
- Outlook: Add `https://myflowsphere.com/auth/outlook/callback`

---

## Cost Breakdown

### Free Tier Summary

- **Gmail API**: Free (within quotas)
- **Yahoo Mail API**: Free
- **Outlook API**: Free
- **Groq API**: Free (14,400 requests/day)

### Potential Costs

**If you exceed free tiers:**
- Gmail API: $0.01 per 1,000 requests (after 1 billion/day)
- Microsoft Graph: Free for personal use
- Groq: Pay-as-you-go pricing available

**For most personal use cases, all APIs remain free.**

---

## Next Steps

After completing API setup:

1. ✅ Add all credentials to `.env` file
2. ✅ Restart development server
3. ✅ Test each email connection in Settings
4. ✅ Connect at least one email account
5. ✅ Send a test email and verify AI classification
6. ✅ Set up Zapier for social media (see ZAPIER_SETUP_GUIDE.md)
7. ✅ Configure notification preferences
8. ✅ Deploy to production with environment variables

---

## Support Resources

- **Google Cloud Support**: [https://cloud.google.com/support](https://cloud.google.com/support)
- **Yahoo Developer Help**: [https://developer.yahoo.com/support](https://developer.yahoo.com/support)
- **Microsoft Azure Support**: [https://azure.microsoft.com/support](https://azure.microsoft.com/support)
- **Groq Documentation**: [https://console.groq.com/docs](https://console.groq.com/docs)

---

**Last Updated**: December 2, 2024
**Version**: 1.0
