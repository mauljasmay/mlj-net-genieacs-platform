# MLJ NET Mobile App — Capacitor Wrapper

A complete Capacitor-based mobile application that wraps the **MLJ NET GenieACS** web platform for deployment as native **Android (APK)** and **iOS (IPA)** applications.

The web app is built with Next.js (static export) and bundled into the native WebView, providing a native-like experience with access to device capabilities through Capacitor plugins.

---

## 📋 Prerequisites

### Common Requirements

| Tool | Version | Required |
|------|---------|----------|
| Node.js | 18+ | ✅ Yes |
| npm | 9+ | ✅ Yes |
| Bun | Latest | ✅ Yes (for Next.js build) |
| Git | 2.x | ✅ Yes |

### Android Requirements

| Tool | Version | Required |
|------|---------|----------|
| Android Studio | Latest | ✅ Yes |
| JDK (Java) | 17+ | ✅ Yes |
| Android SDK | API 34 | ✅ Yes |
| Android Build Tools | 34.0.0 | ✅ Yes |

**Install Android Studio:** [https://developer.android.com/studio](https://developer.android.com/studio)

After installing Android Studio:
1. Open Android Studio
2. Go to **Settings → Appearance & Behavior → System Settings → Android SDK**
3. Install **Android SDK Platform 34**
4. Install **Android SDK Build-Tools 34.0.0**
5. Set **JAVA_HOME** to JDK 17+

### iOS Requirements (macOS only)

| Tool | Version | Required |
|------|---------|----------|
| macOS | Ventura+ | ✅ Yes |
| Xcode | 15+ | ✅ Yes |
| CocoaPods | 1.14+ | ✅ Yes |
| Apple Developer Account | - | For App Store |

**Install Xcode:** From the Mac App Store

```bash
# Install CocoaPods
sudo gem install cocoapods
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd mobile-app
npm install
```

### 2. Build the Web App

From the project root:

```bash
# Make sure Next.js is configured for static export
# In next.config.ts, you should have: output: 'export'

cd ..
bun run build
```

### 3. Copy Web Assets

```bash
cd mobile-app
bash copy-web.sh
```

This copies the static export (from `../out/`) to `mobile-app/www/`.

---

## 📱 Building for Android (APK)

### Automated Build Script

```bash
cd mobile-app
bash build-android.sh
```

This script will:
1. ✅ Build the Next.js web app
2. ✅ Copy output to `www/`
3. ✅ Add Android platform (if not present)
4. ✅ Run `npx cap sync android`
5. ✅ Print instructions for Android Studio

### Manual Build Steps

```bash
cd mobile-app

# Step 1: Install dependencies
npm install

# Step 2: Copy web assets (after building Next.js)
bash copy-web.sh

# Step 3: Add Android platform
npx cap add android

# Step 4: Sync web assets to Android
npx cap sync android

# Step 5: Open in Android Studio
npx cap open android
```

### Build APK from Android Studio

1. Android Studio will open the `android/` project
2. Wait for Gradle sync to complete
3. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`

### Build APK from Command Line

```bash
cd mobile-app/android

# Debug build
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk

# Release build (requires signing config)
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### Run on Connected Device/Emulator

```bash
cd mobile-app
npx cap run android
```

---

## 🍎 Building for iOS (IPA)

### ⚠️ Important
iOS builds **MUST** be performed on macOS with Xcode installed.

### Automated Build Script

```bash
cd mobile-app
bash build-ios.sh
```

This script will:
1. ✅ Build the Next.js web app
2. ✅ Copy output to `www/`
3. ✅ Add iOS platform (if not present)
4. ✅ Run `npx cap sync ios`
5. ✅ Print instructions for Xcode

### Manual Build Steps

```bash
cd mobile-app

# Step 1: Install dependencies
npm install

# Step 2: Copy web assets (after building Next.js)
bash copy-web.sh

# Step 3: Add iOS platform
npx cap add ios

# Step 4: Sync web assets to iOS
npx cap sync ios

# Step 5: Open in Xcode
npx cap open ios
```

### Build IPA from Xcode

1. Xcode will open the `ios/App/` workspace
2. Select the **App** target
3. **Signing & Capabilities** → Set your Development Team
4. Select a simulator or connected device
5. **Product → Build** (⌘B) or **Product → Run** (⌘R)

### Archive for Distribution

1. **Product → Archive**
2. **Distribute App** → Choose distribution method:
   - **App Store Connect** → Submit to App Store
   - **Ad Hoc** → Distribute for testing
   - **Enterprise** → Internal distribution
   - **Development** → Development testing

### Run on Connected Device/Simulator

```bash
cd mobile-app
npx cap run ios
```

---

## 🎨 Customization

### App Configuration (`capacitor.config.ts`)

| Setting | Default | Description |
|---------|---------|-------------|
| `appId` | `com.mljnet.genieacs` | Unique app identifier |
| `appName` | `MLJ NET` | Display name |
| `webDir` | `www` | Web assets directory |
| `backgroundColor` | `#0a0e1a` | Dark navy background |

### Color Scheme

| Role | Color | Hex |
|------|-------|-----|
| Primary | Cyan | `#06b6d4` |
| Background | Dark Navy | `#0a0e1a` |
| Surface | Dark Gray | `#111827` |
| Text Primary | White | `#f8fafc` |
| Text Secondary | Slate | `#94a3b8` |
| Error | Red | `#ef4444` |
| Success | Green | `#10b981` |

### Changing App Name

1. Edit `capacitor.config.ts` → `appName`
2. Edit `android/app/src/main/res/values/strings.xml` → `app_name`
3. Edit `ios/App/App/Info.plist` → `CFBundleDisplayName`
4. Run `npx cap sync`

### Changing App Icons

**Android:** Place icons in `android/app/src/main/res/mipmap-*/`
- `mipmap-mdpi/` → 48×48px
- `mipmap-hdpi/` → 72×72px
- `mipmap-xhdpi/` → 96×96px
- `mipmap-xxhdpi/` → 144×144px
- `mipmap-xxxhdpi/` → 192×192px

**iOS:** Place icons in `ios/App/Assets.xcassets/AppIcon.appiconset/`
- Use Xcode's Asset Catalog for all required sizes

### Changing the Bundle ID / Package Name

1. Edit `capacitor.config.ts` → `appId`
2. For Android: Update in `android/app/build.gradle`
3. For iOS: Xcode → Target → General → Bundle Identifier
4. Run `npx cap sync`

### Connecting to a Remote Server

By default, the app loads bundled web assets from `www/`. To connect to a remote web app instead:

```typescript
// capacitor.config.ts
server: {
  url: 'https://your-server.com',
  allowNavigation: ['your-server.com', 'api.your-server.com'],
  cleartext: true,
}
```

Then run:
```bash
npx cap sync
```

---

## 📁 Project Structure

```
mobile-app/
├── capacitor.config.ts          # Capacitor configuration
├── ionic.config.json            # Ionic project config
├── package.json                 # Dependencies & scripts
├── README.md                    # This file
├── build-android.sh             # Android build automation
├── build-ios.sh                 # iOS build automation
├── copy-web.sh                  # Web assets copy script
├── app-icon-source.png          # Source app icon (1024×1024)
├── www/                         # Bundled web assets (generated)
│   └── .gitkeep
├── android/                     # Android native project
│   ├── build.gradle             # Root build config
│   ├── variables.gradle          # SDK versions
│   └── app/src/main/
│       ├── AndroidManifest.xml  # Permissions & config
│       └── res/
│           ├── values/
│           │   ├── colors.xml   # Dark theme colors
│           │   ├── strings.xml  # App strings
│           │   └── styles.xml   # Dark theme styles
│           └── xml/
│               ├── network_security_config.xml
│               └── file_paths.xml
└── ios/                         # iOS native project
    └── App/App/
        ├── Info.plist           # iOS app config
        └── AppDelegate.swift    # iOS app delegate
```

---

## 🔧 Troubleshooting

### "Android SDK not found"

Set the `ANDROID_HOME` environment variable:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk          # Linux
export ANDROID_HOME=$HOME/AppData/Local/Android/Sdk  # Windows
```

### "Gradle build failed"

- Ensure JDK 17+ is installed and `JAVA_HOME` is set
- Run `cd android && ./gradlew clean && cd .. && npx cap sync android`
- Check `android/variables.gradle` for SDK version compatibility

### "Next.js export not found"

The web app must be built with static export:
```typescript
// next.config.ts
const nextConfig = {
  output: 'export',
  // other config...
};
```

### "White screen on launch"

- Ensure `www/` directory contains the built web files
- Check that `index.html` exists in `www/`
- Run `bash copy-web.sh` to re-copy assets

### "Network errors / API calls failing"

The app allows cleartext HTTP by default for local network access.
If connecting to external servers, ensure HTTPS is configured or
update `network_security_config.xml`.

---

## 📝 Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Copy Web Assets | `npm run copy-web` | Copy Next.js export to www/ |
| Build Android | `npm run build-android` | Full Android build pipeline |
| Build iOS | `npm run build-ios` | Full iOS build pipeline |
| Sync Android | `npm run cap:sync:android` | Sync web assets to Android |
| Sync iOS | `npm run cap:sync:ios` | Sync web assets to iOS |
| Open Android Studio | `npm run cap:open:android` | Open in Android Studio |
| Open Xcode | `npm run cap:open:ios` | Open in Xcode |
| Run Android | `npm run cap:run:android` | Run on device/emulator |
| Run iOS | `npm run cap:run:ios` | Run on device/simulator |

---

## 📄 License

MIT License — MLJ NET
