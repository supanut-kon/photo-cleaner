# Prototype validation

Verified on October 11, 2026:

- All nine bundled JPGs match the source files in AppProjects by SHA-256.
- TypeScript validation and ESLint pass.
- Ten automated tests pass, including queue snapshot removal, progress across photo pages, saved Photos copy IDs, month boundaries, malformed month rejection, undo, malformed storage recovery and rejection of Photos references by the file editor.
- Expo Doctor passes all 21 checks.
- Production JavaScript/Hermes bundles export successfully for both iOS and Android; the development browser preview also exports successfully.
- Browser interaction checks cover direct swipe gestures, keep/remove buttons, undo, library filtering, queue confirmation, restored progress after reload, editor presets, centered square cropping and JPEG copy creation.
- A monochrome square edit saved as an actual 2048 × 2048 JPEG and appeared in the Edits gallery.
- JPEG download succeeded after using a Blob URL; the exported warm preset copy is 1365 × 2048 px.
- The retro brutalist theme passes lint and TypeScript checks and exports for iOS, Android and the browser preview. Phone-size visual checks cover the cleanup deck, library grid, editor and adjustment controls at 390 × 844. Updated screenshots are in `preview/cleanup.jpg` and `preview/editor.jpg`.
- Fixed the reported iPhone `ph://` loader error by using Expo Image for all cards, thumbnails and full previews. Its installed iOS source registers a PhotoLibraryAssetLoader for Photos references and limited access. Editing resolves a local file and normalizes it before Skia or ImageManipulator; restored editor routes also prepare their file before decoding. Physical iPhone confirmation of the fix remains pending.

## Remaining validation

Fixed phone photos keeping `bytes: 0` until the editor was opened. Each loaded page now resolves original local file sizes in the background, with at most three metadata requests in flight and stale results discarded when switching collections. This does not replace photo sources or download cloud originals. Partial queue totals explicitly report unknown sizes. Four regression tests cover local Photos URIs, inaccessible files, bounded requests, collection changes and partial totals (14 automated tests in total). Verify local and cloud-only photos on the physical iPhone after reloading Expo Go.

The keep/remove handoff now retains two complete cards with stable photo keys. The next image stays mounted with identical framing when promoted, uses memory/disk caching and has no image fade. Undo is disabled during the outgoing animation. Keep, remove and undo were checked in the browser preview; lint, TypeScript, all ten tests and iOS/Android/web exports pass. Confirm the absence of flashing with phone-library photos in Expo Go on the physical iPhone.

No physical iOS or Android device was connected during this session. Native installation, gestures on touch hardware, native crop/export behavior, accessibility and the OS share sheet still need device verification. Exported Hermes bundles are not signed IPA/APK installers.

Phone media-library access, album/month selection, pagination, HEIC normalization, saving edited copies to Photos and confirmed native removal are implemented. Their OS dialogs and behavior still require physical-device verification. The Expo Go development server serves the iPhone bundle successfully over the local network; the testing guide and QR are in `PHONE_TESTING.md` and `preview/expo-go-qr.png`.

The media-library runtime warns that Expo Go cannot provide full media-library access on Android. Use a development build to verify the complete Android library flow. The current Expo Go testing target is iPhone.

The dependency audit reported upstream advisories in the Expo/React Native toolchain and transitive packages. Nonbreaking automatic fixes were applied; unresolved advisories remain and require review before production release. Breaking automatic downgrades were not applied.
