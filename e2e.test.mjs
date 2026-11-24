import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { server } from "./server.mjs";

const realFetch = globalThis.fetch;

function deezer(target) {
  if (target.pathname === "/search") return { data: target.searchParams.get("q").includes("eeeeeeeeeee") ? [{ id: 7, album: { id: 9 } }] : [] };
  if (target.pathname === "/album/9") return { genre_id: 113, genres: { data: [{ id: 113 }] } };
  if (target.pathname === "/track/7") return { bpm: 128 };
  return {};
}
let base;

before(async () => {
  globalThis.fetch = (url, init) => {
    const target = new URL(String(url));
    if (target.hostname === "api.deezer.com") return Promise.resolve(Response.json(deezer(target)));
    if (target.hostname !== "www.youtube.com" || target.pathname !== "/oembed") return realFetch(url, init);
    const videoId = new URL(target.searchParams.get("url")).searchParams.get("v");
    return Promise.resolve(Response.json({ title: `Song ${videoId}`, author_name: "Band" }));
  };
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  globalThis.fetch = realFetch;
  server.closeAllConnections();
  server.close();
});

const post = async (action, body) => {
  const res = await realFetch(`${base}/api/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};

async function listen() {
  const res = await realFetch(`${base}/events`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let text = "";
  return {
    async next(event) {
      for (;;) {
        const frame = text.match(new RegExp(`^event: ${event}\ndata: (.*)\n\n`, "m"));
        if (frame) {
          text = text.slice(frame.index + frame[0].length);
          return JSON.parse(frame[1]);
        }
        const { value, done } = await reader.read();
        if (done) throw new Error(`The event stream closed before a ${event} event.`);
        text += value;
      }
    },
    close: () => reader.cancel(),
  };
}

async function snapshot() {
  const stream = await listen();
  const state = await stream.next("message");
  await stream.close();
  return state;
}

const link = (id) => `https://youtu.be/${id}`;
const ids = (state) => state.queue.map((s) => s.videoId);

test("the room flow plays, queues, reorders, skips and advances over HTTP", async () => {
  assert.equal((await post("add", { client: "a", by: "Ann", url: link("aaaaaaaaaaa") })).status, 200);
  let state = await snapshot();
  assert.equal(state.playing.videoId, "aaaaaaaaaaa");
  assert.equal(state.playing.by, "Ann");
  assert.deepEqual(state.queue, []);

  assert.equal((await post("add", { client: "b", url: link("bbbbbbbbbbb") })).status, 200);
  assert.equal((await post("add", { client: "c", url: link("ccccccccccc") })).status, 200);
  state = await snapshot();
  assert.equal(state.playing.videoId, "aaaaaaaaaaa");
  assert.deepEqual(ids(state), ["bbbbbbbbbbb", "ccccccccccc"]);

  assert.equal((await post("add", { client: "a", url: link("ddddddddddd") })).status, 429);
  assert.equal((await post("add", { client: "d", url: link("bbbbbbbbbbb") })).status, 409);
  assert.equal((await post("add", { client: "d", url: "https://vimeo.com/1" })).status, 400);

  const third = state.queue[1].id;
  assert.equal((await post("vote", { client: "x", id: third })).status, 200);
  state = await snapshot();
  assert.deepEqual(ids(state), ["ccccccccccc", "bbbbbbbbbbb"]);

  for (const client of ["x", "y"]) assert.equal((await post("boo", { client, id: state.playing.id })).status, 200);
  state = await snapshot();
  assert.equal(state.playing.videoId, "aaaaaaaaaaa");
  assert.equal(state.playing.boos, 2);
  await post("boo", { client: "z" });
  state = await snapshot();
  assert.equal(state.playing.videoId, "ccccccccccc");
  assert.equal(state.playing.boos, 0);
  assert.deepEqual(ids(state), ["bbbbbbbbbbb"]);

  const stale = "s1";
  await post("next", { id: stale });
  state = await snapshot();
  assert.equal(state.playing.videoId, "ccccccccccc");

  await post("next", { id: state.playing.id });
  state = await snapshot();
  assert.equal(state.playing.videoId, "bbbbbbbbbbb");
  assert.deepEqual(state.queue, []);

  await post("next", { id: state.playing.id });
  state = await snapshot();
  assert.equal(state.playing, null);
});

test("request bodies over 4096 bytes are refused", async () => {
  const res = await post("add", { client: "big", url: "x".repeat(5000) });
  assert.equal(res.status, 400);
});

test("dedications, roses, blocked skips and genre scenes reach the room", async () => {
  const add = await post("add", { client: "e", by: "Eve", dedication: "  for   the   birthday crew who stayed up all night long  ", url: link("eeeeeeeeeee") });
  assert.equal(add.status, 200);
  let state = await snapshot();
  assert.equal(state.playing.id, add.body.id);
  assert.equal(state.playing.dedication, "for the birthday crew who stayed up all");
  for (let i = 0; i < 20 && state.playing.scene !== "club"; i++) state = await snapshot();
  assert.equal(state.playing.scene, "club");

  const stream = await listen();
  await stream.next("message");
  assert.equal((await post("rose", { client: "e", by: "Eve" })).status, 200);
  assert.deepEqual(await stream.next("rose"), { by: "Eve" });
  assert.equal((await post("rose", { client: "e" })).status, 429);
  assert.equal((await post("rose", {})).status, 400);
  await stream.close();

  assert.equal((await post("add", { client: "f", url: link("fffffffffff") })).status, 200);
  await post("next", { id: add.body.id, reason: "blocked" });
  state = await snapshot();
  assert.equal(state.playing.videoId, "fffffffffff");
  assert.equal(state.playing.dedication, "");
  assert.equal(state.playing.scene, "lounge");
  assert.deepEqual({ ...state.skipped, at: 0 }, { id: add.body.id, title: "Song eeeeeeeeeee", by: "Eve", reason: "blocked", at: 0 });

  await post("next", { id: state.playing.id, reason: "nonsense" });
  state = await snapshot();
  assert.equal(state.playing, null);
  assert.equal(state.skipped.id, add.body.id);
});
