#!/bin/bash
#
# build-ios.sh - Build the iOS IPA for MLJ NET
#
# This script:
#   1. Installs Capacitor dependencies
#   2. Adds/syncs iOS platform
#   3. Prints instructions for building IPA in Xcode
#
# The mobile app uses a WebView that connects to the MLJ NET server.
# The www/ directory contains a connector page - no Next.js build needed.
#
# Usage: bash build-ios.sh
#
# NOTE: iOS builds MUST be done on macOS with Xcode installed.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "==========================================="
echo "  MLJ NET - iOS Build Pipeline"
echo "==========================================="
echo ""

# Step 1: Check OS
echo "[1/4] Checking prerequisites..."

OS="$(uname)"
if [ "$OS" != "Darwin" ]; then
    echo "  WARNING: iOS builds require macOS with Xcode."
    echo "  Current OS: $OS"
    echo ""
    echo "  The Capacitor project is ready, but you need a Mac to:"
    echo "    1. Run: cd $SCRIPT_DIR && npm install"
    echo "    2. Run: npx cap add ios"
    echo "    3. Run: npx cap sync ios"
    echo "    4. Open: npx cap open ios"
    echo "    5. Build in Xcode: Product > Archive > Distribute App"
    echo ""
    exit 0
fi

echo "  OS: macOS"
echo "  Node.js: $(node --version)"

if ! command -v xcodebuild &> /dev/null; then
    echo "  ERROR: Xcode not found. Install with: xcode-select --install"
    exit 1
fi

echo "  Xcode: $(xcodebuild -version 2>/dev/null | head -1)"
echo "  Prerequisites OK"
echo ""

# Step 2: Install Capacitor dependencies
echo "[2/4] Installing Capacitor dependencies..."
cd "$SCRIPT_DIR"
npm install
echo "  Done"
echo ""

# Step 3: Add/sync iOS platform
echo "[3/4] Syncing iOS platform..."

if [ ! -d "ios" ]; then
    echo "  Adding iOS platform..."
    npx cap add ios
else
    echo "  iOS platform exists, syncing..."
fi

npx cap sync ios
echo "  Done"
echo ""

# Step 4: Build instructions
echo "[4/4] Build complete!"
echo ""
echo "==========================================="
echo "  iOS IPA Build Instructions"
echo "==========================================="
echo ""
echo "Step 1: Open in Xcode"
echo "  cd $SCRIPT_DIR"
echo "  npx cap open ios"
echo ""
echo "Step 2: Configure Signing"
echo "  1. Select 'App' target in the left panel"
echo "  2. Go to Signing & Capabilities tab"
echo "  3. Select your Development Team"
echo "  4. Set Bundle Identifier (com.mljnet.genieacs)"
echo ""
echo "Step 3: Build & Run"
echo "  Product > Run (Cmd+R) - for testing on simulator/device"
echo ""
echo "Step 4: Create IPA for Distribution"
echo "  Product > Archive > Distribute App"
echo "  Options:"
echo "    - App Store Connect (for App Store)"
echo "    - Ad Hoc (for internal testing)"
echo "    - Enterprise (for in-house distribution)"
echo "    - Development (for development testing)"
echo ""
echo "NOTE: The app shows a server URL input on launch."
echo "Users enter their MLJ NET server address to connect."
echo ""