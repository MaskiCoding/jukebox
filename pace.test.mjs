import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const window = {};
vm.runInNewContext(readFileSync(new URL("./public/pace.js", import.meta.url), "utf8"), { window });
const { lyricProgress } = window.Pace;

test("a lyric line types across 95% of its sung duration", () => {
  assert.equal(lyricProgress(0, 4, 40, 0.07), 0);
  const half = lyricProgress(1.9, 4, 40, 0.07);
  assert.ok(half >= 19 && half <= 21, `half the duration typed ${half} of 40 letters`);
  assert.ok(lyricProgress(3.7, 4, 40, 0.07) < 40);
  assert.equal(lyricProgress(3.8, 4, 40, 0.07), 40);
  assert.equal(lyricProgress(10, 4, 40, 0.07), 40);
});

test("letters keep at least 70 ms apart however short the line is sung", () => {
  assert.equal(lyricProgress(0.36, 0.5, 30, 0.07), 5);
  assert.equal(lyricProgress(2.1, 0.5, 30, 0.07), 30);
});

test("a title with no lyrics types once at 180 ms a letter", () => {
  assert.equal(lyricProgress(0.95, 0, 12, 0.18), 5);
  assert.equal(lyricProgress(60, 0, 12, 0.18), 12);
});
