# LaptopMitra Mobile App — Free Testing & Deployment Guide

This guide details the free hosting and distribution workflows for testing the LaptopMitra React Native mobile application (`apps/mobile`), similar to how the web application is deployed on Vercel.

---

## 1. Architecture & Pre-Requisites

- **Framework**: React Native 0.86 with Expo SDK ~57
- **Routing**: React Navigation (Bottom Tabs + Native Stack)
- **Auth**: Firebase Auth with native secure store persistence
- **Backend API**: Resolves `EXPO_PUBLIC_API_URL` (or defaults to local LAN or production Render API `https://laptopmitra-api.onrender.com`)

---

## 2. Free Testing Deployment Pathways

### Method 1: Expo Go (Instant Over-the-Air Testing — Android & iOS)
*Best for: Immediate team testing on physical phones with zero build wait time and $0 cost.*

1. **Install Expo Go**:
   - Android: Download from [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: Download from [Apple App Store](https://apps.apple.com/app/expo-go/id982107779)
2. **Start the Bundler with Cloud Tunnel**:
   ```bash
   cd apps/mobile
   npx expo start --tunnel
   ```
   *(The `--tunnel` flag creates a free cloud tunnel via ngrok/Cloudflare, allowing any tester on any cellular or Wi-Fi network to connect to your build without being on the same local router).*
3. **Connect**:
   - **Android**: Open the Expo Go app and tap **"Scan QR code"**.
   - **iOS**: Open the native **Camera app** and scan the terminal QR code, then tap the banner to open in Expo Go.
4. **Live Reload**: Any code changes you save are pushed over the air to all connected test devices in real time.

---

### Method 2: EAS Build for Android APK (Standalone Installable App — 100% Free)
*Best for: Distributing an installable standalone `.apk` directly to Android testers (no Expo Go app required, looks like a real app).*

1. **Expo Account (Free)**:
   - Sign up at [expo.dev](https://expo.dev) (EAS has a free tier with 30 free Android cloud builds/month).
   - Log in locally:
     ```bash
     npx eas-cli login
     ```
2. **Build Configuration ([`eas.json`](../apps/mobile/eas.json))**:
   The repository includes a pre-configured `eas.json` with the `preview` profile set to generate a direct `.apk`:
   ```json
   {
     "build": {
       "preview": {
         "distribution": "internal",
         "android": {
           "buildType": "apk"
         },
         "env": {
           "EXPO_PUBLIC_API_URL": "https://laptopmitra-api.onrender.com"
         }
       }
     }
   }
   ```
3. **Trigger Cloud Build**:
   ```bash
   cd apps/mobile
   npx eas build --profile preview --platform android
   ```
4. **Distribute**:
   - EAS will build the app on Expo's cloud servers.
   - When finished, EAS outputs a **downloadable URL + QR code**.
   - Testers open the link on their Android phone, download the `.apk`, tap **Install**, and can test the native LaptopMitra application directly.

---

### Method 3: Mobile Web Testing on Vercel (PWA)
*Best for: Testing the mobile layout directly in a mobile web browser or PWA without installing anything.*

1. Export the mobile app to web:
   ```bash
   cd apps/mobile
   npx expo export -p web
   ```
2. The static web output in `dist/` can be previewed locally with `npx serve dist` or linked to Vercel as a secondary project.

---

## 3. Environment Variables for Mobile

Create `apps/mobile/.env` with your testing or production configuration (see [`apps/mobile/.env.example`](../apps/mobile/.env.example)):

```bash
EXPO_PUBLIC_API_URL=https://laptopmitra-api.onrender.com
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-web-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=laptop-mitra.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=laptop-mitra
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=laptop-mitra.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=101564514748
EXPO_PUBLIC_FIREBASE_APP_ID=1:101564514748:web:abcdef123456
```
