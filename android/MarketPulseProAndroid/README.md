# MarketPulse Pro Android Wrapper

Android Studio WebView wrapper for the hosted MarketPulse Pro dashboard.

## Package

- Package/application id: `com.marketpulse.pro`
- Debug id: `com.marketpulse.pro.debug`
- Default dashboard URL: `https://marketpulse-pro.onrender.com/`

The app no longer depends on `localhost`, LAN IPs, or `npm start` on your PC. It expects a public HTTPS backend/frontend URL.

## Dashboard URL

The default URL is set in `app/build.gradle`:

```gradle
def dashboardUrl = project.findProperty("dashboardUrl") ?: "https://marketpulse-pro.onrender.com/"
```

If Render/Railway gives you a different URL, build with:

```bash
gradle assembleDebug -PdashboardUrl=https://your-real-url.example/
```

or replace the default value in `app/build.gradle`.

## WebView Behavior

The wrapper enables:

- JavaScript
- DOM storage/localStorage
- WebView cache
- cookies and third-party cookies
- session persistence via backend `HttpOnly` cookie
- responsive viewport scaling
- dark status/navigation bars
- loading overlay
- internet/server error overlay with retry
- back button WebView navigation
- pull-down reload gesture at top of page

OTP login works inside WebView when the hosted backend has these environment variables:

```text
RESEND_API_KEY=...
FROM_EMAIL=onboarding@resend.dev
SESSION_SECRET=...
NODE_ENV=production
```

## Build Debug APK

In Android Studio:

1. Open `android/MarketPulseProAndroid`.
2. Let Gradle sync.
3. Choose `app`.
4. Run on a real phone or emulator.
5. Use **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

Command line, if Gradle/Android plugin are installed:

```bash
cd android/MarketPulseProAndroid
gradle assembleDebug
```

The debug APK will be under:

```text
app/build/outputs/apk/debug/
```

## Signed Release APK

Create a release keystore:

```bash
cd android/MarketPulseProAndroid
mkdir release
keytool -genkeypair -v -keystore release/marketpulse-release.jks -alias marketpulse -keyalg RSA -keysize 2048 -validity 10000
```

Copy `keystore.properties.example` to `keystore.properties` and fill in the passwords:

```text
storeFile=release/marketpulse-release.jks
storePassword=...
keyAlias=marketpulse
keyPassword=...
```

Build release:

```bash
gradle assembleRelease
```

Signed APK output:

```text
app/build/outputs/apk/release/app-release.apk
```

## Security Notes

- Cleartext HTTP is blocked in `network_security_config.xml`.
- Use HTTPS only for production.
- The WebView stores session cookies from the hosted backend, so refresh/login persistence works on real phones.
