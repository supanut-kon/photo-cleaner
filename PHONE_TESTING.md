# Test Swipy on iPhone and Android

Use an installed **Swipy development build** for the complete test on each platform. Expo Go is only a smoke test: Android media-library access is restricted. The app has one cleanup screen with a collection chooser and removal queue; editing, edited copies and export are outside this build.

## Install a development build

Build setup and account prerequisites are in [BUILD_READINESS.md](BUILD_READINESS.md). Install the resulting Android APK or the iOS build on a registered iPhone using the Expo build page.

After installation, run from the repository:

```sh
npm run dev -- --lan --port 8081
```

Connect the phone and computer to the same network. Open the installed Swipy app and connect to the server using the terminal QR code or development launcher. Allow local-network access if prompted. The terminal address is authoritative and may change between networks. Stop any existing server on port 8081 before starting this one. Restart the server after dependency updates; rebuild the app when native dependencies or native configuration change.

For an optional Expo Go smoke test, run `npm start` and scan its QR code with an Expo Go version compatible with SDK 58. Do not use that session to sign off complete Android Photos behavior.

## First session

1. Prepare a small album of disposable photos, with at least one screenshot. Include a local photo larger than 1 MB; test cloud-only photos separately.
2. Open the photo chooser, tap **Connect Photos**, and grant selected-photo access where supported. Choose **Recent photos**, an album, or a month in `YYYY-MM` format.
3. Swipe right to keep, left to queue, and try **Undo**. Try the Keep and Remove buttons too. Nothing should be deleted by a swipe.
4. Test All, Screenshots and Large photos on the cleanup screen. Undo a Keep and a Remove: the photo should return from the side it left. Repeat with Reduce Motion enabled. Scroll to check the fading top blur and the absence of a bottom navigation bar.
5. Queue one disposable photo and open the removal queue. Cancel the system deletion prompt first: both the original and queue must remain. Retry and confirm deletion; verify the selected photo disappears from Photos and the app while an unselected control photo remains.
6. Force-close and reopen Swipy. Reconnect to the development server if necessary. Confirm decisions and queue are retained for the same collection. Switching to demo photos must not mix phone and demo decisions.

Use [DEVICE_TEST_CHECKLIST.md](DEVICE_TEST_CHECKLIST.md) for the complete pass, expected results and failure report. App Undo cannot recover deleted originals; use the operating system's Recently Deleted/Trash recovery where available.

## Troubleshooting

- Connection failure: check the network, terminal address and local-network permission. Reopen the development launcher and scan the current QR code.
- Missing native module: install a newly built Swipy development client; restarting Expo Go cannot add native code.
- Photos access denied: reconnect Photos or change access in system Settings, then return and reconnect. Record any stale images or crash.
- Unknown cloud-photo sizes: a partial total is expected; unknown sizes must not be represented as a complete zero-byte total.
