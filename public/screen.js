const $ = (id) => document.getElementById(id);
const PALETTES = [0, 2, 3, 4, 5];

let state = null;
let player = null;
let ready = false;
let current = null;
let garden = null;
let lyrics = { lines: [] };
let lineIndex = -2;
let lineText = "";
let typed = 0;

$("join").textContent = `${location.host}/add`;

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function strip(code, song) {
  const s = el("div", song ? "strip" : "strip empty");
  s.append(el("span", "code", code));
  const t = el("div", "text");
  t.append(el("b", null, song ? song.title : "· · ·"), el("small", null, song ? `${song.artist} · ${song.by}` : "drop a coin"));
  s.append(t);
  return s;
}

function render() {
  const { playing, queue, listeners, boosToSkip } = state;
  const strips = [strip("▶", playing), ...queue.slice(0, 7).map((s, i) => strip(`A${i + 1}`, s))];
  while (strips.length < 8) strips.push(strip(`A${strips.length}`, null));
  $("selector").replaceChildren(...strips);

  const now = $("now");
  now.replaceChildren();
  if (playing) {
    now.append(el("div", "label", "NOW PLAYING"), el("h2", null, playing.title), el("div", "by", `${playing.artist} · picked by ${playing.by}`));
    const boos = el("div", "boos");
    for (let i = 0; i < boosToSkip; i++) boos.append(el("i", i < playing.boos ? "on" : ""));
    now.append(boos);
  } else {
    now.append(el("div", "label", "NOW PLAYING"), el("h2", null, "nothing yet"));
  }
  $("listeners").textContent = `${listeners} ${listeners === 1 ? "listener" : "listeners"}`;
  $("cabinet").classList.toggle("playing", Boolean(playing));
  $("idle").hidden = Boolean(playing && player);
}

function seq(id) {
  return Number(String(id).slice(1)) || 0;
}

async function loadLyrics(song) {
  lyrics = { lines: [] };
  lineIndex = -2;
  $("source").textContent = "";
  garden?.setPalette(PALETTES[seq(song.id) % PALETTES.length]);
  showLine(song.title);
  try {
    const res = await fetch(`/api/lyrics?id=${encodeURIComponent(song.id)}`);
    const data = await res.json();
    if (current !== song.id) return;
    lyrics = data.lines?.length ? data : { lines: [] };
    $("source").textContent = data.source ? `lyrics: ${data.source} via lrclib` : "no synced lyrics found";
  } catch {
    $("source").textContent = "no synced lyrics found";
  }
}

function showLine(text) {
  lineText = text;
  typed = 0;
  garden?.clear();
  $("lyric").textContent = "";
}

function typeTo(count) {
  while (typed < Math.min(count, lineText.length)) {
    const ch = lineText[typed++];
    if (garden) garden.type(ch);
  }
  if (!garden) $("lyric").textContent = lineText.slice(0, typed);
}

function tick() {
  requestAnimationFrame(tick);
  if (!ready || !current) return;
  const lines = lyrics.lines;
  if (!lines.length) {
    typeTo(Math.floor((performance.now() / 90) % 100000));
    return;
  }
  const t = player.getCurrentTime?.() ?? 0;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].t <= t + 0.15) idx = i;
    else break;
  }
  if (idx !== lineIndex) {
    lineIndex = idx;
    showLine(idx >= 0 ? lines[idx].text : "");
  }
  if (idx < 0) return;
  const start = lines[idx].t;
  const end = lines[idx + 1]?.t ?? start + 4;
  const p = Math.min(1, Math.max(0, (t - start) / Math.max(0.6, (end - start) * 0.7)));
  typeTo(Math.ceil(p * lineText.length));
}

function sync() {
  if (!state || !ready) return;
  const song = state.playing;
  if (!song) {
    if (current) player.stopVideo();
    current = null;
    showLine("");
    render();
    return;
  }
  if (song.id === current) return;
  current = song.id;
  const offset = (Date.now() - song.startedAt) / 1000;
  player.loadVideoById({ videoId: song.videoId, startSeconds: offset > 4 ? offset : 0 });
  render();
  loadLyrics(song);
}

function next() {
  if (!current) return;
  fetch("/api/next", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: current }) });
}

function plugIn() {
  $("plug").hidden = true;
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player("player", {
      width: "100%",
      height: "100%",
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, rel: 0, playsinline: 1, iv_load_policy: 3 },
      events: {
        onReady: () => {
          ready = true;
          sync();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.ENDED) next();
        },
        onError: () => next(),
      },
    });
  };
  const s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  document.head.append(s);
}

$("plug").addEventListener("click", plugIn);

document.fonts.load('700 100px "Playfair Display"').finally(() => {
  if (window.Garden) {
    garden = window.Garden.create($("garden"), { transparent: true, palette: 0 });
    $("lyric").hidden = true;
  }
});

const events = new EventSource("/events");
events.onmessage = (e) => {
  state = JSON.parse(e.data);
  render();
  sync();
};

requestAnimationFrame(tick);
