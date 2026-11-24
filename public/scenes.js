window.SCENE_PALETTE = {
  lounge: 0,
  club: 4,
  ranch: 3,
  opera: 0,
  rockstage: 0,
  forge: 3,
  jazzclub: 2,
  rooftop: 4,
  beachbar: 3,
  campfire: 5,
  disco: 4,
  arena: 2,
  cinema: 9,
  cabin: 2
};

window.SCENE_LABEL = {
  lounge: "the lounge",
  club: "the club",
  ranch: "the ranch",
  opera: "the opera house",
  rockstage: "the dive bar",
  forge: "the forge",
  jazzclub: "the jazz club",
  rooftop: "the rooftop",
  beachbar: "the beach bar",
  campfire: "the campfire",
  disco: "the disco",
  arena: "the arena",
  cinema: "the cinema",
  cabin: "the snowy cabin"
};

window.mountScenery = (function () {
  var seed = 7;
  function r() { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }
  function rr(a, b) { return a + r() * (b - a); }
  function n(x) { return Math.round(x * 100) / 100; }
  function pick(list) { return list[Math.floor(r() * list.length)]; }
  function repeat(count, fn) { var s = ""; for (var i = 0; i < count; i++) s += fn(i); return s; }
  function dot(cls, style) { return '<i class="' + cls + '" style="' + style + '"></i>'; }
  function div(cls, inner) { return '<div class="' + cls + '">' + (inner || "") + "</div>"; }
  function svg(cls, body, aspect) {
    return '<svg class="' + cls + '" viewBox="0 0 1600 900" preserveAspectRatio="' + (aspect || "xMidYMax slice") + '" aria-hidden="true">' + body + "</svg>";
  }

  function pine(x, base, h, w) {
    var d = "M" + n(x - w * 0.06) + " " + n(base) + "h" + n(w * 0.12) + "v" + n(-h * 0.2) + "h" + n(-w * 0.12) + "Z";
    var tiers = [[1, 0.36, 0.55], [0.78, 0.18, 0.77], [0.56, 0.04, 1]];
    tiers.forEach(function (t) {
      var top = base - h * t[0], bot = base - h * t[1], half = w * t[2] / 2;
      d += "M" + n(x - half) + " " + n(bot) + "L" + n(x) + " " + n(top) + "L" + n(x + half) + " " + n(bot) + "Z";
    });
    return d;
  }

  function forest(count, base, hMin, hMax, fill) {
    var d = "";
    for (var i = 0; i < count; i++) {
      var h = rr(hMin, hMax);
      d += pine(i * 1600 / (count - 1) + rr(-20, 20), base + rr(-10, 10), h, h * 0.45);
    }
    return '<path fill="' + fill + '" d="' + d + '"/>';
  }

  function crowd(base, fill, arms) {
    var s = "";
    for (var row = 0; row < 2; row++) {
      for (var x = -20; x < 1640; x += rr(46, 62)) {
        var y = base + row * 46 + rr(-8, 8), hr = rr(17, 23);
        s += '<circle cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(hr) + '"/>';
        s += '<rect x="' + n(x - hr * 1.9) + '" y="' + n(y + hr * 0.9) + '" width="' + n(hr * 3.8) + '" height="200" rx="' + n(hr * 1.4) + '"/>';
        if (arms && r() < 0.28) {
          var side = r() < 0.5 ? -1 : 1;
          s += '<path d="M' + n(x + side * hr * 1.3) + " " + n(y + hr * 1.4) + "L" + n(x + side * hr * 2.2) + " " + n(y - hr * 2.6) + '" stroke="' + fill + '" stroke-width="11" stroke-linecap="round"/>';
        }
      }
    }
    return '<g fill="' + fill + '">' + s + "</g>";
  }

  function sparks(count, x0, x1, top0) {
    return repeat(count, function () {
      return dot("spark", "left:" + n(rr(x0, x1)) + "%;top:" + n(rr(top0, 100)) + "%;--d:-" + n(rr(0, 6)) + "s;--t:" + n(rr(2.6, 5.5)) + "s;--dx:" + n(rr(-7, 7)) + "vw;--s:" + n(rr(2, 4.5)) + "px");
    });
  }

  function cones(count, colors, spread) {
    return repeat(count, function (i) {
      var a = n((i - (count - 1) / 2) * spread);
      return dot("cone", "left:" + n(12 + i * 76 / (count - 1)) + "%;--a:" + a + "deg;--w:" + n(rr(10, 22) * (a > 0 ? -1 : 1)) + "deg;--t:" + n(rr(5, 9)) + "s;--d:-" + n(rr(0, 9)) + "s;--c:" + colors[i % colors.length]);
    });
  }

  function smoke(count, tint) {
    return repeat(count, function () {
      return dot("smoke", "left:" + n(rr(-20, 80)) + "%;top:" + n(rr(45, 85)) + "%;--t:" + n(rr(18, 30)) + "s;--d:-" + n(rr(0, 30)) + "s;--c:" + tint);
    });
  }

  function club() {
    var beams = repeat(10, function (i) {
      var a = rr(-60, 60);
      return dot("beam", "left:" + (i % 2 ? 66 : 34) + "%;--a:" + n(a) + "deg;--w:" + n(rr(25, 55) * (a > 0 ? -1 : 1)) + "deg;--t:" + n(rr(2.8, 6)) + "s;--d:-" + n(rr(0, 6)) + "s;--c:" + (i % 3 ? "#39ff9c" : "#ff39e6"));
    });
    return div("haze one") + div("haze two") + beams + dot("emitter", "left:34%") + dot("emitter", "left:66%") +
      svg("crowd", crowd(800, "#030208", true)) + div("strobe");
  }

  function ranch() {
    var fence = "";
    for (var x = -10; x < 1620; x += 96) fence += '<rect x="' + x + '" y="636" width="13" height="104" rx="2"/>';
    var blades = repeat(8, function (i) { return '<path d="M1040 408 l-6 -86 l12 0 Z" transform="rotate(' + i * 45 + ' 1040 408)"/>'; });
    var body =
      '<path fill="#5b2f52" d="M0 640 C200 600 380 612 560 628 S900 588 1100 612 S1450 596 1600 618 V900 H0Z"/>' +
      '<g fill="#3b1d38"><path d="M1030 412 L1018 640 h44 L1050 412 Z"/><g class="mill">' + blades + '</g><circle cx="1040" cy="408" r="9"/></g>' +
      '<path fill="#1b0f18" d="M0 716 C300 698 600 712 900 702 S1400 698 1600 710 V900H0Z"/>' +
      '<g fill="#140a12">' + fence + '<rect x="-10" y="660" width="1640" height="9"/><rect x="-10" y="694" width="1640" height="9"/></g>' +
      '<g fill="#120910"><circle cx="230" cy="742" r="58"/><circle cx="1360" cy="752" r="52"/><circle cx="1462" cy="770" r="40"/>' +
      '<rect x="1160" y="726" width="120" height="52" rx="6"/><rect x="1190" y="684" width="96" height="46" rx="6"/></g>' +
      '<g fill="none" stroke="#2c1824" stroke-width="3"><circle cx="230" cy="742" r="40"/><circle cx="230" cy="742" r="22"/><circle cx="1360" cy="752" r="34"/></g>';
    var flies = repeat(34, function () {
      return dot("firefly", "left:" + n(rr(2, 98)) + "%;top:" + n(rr(48, 96)) + "%;--t:" + n(rr(5, 10)) + "s;--d:-" + n(rr(0, 10)) + "s;--b:" + n(rr(1.6, 3.4)) + "s");
    });
    return div("sun") + svg("land", body) + flies;
  }

  function opera() {
    var tiers = "";
    [470, 620, 770].forEach(function (y, t) {
      var sag = 70 + t * 30, lamps = "", arches = "";
      for (var k = 1; k < 16; k++) {
        var u = k / 16, px = -100 + 1800 * u, py = y - 4 * sag * u * (1 - u);
        lamps += '<circle cx="' + n(px) + '" cy="' + n(py + 14) + '" r="3.2"/>';
        arches += '<path d="M' + n(px - 46) + " " + n(py - 2) + "Q" + n(px) + " " + n(py - 92) + " " + n(px + 46) + " " + n(py - 2) + '"/>';
      }
      var front = "M-100 " + y + "Q800 " + (y - 2 * sag) + " 1700 " + y;
      tiers += '<g fill="none" stroke="#c8963e" stroke-width="2.5" opacity="0.55">' + arches + "</g>" +
        '<path d="' + front + 'v34Q800 ' + (y - 2 * sag + 34) + " -100 " + (y + 34) + 'Z" fill="#3a0c12" stroke="#d6a648" stroke-width="3"/>' +
        '<g fill="#ffd27a">' + lamps + "</g>";
    });
    var drops = repeat(9, function (i) {
      var a = i * 40 - 160;
      return '<path d="M0 60 Q' + n(a * 0.6) + ' 80 ' + a + ' 70" fill="none" stroke="#e6b65a" stroke-width="3"/><circle class="flame" cx="' + a + '" cy="62" r="5"/>';
    });
    var chandelier = '<svg viewBox="-200 -120 400 260" aria-hidden="true"><path d="M0 -120 V40" stroke="#c8963e" stroke-width="3"/>' + drops +
      '<ellipse cx="0" cy="70" rx="150" ry="18" fill="none" stroke="#e6b65a" stroke-width="3"/><ellipse cx="0" cy="105" rx="70" ry="10" fill="none" stroke="#e6b65a" stroke-width="3"/>' +
      '<path d="M0 105 l-10 30 h20 Z" fill="#e6b65a"/></svg>';
    return div("glow") + svg("hall", tiers, "xMidYMid slice") + div("chandelier", chandelier) +
      div("curtain left") + div("curtain right") + div("valance");
  }

  function rockstage() {
    function stack(x, w) {
      var s = "";
      for (var k = 0; k < 3; k++) {
        var y = 880 - (k + 1) * w * 0.62;
        s += '<rect x="' + x + '" y="' + n(y) + '" width="' + w + '" height="' + n(w * 0.6) + '" rx="8" fill="#0b0606" stroke="#3a1a12" stroke-width="3"/>' +
          '<rect x="' + (x + 12) + '" y="' + n(y + 14) + '" width="' + (w - 24) + '" height="' + n(w * 0.6 - 28) + '" fill="url(#grille)"/>';
      }
      return s + '<g fill="#d8a24a">' + repeat(5, function (i) { return '<circle cx="' + (x + 20 + i * 16) + '" cy="' + n(880 - 3 * w * 0.62 + 7) + '" r="3"/>'; }) + "</g>";
    }
    var body = '<defs><pattern id="grille" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#140b09"/><circle cx="4" cy="4" r="2" fill="#050303"/></pattern></defs>' +
      stack(40, 210) + stack(1350, 210) + '<rect x="0" y="880" width="1600" height="20" fill="#2a120c"/>' +
      '<g fill="#ffb347">' + repeat(14, function (i) { return '<circle cx="' + (60 + i * 115) + '" cy="886" r="3"/>'; }) + "</g>";
    return div("bricks") + cones(5, ["#ff2a1a", "#ffab2e"], 14) + div("truss", repeat(6, function () { return "<b></b>"; })) +
      svg("amps", body) + smoke(5, "rgba(255,120,80,0.16)");
  }

  function forge() {
    var spikes = "M0 900 L0 830";
    for (var x = 0; x <= 1600; x += rr(30, 70)) spikes += "L" + n(x) + " " + n(rr(760, 830)) + "L" + n(x + rr(12, 30)) + " " + n(rr(820, 860));
    spikes += "L1600 900Z";
    var chains = repeat(5, function (i) {
      var x = 120 + i * 340 + rr(-40, 40), len = rr(180, 380);
      return '<path d="M' + n(x) + " 0V" + n(len) + '" stroke="#1f0c06" stroke-width="12" stroke-dasharray="18 7"/><circle cx="' + n(x) + '" cy="' + n(len + 12) + '" r="16" fill="none" stroke="#1f0c06" stroke-width="8"/>';
    });
    var anvil = '<path fill="#0a0403" d="M1180 742 h260 c-10 18 -40 30 -80 32 v40 h40 v26 h-200 v-26 h40 v-40 c-60 -4 -80 -20 -110 -32 Z"/>';
    return div("ember") + svg("iron", chains + '<path fill="#070302" d="' + spikes + '"/>' + anvil) + sparks(60, 0, 100, 55) + div("heat");
  }

  function jazzclub() {
    var tables = "", candles = "";
    [[12, 800, 70], [30, 840, 80], [52, 812, 66], [72, 846, 84], [90, 806, 70]].forEach(function (t) {
      var cx = t[0] * 16;
      tables += '<ellipse cx="' + cx + '" cy="' + t[1] + '" rx="' + t[2] + '" ry="14"/><rect x="' + (cx - 5) + '" y="' + t[1] + '" width="10" height="120"/>' +
        '<rect x="' + (cx - t[2] - 40) + '" y="' + (t[1] - 40) + '" width="26" height="80" rx="10"/><rect x="' + (cx + t[2] + 14) + '" y="' + (t[1] - 44) + '" width="26" height="84" rx="10"/>';
      candles += dot("candle", "left:" + t[0] + "%;top:" + n((t[1] - 16) / 9) + "%;--d:-" + n(rr(0, 2)) + "s");
    });
    var bass = '<path fill="#03050b" d="M1268 520 c-30 0 -44 40 -30 70 c-36 20 -40 86 -6 118 c30 26 92 26 120 -2 c34 -32 30 -98 -8 -116 c14 -30 0 -70 -32 -70 c-10 0 -16 6 -22 14 Z"/><rect x="1288" y="330" width="8" height="210" fill="#03050b"/>';
    return div("slats") + div("spot") + div("pool") + svg("room", bass + '<g fill="#03050b">' + tables + "</g>") + candles +
      smoke(6, "rgba(120,150,220,0.13)") + repeat(18, function () {
        return dot("mote", "left:" + n(rr(52, 72)) + "%;top:" + n(rr(10, 80)) + "%;--t:" + n(rr(8, 14)) + "s;--d:-" + n(rr(0, 14)) + "s");
      });
  }

  function skyline(fill, hMin, hMax, windowColors, density) {
    var s = "", w = "";
    for (var x = -20; x < 1620;) {
      var bw = rr(50, 120), bh = rr(hMin, hMax), top = 900 - bh;
      s += '<rect x="' + n(x) + '" y="' + n(top) + '" width="' + n(bw) + '" height="' + n(bh) + '"/>';
      if (r() < 0.2) s += '<rect x="' + n(x + bw / 2 - 2) + '" y="' + n(top - 50) + '" width="4" height="50"/>';
      for (var wy = top + 14; wy < 880; wy += 20) {
        for (var wx = x + 8; wx < x + bw - 12; wx += 14) {
          if (r() < density) w += '<rect x="' + n(wx) + '" y="' + n(wy) + '" width="6" height="9" fill="' + pick(windowColors) + '"/>';
        }
      }
      x += bw + rr(0, 10);
    }
    return '<g fill="' + fill + '">' + s + "</g><g opacity=\"0.8\">" + w + "</g>";
  }

  function rooftop() {
    var tower = '<g fill="#05030a"><path d="M300 640 h90 l-8 -70 h-74 Z"/><path d="M296 570 l49 -36 l49 36 Z"/><rect x="300" y="640" width="8" height="120"/><rect x="382" y="640" width="8" height="120"/></g>';
    return div("stars") + svg("city", skyline("#1d1236", 260, 520, ["#6d4fa8"], 0.05) + skyline("#0b0716", 120, 380, ["#ffcf7a", "#ffcf7a", "#7ad7ff"], 0.18) +
      tower + '<rect x="0" y="830" width="1600" height="70" fill="#040209"/><rect x="0" y="822" width="1600" height="10" fill="#120a1c"/>') +
      dot("beacon", "left:72%;top:31%") + div("sign", "<span>late</span><span>nite</span>");
  }

  function beachbar() {
    function palm(x, base, h, flip) {
      var lean = flip ? -1 : 1, tx = x + lean * h * 0.28, ty = base - h;
      var trunk = '<path d="M' + (x - 14) + " " + base + "Q" + n(x + lean * h * 0.05) + " " + n(base - h * 0.55) + " " + n(tx - 4) + " " + n(ty) + "h10Q" + n(x + lean * h * 0.12) + " " + n(base - h * 0.5) + " " + (x + 14) + " " + base + 'Z"/>';
      var fronds = repeat(7, function (i) {
        var a = -170 + i * 50 + rr(-10, 10), len = h * rr(0.42, 0.56);
        var ex = tx + Math.cos(a * Math.PI / 180) * len, ey = ty + Math.sin(a * Math.PI / 180) * len * 0.6 + len * 0.35;
        var mx = tx + Math.cos(a * Math.PI / 180) * len * 0.5, my = ty + Math.sin(a * Math.PI / 180) * len * 0.5 - 30;
        return '<path d="M' + n(tx) + " " + n(ty) + "Q" + n(mx) + " " + n(my - 14) + " " + n(ex) + " " + n(ey) + "Q" + n(mx) + " " + n(my + 22) + " " + n(tx) + " " + n(ty + 8) + 'Z"/>';
      });
      return '<g class="palm" style="transform-origin:' + x + "px " + base + 'px">' + trunk + fronds + "</g>";
    }
    var strand = "", bulbs = "";
    [[0, 70, 800, 150], [800, 150, 1600, 60]].forEach(function (s, k) {
      var mx = (s[0] + s[2]) / 2, my = Math.max(s[1], s[3]) + 110;
      strand += '<path d="M' + s[0] + " " + s[1] + "Q" + mx + " " + my + " " + s[2] + " " + s[3] + '"/>';
      for (var j = 1; j < 14; j++) {
        var u = j / 14, bx = (1 - u) * (1 - u) * s[0] + 2 * u * (1 - u) * mx + u * u * s[2], by = (1 - u) * (1 - u) * s[1] + 2 * u * (1 - u) * my + u * u * s[3];
        bulbs += dot("bulb", "left:" + n(bx / 16) + "%;top:calc(" + n(by / 9) + "% + 6px);--c:" + pick(["#ffd27a", "#ff8a5c", "#7affd4", "#ffd27a"]) + ";--d:-" + n(rr(0, 3)) + "s");
      }
    });
    var land = '<g fill="#140818">' + palm(110, 900, 620, false) + palm(250, 900, 430, false) + palm(1500, 900, 600, true) + palm(1360, 900, 380, true) +
      '<path d="M0 860 Q400 820 800 850 T1600 840 V900H0Z"/></g>' +
      '<g fill="none" stroke="#1a0b1d" stroke-width="2.5">' + strand + "</g>";
    return div("sun") + div("sea") + div("glints") + svg("shore", land, "xMidYMax slice") + bulbs;
  }

  function campfire() {
    var body = forest(26, 760, 220, 380, "#0d1b19") + forest(18, 830, 280, 460, "#050b09") +
      '<path fill="#030605" d="M0 830 Q800 800 1600 830 V900H0Z"/>' +
      '<g fill="#0a0503"><rect x="1045" y="822" width="150" height="22" rx="11" transform="rotate(-12 1120 833)"/><rect x="1045" y="822" width="150" height="22" rx="11" transform="rotate(14 1120 833)"/></g>';
    return div("stars") + div("fireglow") + svg("woods", body) +
      div("fire", "<b></b><b></b><b></b>") + sparks(34, 67, 73, 62);
  }

  function disco() {
    var spots = repeat(70, function () {
      var a = rr(0, Math.PI * 2), d = rr(12, 95);
      return dot("spot", "left:" + n(Math.cos(a) * d) + "vmax;top:" + n(Math.sin(a) * d) + "vmax;--c:" + pick(["#ff5fd2", "#5fd9ff", "#fff27a", "#ffffff", "#9b7bff"]) + ";--s:" + n(rr(2, 4.5)) + "vmax");
    });
    var tiles = repeat(84, function () {
      return dot("tile", "--c:" + pick(["#ff3fae", "#3fd2ff", "#ffe23f", "#8a5bff", "#3fff9a"]) + ";--d:-" + n(rr(0, 4)) + "s;--t:" + n(pick([2, 3, 4])) + "s");
    });
    return div("spots", spots) + div("floor", tiles) + div("ball");
  }

  function arena() {
    var sticks = repeat(90, function (i) {
      var x = rr(0, 100);
      return dot("stick", "left:" + n(x) + "%;top:" + n(rr(72, 90)) + "%;--d:-" + n(x / 40) + "s;--c:" + pick(["#7af0ff", "#ff7ad9", "#7af0ff", "#fff07a"]));
    });
    var confetti = repeat(55, function () {
      var top = rr(-10, 90);
      return dot("confetti", "left:" + n(rr(0, 100)) + "%;top:" + n(top) + "%;--from:" + n(-top - 12) + "vh;--to:" + n(105 - top) + "vh;--t:" + n(rr(5, 9)) + "s;--d:-" + n(rr(0, 9)) + "s;--c:" + pick(["#ff4f9a", "#ffd23f", "#4fe3ff", "#ffffff", "#9b6bff"]) + ";--r:" + n(rr(-1, 1) * 720) + "deg");
    });
    return cones(4, ["#5a7bff", "#ff5fc8"], 18) + sticks + svg("crowd", crowd(800, "#05040e", false)) + confetti;
  }

  function cinema() {
    var seats = "";
    for (var row = 0; row < 3; row++) {
      for (var x = -30 + row * 40; x < 1640; x += 110) {
        var y = 770 + row * 50;
        seats += '<path d="M' + x + " " + (y + 200) + "V" + (y + 16) + "q0 -26 26 -26h52q26 0 26 26V" + (y + 200) + 'Z"/>';
      }
    }
    var motes = repeat(26, function () {
      return dot("mote", "left:" + n(rr(14, 96)) + "%;top:" + n(rr(14, 66)) + "%;--t:" + n(rr(9, 16)) + "s;--d:-" + n(rr(0, 16)) + "s");
    });
    return div("screenglow") + div("beam") + div("projector") + motes +
      svg("seats", '<g fill="#0b0607" stroke="#2a0d10" stroke-width="3">' + seats + "</g>") + div("grain");
  }

  function cabin() {
    var body =
      '<defs><radialGradient id="warm"><stop offset="0" stop-color="#ffb24a" stop-opacity="0.75"/><stop offset="1" stop-color="#ffb24a" stop-opacity="0"/></radialGradient></defs>' +
      '<path fill="#2e3b62" d="M0 700 C300 640 600 660 900 690 S1400 640 1600 670 V900H0Z"/>' +
      forest(22, 720, 120, 220, "#101a33") +
      '<path fill="#46557e" d="M0 790 C400 750 800 770 1100 780 S1450 760 1600 770 V900H0Z"/>' +
      '<circle class="windowglow" cx="1270" cy="735" r="190" fill="url(#warm)"/>' +
      '<g fill="#150d0c"><rect x="1150" y="680" width="240" height="120"/><path d="M1130 690 L1270 590 L1410 690 Z"/><rect x="1340" y="600" width="28" height="60"/></g>' +
      '<path fill="#eef3fb" d="M1124 694 L1270 584 L1416 694 l-12 4 L1270 600 L1136 698 Z"/>' +
      '<g fill="#ffc36b"><rect x="1185" y="712" width="44" height="40"/><rect x="1310" y="712" width="44" height="40"/></g>' +
      '<g stroke="#150d0c" stroke-width="4"><path d="M1207 712v40M1185 732h44M1332 712v40M1310 732h44"/></g>' +
      '<rect x="1250" y="730" width="36" height="70" fill="#2a1a14"/>' +
      '<path fill="#56668f" d="M0 830 C500 800 1000 830 1600 812 V900H0Z"/>' +
      '<path fill="#0b1226" d="' + pine(90, 860, 300, 150) + pine(1520, 870, 260, 130) + '"/>';
    return div("stars") + div("moon") + svg("snowland", body) + div("snow far") + div("snow near");
  }

  var SCENES = { club: club, ranch: ranch, opera: opera, rockstage: rockstage, forge: forge, jazzclub: jazzclub, rooftop: rooftop, beachbar: beachbar, campfire: campfire, disco: disco, arena: arena, cinema: cinema, cabin: cabin };

  return function mountScenery() {
    if (document.getElementById("scenery")) return;
    var root = document.createElement("div");
    root.id = "scenery";
    root.setAttribute("aria-hidden", "true");
    var html = "";
    Object.keys(SCENES).forEach(function (id) { html += '<div class="sc s-' + id + '">' + SCENES[id]() + "</div>"; });
    root.innerHTML = html + '<div class="veil"></div>';
    document.body.insertBefore(root, document.body.firstChild);
  };
})();
