window.Coin = (function () {
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
  const mine = new Set();
  let toldSkip = null;

  async function post(path, body) {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client, ...body }) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  function say(text, err) {
    $("msg").textContent = text;
    $("msg").classList.toggle("err", Boolean(err));
  }

  $("by").value = stored("jukebox-name", () => "");
  $("by").addEventListener("change", () => {
    try {
      localStorage.setItem("jukebox-name", $("by").value.trim());
    } catch {}
  });

  $("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const coin = $("coin");
    coin.disabled = true;
    coin.classList.add("drop");
    say("Clink…");
    const { ok, data } = await post("/api/add", { url: $("url").value, by: $("by").value, dedication: $("dedication").value });
    setTimeout(() => {
      coin.classList.remove("drop");
      coin.disabled = false;
    }, 600);
    if (ok) {
      mine.add(data.id);
      say(`Queued: ${data.title}`);
      $("url").value = "";
      $("dedication").value = "";
      navigator.vibrate?.(30);
    } else say(data.error ?? "The jukebox jammed. Try again.", true);
  });

  $("rose").addEventListener("click", async () => {
    const rose = $("rose");
    rose.classList.remove("thrown");
    void rose.offsetWidth;
    rose.classList.add("thrown");
    const { ok, data } = await post("/api/rose", { by: $("by").value });
    if (!ok) say(data.error ?? "The rose missed. Try again.", true);
  });

  function heard(state) {
    const skip = state.skipped;
    if (!skip || skip.id === toldSkip || !mine.has(skip.id)) return;
    toldSkip = skip.id;
    say(skip.reason === "blocked" ? `YouTube won't let “${skip.title}” play outside YouTube. Try a lyric video or an audio upload of it.` : `“${skip.title}” wouldn't play, so the jukebox skipped it.`, true);
  }

  return { client, post, heard };
})();
