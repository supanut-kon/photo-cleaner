// A server flag cannot add native modules to Expo Go. Never evaluate the
// third-party package there, even when serving a development-build bundle.
export function loadGlassBackend<T>(
  expoGo: boolean,
  enabled: boolean,
  load: () => T,
): T | null {
  return !expoGo && enabled ? load() : null;
}
