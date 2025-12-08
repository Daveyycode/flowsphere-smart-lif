#!/bin/bash

# FlowSphere Cleanup Script
# Safely removes duplicate and unused files after verification

set -e

echo "=================================================="
echo "FlowSphere Cleanup Script"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "ℹ $1"; }

# Check if in correct directory
if [ ! -f "package.json" ]; then
    print_error "Must be run from project root"
    exit 1
fi

echo "Step 1: Creating backup directory..."
mkdir -p .archive/$(date +%Y%m%d-%H%M%S)
ARCHIVE_DIR=".archive/$(date +%Y%m%d-%H%M%S)"
print_success "Backup directory: $ARCHIVE_DIR"
echo ""

# Step 2: Archive unused standalone components
echo "Step 2: Archiving unused standalone components..."

# Check if CEOAuth.tsx is imported
if grep -r "from.*CEOAuth\|import.*CEOAuth" --include="*.tsx" --include="*.ts" src/ > /dev/null 2>&1; then
    print_warning "CEOAuth.tsx is still in use - skipping"
else
    if [ -f "src/CEOAuth.tsx" ]; then
        cp src/CEOAuth.tsx "$ARCHIVE_DIR/"
        rm src/CEOAuth.tsx
        print_success "Archived and removed: src/CEOAuth.tsx"
    fi
fi

# Check if CEODashboard.tsx is imported (excluding component version)
if grep -r "from.*CEODashboard\"" --include="*.tsx" --include="*.ts" src/ | grep -v "ceo-dashboard" > /dev/null 2>&1; then
    print_warning "CEODashboard.tsx is still in use - skipping"
else
    if [ -f "src/CEODashboard.tsx" ]; then
        cp src/CEODashboard.tsx "$ARCHIVE_DIR/"
        rm src/CEODashboard.tsx
        print_success "Archived and removed: src/CEODashboard.tsx"
    fi
fi

# Check if Admin.tsx is imported
if grep -r "from.*Admin\"" --include="*.tsx" --include="*.ts" src/ | grep -v "admin-dashboard" > /dev/null 2>&1; then
    print_warning "Admin.tsx is still in use - skipping"
else
    if [ -f "src/Admin.tsx" ]; then
        cp src/Admin.tsx "$ARCHIVE_DIR/"
        rm src/Admin.tsx
        print_success "Archived and removed: src/Admin.tsx"
    fi
fi

echo ""

# Step 3: Organize session logs
echo "Step 3: Organizing session logs..."
mkdir -p docs/session-logs

for file in 2025-*.txt; do
    if [ -f "$file" ]; then
        mv "$file" docs/session-logs/
        print_success "Moved: $file → docs/session-logs/"
    fi
done

echo ""

# Step 4: Organize documentation
echo "Step 4: Organizing documentation..."
mkdir -p docs/guides docs/reports

# Move guides
for file in *_GUIDE.md *_SETUP*.md; do
    if [ -f "$file" ] && [ "$file" != "README.md" ]; then
        mv "$file" docs/guides/
        print_success "Moved: $file → docs/guides/"
    fi
done

# Move reports
for file in *_REPORT.md *_SUMMARY.md; do
    if [ -f "$file" ] && [ "$file" != "IMPLEMENTATION_SUMMARY.md" ] && [ "$file" != "CODEBASE_ANALYSIS_REPORT.md" ]; then
        mv "$file" docs/reports/
        print_success "Moved: $file → docs/reports/"
    fi
done

echo ""

# Step 5: Update gitignore
echo "Step 5: Updating .gitignore..."
if ! grep -q ".archive/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Archived files" >> .gitignore
    echo ".archive/" >> .gitignore
    print_success "Added .archive/ to .gitignore"
else
    print_info ".archive/ already in .gitignore"
fi

echo ""

# Step 6: Summary
echo "=================================================="
echo "Cleanup Complete!"
echo "=================================================="
echo ""
print_success "Files archived to: $ARCHIVE_DIR"
print_success "Session logs moved to: docs/session-logs/"
print_success "Documentation organized"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Review changes:"
echo "   git status"
echo ""
echo "2. Test the application:"
echo "   npm run dev"
echo ""
echo "3. If everything works, commit:"
echo "   git add ."
echo "   git commit -m \"chore: Clean up duplicate files and organize docs\""
echo ""
echo "4. To restore archived files:"
echo "   cp $ARCHIVE_DIR/* src/"
echo ""
print_warning "Backup available at: $ARCHIVE_DIR"
echo ""
echo "=================================================="
