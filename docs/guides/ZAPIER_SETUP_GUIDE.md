# Zapier Setup Guide for FlowSphere

This guide will help you set up Zapier automation to monitor social media platforms (Twitter/X, Facebook, Instagram) and send real-time alerts to FlowSphere.

## Overview

Zapier will monitor your social media accounts for:
- Mentions on Twitter/X
- Comments and messages on Facebook
- Comments and DMs on Instagram
- Notifications from other platforms

When activity is detected, Zapier will send the data to FlowSphere for AI classification and smart notifications.

---

## Prerequisites

1. **Zapier Account**: Sign up at [zapier.com](https://zapier.com)
   - Recommended Plan: Starter ($19.99/month) or Professional ($49/month)
   - Free plan has limitations (5 Zaps, 100 tasks/month)

2. **FlowSphere Webhook Endpoint**:
   - Development: `http://localhost:5000/api/zapier-webhook`
   - Production: `https://myflowsphere.com/api/zapier-webhook`

---

## Step-by-Step Setup

### 1. Twitter/X Mentions Monitor

**Zap Configuration:**
```
Trigger: Twitter - New Mention
Action: Webhooks by Zapier - POST
```

**Setup Steps:**
1. Create new Zap
2. Choose Trigger: **Twitter** → **New Mention**
3. Connect your Twitter/X account
4. Test trigger to verify connection
5. Choose Action: **Webhooks by Zapier** → **POST**
6. Configure webhook:
   - **URL**: `https://myflowsphere.com/api/zapier-webhook`
   - **Payload Type**: JSON
   - **Data**:
     ```json
     {
       "provider": "twitter",
       "from": "{{Tweet Username}}",
       "fromName": "{{Tweet Name}}",
       "subject": "Mention from @{{Tweet Username}}",
       "body": "{{Tweet Text}}",
       "snippet": "{{Tweet Text}}",
       "timestamp": "{{Tweet Created At}}",
       "link": "{{Tweet URL}}",
       "type": "mention"
     }
     ```
7. Test action
8. Turn on Zap

---

### 2. Facebook Comments Monitor

**Zap Configuration:**
```
Trigger: Facebook Pages - New Comment
Action: Webhooks by Zapier - POST
```

**Setup Steps:**
1. Create new Zap
2. Choose Trigger: **Facebook Pages** → **New Comment**
3. Connect your Facebook account
4. Select your Facebook Page
5. Test trigger
6. Choose Action: **Webhooks by Zapier** → **POST**
7. Configure webhook:
   - **URL**: `https://myflowsphere.com/api/zapier-webhook`
   - **Payload Type**: JSON
   - **Data**:
     ```json
     {
       "provider": "facebook",
       "from": "{{Commenter ID}}",
       "fromName": "{{Commenter Name}}",
       "subject": "Comment on your post",
       "body": "{{Comment Message}}",
       "snippet": "{{Comment Message}}",
       "timestamp": "{{Comment Created Time}}",
       "link": "{{Post Link}}",
       "type": "comment"
     }
     ```
8. Test action
9. Turn on Zap

---

### 3. Instagram Comments Monitor

**Zap Configuration:**
```
Trigger: Instagram for Business - New Comment
Action: Webhooks by Zapier - POST
```

**Setup Steps:**
1. Create new Zap
2. Choose Trigger: **Instagram for Business** → **New Comment**
3. Connect Instagram Business account
4. Test trigger
5. Choose Action: **Webhooks by Zapier** → **POST**
6. Configure webhook:
   - **URL**: `https://myflowsphere.com/api/zapier-webhook`
   - **Payload Type**: JSON
   - **Data**:
     ```json
     {
       "provider": "instagram",
       "from": "{{Commenter Username}}",
       "fromName": "{{Commenter Username}}",
       "subject": "Comment on Instagram",
       "body": "{{Comment Text}}",
       "snippet": "{{Comment Text}}",
       "timestamp": "{{Comment Timestamp}}",
       "link": "{{Media Permalink}}",
       "type": "comment"
     }
     ```
7. Test action
8. Turn on Zap

---

### 4. Instagram DMs Monitor

**Zap Configuration:**
```
Trigger: Instagram for Business - New Message
Action: Webhooks by Zapier - POST
```

**Setup Steps:**
1. Create new Zap
2. Choose Trigger: **Instagram for Business** → **New Message**
3. Connect Instagram account
4. Test trigger
5. Choose Action: **Webhooks by Zapier** → **POST**
6. Configure webhook:
   - **URL**: `https://myflowsphere.com/api/zapier-webhook`
   - **Payload Type**: JSON
   - **Data**:
     ```json
     {
       "provider": "instagram",
       "from": "{{Sender Username}}",
       "fromName": "{{Sender Name}}",
       "subject": "Instagram DM",
       "body": "{{Message Text}}",
       "snippet": "{{Message Text}}",
       "timestamp": "{{Message Created Time}}",
       "type": "message"
     }
     ```
7. Test action
8. Turn on Zap

---

## Setting up the Webhook Endpoint

You'll need to create an API endpoint in FlowSphere to receive Zapier webhooks.

### For Development (localhost)

1. Use **ngrok** to expose local server:
   ```bash
   npx ngrok http 5000
   ```
2. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
3. Use this URL in Zapier: `https://abc123.ngrok.io/api/zapier-webhook`

### For Production

Create API route file: `src/api/zapier-webhook.ts`

```typescript
import { Request, Response } from 'express'
import { zapierWebhookHandler, ZapierEmailPayload } from '@/lib/email/zapier-webhook'

export async function POST(req: Request, res: Response) {
  try {
    const payload: ZapierEmailPayload = req.body

    // Validate payload
    if (!payload.provider || !payload.body) {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    // Process webhook
    const alert = await zapierWebhookHandler.processWebhook(payload)

    return res.status(200).json({
      success: true,
      alertId: alert.id
    })
  } catch (error) {
    console.error('Zapier webhook error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
```

---

## Testing Your Zaps

### 1. Test Each Zap Individually

1. Go to Zapier dashboard
2. Find your Zap
3. Click "Test & Review"
4. Trigger a test event (post a comment, send a mention, etc.)
5. Check FlowSphere notifications to see if alert appears

### 2. Verify in FlowSphere

After setting up Zaps:
1. Check localStorage for `flowsphere-zapier-alerts`
2. Alerts should appear in Notifications view
3. AI classification should be applied
4. Toast notifications should appear for important/emergency items

---

## Monitoring & Maintenance

### Check Zap Status
- Visit [zapier.com/app/zaps](https://zapier.com/app/zaps)
- Ensure all Zaps show "On" status
- Check task usage to avoid hitting limits

### Task Usage Estimates
- **Twitter mentions**: ~5-50 tasks/month (depends on your reach)
- **Facebook comments**: ~10-100 tasks/month
- **Instagram engagement**: ~20-200 tasks/month

**Recommended Plan**: Starter ($19.99/month, 750 tasks) for personal use

---

## Troubleshooting

### Webhook Not Receiving Data

1. **Check Zap is ON**: Verify Zap is turned on in Zapier dashboard
2. **Verify URL**: Ensure webhook URL is correct
3. **Test endpoint**: Use curl to test:
   ```bash
   curl -X POST https://myflowsphere.com/api/zapier-webhook \
     -H "Content-Type: application/json" \
     -d '{"provider":"twitter","from":"test","body":"test message","timestamp":"2024-12-02T00:00:00Z","type":"mention"}'
   ```
4. **Check logs**: Look at Zapier task history for errors

### AI Classification Not Working

1. Verify GROQ API key is set in `.env`:
   ```
   VITE_GROQ_API_KEY=your_groq_api_key
   ```
2. Check browser console for errors
3. Verify `zapierWebhookHandler.processWebhook()` is being called

### Alerts Not Showing

1. Check localStorage: `localStorage.getItem('flowsphere-zapier-alerts')`
2. Verify notification permissions are enabled
3. Check if toast notifications are being blocked

---

## Cost Optimization Tips

1. **Filter Triggers**: Only monitor important accounts/pages
2. **Use Paths**: Add conditional logic to filter out spam
3. **Batch Processing**: Group similar alerts together
4. **Monitor Usage**: Set up alerts when approaching task limits

---

## Advanced Configuration

### Add Filters to Reduce Noise

In Zapier, add a **Filter** step between Trigger and Action:

**Example: Only process mentions with keywords**
```
Filter: Tweet Text contains any of: urgent, emergency, help, important
```

**Example: Skip spam comments**
```
Filter: Comment Message does not contain: spam, bot, fake
```

### Multi-Step Zaps for Rich Notifications

Add intermediate steps:
1. **Trigger**: New mention
2. **Action 1**: Get user details
3. **Action 2**: Analyze sentiment (using AI)
4. **Action 3**: Send to FlowSphere with enriched data

---

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS for webhook URLs
2. **Validate Payloads**: Check payload structure in your API
3. **Rate Limiting**: Implement rate limiting on webhook endpoint
4. **Secret Tokens**: Add authentication header to verify requests are from Zapier

Example with secret token:
```typescript
const ZAPIER_SECRET = process.env.ZAPIER_WEBHOOK_SECRET

if (req.headers['x-zapier-secret'] !== ZAPIER_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

---

## Next Steps

Once Zapier is configured:

1. ✅ Test each Zap thoroughly
2. ✅ Monitor task usage for first week
3. ✅ Fine-tune filters to reduce noise
4. ✅ Set up Groq API for AI classification
5. ✅ Configure notification preferences in FlowSphere
6. ✅ Add more integrations as needed (LinkedIn, Slack, etc.)

---

## Need Help?

- **Zapier Support**: [https://zapier.com/help](https://zapier.com/help)
- **Zapier Community**: [https://community.zapier.com](https://community.zapier.com)
- **FlowSphere Issues**: Create issue on GitHub repository

---

**Last Updated**: December 2, 2024
**Version**: 1.0
