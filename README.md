# Keep — photo cleanup prototype

A React Native + Expo app for iOS and Android. Use your phone's photo library or the nine bundled AppProjects demo photos. Editing always creates a separate JPEG copy. Phone-photo removal requires review and a system confirmation; demo removal only changes local demo progress.

The visual theme takes inspiration from [Kim Phuong’s retro brutalist app design](https://dribbble.com/shots/23724865-Job-search-app-Retro-brutalism-style): bundled Space Mono lettering, charcoal outlines, crisp offset shadows, purple actions and mint, pink, lime and yellow surfaces. Cleanup, library, previews, sheets and the photo editor share these styles.

## Try it on a phone

```powershell
cd photo-cleaner
npm install
npm start
```

Open the QR code with Expo Go compatible with SDK 57. The phone and computer should be on the same network. If the installed Expo Go version does not support this SDK, use an Expo development build with a compatible native runtime. For an Android emulator, run `npm run android`. Local iOS compilation requires macOS; EAS can build iOS in the cloud with the appropriate Apple credentials.

The startup script selects a local network address so the QR code opens from a phone, rather than pointing at the computer's localhost. See [the iPhone testing guide](PHONE_TESTING.md) for the current link and test flow.

## Prototype behavior

- Swipe left to queue a photo for removal, right to keep it. Buttons provide the same actions.
- Connect Photos with full or limited access, then choose recent photos, an album or a month. Photos load in batches of 40; gallery pages render at most 40 thumbnails.
- Undo restores the previous reviewed photo before demo removal.
- The queue lets you keep individual photos, review a removal snapshot and ask the OS to remove phone photos. Cancellation or failure leaves the queue intact.
- Library provides All, Kept and To review views. Open any photo for a full preview or editing.
- Editor includes five looks, brightness, contrast, saturation, warmth, rotation and centered square/4:5 crops.
- Save produces a JPEG copy with a maximum long edge of 2048 px and saves it to Photos on a phone. HEIC and image orientation are normalized before editing. Copies remain in Edits even if their original is removed, and can be shared separately.
- Phone and demo decisions are stored separately. Progress survives paging and relaunch. Start fresh resets decisions and keeps edited copies; it cannot restore deleted phone originals. No account or backend is required.

## Development preview and checks

```powershell
cd photo-cleaner
npm run preview
npm run typecheck
npm run lint
npm test
npx expo export --platform ios --platform android
```

The browser preview is a development aid for reviewing the mobile interface. The product targets iOS and Android. Browser copies download as JPEGs; mobile copies use the operating system share sheet. Pinch zoom in the preview uses the native iOS ScrollView behavior; Android supports opening the full image without a zoom gesture in this prototype.

To create a browser preview for development:

```powershell
npx expo export --platform web --output-dir dist-prototype
npx serve@latest dist-prototype --single --listen tcp://127.0.0.1:8082 --no-clipboard
```

See `VALIDATION.md` for completed checks and remaining device verification.

## Scope and next step

Phone-library access, limited permissions, album/month selection, edited copies and confirmed deletion are implemented. The next step is physical-device verification on iOS and Android, followed by signed beta builds. No backend or photo upload is used.

Photo sizes are read from local originals in the background. Cloud-only originals may have an unknown size until downloaded. Queue totals distinguish known sizes from incomplete totals.
