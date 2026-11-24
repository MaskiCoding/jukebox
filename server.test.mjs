import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseLrc, sceneFrom, searchTerms, videoIdFrom } from "./server.mjs";

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

test("sceneFrom maps Deezer genre ids, bpm and keywords to a scene", () => {
  const cases = [
    [{ genres: [113] }, "club"],
    [{ genres: [-1, 106] }, "club"],
    [{ genres: [84] }, "ranch"],
    [{ genres: [98] }, "opera"],
    [{ genres: [464] }, "forge"],
    [{ genres: [116] }, "rooftop"],
    [{ genres: [132], bpm: 124 }, "disco"],
    [{ genres: [132], bpm: 90 }, "arena"],
    [{ genres: [132], text: "Disco Inferno" }, "disco"],
    [{ genres: [132], bpm: 130, text: "Last Christmas Wham!" }, "cabin"],
    [{ genres: [95], text: "Nessun Dorma aria" }, "opera"],
    [{ text: "Some Song Band" }, "lounge"],
    [{}, "lounge"],
  ];
  for (const [input, scene] of cases) assert.equal(sceneFrom(input), scene, JSON.stringify(input));
});

test("the hidden attribute beats every display rule in style.css", async () => {
  const css = await readFile(new URL("./public/style.css", import.meta.url), "utf8");
  assert.match(css, /^\[hidden\] \{ display: none !important; \}$/m);
});

test("the screen's coin slot sits in the cabinet above a slim grille, clear of the stage", async () => {
  const html = await readFile(new URL("./public/screen.html", import.meta.url), "utf8");
  const at = (needle) => html.indexOf(needle);
  assert.ok(at('class="cabinet"') < at('id="form"') && at('id="form"') < at('class="stage"'), "the form is inside the cabinet");
  assert.ok(at('class="grille"') > at('id="form"'), "a grille follows the form");
  assert.doesNotMatch(html, /coin-row/, "the compact grid places the coin, message and rose directly");
  assert.doesNotMatch(html.slice(at('class="join"'), at("</header>")), /<form/);
});

test("the screen shows no credit line and the README credits Type Garden", async () => {
  const html = await readFile(new URL("./public/screen.html", import.meta.url), "utf8");
  const readme = await readFile(new URL("./README.md", import.meta.url), "utf8").catch(() => "");
  assert.doesNotMatch(html, /Type Garden/);
  assert.match(readme, /Type Garden/);
  assert.ok(readme.includes("https://type-garden.vercel.app/"));
});
