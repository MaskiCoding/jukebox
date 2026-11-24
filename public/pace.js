(function () {
  function lyricProgress(elapsed, duration, chars, floor) {
    var paced = duration > 0 ? Math.ceil((chars * elapsed) / (duration * 0.95)) : chars;
    return Math.max(0, Math.min(chars, Math.floor(elapsed / floor), paced));
  }

  window.Pace = { lyricProgress: lyricProgress };
})();
