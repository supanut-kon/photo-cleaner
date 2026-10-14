import { test } from "node:test";
import assert from "node:assert/strict";
import { lightColors, darkColors } from "../src/themePalette.ts";

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("dark panels retain readable text and action colors", () => {
  for (const token of ["ink", "muted", "accent", "coral"]) {
    assert.ok(contrast(darkColors[token], darkColors.bg) >= 4.5, `${token} needs readable contrast`);
  }
});

test("background text stays readable in both appearances", () => {
  for (const palette of [lightColors, darkColors]) {
    assert.ok(contrast(palette.ambientInk, palette.ambientBackground) >= 4.5);
    assert.ok(contrast(palette.ambientMuted, palette.ambientBackground) >= 4.5);
  }
});

test("dark background text remains readable even with all three cloud peaks overlapping", () => {
  let rgb = darkColors.ambientBackground.slice(1).match(/../g).map(value => parseInt(value, 16));
  for (const cloud of ["#8C9BFF", "#FFB09F", "#94DFC0"]) {
    const next = cloud.slice(1).match(/../g).map(value => parseInt(value, 16));
    rgb = rgb.map((value, i) => value * (1 - darkColors.cloudOpacity) + next[i] * darkColors.cloudOpacity);
  }
  const composite = "#" + rgb.map(value => Math.round(value).toString(16).padStart(2, "0")).join("");
  assert.ok(contrast(darkColors.ambientInk, composite) >= 4.5);
  assert.ok(contrast(darkColors.ambientMuted, composite) >= 4.5);
});
