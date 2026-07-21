#!/bin/bash
#
# copy-web.sh - Copy the built Next.js output to mobile-app/www/
#
# This script copies the static export of the Next.js web app
# into the www/ directory used by Capacitor.
#
# Usage: bash copy-web.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WEB_DIST="$PROJECT_ROOT/out"
MOBILE_WWW="$SCRIPT_DIR/www"

echo "═══════════════════════════════════════════"
echo "  MLJ NET Mobile - Copy Web Assets"
echo "═══════════════════════════════════════════"
echo ""

# Check if Next.js output exists
if [ ! -d "$WEB_DIST" ]; then
    echo "❌ Error: Next.js export not found at $WEB_DIST"
    echo ""
    echo "Please build the web app first:"
    echo "  cd $PROJECT_ROOT"
    echo "  bun run build"
    echo ""
    exit 1
fi

# Clean the www directory
echo "🧹 Cleaning www/ directory..."
rm -rf "$MOBILE_WWW"/*
mkdir -p "$MOBILE_WWW"

# Copy the built web app
echo "📦 Copying web assets from $WEB_DIST to $MOBILE_WWW..."
cp -r "$WEB_DIST"/* "$MOBILE_WWW/"

# Also copy hidden files (like .next directory if present)
cp -r "$WEB_DIST"/.[!.]* "$MOBILE_WWW/" 2>/dev/null || true

# Count files
FILE_COUNT=$(find "$MOBILE_WWW" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$MOBILE_WWW" | cut -f1)

echo ""
echo "✅ Copied $FILE_COUNT files ($TOTAL_SIZE) to www/"
echo ""
echo "Next steps:"
echo "  npm run cap:sync:android   # Sync with Android"
echo "  npm run cap:sync:ios       # Sync with iOS"
echo ""
