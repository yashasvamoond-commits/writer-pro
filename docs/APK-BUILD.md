# Building the Android APK (tablets & phones)

Writer Pro is an offline-first web core wrapped natively with Capacitor. The
APK ships the entire drafter — editor, Kruti Dev ⇄ Unicode engine, legal
dictionaries, bundled Devanagari fonts — inside the package, so drafting works
in airplane mode inside court complexes.

## One-time setup (any machine with JDK 17 + Android SDK)

```bash
npm install
npm install -D @capacitor/cli @capacitor/core @capacitor/android
npm run build                 # produces dist/ (the web core)
npx cap add android           # creates android/ project
npx cap sync android
```

## Debug APK

```bash
npm run android:apk           # = npx cap build android  (gradle assembleDebug)
# artifact: android/app/build/outputs/apk/debug/app-debug.apk
```

## Release APK / AAB

```bash
cd android && ./gradlew bundleRelease   # or assembleRelease
# sign with your keystore per Play Console requirements
```

## Printing (thermal / laser, Wi-Fi & USB-OTG)

The app's “PDF / Print” action calls the platform print framework
(`window.print()` → Android PrintManager inside the WebView). Any
Mopria/Print-Service compatible printer — e.g. Canon LBP/MF series on the
office Wi-Fi — appears in the system picker, and “Save as PDF” produces the
searchable, font-embedded court copy with the exact `@page` geometry
(A4/Legal, 1.75" stitching margin). Because layout is applied through
`@page` + print CSS, there is no print-dialog layout shift.

For silent/direct printing without the dialog on rooted kiosk tablets, add a
small native plugin exposing `PrintManager.print()` with a cached
`PrintDocumentAdapter`; the web core already emits perfectly paginated
output, so no layout code changes are needed.

## Why the PDF path is the print engine (not a JS PDF writer)

JavaScript PDF writers (jsPDF/pdf-lib) cannot perform Devanagari complex-text
shaping (matra reordering, conjuncts, reph) — Hindi output comes out broken.
The platform renderer (Chromium/Android) shapes Devanagari correctly, embeds
the fonts and keeps the text layer searchable, which is exactly what e-filing
registries accept.

## Offline guarantees

- Service worker precaches the shell and cache-first serves every asset.
- No runtime fetches: dictionaries, fonts and the Kruti Dev tables are bundled.
- Documents live in `localStorage` (per-device), exportable as `.json` backup.
