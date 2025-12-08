# FlowSphere - Post-Installation Setup Guide

**After Xcode and Android Studio finish installing, follow these steps.**

---

## STEP 1: Install CocoaPods (for iOS)

CocoaPods manages iOS dependencies.

```bash
# Install CocoaPods
sudo gem install cocoapods

# Navigate to iOS project
cd /Users/abbieatienza/Desktop/flowsphere-from-github/ios/App

# Install dependencies
pod install
```

**Time:** 5 minutes

---

## STEP 2: Open iOS Project in Xcode

```bash
# Open the workspace (NOT .xcodeproj!)
open /Users/abbieatienza/Desktop/flowsphere-from-github/ios/App/App.xcworkspace
```

### Configure Signing in Xcode:

1. Select the **App** project in the left sidebar
2. Select the **App** target
3. Go to **Signing & Capabilities** tab
4. **Team:** Select your Apple Developer account
5. **Bundle Identifier:** Should be `com.flowsphere.app`
6. Check **Automatically manage signing**
7. Xcode will create provisioning profiles

**Important:** You need an Apple Developer account ($99/year) to deploy to the App Store.

---

## STEP 3: Sync iOS Assets

```bash
cd /Users/abbieatienza/Desktop/flowsphere-from-github
npx cap sync ios
```

This copies web assets and updates iOS plugins.

**Expected output:**
```
✅ Web assets copied to ios/App/App/public/
✅ Capacitor config created
✅ iOS plugins updated
✅ Ready for Xcode
```

---

## STEP 4: Build iOS App

### Option A: Build in Xcode (Recommended)

1. In Xcode, select **App** scheme
2. Select a simulator (e.g., iPhone 15 Pro)
3. Press **⌘ + R** (or click the Play button)
4. Wait for build to complete
5. App should launch in simulator

### Option B: Build from Terminal

```bash
cd /Users/abbieatienza/Desktop/flowsphere-from-github/ios/App
xcodebuild -workspace App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug
```

---

## STEP 5: Test iOS App

### Run on Simulator:
1. **⌘ + R** in Xcode
2. Test all features (auth, dashboard, devices, etc.)
3. Check for crashes or UI issues

### Run on Physical Device:
1. Connect iPhone via USB
2. Trust the device when prompted
3. Select your iPhone in Xcode
4. **⌘ + R** to build and run
5. May need to trust developer certificate on iPhone:
   - Settings → General → VPN & Device Management → Trust

---

## STEP 6: Open Android Project in Android Studio

```bash
# Open Android Studio
open -a "Android Studio" /Users/abbieatienza/Desktop/flowsphere-from-github/android
```

### First-Time Setup:

1. **Trust the project** when prompted
2. **Sync Gradle** (automatic, takes 5-10 minutes)
3. Wait for indexing to complete
4. **SDK Components:** Android Studio will prompt to install missing components
   - Android SDK Platform 34
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Click "Install" and wait

---

## STEP 7: Sync Android Assets

```bash
cd /Users/abbieatienza/Desktop/flowsphere-from-github
npx cap sync android
```

**Expected output:**
```
✅ Web assets copied to android/app/src/main/assets/public/
✅ All files synced perfectly
✅ Capacitor config created
✅ Android plugins updated
✅ Ready for Android Studio
```

---

## STEP 8: Build Android App

### Option A: Build in Android Studio (Recommended)

1. **Build → Make Project** (or **⌘ + F9**)
2. Wait for build to complete (2-5 minutes first time)
3. Check **Build** tab for errors

### Option B: Build from Terminal

```bash
cd /Users/abbieatienza/Desktop/flowsphere-from-github/android
./gradlew assembleDebug
```

**Output location:**
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## STEP 9: Test Android App

### Run on Emulator:

1. **Tools → Device Manager**
2. Create a new virtual device:
   - **Phone:** Pixel 7 Pro
   - **System Image:** API 34 (Android 14)
   - Download system image if needed
3. **Run → Run 'app'** (or **⌃ + R**)
4. Select emulator
5. App launches

### Run on Physical Device:

1. Enable **Developer Options** on Android phone:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable **USB Debugging**:
   - Settings → Developer Options → USB Debugging
3. Connect phone via USB
4. Trust computer when prompted
5. In Android Studio, select your device
6. **Run → Run 'app'**

---

## STEP 10: Build for Production

### iOS Production Build

1. In Xcode, select **Any iOS Device (arm64)**
2. **Product → Archive**
3. Wait for archive to complete (5-10 minutes)
4. **Window → Organizer** opens
5. Select latest archive
6. **Distribute App**
7. **App Store Connect**
8. Follow prompts to upload

**Requirements:**
- Apple Developer account
- App Store Connect app created
- Valid provisioning profiles

### Android Production Build

```bash
cd /Users/abbieatienza/Desktop/flowsphere-from-github/android
./gradlew bundleRelease
```

**Output location:**
`android/app/build/outputs/bundle/release/app-release.aab`

**Requirements:**
- App signing key generated
- Upload to Play Console

---

## TROUBLESHOOTING

### iOS Issues

**"Command PhaseScriptExecution failed"**
```bash
cd ios/App
pod deintegrate
pod install
```

**"No signing certificate found"**
- Go to Xcode → Preferences → Accounts
- Add your Apple ID
- Download Manual Profiles

**"Module not found"**
```bash
npx cap sync ios
cd ios/App
pod install
```

**Build fails with Swift errors**
- Clean build folder: **⌘ + Shift + K**
- Rebuild: **⌘ + B**

### Android Issues

**"SDK location not found"**
- Android Studio → Preferences → Appearance & Behavior → System Settings → Android SDK
- Note the SDK location
- Create `local.properties`:
```bash
echo "sdk.dir=/Users/abbieatienza/Library/Android/sdk" > android/local.properties
```

**"Gradle sync failed"**
```bash
cd android
./gradlew clean
./gradlew build
```

**"Execution failed for task ':app:mergeDexDebug'"**
- Enable multidex in `android/app/build.gradle`:
```gradle
defaultConfig {
    multiDexEnabled true
}
```

**Build fails after first run**
```bash
npx cap sync android
cd android
./gradlew clean build
```

### General Issues

**"capacitor command not found"**
```bash
npm install -g @capacitor/cli
```

**Web assets not syncing**
```bash
npm run build
npx cap copy
```

**Plugin errors**
```bash
npm install
npx cap sync
```

---

## QUICK REFERENCE

### Build Commands

```bash
# iOS
cd /Users/abbieatienza/Desktop/flowsphere-from-github
npm run build              # Build web app
npx cap sync ios          # Sync to iOS
open ios/App/App.xcworkspace  # Open in Xcode

# Android
npm run build              # Build web app
npx cap sync android      # Sync to Android
open -a "Android Studio" android  # Open in Android Studio
```

### Rebuild Everything

```bash
# Clean and rebuild
npm run build
npx cap sync
cd ios/App && pod install
cd ../../android && ./gradlew clean build
```

---

## NEXT STEPS

After successful builds:

1. ✅ Complete **TESTING_CHECKLIST.md**
2. ✅ Test on real devices
3. ✅ Fix any bugs found
4. ✅ Update version numbers
5. ✅ Create App Store/Play Store listings
6. ✅ Upload screenshots
7. ✅ Submit for review

---

## HELPFUL RESOURCES

**Capacitor Docs:** https://capacitorjs.com/docs
**iOS Development:** https://developer.apple.com/documentation/
**Android Development:** https://developer.android.com/docs
**App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/
**Play Store Policies:** https://play.google.com/about/developer-content-policy/

---

## NEED HELP?

**Common Commands:**

```bash
# Check Capacitor
npx cap doctor

# Update Capacitor
npm install @capacitor/cli@latest @capacitor/core@latest
npm install @capacitor/ios@latest @capacitor/android@latest

# View logs
npx cap run ios --livereload  # iOS with hot reload
npx cap run android --livereload  # Android with hot reload
```

**Still stuck?** Create an issue or contact support!

---

**You're almost there! Once Xcode and Android Studio finish installing, run through these steps and you'll have working native apps!**
