# Development build readiness

Checked against Expo SDK 57 documentation on November 11, 2026. This app uses npm and Continuous Native Generation; do not hand-edit or commit generated `ios/` or `android/` directories.

## Configuration reviewed

- `expo-dev-client` is installed.
- `eas.json` has `developmentClient: true` and internal distribution on the development profile. Internal Android builds produce an installable APK; iOS targets a physical registered device, not a simulator.
- Both application identifiers are `com.keep.photocleaner.prototype`. Confirm ownership before first account linking/signing; these are the existing prototype identifiers.
- Photos permission plugin requests photo access, not audio/video access. Native permission dialogs still require a signed build and physical-device testing.

## Account setup still required

The CLI authentication check returned **Not logged in**. The resolved Expo config has no `extra.eas.projectId`. No cloud build was submitted and no signing credentials were created.

Run these interactively in the repository using the intended Expo account; do not put passwords or tokens in repository files or chat:

```sh
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest init
```

Select the intended owner/project during initialization. This writes the real project ID into the app configuration. Review that change before building. An iOS physical-device build needs an Apple Developer Program team and a registered device; Android internal APK testing does not require a Google Play developer account.

For iPhone registration:

```sh
npx eas-cli@latest device:create
```

Follow the registration link on the test iPhone and complete registration before creating its provisioning profile. Then submit each build and follow the signing prompts (Expo can manage credentials):

```sh
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile development --platform android
```

Save each build URL and result in the device run record. Install from the completed build page and follow [PHONE_TESTING.md](PHONE_TESTING.md). A successful JavaScript export is not proof of native compilation. Rebuild after changing native dependencies, plugins or permissions.

## Local preflight

```sh
npm run lint
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
npx expo export --platform ios --platform android --output-dir dist-native
```

Check results and current limitations are recorded in [VALIDATION.md](VALIDATION.md). Store submission and production release are separate from this development-build setup.

## Official references

- [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [Development build setup](https://docs.expo.dev/develop/development-builds/introduction/)
- [Internal distribution and signing](https://docs.expo.dev/build/internal-distribution/)
- [Using an installed development build](https://docs.expo.dev/develop/development-builds/use-development-builds/)
