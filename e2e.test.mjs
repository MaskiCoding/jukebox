import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { server } from "./server.mjs";

const realFetch = globalThis.fetch;
let base;

before(async () => {
  globalThis.fetch = (url, init) => {
    const target = new URL(String(url));
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

async function snapshot() {
  const res = await realFetch(`${base}/events`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) throw new Error("The event stream closed before a snapshot.");
    text += value;
    const frame = text.match(/^data: (.*)$/m);
    if (frame) {
      await reader.cancel();
      return JSON.parse(frame[1]);
    }
  }
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
