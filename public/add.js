const $ = (id) => document.getElementById(id);

function stored(key, make) {
  try {
    const value = localStorage.getItem(key) ?? make();
    localStorage.setItem(key, value);
    return value;
  } catch {
    return make();
  }
}

const client = stored("jukebox-client", () => crypto.randomUUID());
const voted = new Set();
let booedFor = null;
let state = null;

$("by").value = stored("jukebox-name", () => "");
$("by").addEventListener("change", () => {
  try {
    localStorage.setItem("jukebox-name", $("by").value.trim());
  } catch {}
});

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

async function post(path, body) {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client, ...body }) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

function say(text, err) {
  $("msg").textContent = text;
  $("msg").classList.toggle("err", Boolean(err));
}

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const coin = $("coin");
  coin.disabled = true;
  coin.classList.add("drop");
  say("Clink…");
  const { ok, data } = await post("/api/add", { url: $("url").value, by: $("by").value });
  setTimeout(() => {
    coin.classList.remove("drop");
    coin.disabled = false;
  }, 600);
  if (ok) {
    say(`Queued: ${data.title}`);
    $("url").value = "";
    navigator.vibrate?.(30);
  } else say(data.error ?? "The jukebox jammed. Try again.", true);
});

function render() {
  const { playing, queue, boosToSkip } = state;
  const box = $("playing");
  box.replaceChildren();
  if (playing) {
    const row = el("div", "playing-now");
    const img = el("img");
    img.src = playing.thumb;
    img.alt = "";
    const text = el("div");
    text.append(el("b", null, playing.title), el("small", null, `${playing.artist} · picked by ${playing.by}`));
    row.append(img, text);
    const boo = el("button", "boo", booedFor === playing.id ? `booed · ${playing.boos}/${boosToSkip}` : `boo this song · ${playing.boos}/${boosToSkip}`);
    boo.type = "button";
    boo.disabled = booedFor === playing.id;
    boo.addEventListener("click", async () => {
      booedFor = playing.id;
      render();
      await post("/api/boo", {});
    });
    box.append(row, boo);
  } else box.append(el("p", "empty-note", "Silence. Be the first coin."));

  const list = $("queue");
  list.replaceChildren();
  if (!queue.length) list.append(el("li", "empty-note", "Nothing queued yet."));
  queue.forEach((song, i) => {
    const li = el("li");
    const s = el("div", "strip");
    s.append(el("span", "code", `A${i + 1}`));
    const t = el("div", "text");
    t.append(el("b", null, song.title), el("small", null, `${song.artist} · ${song.by}`));
    s.append(t);
    const vote = el("button", voted.has(song.id) ? "vote on" : "vote", `▲\n${song.votes}`);
    vote.type = "button";
    vote.style.whiteSpace = "pre";
    vote.setAttribute("aria-label", `Push up ${song.title}, ${song.votes} votes`);
    vote.addEventListener("click", async () => {
      voted.add(song.id);
      render();
      await post("/api/vote", { id: song.id });
    });
    li.append(s, vote);
    list.append(li);
  });
}

const events = new EventSource("/events");
events.onmessage = (e) => {
  state = JSON.parse(e.data);
  render();
};
