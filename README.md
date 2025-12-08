# FlowSphere - Multi-Feature Home & Family Management App

**FlowSphere** is a comprehensive home and family management application that handles email monitoring, home automation, kids tracking, voice notes, secure vault, maps, and AI integrations.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📋 Features

- **Email Management**: Real-time monitoring, AI classification, emergency alerts
- **Home Automation**: CCTV monitoring, electricity tracking
- **Kids Tracking**: Location monitoring for family members
- **Voice Notes**: Voice recording and transcription
- **Secure Vault**: Encrypted file storage
- **AI Assistant**: Intelligent home management
- **Subscription Management**: Tiered access (Basic, Pro, Gold, Family)

---

## 🔄 BACKUP SYNC REQUIREMENT (For Claude)

**CRITICAL INSTRUCTION FOR CLAUDE CODE:**

Every time you make changes to this project, you MUST also sync/copy the modified files to:
```
/Users/abbieatienza/LocalProjects/merged-FL-DONT-TOUCH/
```

### Sync Procedure:
1. After completing any code changes in `flowsphere-from-github`
2. Copy the modified files to `merged-FL-DONT-TOUCH` (same directory structure)
3. Update the sync log: `merged-FL-DONT-TOUCH/SYNC-LOG.md`

### What to Include in SYNC-LOG.md:
- Date of sync
- List of files synced
- Brief summary of changes

### Why This Matters:
- `merged-FL-DONT-TOUCH` is the **golden master backup**
- If something breaks in the working directory, we can restore from here
- Keeps a safe, always-working copy of the codebase

**DO NOT SKIP THIS STEP!**

---

## CEO/Admin Features (Remove Before Production!)

**IMPORTANT:** This codebase contains CEO/Admin dashboard features that should be **removed before production deployment**.

### CEO Files Location
All CEO-related code is documented in:
- `CEO_EXTRACTION_GUIDE.md` - Complete list of CEO files and how to remove them
- `/Users/abbieatienza/LocalProjects/flowsphere-ceo-backup/` - Backup of all CEO files

### Before Deploying to Production
1. Run `./scripts/extract-ceo.sh` to backup CEO files
2. Remove CEO files from project (see guide)
3. Edit `App.tsx`, `vault.tsx`, `auth-modal.tsx` to remove CEO imports
4. Run `npm run build` to verify no errors

### Security Warning
The CEO credentials are currently **hardcoded** in source code:
- `src/CEOAuth.tsx`
- `src/lib/ceo-check.ts`

**These MUST be removed or moved to secure server-side environment variables before production!**

See `AUDIT_REPORT.md` for full security audit.

---

## 🛠️ Claude Code Setup v2.0

For AI-assisted development with Claude Code, we've created a **v2.0 setup script** with **automatic session management** and **file recreation prevention**.

### ✨ What's New in v2.0

- **🔄 Automatic Session Management**: Auto-loads sessions on start, auto-saves at 70-80% tokens
- **🚫 Never Recreates Files**: Claude only makes targeted edits, never regenerates entire files
- **📊 Smart Token Monitoring**: Claude actively tracks usage and saves before hitting limits
- **🎯 Seamless Continuation**: Pick up exactly where you left off, every time
- **📝 Enhanced Commands**: New `/login`, `/logout`, `/status` commands
- **🔧 Helper Scripts**: `start-session.sh`, `view-session.sh` for easy management

### Quick Setup

1. **Copy the setup script** below and save as `claude-setup-v2.sh`
2. **Make executable**: `chmod +x claude-setup-v2.sh`
3. **Run it**: `./claude-setup-v2.sh`
4. **Start working**: `./start-session.sh`

### Complete Setup Script v2.0

**To use this script:**
- Copy everything between the bash code block markers
- Save as `claude-setup-v2.sh` in your project root
- Run: `chmod +x claude-setup-v2.sh && ./claude-setup-v2.sh`

```bash
#!/bin/bash

# Complete Claude Code Setup Script v2.0
# Features: Automatic session logging, strict file edit policies, seamless continuation

set -e  # Exit on error

# ========================================
# 🚨 CRITICAL INSTRUCTIONS FOR CLAUDE 🚨
# ========================================
# READ THIS EVERY TIME YOU START A NEW SESSION!
#
# 1. 🚫 NEVER RECREATE ANY FILE
#    - ALWAYS use Edit tool to modify existing files
#    - NEVER use Write tool on existing files
#    - Only create NEW files when explicitly requested
#    - If a file exists, EDIT it - don't regenerate it
#
# 2. 📝 LOG ALL SUCCESSFUL CHANGES
#    - Update: ~/LocalProjects/merged-FL-DONT-TOUCH/WHAT-WE-SUCCESSFULLY-EDITED-CHANGED.md
#    - Include: Date, Time, File changed, What was done, Why it was done
#    - ONLY log successful implementations (not failed attempts)
#    - NEVER create new log files - APPEND to existing one
#
# 3. 🌍 PRODUCTION-READY REQUIREMENTS
#    - Target: MILLIONS of real users worldwide
#    - Platforms: Web (current), iOS, Android (native-ready)
#    - NO FAKE DATA - Everything must use real backends:
#      ✅ Supabase (database, auth, storage, realtime)
#      ✅ Stripe (payments)
#      ✅ OAuth providers (email)
#      ✅ Real-time sync (Supabase Realtime subscriptions)
#    - NO MOCK DATA - All data from real APIs/databases
#    - NO PLACEHOLDERS - All features must be fully functional
#    - RESPONSIVE - Must work on mobile, tablet, desktop
#    - REAL-TIME - All updates must sync across devices instantly
#    - MULTI-USER - Proper data isolation with Row Level Security (RLS)
#    - NATIVE-READY - Code must work with Capacitor for iOS/Android
#
# 4. 🔒 FEATURE ISOLATION (CRITICAL!)
#    - When user requests to edit/implement ONE feature:
#      ✅ ONLY modify files related to THAT specific feature
#      ✅ LOCK all other features - DO NOT TOUCH THEM
#      ✅ CREATE WARNING if change might affect other features
#      ✅ ASK USER before modifying shared/common files
#      ✅ NEVER "improve" or "refactor" code not related to the task
#    - Example: If fixing Vault, DO NOT touch Messenger, Auth, etc.
#
# 5. ⚠️ IMPACT WARNINGS
#    - Before making ANY change, check if it affects:
#      • Shared components (ui/*, layout.tsx, etc.)
#      • Common utilities (lib/utils.ts, lib/supabase.ts, etc.)
#      • Database schema or API calls
#      • Authentication or user management
#    - If it affects OTHER features, WARN USER and ASK PERMISSION
#    - Format: "⚠️ WARNING: This change will also affect [Feature X, Y]. Proceed? (y/n)"
#
# 6. 🎯 SAFE BACKUP
#    - merged-FL-DONT-TOUCH = CLEAN BACKUP (never modify code here)
#    - Only update the log file in merged folder
#    - If LocalProjects breaks, we can restore from merged-FL-DONT-TOUCH
#
# 7. 📋 SESSION TRACKING
#    - Log current TODOs in the tracking file
#    - Include what's in progress, what's completed
#    - Update timestamps for every session
#    - Help user pick up where they left off
#
# ========================================

echo "=================================================="
echo "Claude Code Complete Setup & Optimization v2.0"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "ℹ $1"; }

# Clean up old installations
echo "Step 1: Checking for existing Claude Code installations..."
CLAUDE_LOCATIONS=$(which -a claude 2>/dev/null || true)
if [ -n "$CLAUDE_LOCATIONS" ]; then
    print_warning "Found: $CLAUDE_LOCATIONS"
else
    print_info "No existing installations found"
fi
echo ""

# Remove duplicates
echo "Step 2: Cleaning up..."
npm list -g @anthropic-ai/claude-code &>/dev/null && npm uninstall -g @anthropic-ai/claude-code 2>/dev/null || true
brew list --cask claude-code &>/dev/null && brew uninstall --cask claude-code 2>/dev/null || true
[ -f "/opt/homebrew/bin/claude" ] && sudo rm -f /opt/homebrew/bin/claude
npm cache clean --force &>/dev/null
print_success "Cleanup complete"
echo ""

# Backup config
echo "Step 3: Backing up configuration..."
if [ -d "$HOME/.claude" ]; then
    BACKUP_DIR="$HOME/.claude-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$HOME/.claude" "$BACKUP_DIR"
    print_success "Backed up to $BACKUP_DIR"
    rm -rf "$HOME/.claude"
fi
[ -f "$HOME/.claude.json" ] && rm "$HOME/.claude.json"
print_success "Old config removed"
echo ""

# Install Claude Code
echo "Step 4: Installing Claude Code..."
curl -fsSL https://claude.ai/install.sh | bash

if ! grep -q ".local/bin" "$HOME/.zshrc" 2>/dev/null && ! grep -q ".local/bin" "$HOME/.bashrc" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    export PATH="$HOME/.local/bin:$PATH"
    print_success "Added to PATH"
fi
print_success "Claude Code installed"
echo ""

# Verify
echo "Step 5: Verifying installation..."
if command -v claude &>/dev/null; then
    print_success "Claude Code is ready"
    claude doctor || print_warning "Some diagnostics failed"
else
    print_error "Installation failed"
    exit 1
fi
echo ""

# Project setup
echo "Step 6: Project configuration..."
read -p "Project path (e.g., /Users/you/projects/app): " PROJECT_PATH

if [ ! -d "$PROJECT_PATH" ]; then
    read -p "Directory doesn't exist. Create it? (y/n): " CREATE_DIR
    [ "$CREATE_DIR" = "y" ] && mkdir -p "$PROJECT_PATH" || exit 1
fi

cd "$PROJECT_PATH"
print_success "Working in: $PROJECT_PATH"
echo ""

# Create structure
echo "Step 7: Creating project structure..."
mkdir -p docs .claude/commands .claude/sessions
print_success "Structure ready"
echo ""

# Create CLAUDE.md with v2.0 features
echo "Step 8: Creating CLAUDE.md..."
cat > "$PROJECT_PATH/CLAUDE.md" << 'EOFCLAUDEMD'
# FlowSphere - Home & Family Management App

## AUTOMATIC SESSION MANAGEMENT (v2.0)

### On Start (Auto-Login)
**IMMEDIATELY after starting:**
1. Check if `.claude/sessions/active-session.md` exists
2. If exists: Read it and announce "📂 Resuming: [session name]"
3. Load context and continue from where we left off
4. If not exists: Announce "✨ Starting fresh"

### Token Monitoring (70-80% Rule)
**Actively monitor token usage:**
- At 70-80% capacity:
  1. STOP current work
  2. Execute automatic logout (create session file)
  3. Tell user: "⚠️ APPROACHING TOKEN LIMIT - Session saved. Restart Claude Code to continue."

### On Exit (Auto-Logout)
**AUTOMATICALLY create `.claude/sessions/active-session.md`:**

```markdown
# Session: [Feature Name]
**Last Updated:** [timestamp]
**Status:** [In Progress/Blocked/Testing]

## Current Objective
[One sentence goal]

## Progress Summary
### Completed ✅
- [Tasks with file paths]

### In Progress 🔄
- [Current task details]

### Next Steps 📋
1. [Next action]
2. [Following action]

## Files Modified
- `path/file.ts` - [changes]

## Known Issues 🚧
- [Blockers]

## Important Context 💡
- [Critical details]

## Test Status 🧪
- ✅ Passing: [list]
- ❌ Failing: [list]

## Technical Summary
[2-3 sentence overview]
```

## CRITICAL: NEVER RECREATE FILES

**ABSOLUTE RULE:**

### File Handling Rules
- **NEVER** regenerate entire files
- **NEVER** show complete file contents (unless explicitly asked)
- **NEVER** duplicate existing code
- **ALWAYS** make targeted edits only
- **ALWAYS** show only changed sections

### Correct Approach
```
I'll update EmailService.ts line 45:

  async filterByDate(start: Date, end: Date) {
    return this.emails.filter(e =>
      e.date >= start && e.date <= end
    );
  }
```

### Wrong Approach (NEVER DO THIS)
```
Here's the complete EmailService.ts:
[200 lines of code]
```

### Before ANY Change
1. Check if file exists
2. Read to understand structure
3. Make ONLY necessary edits
4. Show ONLY changed sections

## Project Info

**Tech Stack:**
- Frontend: React + TypeScript + Vite
- Backend: Supabase (PostgreSQL + Auth)
- State: Local KV (@github/spark)
- Email: OAuth (Gmail, Yahoo, Outlook, iCloud)

**Key Features:**
- Email monitoring with AI classification
- Subscription tiers: Basic (2), Pro (5), Gold (10), Family (unlimited) email accounts
- CEO Dashboard (hidden: 7 taps on Settings > About)
- Secure vault, Family tracking, AI assistant

## NO MOCK DATA POLICY

**Critical rule:**
- NO mock data or placeholders
- NO simulated responses
- Use REAL API calls, database, auth
- If something doesn't work: TELL ME immediately
- Don't create fake implementations

## Development Workflow

1. **Check session**: Read `.claude/sessions/active-session.md` first
2. **Understand**: Read relevant files
3. **Plan**: Get approval before coding
4. **Implement**: Targeted edits only (never recreate files)
5. **Test**: Verify changes work
6. **Log**: Update session regularly

## Commands

```bash
npm run dev      # Start dev server (localhost:5173)
npm run build    # Production build
npm run lint     # Check errors
```

## Git Workflow

```bash
git checkout -b feature/name
# ... changes ...
git add .
git commit -m "feat: description"
git push origin feature/name
```

## Important Files

- `src/App.tsx` - Main app, subscription state
- `src/components/email-connection.tsx` - Email OAuth (with real subscription prop)
- `src/components/settings-view.tsx` - Settings page
- `.env` - Environment variables (DO NOT READ)

## Communication Style

- Be concise
- Show only changed code sections
- This is MVP - simple solutions first
- Tell me if approaching token limits
- Never recreate existing files

## Remember

**Three Golden Rules:**
1. Check session file on start
2. Save session at 70-80% tokens
3. Never recreate existing files

Work naturally. The system handles the rest.
EOFCLAUDEMD

print_success "CLAUDE.md created"
echo ""

# Create settings
echo "Step 9: Creating settings..."
cat > "$PROJECT_PATH/.claude/settings.json" << 'EOFSETTINGS'
{
  "model": "claude-sonnet-4-20250514",
  "maxTokens": 8192,
  "permissions": {
    "allowedTools": ["Read", "Write", "Edit", "Bash", "Grep", "Glob"],
    "deny": ["Read(./.env)", "Read(./.env.*)"]
  }
}
EOFSETTINGS
print_success "Settings configured"
echo ""

# Create commands
echo "Step 10: Creating custom commands..."

cat > "$PROJECT_PATH/.claude/commands/login.md" << 'EOFLOGIN'
---
description: Auto-load session and continue work
---

1. Check `.claude/sessions/active-session.md`
2. If exists: Read and announce "📂 Resuming: [name]"
3. Summarize: What we're doing, progress, next step
4. Ask: "Ready to continue with: [next action]?"
5. If not exists: "✨ Starting fresh. What to work on?"
EOFLOGIN

cat > "$PROJECT_PATH/.claude/commands/logout.md" << 'EOFLOGOUT'
---
description: Auto-save session before exit
---

Create `.claude/sessions/active-session.md` with complete state (see CLAUDE.md format).

Then announce: "💾 Session saved. Safe to exit. Use ./start-session.sh to resume."
EOFLOGOUT

cat > "$PROJECT_PATH/.claude/commands/status.md" << 'EOFSTATUS'
---
description: Check session status and token usage
---

1. Read active session file
2. Check token usage
3. Report: session name, current task, token %, recommendation
EOFSTATUS

cat > "$PROJECT_PATH/.claude/commands/implement-real.md" << 'EOFREAL'
---
description: Implement with real integrations (NO MOCKS)
argument-hint: [feature]
---

Implement: $ARGUMENTS

**Rules:**
- NO mocks or placeholders
- Real API calls and database
- Never recreate existing files
- Targeted edits only

If doesn't work: Tell me, don't fake it.
EOFREAL

print_success "Commands created: /login, /logout, /status, /implement-real"
echo ""

# Create helper scripts
echo "Step 11: Creating helper scripts..."

cat > "$PROJECT_PATH/start-session.sh" << 'EOFSTART'
#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 Starting Claude Code with auto-session..."
[ -f ".claude/sessions/active-session.md" ] && echo "📂 Active session found" || echo "✨ Starting fresh"
echo ""
claude
EOFSTART
chmod +x "$PROJECT_PATH/start-session.sh"

cat > "$PROJECT_PATH/view-session.sh" << 'EOFVIEW'
#!/bin/bash
[ -f ".claude/sessions/active-session.md" ] && cat .claude/sessions/active-session.md || echo "No active session"
EOFVIEW
chmod +x "$PROJECT_PATH/view-session.sh"

cat > "$PROJECT_PATH/checkpoint.sh" << 'EOFCHECK'
#!/bin/bash
echo "📍 Creating checkpoint..."
git add .
git commit -m "CHECKPOINT: $(date '+%Y-%m-%d %H:%M:%S')"
echo "✅ Done! Use ./recover.sh to restore"
EOFCHECK
chmod +x "$PROJECT_PATH/checkpoint.sh"

cat > "$PROJECT_PATH/recover.sh" << 'EOFRECOVER'
#!/bin/bash
echo "📜 Recent checkpoints:"
git log --oneline --grep="CHECKPOINT" -10
read -p "How many commits back? (1 for last): " COMMITS
git reset --hard HEAD~${COMMITS:-1}
echo "✅ Restored to: $(git log -1 --oneline)"
EOFRECOVER
chmod +x "$PROJECT_PATH/recover.sh"

print_success "Scripts created"
echo ""

# Create quick start guide
echo "Step 12: Creating quick start guide..."
cat > "$PROJECT_PATH/CLAUDE-QUICKSTART.md" << 'EOFQUICK'
# Quick Start - Claude Code v2.0

## Daily Workflow

### Start
```bash
./start-session.sh
```
→ Auto-loads last session
→ Continues where you left off

### Work
Just code naturally. Claude:
- Monitors tokens automatically
- Saves at 70-80% capacity
- Never recreates files
- Shows only changed code

### End
```
/logout
```
→ Auto-saves session
→ Safe to exit

## Key Features

✅ **Automatic session management** - No manual work
✅ **Never recreates files** - Only targeted edits
✅ **Smart token monitoring** - Saves before limits
✅ **Seamless continuation** - Pick up anywhere

## Commands

```bash
./start-session.sh    # Start with auto-load
./view-session.sh     # See current session
./checkpoint.sh       # Save before risky changes
./recover.sh          # Restore if needed
```

**In Claude Code:**
- `/login` - Auto-load session
- `/logout` - Auto-save session
- `/status` - Check tokens & status
- `/implement-real` - Force real implementations

## Example

**First time:**
```bash
./start-session.sh
> ✨ Starting fresh
> What to work on?

You: "Add email filtering"
[Claude implements, tests]

At 70% tokens:
> ⚠️ Saving session...
```

**Next time:**
```bash
./start-session.sh
> 📂 Resuming: Email Filtering
> Next: Add date filter tests
> Continue?

You: "Yes"
[Continues automatically]
```

## That's It!

Just run `./start-session.sh` and work naturally.
Everything else is automatic.
EOFQUICK

print_success "Quick start guide created"
echo ""

# Git setup
echo "Step 13: Git repository..."
if [ ! -d ".git" ]; then
    git init
    cat > .gitignore << 'EOFGITIGNORE'
node_modules/
.env
.env.local
dist/
build/
.DS_Store
*.log
.claude-backup-*/
EOFGITIGNORE
    git add .
    git commit -m "Initial commit: Claude Code v2.0 setup"
    print_success "Git initialized"
else
    print_info "Git already initialized"
fi
echo ""

# Env template
if [ ! -f ".env" ]; then
    cat > .env.template << 'EOFENV'
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_GOOGLE_CLIENT_ID=your_id
VITE_GOOGLE_CLIENT_SECRET=your_secret
EOFENV
    cp .env.template .env
    print_success ".env template created"
    print_warning "Fill in real credentials"
fi
echo ""

# Final summary
echo "=================================================="
echo "✓ Setup Complete! v2.0"
echo "=================================================="
echo ""
print_success "Claude Code v2.0 configured"
print_success "Automatic session management active"
print_success "File recreation prevention enabled"
echo ""
echo "🎯 What's Automatic:"
echo ""
echo "  ✅ Session loading on start"
echo "  ✅ Session saving at 70-80% tokens"
echo "  ✅ Never recreating files"
echo "  ✅ Only showing changed code"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "1. Fill credentials: nano $PROJECT_PATH/.env"
echo "2. Read guide: cat $PROJECT_PATH/CLAUDE-QUICKSTART.md"
echo "3. Start coding: ./start-session.sh"
echo ""
print_warning "Remember: Everything is automatic now!"
echo ""
echo "=================================================="
echo "🎉 Ready to code efficiently!"
echo "=================================================="
```

### What This Setup Does

**v2.0 Features:**

1. **Automatic Session Management**
   - Loads previous session on start
   - Saves at 70-80% token capacity
   - Seamless continuation between sessions

2. **File Recreation Prevention**
   - Claude NEVER regenerates entire files
   - Only makes targeted edits
   - Shows only changed code sections

3. **Smart Token Monitoring**
   - Active token tracking
   - Warns at 70%
   - Auto-saves at 80%

4. **Custom Commands**
   - `/login` - Auto-load session
   - `/logout` - Auto-save session
   - `/status` - Check tokens & progress
   - `/implement-real` - Force real implementations

5. **Helper Scripts**
   - `start-session.sh` - Start with auto-load
   - `view-session.sh` - View session state
   - `checkpoint.sh` - Quick git checkpoint
   - `recover.sh` - Restore checkpoint

### After Setup

**Start working:**
```bash
./start-session.sh
```

**View session anytime:**
```bash
./view-session.sh
```

**Before risky changes:**
```bash
./checkpoint.sh
```

**If something breaks:**
```bash
./recover.sh
```

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Environment Variables

Create `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_GOOGLE_CLIENT_ID=your_google_id
VITE_GOOGLE_CLIENT_SECRET=your_secret
```

### Running Locally

```bash
npm run dev
```

Visit `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## 📦 Project Structure

```
flowsphere-from-github/
├── src/
│   ├── components/          # React components
│   │   ├── email-connection.tsx    # Email OAuth (with subscription prop)
│   │   └── settings-view.tsx       # Settings page
│   ├── lib/                 # Utilities, API clients
│   ├── hooks/               # Custom hooks
│   ├── App.tsx              # Main app (subscription state)
│   └── main.tsx             # Entry point
├── .claude/                 # Claude Code v2.0 config
│   ├── settings.json        # Settings
│   ├── commands/            # Custom slash commands
│   │   ├── login.md         # Auto-load session
│   │   ├── logout.md        # Auto-save session
│   │   ├── status.md        # Check progress
│   │   └── implement-real.md
│   └── sessions/            # Session storage
│       └── active-session.md    # Current session state
├── docs/                    # Documentation
├── CLAUDE.md                # Project guide for Claude
├── CLAUDE-QUICKSTART.md     # Quick start guide
├── CLAUDE_V2_COMPARISON.md  # v2.0 features comparison
├── start-session.sh         # Start with auto-load
├── view-session.sh          # View session state
├── checkpoint.sh            # Create checkpoint
├── recover.sh               # Restore checkpoint
└── README.md                # This file
```

## 🎯 Workflow with Claude Code v2.0

### Daily Development

```bash
# 1. Start (auto-loads session)
./start-session.sh

# 2. Work naturally
# Claude monitors tokens automatically
# At 70-80%: Auto-saves and asks you to restart

# 3. Before risky changes
./checkpoint.sh

# 4. End of day
# In Claude Code: /logout
# Or just exit - Claude will prompt
```

### Session Management

**All automatic - you don't need to do anything!**

- ✅ Claude checks for session on start
- ✅ Claude loads context automatically
- ✅ Claude saves at 70-80% tokens
- ✅ Claude updates session file regularly

### File Editing

**Claude will NEVER recreate your files in v2.0:**

❌ Old way (v1.0):
```
Claude: "Here's the complete EmailService.ts:"
[Shows entire 200-line file]
```

✅ New way (v2.0):
```
Claude: "I'll add filterByDate to EmailService.ts line 45:"
[Shows only the new method]
```

## 🤝 Contributing

1. Create branch: `git checkout -b feature/name`
2. Make changes (Claude helps with targeted edits)
3. Test: `npm run dev`
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/name`

## 📝 v2.0 vs v1.0

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Session Management | Manual commands | Automatic |
| Session Resume | Manual `/resume-session` | Auto on start |
| Token Monitoring | User responsibility | Claude monitors |
| File Handling | Could recreate | Never recreates |
| Code Display | Sometimes full files | Only changed sections |
| Startup | `claude` command | `./start-session.sh` |
| Commands | 3 commands | 4 commands + scripts |

**For detailed comparison, see:** [CLAUDE_V2_COMPARISON.md](./CLAUDE_V2_COMPARISON.md)

## 📝 License

MIT License - Copyright GitHub, Inc.

## 🆘 Support

- **Claude Code Issues**: `claude doctor`
- **Development Issues**: Check browser console
- **API Issues**: Verify `.env` credentials
- **Session Issues**: `./view-session.sh` or delete `.claude/sessions/active-session.md`

## 🔗 Quick Links

- [Claude Code Documentation](https://code.claude.com)
- [v2.0 Features Comparison](./CLAUDE_V2_COMPARISON.md)
- [Quick Start Guide](./CLAUDE-QUICKSTART.md)
- [Supabase Documentation](https://supabase.com/docs)

---

**Built with ❤️ using React, TypeScript, Supabase, and Claude Code v2.0**

### Recent Changes

- ✅ Fixed TODO in `email-connection.tsx` - Now uses real subscription state
- ✅ Added subscription prop passing from `App.tsx` → `settings-view.tsx` → `email-connection.tsx`
- ✅ Email account limits now properly based on subscription tier (Basic: 2, Pro: 5, Gold: 10, Family: unlimited)
- ✅ Upgraded to Claude Code Setup v2.0 with automatic session management

---

## 🚀 PRODUCTION DEPLOYMENT NOTES (December 8, 2025)

### OAuth Backend Server

A production-ready Express backend server has been created at `/server` for handling OAuth authentication securely.

**Why a backend?**
- OAuth client secrets MUST be kept server-side (never in frontend)
- Tokens are encrypted with AES-256 before passing to frontend
- Rate limiting protects against abuse
- Scalable to millions of users

**Server Location:** `/server/`

**Start the server:**
```bash
cd server
npm install
npm run dev  # Development (port 3001)
npm run start  # Production
```

### OAuth Provider Status

| Provider | Status | Notes |
|----------|--------|-------|
| Gmail/Google | ✅ Ready | Works locally + production |
| Outlook/Microsoft | ✅ Ready | Works locally + production |
| Yahoo | ⚠️ Prod Only | Yahoo requires HTTPS redirect URIs |
| iCloud/Apple | ❌ Disabled | Requires Apple Developer ($99/yr) |

### Environment Variables Required

**Frontend (.env):**
```env
VITE_GROQ_API_KEY=gsk_...  # For AI Email Assistant
VITE_API_URL=http://localhost:3001  # Dev
VITE_API_URL=https://api.myflowsphere.com  # Prod
```

**Backend (server/.env):**
```env
# Google OAuth
GOOGLE_CLIENT_ID=153926706146-...
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Microsoft/Outlook OAuth
OUTLOOK_CLIENT_ID=5a79ab29-...
OUTLOOK_CLIENT_SECRET=rsb8Q~...

# Yahoo OAuth (production only)
YAHOO_CLIENT_ID=dj0yJmk9...
YAHOO_CLIENT_SECRET=a828...

# Security
JWT_SECRET=<change-in-production>
ENCRYPTION_KEY=<32-byte-key>
```

### Production Deployment Checklist

**Before deploying:**
- [ ] Change JWT_SECRET to secure random value
- [ ] Change ENCRYPTION_KEY to secure 32-byte key
- [ ] Update OAuth redirect URIs in provider consoles:
  - Google: `https://api.myflowsphere.com/auth/google/callback`
  - Microsoft: `https://api.myflowsphere.com/auth/outlook/callback`
  - Yahoo: `https://myflowsphere.com/api/auth/yahoo/callback`
- [ ] Set up production domain CORS in `server/src/app.ts`
- [ ] Enable Redis for session storage (optional, for scaling)
- [ ] Remove CEO features (see CEO_EXTRACTION_GUIDE.md)

### Known Issues to Fix for Production

1. **Groq AI**: If seeing "AI unavailable", restart dev server to reload env vars
2. **Yahoo OAuth**: Only works with HTTPS - test after production deploy
3. **Apple/iCloud**: Requires Apple Developer Program membership

### Architecture for Production

```
                    ┌─────────────────────┐
                    │   CDN (Cloudflare)  │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        │                      │                       │
        ▼                      ▼                       ▼
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Frontend     │    │  API Backend    │    │   Supabase      │
│  (Vercel)     │    │  (Railway/Fly)  │    │   (Database)    │
│  myflowsphere │    │  api.myflow...  │    │   (Auth)        │
│  .com         │    │  Port 3001      │    │   (Storage)     │
└───────────────┘    └─────────────────┘    └─────────────────┘
        │                      │                       │
        │                      │                       │
        └──────────────────────┴───────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │  OAuth Providers    │
                    │  (Google, MS, Yahoo)│
                    └─────────────────────┘
```

### Server Endpoints

```
GET  /health                    - Health check
GET  /auth/providers            - List enabled providers
GET  /auth/:provider            - Initiate OAuth flow
GET  /auth/:provider/callback   - OAuth callback (receives code)
POST /auth/complete             - Exchange JWT for account data
POST /auth/refresh              - Refresh access token
```

---
