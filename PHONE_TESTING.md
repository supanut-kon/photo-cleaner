# Test Keep on your iPhone

Run `npm start`, connect your iPhone to the same network as your computer, then scan the terminal QR code with the iPhone Camera. Tap the banner to open Expo Go. Allow local-network access if iOS asks.

This app uses Expo SDK 57. Update Expo Go if it reports an incompatible SDK. This is a development testing session, not a TestFlight install; no Apple signing account is needed for Expo Go.

## First test

1. Tap **Connect Photos**. For a small first test, give access to a few selected photos. You can change allowed photos later in the chooser, or in iPhone Settings for Expo Go.
2. Choose **Recent photos**, an album, or enter a month as `YYYY-MM`.
3. Swipe right to keep, left to queue, then try **Undo**. Load the next 40 when ready.
4. Open **Edit**, try a look, a slider and a crop. Tap **Save edited copy**. Check that a new JPEG appears in Apple Photos and in the app's **Edits** tab, while the original is unchanged.
5. Queue a disposable test photo, review it, and tap **Remove from Photos**. Cancel the iOS dialog first and verify the queue stays intact. Repeat and confirm if you want to test actual removal. On iPhone, recover removed photos through Apple Photos' **Recently Deleted**, not through the app's Undo button.
6. Close and reopen the app. Check progress and saved copies. Test a HEIC/iCloud photo and limited access, then change photo access in Settings and return to the app.

## Restart the server later

```powershell
cd photo-cleaner
npm start
```

The address printed on restart is authoritative; it can change if the computer joins a different network. Scan the new terminal QR code. If the phone cannot connect, check that both devices share the same network and Expo Go has local-network access.

Native Photos permissions, deletion dialogs and saving to Photos must be verified on your phone. Local checks cover TypeScript, lint, 14 automated tests, Expo Doctor, native bundle exports and the served iPhone development bundle. A signed TestFlight/Play beta can follow the device testing phase. Full Android media-library testing requires a development build because Expo Go restricts media-library access on Android.
