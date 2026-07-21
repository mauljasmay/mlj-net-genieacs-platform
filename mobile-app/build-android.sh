#!/bin/bash
#
# build-android.sh - Build the Android APK for MLJ NET
#
# This script:
#   1. Installs Capacitor dependencies
#   2. Adds/syncs Android platform
#   3. Prints instructions for building APK in Android Studio
#
# The mobile app uses a WebView that connects to the MLJ NET server.
# The www/ directory contains a connector page - no Next.js build needed.
#
# Usage: bash build-android.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "==========================================="
echo "  MLJ NET - Android Build Pipeline"
echo "==========================================="
echo ""

# Step 1: Check prerequisites
echo "[1/4] Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js 18+."
    exit 1
fi

echo "  Node.js: $(node --version)"

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed."
    exit 1
fi

if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    echo "  WARNING: ANDROID_HOME not set. Android Studio is required to build APK."
fi

echo "  Prerequisites OK"
echo ""

# Step 2: Install Capacitor dependencies
echo "[2/4] Installing Capacitor dependencies..."
cd "$SCRIPT_DIR"
npm install
echo "  Done"
echo ""

# Step 3: Add/sync Android platform
echo "[3/4] Syncing Android platform..."

if [ ! -d "android" ]; then
    echo "  Adding Android platform..."
    npx cap add android
else
    echo "  Android platform exists, syncing..."
fi

npx cap sync android
echo "  Done"
echo ""

# Step 4: Build instructions
echo "[4/4] Build complete!"
echo ""
echo "==========================================="
echo "  Android APK Build Instructions"
echo "==========================================="
echo ""
echo "Option A - Android Studio (Recommended):"
echo "-------------------------------------------"
echo "  cd $SCRIPT_DIR"
echo "  npx cap open android"
echo ""
echo "  In Android Studio:"
echo "    1. Wait for Gradle sync to complete"
echo "    2. Build > Build Bundle(s)/APK(s) > Build APK(s)"
echo "    3. APK location: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "Option B - Command Line (if Android SDK is in PATH):"
echo "-----------------------------------------------------"
echo "  cd $SCRIPT_DIR/android"
echo "  ./gradlew assembleDebug"
echo ""
echo "  For release APK (requires signing config):"
echo "  ./gradlew assembleRelease"
echo ""
echo "Option C - Run on connected device/emulator:"
echo "---------------------------------------------"
echo "  npx cap run android"
echo ""
echo "NOTE: The app shows a server URL input on launch."
echo "Users enter their MLJ NET server address to connect."
echo ""