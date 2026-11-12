# Swipy — photo cleanup prototype

A React Native + Expo app for iOS and Android. Use your phone's photo library or the nine bundled AppProjects demo photos. Phone-photo removal requires review and a system confirmation; demo removal only changes local demo progress.

The interface uses a neo-brutalist theme with opaque cream surfaces, bold outlines, hard shadows, lilac and lime accents, and matching dark mode. The brand uses bundled [Geist Pixel Square](https://github.com/vercel/geist-font); supporting text uses Work Sans. The included font license is `assets/fonts/OFL.txt`.

## Try it on a phone

```powershell
cd photo-cleaner
npm install
npm start
```

Open the QR code with Expo Go compatible with SDK 58. The phone and computer should be on the same network. If the installed Expo Go version does not support this SDK, use an Expo development build with a compatible native runtime. For an Android emulator, run `npm run android`. Local iOS compilation requires macOS; EAS can build iOS in the cloud with the appropriate Apple credentials.

The startup script selects a local network address so the QR code opens from a phone, rather than pointing at the computer's localhost. See [the phone testing guide](PHONE_TESTING.md) for both platforms and [build readiness](BUILD_READINESS.md) for custom development builds.

## Prototype behavior

- Swipe left to queue a photo for removal, right to keep it. Buttons provide the same actions.
- Connect Photos with full or limited access, then choose recent photos, an album or a month. Photos load in batches of 40.
- Undo slides the previous reviewed photo back from the side it left. Reduce Motion skips the slide.
- The queue lets you keep individual photos, review a removal snapshot and ask the OS to remove phone photos. Cancellation or failure leaves the queue intact.
- One cleanup screen holds the collection chooser, filters and removal queue. There is no Library tab or bottom navigation. Content extends behind a fading status-bar blur, with controls clear of the home indicator.
- Phone and demo decisions are stored separately. Progress survives paging and relaunch. Start fresh resets decisions; it cannot restore deleted phone originals. No account or backend is required.

## Development preview and checks

```powershell
cd photo-cleaner
npm run preview
npm run typecheck
npm run lint
npm test
npx expo export --platform ios --platform android
```

The browser preview is a development aid for reviewing the mobile interface. The product targets iOS and Android.

To create a browser preview for development:

```powershell
npx expo export --platform web --output-dir dist-prototype
npx serve@latest dist-prototype --single --listen tcp://127.0.0.1:8082 --no-clipboard
```

See [VALIDATION.md](VALIDATION.md) for completed checks and [the device checklist](DEVICE_TEST_CHECKLIST.md) for remaining verification.

## Scope and next step

Phone-library access, limited permissions, album/month selection and confirmed deletion are implemented. The next step is physical-device verification on iOS and Android, followed by signed beta builds. No backend or photo upload is used.

Photo sizes are read from local originals in the background. Cloud-only originals may have an unknown size until downloaded. Queue totals distinguish known sizes from incomplete totals.
