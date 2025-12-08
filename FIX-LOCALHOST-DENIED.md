# 🚨 FIX: Localhost Denied Issue - Port 5000 Blocked

## Problem:
Port 5000 is being used by **Apple's AirPlay Receiver** (ControlCenter), blocking your FlowSphere dev server.

**Error:** `HTTP/1.1 403 Forbidden` from AirTunes/920.10.1

---

## ✅ SOLUTION (2 Options)

### **Option 1: Disable AirPlay Receiver** (RECOMMENDED)

1. **Open System Settings** (System Preferences on older macOS)
2. Go to **General** → **AirDrop & Handoff**
3. Find **AirPlay Receiver**
4. **Turn OFF** AirPlay Receiver

**OR** (Alternate path):
1. Go to **System Settings** → **Sharing**
2. Turn OFF **AirPlay Receiver**

5. **Restart your dev server:**
   ```bash
   cd /Users/abbieatienza/LocalProjects/flowsphere-from-github
   npm run dev
   ```

6. Should now work on `http://localhost:5000`

---

### **Option 2: Use a Different Port** (ALTERNATIVE)

If you need AirPlay Receiver enabled:

1. **Edit package.json:**
   ```bash
   # Change dev script port from 5000 to 5173
   # Before: "dev": "vite --port 5000"
   # After: "dev": "vite --port 5173"
   ```

2. **Update Gmail OAuth redirect URI:**
   - Go to Google Cloud Console
   - Update OAuth redirect URI to `http://localhost:5173`

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. Access app at: `http://localhost:5173`

---

## 🎯 RECOMMENDED: Option 1 (Disable AirPlay)

**Why?**
- Gmail OAuth already configured for port 5000
- No code changes needed
- Most Mac users don't use AirPlay Receiver
- Quick fix (30 seconds)

---

## 🔍 How I Found This:

```bash
# Checked what's using port 5000
$ lsof -i :5000
COMMAND     PID         USER   FD   TYPE
ControlCe 47337 abbieatienza   10u  IPv4  (AirPlay Receiver)

# Verified it's AirPlay
$ curl -I http://localhost:5000
HTTP/1.1 403 Forbidden
Server: AirTunes/920.10.1  ← Apple's AirPlay
```

---

## ✅ After Fix, Test These:

1. Dev server starts: `npm run dev`
2. Browser loads: `http://localhost:5000`
3. Gmail OAuth works (no redirect_uri_mismatch)
4. All 6 fixes from today's session work:
   - AI Assistant upgrade
   - Email box overflow fix
   - Permission toggles
   - Permission status display
   - Voice command greeting fix
   - Clear browser cache first!

---

**Issue:** Port 5000 blocked by AirPlay Receiver
**Solution:** Disable AirPlay Receiver in System Settings
**Time:** 30 seconds
**Status:** Ready to fix!
