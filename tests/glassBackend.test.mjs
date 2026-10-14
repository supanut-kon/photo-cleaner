import { test } from "node:test";
import assert from "node:assert/strict";
import { loadGlassBackend } from "../src/glassBackend.ts";

test("Expo Go never evaluates a missing native glass module, even with the build flag on", () => {
  const unavailable = () => { throw Error("Native view manager not installed in Expo Go"); };
  assert.equal(loadGlassBackend(true, true, unavailable), null);
  assert.equal(loadGlassBackend(true, false, unavailable), null);
});

test("only an opted-in custom binary loads the native library", () => {
  let calls = 0;
  const library = { LiquidGlassView: "native component" };
  const load = () => { calls++; return library; };
  assert.equal(loadGlassBackend(false, false, load), null);
  assert.equal(calls, 0);
  assert.equal(loadGlassBackend(false, true, load), library);
  assert.equal(calls, 1);
});
