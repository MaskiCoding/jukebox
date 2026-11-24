const $ = (id) => document.getElementById(id);
const PALETTES = [0, 2, 3, 4, 5];

let state = null;
let player = null;
let ready = false;
let current = null;
let garden = null;
let lyrics = { lines: [] };
let lineIndex = -2;
let lineChars = [];
let typed = 0;
let seenSkip;
let skipTimer = 0;

$("join").textContent = `${location.host}/add`;
window.mountScenery?.();

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

function seq(id) {
  return Number(String(id).slice(1)) || 0;
}

function paletteFor(song) {
  return window.SCENE_PALETTE?.[song?.scene] ?? PALETTES[seq(song?.id) % PALETTES.length];
}

function render() {
  const { playing, queue, listeners, boosToSkip } = state;
  const scene = playing?.scene ?? "lounge";
  document.body.dataset.scene = scene;
  if (playing) garden?.setPalette(paletteFor(playing));
  const strips = [strip("▶", playing), ...queue.slice(0, 7).map((s, i) => strip(`A${i + 1}`, s))];
  while (strips.length < 8) strips.push(strip(`A${strips.length}`, null));
  $("selector").replaceChildren(...strips);

  const now = $("now");
  now.replaceChildren();
  if (playing) {
    const where = window.SCENE_LABEL?.[scene];
    now.append(el("div", "label", where ? `NOW PLAYING · LIVE FROM ${where.toUpperCase()}` : "NOW PLAYING"), el("h2", null, playing.title), el("div", "by", `${playing.artist} · picked by ${playing.by}`));
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

async function loadLyrics(song) {
  lyrics = { lines: [] };
  lineIndex = -2;
  showLine(song.title);
  try {
    const res = await fetch(`/api/lyrics?id=${encodeURIComponent(song.id)}`);
    const data = await res.json();
    if (current !== song.id) return;
    lyrics = data.lines?.length ? data : { lines: [] };
  } catch {}
}

function showLine(text) {
  lineChars = Array.from(text);
  typed = 0;
  garden?.clear();
  $("lyric").textContent = "";
}

function typeTo(count) {
  while (typed < Math.min(count, lineChars.length)) {
    const ch = lineChars[typed++];
    if (garden) garden.type(ch);
  }
  if (!garden) $("lyric").textContent = lineChars.slice(0, typed).join("");
}

function showDedication(song) {
  const marquee = $("marquee");
  marquee.hidden = !song.dedication;
  if (!song.dedication) return;
  const text = $("marquee-text");
  text.textContent = `♥ ${song.dedication} · from ${song.by} ♥`;
  text.style.animation = "none";
  void text.offsetWidth;
  text.style.animation = "";
  text.onanimationend = () => (marquee.hidden = true);
}

const skipWords = {
  blocked: "YouTube won't let this one play outside YouTube. Try a lyric video or an audio upload.",
  broken: "This one wouldn't load, so the jukebox skipped it.",
};

function noteSkip(skipped) {
  const id = skipped?.id ?? null;
  if (seenSkip === undefined || id === seenSkip) {
    seenSkip = id;
    return;
  }
  seenSkip = id;
  const note = $("skipnote");
  note.textContent = `Skipped “${skipped.title}” from ${skipped.by}. ${skipWords[skipped.reason] ?? ""}`;
  note.hidden = false;
  clearTimeout(skipTimer);
  skipTimer = setTimeout(() => (note.hidden = true), 12000);
}

function throwRose() {
  const canvas = $("garden");
  if (!garden || !canvas.clientWidth) return;
  garden.rose(canvas.clientWidth * (0.08 + Math.random() * 0.84), canvas.clientHeight * (0.12 + Math.random() * 0.76));
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
  typeTo(Math.ceil(p * lineChars.length));
}

function sync() {
  if (!state || !ready) return;
  const song = state.playing;
  if (!song) {
    if (current) player.stopVideo();
    current = null;
    showLine("");
    $("marquee").hidden = true;
    render();
    return;
  }
  if (song.id === current) return;
  current = song.id;
  const offset = (Date.now() - song.startedAt) / 1000;
  player.loadVideoById({ videoId: song.videoId, startSeconds: offset > 4 ? offset : 0 });
  render();
  showDedication(song);
  loadLyrics(song);
}

function next(reason) {
  if (!current) return;
  fetch("/api/next", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: current, reason }) });
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
        onError: (e) => next(e.data === 101 || e.data === 150 ? "blocked" : "broken"),
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
    garden = window.Garden.create($("garden"), { transparent: true, palette: paletteFor(state?.playing) });
    $("lyric").hidden = true;
  }
});

const events = new EventSource("/events");
events.onmessage = (e) => {
  state = JSON.parse(e.data);
  noteSkip(state.skipped);
  render();
  sync();
};
events.addEventListener("rose", throwRose);

requestAnimationFrame(tick);
