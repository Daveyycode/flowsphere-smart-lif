# 🚀 FlowSphere REAL Backend Setup Guide

**You now have REAL backend services!** Follow these steps to activate them.

## ✅ What's Now REAL (Not Fake):

1. **Payments** - Saves to database, tracks transactions
2. **Messaging** - Real-time with Supabase, persists to database
3. **User Data** - Everything saves to real database
4. **Subscriptions** - Real subscription tracking

---

## 🔧 Setup Steps (15 minutes):

### Step 1: Create Supabase Project (FREE)

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub
4. Click "New Project"
5. **Copy these values:**
   - Project URL (looks like: https://xxxxx.supabase.co)
   - Anon/Public Key (starts with: eyJ...)

### Step 2: Set Up Database

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. **Copy ALL contents from these 2 files:**
   - `supabase-schema.sql` (main tables)
   - `supabase-messenger-tables.sql` (messenger + payments)
4. Paste into SQL Editor
5. Click **Run** button
6. ✅ You should see "Success. No rows returned"

### Step 3: Add Your API Keys

1. Open `.env` file in your project
2. Add these lines (replace with YOUR values):

```env
# Supabase (FREE)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...YOUR_KEY_HERE

# OpenAI (for AI features)
VITE_OPENAI_API_KEY=sk-...YOUR_KEY_HERE

# Groq (FREE alternative to OpenAI)
VITE_GROQ_API_KEY=gsk_...YOUR_KEY_HERE
```

### Step 4: Build & Deploy

```bash
npm run build
npx vercel --prod
```

---

## 💰 What Works NOW:

### ✅ Payment Processing
- Credit card validation (Luhn algorithm)
- Bank transfer support
- Saves to `subscriptions` table
- Records all transactions in `payment_transactions` table
- Tracks payment history

### ✅ Secure Messenger
- Real-time messaging with Supabase Realtime
- Messages save to database
- Contacts persist across devices
- Auto-sync between tabs/windows

### ✅ User Authentication
- Supabase Auth (email/password)
- Session management
- Row-level security (users only see their own data)

---

## 💸 Costs Breakdown:

### FREE Tier (What You Get):
- **Supabase**: 500MB database, 2GB bandwidth/month, unlimited API requests
- **Groq AI**: 6,000 free requests/day (for AI features)
- **Vercel**: Unlimited deployments, 100GB bandwidth

### When You Need to Pay:
- **OpenAI** (optional): $5-20/month for GPT-4o-mini
- **Twilio SMS** (optional): $0.0079 per SMS
- **Real Stripe** (when ready): 2.9% + $0.30 per transaction

---

## 🎯 What's Next (Real Payments):

To add REAL Stripe credit card processing:

1. Create Stripe account: [stripe.com](https://stripe.com)
2. Get API keys (Test mode free)
3. Add to `.env`:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. I'll help integrate Stripe Elements for real card processing

**Current Status**: Payments validate + save to database. Cards not actually charged yet.

---

## 📊 Check If It's Working:

1. Sign up for an account
2. Try to subscribe (card: 4532 0012 3456 7890)
3. Go to Supabase Dashboard → Table Editor
4. Check `subscriptions` table - you should see your subscription!
5. Check `payment_transactions` - transaction recorded!

---

## ❓ Troubleshooting:

**"Supabase not defined"**
- Make sure `.env` has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Restart dev server: `npm run dev`

**"Table does not exist"**
- Run BOTH SQL files in Supabase SQL Editor
- Make sure both queries show "Success"

**Payments not saving**
- Check browser console for errors
- Verify you're logged in (Supabase auth)
- Check Supabase dashboard → Authentication → Users

---

## 💾 Database Tables Created:

✅ `profiles` - User profiles
✅ `messages` - Secure messages
✅ `messenger_contacts` - Contacts list
✅ `subscriptions` - User subscriptions
✅ `payment_transactions` - Payment history
✅ `meetings` - Meeting notes
✅ `vault_items` - Password vault
✅ `calendar_events` - Family calendar
✅ `ai_conversations` - AI chat history
✅ `voice_memos` - Voice recordings
✅ `tasks` - Todo items

All tables have **Row Level Security** - users can ONLY access their own data!

---

## 🚀 You're Done!

Your app now has a REAL backend. Everything saves to a real database. No more fake data!

**Total Time to Set Up**: ~15 minutes
**Total Cost**: $0 (using free tiers)

Need help? Check Supabase logs in dashboard → Logs → Postgres Logs
