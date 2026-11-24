import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 8080);
const boosToSkip = Number(process.env.BOOS_TO_SKIP ?? 3);
const addCooldownMs = Number(process.env.ADD_COOLDOWN_MS ?? 45000);
const maxQueue = 60;
const publicDir = fileURLToPath(new URL("./public/", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
const pages = { "/": "screen.html", "/add": "add.html" };

let queue = [];
let playing = null;
let seq = 0;
const lastAdd = new Map();
const streams = new Set();

export function videoIdFrom(input) {
  let url;
  try {
    url = new URL(String(input).trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (host === "youtube.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else id = url.pathname.match(/^\/(shorts|embed|live)\/([^/]+)/)?.[2] ?? null;
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id ?? "") ? id : null;
}

const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const sortedQueue = () => [...queue].sort((a, b) => b.votes.size - a.votes.size || a.at - b.at);

const view = (song) =>
  song && {
    id: song.id,
    videoId: song.videoId,
    title: song.title,
    artist: song.artist,
    thumb: song.thumb,
    by: song.by,
    votes: song.votes.size,
    boos: song.boos?.size ?? 0,
    startedAt: song.startedAt ?? null,
  };

const snapshot = () => ({ playing: view(playing), queue: sortedQueue().map(view), listeners: streams.size, boosToSkip });

function broadcast() {
  const frame = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const res of streams) res.write(frame);
}

function advance(fromId) {
  if (fromId && playing?.id !== fromId) return;
  const next = sortedQueue()[0];
  queue = queue.filter((s) => s !== next);
  playing = next ? { ...next, boos: new Set(), startedAt: Date.now() } : null;
  broadcast();
}

async function lookup(videoId) {
  const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { title: clean(data.title, 120), artist: clean(data.author_name, 80), thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
}

const lyricsCache = new Map();

export function searchTerms(title, channel) {
  const base = String(title)
    .replace(/[([{][^)\]}]*[)\]}]/g, " ")
    .replace(/\b(official|music|lyric|lyrics|video|audio|visualizer|hd|4k|remaster(ed)?|mv)\b/gi, " ")
    .replace(/\b(ft|feat)\.?\s.*$/i, " ")
    .replace(/["|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const artist = String(channel).replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
  return base.includes(" - ") ? base : `${artist} ${base}`.trim();
}

export function parseLrc(text) {
  const lines = [];
  for (const raw of String(text).split("\n")) {
    const m = raw.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (m) lines.push({ t: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return lines;
}

async function lyricsFor(song) {
  if (lyricsCache.has(song.videoId)) return lyricsCache.get(song.videoId);
  const q = searchTerms(song.title, song.artist);
  const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, {
    headers: { "user-agent": "jukebox-meetup-demo/1.0" },
    signal: AbortSignal.timeout(6000),
  });
  const hits = res.ok ? await res.json() : [];
  const hit = hits.find((h) => h.syncedLyrics);
  const lyrics = hit ? { source: `${hit.artistName} · ${hit.trackName}`, lines: parseLrc(hit.syncedLyrics) } : { source: null, lines: [] };
  lyricsCache.set(song.videoId, lyrics);
  return lyrics;
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 4096) throw new Error("too large");
  }
  return JSON.parse(body || "{}");
}

const send = (res, status, data) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
};

const api = {
  async add(body) {
    const client = clean(body.client, 64);
    if (!client) return [400, { error: "Missing client." }];
    const videoId = videoIdFrom(body.url);
    if (!videoId) return [400, { error: "That isn't a YouTube link." }];
    const wait = (lastAdd.get(client) ?? 0) + addCooldownMs - Date.now();
    if (wait > 0) return [429, { error: `Your next coin is ready in ${Math.ceil(wait / 1000)}s.` }];
    if (playing?.videoId === videoId || queue.some((s) => s.videoId === videoId)) return [409, { error: "That one is already in the jukebox." }];
    if (queue.length >= maxQueue) return [429, { error: "The jukebox is full. Try again soon." }];
    const meta = await lookup(videoId).catch(() => null);
    if (!meta) return [400, { error: "YouTube won't let that video play here. Try another." }];
    lastAdd.set(client, Date.now());
    queue.push({ id: `s${++seq}`, videoId, ...meta, by: clean(body.by, 24) || "someone", votes: new Set([client]), at: Date.now() });
    if (!playing) advance();
    else broadcast();
    return [200, { ok: true, title: meta.title }];
  },
  vote(body) {
    const song = queue.find((s) => s.id === body.id);
    const client = clean(body.client, 64);
    if (!song || !client) return [404, { error: "That song already played." }];
    song.votes.add(client);
    broadcast();
    return [200, { ok: true }];
  },
  boo(body) {
    const client = clean(body.client, 64);
    if (!playing || !client) return [404, { error: "Nothing is playing." }];
    playing.boos.add(client);
    if (playing.boos.size >= boosToSkip) advance(playing.id);
    else broadcast();
    return [200, { ok: true }];
  },
  next(body) {
    advance(clean(body.id, 32));
    return [200, { ok: true }];
  },
};

async function serveFile(res, path) {
  const file = normalize(join(publicDir, path));
  if (!file.startsWith(publicDir)) return send(res, 404, { error: "Not found." });
  try {
    const data = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    send(res, 404, { error: "Not found." });
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");

  if (req.method === "GET" && pathname === "/healthz") return send(res, 200, { ok: true });

  if (req.method === "GET" && pathname === "/api/lyrics") {
    const id = new URL(req.url, "http://localhost").searchParams.get("id");
    const song = playing?.id === id ? playing : queue.find((s) => s.id === id);
    if (!song) return send(res, 404, { error: "Unknown song." });
    const lyrics = await lyricsFor(song).catch(() => ({ source: null, lines: [] }));
    return send(res, 200, lyrics);
  }

  if (req.method === "GET" && pathname === "/events") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no" });
    res.write("retry: 2000\n\n");
    streams.add(res);
    broadcast();
    req.on("close", () => {
      streams.delete(res);
      broadcast();
    });
    return;
  }

  const action = pathname.startsWith("/api/") && api[pathname.slice(5)];
  if (req.method === "POST" && action) {
    try {
      const [status, data] = await action(await readJson(req));
      return send(res, status, data);
    } catch {
      return send(res, 400, { error: "Bad request." });
    }
  }

  if (req.method === "GET") return serveFile(res, pages[pathname] ?? pathname);
  send(res, 405, { error: "Method not allowed." });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setInterval(() => {
    for (const res of streams) res.write(": ping\n\n");
  }, 25000);
  server.listen(port, () => console.log(`jukebox on :${port}`));
}
