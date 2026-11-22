# LaptopMitra Mobile Development Build Guide

This guide explains how to build, install, and run a custom Expo Development Client (`expo-dev-client`) for LaptopMitra on Android and iOS.

---

## 1. Why a Development Build is Required

Starting with Expo SDK 53, **remote push notifications (FCM)** are no longer supported inside the generic Expo Go application on Android. Additionally, third-party native libraries containing custom native code (such as `react-native-razorpay`) cannot run inside Expo Go.

A custom development build gives you the full developer experience of Expo (Fast Refresh, Metro bundler, Dev Menu) combined with full native module execution.

---

## 2. Prerequisites & Credentials Setup

> **SECURITY NOTE:** Never commit `google-services.json`, Firebase private keys, or APNs certificates to source control. They must be managed via EAS secrets or local environment variables.

### A. Android Configuration
1. **Package Identifier:** `com.laptopmitra.mobile` (configured in `app.json`).
2. **Firebase Project Setup:**
   - Go to [Firebase Console](https://console.firebase.google.com/) -> Project Settings.
   - Under "Your apps", register an Android app with package name `com.laptopmitra.mobile`.
   - Download the generated `google-services.json`.
3. **EAS File Secret:**
   - Upload `google-services.json` to EAS as a file secret:
     ```bash
     eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
     ```
   - In `app.json`, reference it dynamically or via EAS build hooks:
     ```json
     "android": {
       "package": "com.laptopmitra.mobile",
       "googleServicesFile": process.env.GOOGLE_SERVICES_JSON || "./google-services.json"
     }
     ```
4. **FCM v1 Service Account Upload (Push Notifications):**
   - In Google Cloud Console / Firebase Console, navigate to **Project Settings -> Service Accounts**.
   - Click **Generate New Private Key** (downloads a `.json` service account file).
   - In Expo Dashboard or via EAS CLI:
     ```bash
     eas credentials
     ```
   - Select **Android -> production / development -> Push Notifications -> Set up FCM v1**.
   - Upload the downloaded service account JSON file.

### B. iOS Configuration (Optional / Production)
1. **Bundle Identifier:** `com.laptopmitra.mobile` (configured in `app.json`).
2. **Apple Developer Account:** Requires an active paid Apple Developer membership.
3. **APNs Authentication Key:**
   - In Apple Developer portal, create an APNs Key (`.p8` file).
   - In EAS CLI, run `eas credentials` -> iOS -> Push Notifications -> Upload APNs Key.

---

## 3. Building the Development Client

### Option 1: EAS Cloud Build (Recommended)
Run from the `apps/mobile` directory:

```bash
# Build Android Development Client APK (internal distribution)
eas build --profile development --platform android

# Or build for iOS (simulator or ad-hoc internal)
eas build --profile development --platform ios
```

Once the EAS build finishes:
1. Scan the QR code or open the download URL on your physical device.
2. Download and install the `.apk` (Android) or `.ipa` (iOS).

### Option 2: Local Native Prebuild & Run (Android Studio / Xcode installed)
```bash
# Generate native android/ and ios/ folders locally
npx expo run:android

# Or for iOS
npx expo run:ios
```

---

## 4. Running the Development Server

After the custom development client is installed on your device:

1. Start Metro in dev-client mode:
   ```bash
   pnpm --filter mobile start:dev-client
   # or
   cd apps/mobile && npx expo start --dev-client
   ```
2. Open the **LaptopMitra** app on your physical device.
3. It will automatically detect your local Metro bundler on your local network (or you can scan the terminal QR code / enter `exp://<your-ip>:8081`).

---

## 5. What Works in Each Environment

| Feature | Expo Go (Android) | Development Client (`expo-dev-client`) | Production Release |
| :--- | :--- | :--- | :--- |
| **Catalog & Cart Browsing** | Yes | Yes | Yes |
| **Customer Auth & Profile** | Yes | Yes | Yes |
| **Cash on Delivery (COD)** | Yes | Yes | Yes |
| **Remote Push Notifications** | No (Shows dev banner) | Yes (FCM v1 active) | Yes (FCM v1 active) |
| **In-App Razorpay Checkout** | No (Shows dev notice) | Yes (Native SDK modal) | Yes (Native SDK modal) |

