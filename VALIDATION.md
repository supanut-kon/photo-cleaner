# Current theme

The app now uses opaque neo-brutalist surfaces. Liquid-glass adapters, dependencies, build flags and the dedicated launcher have been removed. Glass-related entries below describe historical revisions.

# Prototype validation

## Single-screen cleanup — November 12, 2026

- Removed Library, its full-preview modal and bottom navigation. Old `?tab=library` URLs open cleanup. Collections, filters, settings and the reviewed removal queue remain accessible from the main screen.
- Larger preview with decision controls below the image. Removed navigation padding and the redundant demo connect button; the collection selector opens Connect Photos. Background extends through the safe areas; a masked Expo Blur fades the top edge. The bottom keeps home-indicator spacing without a navigation surface.
- Undo returns a photo from its original swipe side, including from the completed state. Returning cards block overlapping decisions, and reduced motion skips the slide. Undo from another filter switches to All when needed and focuses the restored photo.
- Added SDK 58-compatible `expo-blur`. Existing custom native builds need rebuilding to include it; compatible Expo Go bundles it. Android uses the SDK 31+ blur method with a translucent fallback on older versions.
- ESLint, TypeScript and all 28 current unit tests pass. iOS/Android JavaScript exports pass; these do not validate native compilation.
- Chromium checks at 390 × 844 and 375 × 667 cover Keep/Remove undo, final-photo undo, consecutive undo, restored progress after reload, reduced-motion undo and the legacy Library URL. No page errors occurred. Physical iPhone/Android blur, safe areas and touch behavior still need confirmation.


## Current preflight — November 11, 2026

The current product is photo cleanup and Library browsing. Editing, saved edited copies, crop/export and the Edits gallery have been removed. Historical entries below describe earlier builds and do not establish acceptance of the current app.

- Updated phone testing instructions for both platforms and added `DEVICE_TEST_CHECKLIST.md` with expected outcomes, a per-device run record and failure-report fields.
- Reviewed the existing development profile, native identifiers and Photos permission configuration. Account linking and signing instructions are in `BUILD_READINESS.md`.
- Installed Expo-recommended SDK 57 patch updates using `npx expo install --fix`. Online `npx expo install --check` now passes.
- ESLint and TypeScript pass; all 30 automated tests pass.
- iOS and Android Hermes/JavaScript exports pass. These are not signed installers or native compilation checks.
- CLI authentication reports **Not logged in**; resolved config has no EAS project ID. Cloud builds, signing, installation and physical-device acceptance remain pending.
- npm reports 13 dependency advisories (9 moderate, 4 high). No forced audit fixes were applied; review remains necessary before release.
- Expo Doctor 1.21.7 failed to start: its downloaded CLI could not resolve `@expo/env`. A rerun with project module resolution also exited before producing checks. Doctor is not passed for this revision; retry with a working CLI/runtime before cloud-build signoff.

## Historical validation


October 13, 2026 (light theme revision): Removed all photo glow layers and changed the app to a light glass theme. Shared surfaces now use Expo GlassEffect on iPhones where both the native API and compiled Liquid Glass support are available; unsupported systems use light Expo Blur. Headers, menus, navigation, editor and chooser use pale translucent surfaces and system text with Geist Pixel titles. Native Liquid Glass requires iOS 26+ and still needs physical-device confirmation. Lint, TypeScript, 14 tests and iOS/Android/web exports pass; Expo Doctor passes all 21 checks.

October 13, 2026: Reworked all app surfaces into a dark liquid-glass theme, with frosted controls, rounded panels, a warm lower-edge photo glow and bundled Geist Pixel Square headings. Supporting text uses system fonts. The photo backdrop supplies an explicit Android blur target; iOS/web use backdrop blur. Browser checks cover cleanup, library, editor, settings, the collection chooser and Keep/Remove/Undo at 390 × 844 and 375 × 667. Lint, TypeScript, all 14 tests, all 21 Expo Doctor checks and iOS/Android/web exports pass. Native blur still needs physical-device verification.

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

October 13, 2026 (article library integration): Added @sbaiahmed1/react-native-blur 6.0.2, shared LiquidGlassView adapters, Expo Go import protection, EAS profile configuration and a development launcher. iOS autolinking finds its podspec. All 16 tests, lint, TypeScript and all 21 Expo Doctor checks pass; iOS/Android/web JavaScript exports pass with the library flag enabled. The browser implementation renders without runtime errors. A signed native binary has not been built or tested; see the historical glass integration notes above.
