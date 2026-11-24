import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLrc, searchTerms, videoIdFrom } from "./server.mjs";

test("videoIdFrom reads every common YouTube link shape", () => {
  const id = "dQw4w9WgXcQ";
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}&list=RD`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
  ]) assert.equal(videoIdFrom(url), id, url);
});

test("videoIdFrom rejects non-YouTube and malformed input", () => {
  for (const input of ["", "hello", "https://vimeo.com/123", "https://youtube.com/watch?v=short", "https://evil.com/watch?v=dQw4w9WgXcQ", "javascript:alert(1)"]) {
    assert.equal(videoIdFrom(input), null, input);
  }
});

test("searchTerms strips YouTube title noise", () => {
  assert.equal(searchTerms("ABBA - Dancing Queen (Official Lyric Video)", "ABBA"), "ABBA - Dancing Queen");
  assert.equal(searchTerms("Blinding Lights [Official Video]", "The Weeknd - Topic"), "The Weeknd Blinding Lights");
  assert.equal(searchTerms("Daft Punk - Get Lucky ft. Pharrell Williams", "Daft Punk"), "Daft Punk - Get Lucky");
});

test("parseLrc reads timestamps and keeps empty lines as gaps", () => {
  assert.deepEqual(parseLrc("[00:16.85] you can dance\n[01:02.5] \nnot a line"), [
    { t: 16.85, text: "you can dance" },
    { t: 62.5, text: "" },
  ]);
});
