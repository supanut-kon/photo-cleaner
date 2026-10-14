# Test the native liquid-glass library

The app integrates `@sbaiahmed1/react-native-blur` 6.0.2 through its `LiquidGlassView` component. It applies to the shared controls, toolbar surfaces, navigation and panels. The light theme and no-glow photo preview are preserved.

## Which app to open

- **Custom development or release build:** uses this library when `EXPO_PUBLIC_GLASS_BACKEND=library`. All EAS build profiles already set this value.
- **Expo Go:** keeps using the built-in Expo GlassEffect/Blur fallback. The third-party native module is never evaluated, including when the server has the library flag enabled.
- **Browser:** uses the library's own CSS blur fallback. Browser appearance does not validate native refraction.

The library provides native Liquid Glass on iOS 26+ and an AGSL glass shader on Android 13+. Older systems use its blur fallback. See the [library's platform documentation](https://sbaiahmed1.github.io/react-native-blur/docs/liquid-glass-view/).

## Build and install for iPhone

From this repository:

```powershell
npx eas-cli@latest build --profile development --platform ios
```

EAS must first link the project to your Expo account and complete Apple signing and device registration. An installed development build containing this native module is required; restarting Expo Go cannot add the module. Windows cannot compile the iOS binary locally.

After installing the build, stop the current Expo server and start:

```powershell
npm run dev:glass -- --lan --port 8081
```

Open the installed **Keep** development app and connect to the development server. Do not scan its link into Expo Go when checking this library.

For Android, create a development build with `npx eas-cli@latest build --profile development --platform android` and use the same server.

## Device checks

Check Keep, Remove, Undo, Edit, navigation and modal buttons; confirm backdrop updates during swipes without the previous card flash. Check Reduce Transparency on iPhone. Profile scrolling and shader cost on Android 13+ before release.

Local lint, type checks, automated tests and exported JavaScript bundles do not confirm native compilation or device appearance. No signed native build was created during this integration.
