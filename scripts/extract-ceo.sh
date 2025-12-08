#!/bin/bash

# FlowSphere CEO Features Extraction Script
# Run this BEFORE production deployment to remove CEO features
#
# Usage: ./scripts/extract-ceo.sh
#
# This script will:
# 1. Create a backup of all CEO files
# 2. Remove CEO files from the main codebase
# 3. Show you which files need manual editing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/../flowsphere-ceo-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "==========================================="
echo "FlowSphere CEO Extraction Script"
echo "==========================================="
echo ""
echo "Project: $PROJECT_DIR"
echo "Backup:  $BACKUP_DIR"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR/components"
mkdir -p "$BACKUP_DIR/lib"
mkdir -p "$BACKUP_DIR/scripts"

echo "Step 1: Backing up CEO files..."
echo "-------------------------------------------"

# Backup main CEO files
CEO_FILES=(
    "src/CEOAuth.tsx"
    "src/CEODashboard.tsx"
    "src/Admin.tsx"
)

for file in "${CEO_FILES[@]}"; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        cp "$PROJECT_DIR/$file" "$BACKUP_DIR/"
        echo "  Backed up: $file"
    fi
done

# Backup CEO components
CEO_COMPONENTS=(
    "src/components/ceo-dashboard.tsx"
    "src/components/ceo-login.tsx"
    "src/components/ceo-auth-setup.tsx"
    "src/components/ceo-dashboard-sections.tsx"
    "src/components/ceo-security-monitor.tsx"
    "src/components/ceo-complaints-dashboard.tsx"
    "src/components/ceo-ai-assistant.tsx"
    "src/components/admin-dashboard.tsx"
)

for file in "${CEO_COMPONENTS[@]}"; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        cp "$PROJECT_DIR/$file" "$BACKUP_DIR/components/"
        echo "  Backed up: $file"
    fi
done

# Backup CEO libs
CEO_LIBS=(
    "src/lib/ceo-auth.ts"
    "src/lib/ceo-check.ts"
    "src/lib/ceo-dashboard.ts"
    "src/lib/ceo-ai-assistant.ts"
    "src/lib/ai-complaint-handler.ts"
)

for file in "${CEO_LIBS[@]}"; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        cp "$PROJECT_DIR/$file" "$BACKUP_DIR/lib/"
        echo "  Backed up: $file"
    fi
done

# Backup documentation
cp "$PROJECT_DIR/CEO_EXTRACTION_GUIDE.md" "$BACKUP_DIR/" 2>/dev/null || true

echo ""
echo "Step 2: Creating backup manifest..."
echo "-------------------------------------------"

cat > "$BACKUP_DIR/MANIFEST.txt" << EOF
FlowSphere CEO Features Backup
==============================
Created: $(date)
From: $PROJECT_DIR

Files Included:
---------------
$(find "$BACKUP_DIR" -type f -name "*.tsx" -o -name "*.ts" | sort)

To Restore:
-----------
cp -r $BACKUP_DIR/* $PROJECT_DIR/src/

Notes:
------
- These files contain CEO/Admin functionality
- Do NOT include in production builds
- Keep credentials secure and rotate them
EOF

echo "  Created: MANIFEST.txt"

echo ""
echo "==========================================="
echo "BACKUP COMPLETE!"
echo "==========================================="
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
echo "NEXT STEPS (Manual):"
echo "-------------------------------------------"
echo ""
echo "1. REMOVE these files from project:"
echo "   rm src/CEOAuth.tsx"
echo "   rm src/CEODashboard.tsx"
echo "   rm src/Admin.tsx"
echo "   rm src/components/ceo-*.tsx"
echo "   rm src/components/admin-dashboard.tsx"
echo "   rm src/lib/ceo-*.ts"
echo "   rm src/lib/ai-complaint-handler.ts"
echo ""
echo "2. EDIT these files to remove CEO imports:"
echo "   - src/App.tsx"
echo "   - src/components/vault.tsx"
echo "   - src/components/auth-modal.tsx"
echo "   - src/components/secure-messenger.tsx"
echo ""
echo "3. RUN build to verify:"
echo "   npm run build"
echo ""
echo "4. TEST that CEO URLs return 404"
echo ""
echo "==========================================="
