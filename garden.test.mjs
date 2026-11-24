import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./public/garden.js", import.meta.url), "utf8");

function loadGarden() {
  const calls = [];
  const frames = [];
  let now = 0;
  const ctx = new Proxy({}, {
    get: (target, key) => key in target ? target[key] : (key === "measureText" ? () => ({ width: 60 }) : (...args) => calls.push([key, ...args])),
    set: (target, key, value) => { target[key] = value; return true; },
  });
  const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: 800, height: 400, left: 0, top: 0 }) };
  const listeners = { addEventListener() {}, removeEventListener() {} };
  const window = { ...listeners, devicePixelRatio: 1 };
  vm.runInNewContext(source, {
    window,
    document: listeners,
    performance: { now: () => now },
    requestAnimationFrame: (fn) => frames.push(fn),
    cancelAnimationFrame() {},
    Math,
  });
  const garden = window.Garden.create(canvas, { transparent: true });
  const advance = (ms) => {
    now += ms;
    frames.splice(0).forEach((fn) => fn());
  };
  return { garden, calls, advance };
}

test("type grows astral characters such as emoji as one letter", () => {
  const { garden, calls, advance } = loadGarden();
  garden.type("🌹");
  advance(16);
  assert.ok(calls.some(([name, ch]) => name === "fillText" && ch === "🌹"));
});

test("rose blooms petals at the given spot and withers away", () => {
  const { garden, calls, advance } = loadGarden();
  advance(16);
  const fillsBefore = calls.filter(([name]) => name === "fill").length;
  garden.rose(200, 150);
  advance(1500);
  const blooming = calls.filter(([name]) => name === "fill").length;
  assert.ok(blooming > fillsBefore, "the rose draws petals");
  advance(8000);
  calls.length = 0;
  advance(16);
  assert.equal(calls.filter(([name]) => name === "fill").length, 0, "the rose is gone after its life");
});
