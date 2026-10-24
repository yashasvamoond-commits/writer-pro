import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android packaging for Writer Pro. The whole app (editor, Kruti Dev engine,
 * dictionaries, fonts) ships inside the APK — zero server dependency, per the
 * confidentiality requirement for court-complex use.
 *
 * Build steps (machine with Android SDK + JDK 17):
 *   npm i && npm run build
 *   npm i -D @capacitor/cli @capacitor/core @capacitor/android
 *   npx cap add android && npx cap sync android
 *   npm run android:apk        # or: npx gradle assembleDebug in android/
 * See docs/APK-BUILD.md.
 */
const config: CapacitorConfig = {
  appId: 'in.advocate.writerpro',
  appName: 'Writer Pro Legal Drafter',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    backgroundColor: '#f4f1ea',
  },
  server: {
    // Serve the bundled SPA from the APK assets; no remote URLs anywhere.
    androidScheme: 'https',
  },
};

export default config;
