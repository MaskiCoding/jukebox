(function () {
  'use strict';

  var F = '"Playfair Display",Georgia,serif';
  var PAL = [
    ['Rose noir', '#000000', '#FF1400', '#3257FF', '#FFB4A8', '#FFFFFF'],
    ['Paper', '#F3EEE4', '#FF3B1F', '#1C2B8F', '#FFD2C4', '#111111'],
    ['Midnight', '#0D1B4C', '#FF5A4E', '#9FB4FF', '#FFD6CF', '#FFFFFF'],
    ['Citrus', '#0E1A12', '#FF8A00', '#1FA463', '#FFE2B8', '#FFF6E8'],
    ['Orchid', '#140A1F', '#E63CFF', '#2FB8A6', '#F9D1FF', '#FFFFFF'],
    ['Moss', '#133A2A', '#FFB7C5', '#7FD18B', '#FFFFFF', '#F6F1E7'],
    ['Tomato', '#FF1400', '#FFF1E0', '#0B0B0B', '#FF1400', '#000000'],
    ['Butter', '#FFE9A8', '#E4002B', '#0F5132', '#FFC2C2', '#1A1A1A'],
    ['Blush', '#FAD4D8', '#C8102E', '#274690', '#FFE3E6', '#1A1A1A'],
    ['Mono', '#000000', '#F2F2F2', '#6E6E6E', '#000000', '#FFFFFF']
  ];
  var DENSITY = 1, RECOIL = 20, WITHER = 260, BLOOM_LIFE = 7000, MAX_BLOOMS = 40;

  function h(n) { var x = Math.sin(n) * 43758.5453; return x - Math.floor(x); }
  function spr(t, k, w) { if (t <= 0) return 0; return 1 - Math.exp(-t * k) * Math.cos(t * w); }
  function eo(t) { if (t <= 0) return 0; if (t >= 1) return 1; return 1 - Math.pow(1 - t, 3); }
  function rng(seed) {
    var s = seed | 0;
    return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function bez(a, b, c, d, n) {
    var P = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      P.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]);
    }
    return P;
  }
  function at(P, u) {
    var n = P.length, i = Math.min(n - 2, Math.max(1, Math.round(u * (n - 1))));
    return [P[i], Math.atan2(P[i + 1][1] - P[i - 1][1], P[i + 1][0] - P[i - 1][0])];
  }
  function jit(id, f, amp) {
    if (!amp) return [0, 0, 0];
    return [(h(id * 1.37 + f * 7.13) * 2 - 1) * amp, (h(id * 2.71 + f * 3.11) * 2 - 1) * amp, (h(id * 5.3 + f * 1.7) * 2 - 1) * 0.035];
  }
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  function path(c, p, closed) {
    var n = p.length, i, q; if (n < 2) return;
    if (closed) {
      var s = mid(p[n - 1], p[0]); c.moveTo(s[0], s[1]);
      for (i = 0; i < n; i++) { q = mid(p[i], p[(i + 1) % n]); c.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]); }
      c.closePath();
    } else {
      c.moveTo(p[0][0], p[0][1]);
      for (i = 1; i < n - 1; i++) { q = mid(p[i], p[i + 1]); c.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]); }
      c.lineTo(p[n - 1][0], p[n - 1][1]);
    }
  }
  function vine(base, dir, len, amp, waves, ph, bend, n) {
    n = n || 40; var P = [[base[0], base[1]]], step = len / n, x = base[0], y = base[1];
    for (var i = 1; i <= n; i++) {
      var u = i / n, a = dir + bend * u + amp * Math.sin(u * Math.PI * waves + ph) * Math.min(1, u * 3);
      x += Math.cos(a) * step; y += Math.sin(a) * step; P.push([x, y]);
    }
    return P;
  }
  function curl(P, sign, rad) {
    var n = P.length, e = P[n - 1], a = Math.atan2(e[1] - P[n - 2][1], e[0] - P[n - 2][0]);
    var c = [e[0] - Math.sin(a) * sign * rad, e[1] + Math.cos(a) * sign * rad];
    var a0 = Math.atan2(e[1] - c[1], e[0] - c[0]);
    for (var i = 1; i <= 14; i++) { var u = i / 14, t = a0 + sign * u * Math.PI * 1.6, rr = rad * (1 - 0.5 * u); P.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]); }
    return P;
  }
  function weave(r, startLayer) {
    var cuts = [], nc = 1 + Math.floor(r() * 3), i;
    for (i = 0; i < nc; i++) cuts.push(0.15 + r() * 0.7);
    cuts.sort(function (a, b) { return a - b; });
    var segs = [], u0 = 0, layer = startLayer;
    for (i = 0; i < cuts.length; i++) {
      var c = cuts[i];
      if (c <= u0) continue;
      segs.push({ u0: u0, u1: c, layer: layer });
      if (r() < 0.3) { var g = 0.02 + r() * 0.03; u0 = Math.min(0.98, c + g); } else u0 = c;
      layer = 1 - layer;
    }
    segs.push({ u0: u0, u1: 1, layer: layer });
    return segs;
  }
  function layerAt(segs, u) { for (var i = 0; i < segs.length; i++) if (u >= segs[i].u0 && u <= segs[i].u1) return segs[i].layer; return segs[segs.length - 1].layer; }
  function wordParams(ws) {
    var r = rng(ws * 7 + 13), dens = DENSITY;
    return { roseP: 0.3 + r() * 0.3, leafy: (0.6 + r() * 0.8) * dens, dens: dens, lean: (r() - 0.5) * 0.6, big: 0.85 + r() * 0.45, curvy: 0.8 + r() * 0.6, bridgeP: Math.min(0.95, (0.45 + r() * 0.35) * dens), w: 0.5 };
  }
  function grow(r, E, nid, p, o) {
    var tip = o.tip || (r() < p.roseP ? 'rose' : r() < 0.45 ? 'fan' : r() < 0.6 ? 'leaf' : 'curl');
    var P = o.pts || vine(o.base, o.dir, o.len, (0.35 + r() * 0.45) * p.curvy, 1 + r() * 1.6, r() * 6.28, (r() - 0.5) * 1.2, 40);
    if (tip === 'curl') P = curl(P, r() < 0.5 ? -1 : 1, 0.05 + r() * 0.05);
    var segs = weave(r, o.layer0 != null ? o.layer0 : (r() < 0.5 ? 0 : 1));
    var dur = Math.max(320, (o.len || 0.8) * 620);
    var thorns = [], nt = Math.floor(r() * 2.5), i, q, a, u;
    for (i = 0; i < nt; i++) thorns.push({ u: 0.15 + r() * 0.65, s: r() < 0.5 ? -1 : 1 });
    E.push({ t: 'stem', id: nid(), pts: P, segs: segs, d0: o.d0, dur: dur, w: o.depth ? 0.82 : 1, thorns: thorns });
    var nl = Math.floor(r() * 2.8 * p.leafy), sd = r() < 0.5 ? -1 : 1;
    for (i = 0; i < nl; i++) {
      u = 0.25 + r() * 0.6; q = at(P, u); a = q[1]; q = q[0]; sd = -sd;
      E.push({ t: 'leaf', id: nid(), x: q[0], y: q[1], a: a + sd * (0.55 + r() * 0.5), L: (0.14 + r() * 0.2) * (o.depth ? 0.8 : 1), bend: (r() - 0.5) * 1.2, layer: layerAt(segs, u), d0: o.d0 + dur * u });
    }
    var tA = at(P, 1), tp = tA[0], ta = tA[1], td = o.d0 + dur * 0.8, tl = layerAt(segs, 1);
    if (tip === 'rose') {
      var R = (0.13 + r() * 0.15) * p.big * (o.depth ? 0.75 : 1);
      var over = tp[1] > -0.78 && tp[1] < 0.05 && Math.abs(tp[0]) < p.w * 0.5;
      var layer = over ? (r() < 0.22 ? 1 : 0) : (r() < 0.6 ? 1 : tl);
      E.push({ t: 'rose', id: nid(), x: tp[0], y: tp[1], R: R, rot: (r() - 0.5) * 1.0, ph1: r() * 6.28, ph2: r() * 6.28, turns: 1.8 + r() * 1, layer: layer, d0: td });
      if (r() < 0.2) { var oo = ta + (r() < 0.5 ? 1 : -1) * 1.3; E.push({ t: 'rose', id: nid(), x: tp[0] + Math.cos(oo) * R * 1.4, y: tp[1] + Math.sin(oo) * R * 1.4, R: R * (0.6 + r() * 0.3), rot: (r() - 0.5) * 1.2, ph1: r() * 6.28, ph2: r() * 6.28, turns: 1.8 + r(), layer: layer, d0: td + 120 }); }
    } else if (tip === 'fan') {
      var spread = 0.6 + r() * 0.3;
      for (var j = 0; j < 2; j++) E.push({ t: 'leaf', id: nid(), x: tp[0], y: tp[1], a: ta + (j - 0.5) * spread, L: 0.2 + r() * 0.2, bend: (j - 0.5) * 0.8, layer: tl, d0: td + j * 60 });
    } else if (tip === 'leaf') {
      E.push({ t: 'leaf', id: nid(), x: tp[0], y: tp[1], a: ta + (r() - 0.5) * 0.3, L: 0.16 + r() * 0.16, bend: (r() - 0.5), layer: tl, d0: td });
    }
    if (!o.depth && r() < 0.3) {
      u = 0.35 + r() * 0.35; q = at(P, u); a = q[1]; q = q[0];
      grow(r, E, nid, p, { base: q, dir: a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.4), len: (o.len || 0.8) * (0.35 + r() * 0.2), d0: o.d0 + dur * u, depth: 1, layer0: layerAt(segs, u) });
    }
    return P;
  }

  function create(canvas, options) {
    options = options || {};
    var g = canvas.getContext('2d');
    var transparent = !!options.transparent;
    var palette = PAL[options.palette] ? options.palette | 0 : 0;
    var rm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var letters = [], uid = 1, cache = {}, Sd = 0, St = 0, wrapped = false;
    var t0 = performance.now(), lastKey = 0, lt = 0, raf = 0, dead = false;
    var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, caretX = 0, cty = 0;
    var mx = null, my = 0, fa = {}, cc = null, nowT = 0, blooms = [], bid = 0;

    function mw(ch) {
      if (cache[ch] != null) return cache[ch];
      g.font = '700 100px ' + F;
      var w = g.measureText(ch).width / 100;
      if (ch === ' ') w *= 1.4;
      return (cache[ch] = w);
    }

    function layoutCore(A, W, H, prevWrapped) {
      var maxW = W * 0.8, S0 = H * 0.28, LH = 2.1;
      var ws = A.map(function (l) { return mw(l.ch); });
      var words = [], cur = null;
      A.forEach(function (l, i) {
        if (l.ch === ' ') { if (cur) { words.push(cur); cur = null; } words.push({ sp: true, idx: [i] }); }
        else { if (!cur) cur = { idx: [] }; cur.idx.push(i); }
      });
      if (cur) words.push(cur);
      var lineW = function (li, S) { var e = li.length; while (e > 0 && A[li[e - 1]].ch === ' ') e--; var w = 0; for (var k = 0; k < e; k++) w += ws[li[k]]; return w * S; };
      var wrap = function (S) {
        var lines = [[]], lw = 0;
        words.forEach(function (w) {
          var ww = w.idx.reduce(function (s, i) { return s + ws[i]; }, 0) * S;
          if (!w.sp && lw > 0 && lw + ww > maxW) { lines.push([]); lw = 0; }
          Array.prototype.push.apply(lines[lines.length - 1], w.idx); lw += ww;
        });
        return lines;
      };
      var lines = [A.map(function (_, i) { return i; })];
      var unit = lineW(lines[0], 1);
      var S = unit > 0 ? Math.min(S0, maxW / unit) : S0;
      var multi = words.filter(function (w) { return !w.sp; }).length > 1;
      var wr = multi && (S < H * 0.1 || (prevWrapped && S < H * 0.14));
      if (wr) {
        var lo = H * 0.03, hi = H * 0.15;
        for (var k = 0; k < 22; k++) {
          var m = (lo + hi) / 2, ls = wrap(m);
          var ok = ls.every(function (li) { return lineW(li, m) <= maxW; }) && ls.length * LH * m <= H * 0.82;
          if (ok) lo = m; else hi = m;
        }
        S = lo; lines = wrap(S);
        if (lines.length < 2) wr = false;
      }
      var n = lines.length, lh = LH * S;
      lines.forEach(function (li, k) {
        var x = W / 2 - lineW(li, S) / 2;
        var y = H / 2 + (k - (n - 1) / 2) * lh + 0.33 * S;
        li.forEach(function (i) { var l = A[i], w = ws[i] * S; l.tx = x + w / 2; l.ty = y; l.tw = w; l.line = k; x += w; });
      });
      return { S: S, wrapped: wr, n: n };
    }

    function live() { return letters.filter(function (l) { return !l.dead; }); }

    function layout(snap) {
      if (!W) return;
      var A = live();
      var res = layoutCore(A, W, H, wrapped);
      wrapped = res.wrapped;
      A.forEach(function (l) { if (l.x == null) { l.x = l.tx; l.y = l.ty; } });
      var S = res.S, last = A[A.length - 1];
      St = S;
      caretX = last ? last.tx + last.tw / 2 + 0.07 * S : W / 2;
      cty = last ? last.ty - 0.33 * S : H / 2;
      if (snap || !Sd) { Sd = S; cx = caretX; cy = cty; A.forEach(function (l) { l.x = l.tx; l.y = l.ty; }); }
    }

    function resize() {
      var r = canvas.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      if (!r.width) return;
      W = r.width; H = r.height; dpr = d;
      canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
      layout(true);
    }

    function gen(l) {
      var r = rng((l.ws ^ Math.imul(l.wi + 1, 2654435761)) + Math.floor(Math.random() * 1e6));
      var p = wordParams(l.ws), E = [], k0 = 0, nid = function () { return l.id * 100 + (k0++); };
      var w = mw(l.ch), inX = function () { return (r() - 0.5) * w * 0.7; }; p.w = w;
      var nUp = 1 + (r() < 0.45 * p.dens ? 1 : 0);
      for (var i = 0; i < nUp; i++) {
        grow(r, E, nid, p, { base: [inX(), -r() * 0.3], dir: -Math.PI / 2 + p.lean * 0.5 + (r() - 0.5) * 0.7, len: 0.6 + r() * 0.5, d0: 40 + i * 130, tip: l.wi === 0 && i === 0 ? 'rose' : null });
      }
      if (r() < 0.4 * p.dens) grow(r, E, nid, p, { base: [inX(), -0.1 - r() * 0.35], dir: Math.PI / 2 + (r() - 0.5) * 0.8, len: 0.35 + r() * 0.35, d0: 160 });
      if (l.prev && r() < p.bridgeP) {
        var px = -(mw(l.prev.ch) + w) / 2;
        var a = [inX(), -0.05 - r() * 0.55], b = [px + (r() - 0.5) * 0.25, -0.05 - r() * 0.55];
        var bulge = (r() < 0.55 ? -1 : 1) * (0.4 + r() * 0.4), dx = b[0] - a[0];
        var P = bez(a, [a[0] + dx * 0.15, a[1] + bulge], [b[0] - dx * 0.15, b[1] + bulge * 0.9], b, 40);
        if (r() < 0.45) P = P.slice(0, Math.floor(P.length * (0.7 + r() * 0.2)));
        grow(r, E, nid, p, { pts: P, len: Math.abs(dx) + Math.abs(bulge), d0: 90, tip: r() < 0.5 ? 'curl' : r() < 0.5 ? 'leaf' : 'rose' });
      }
      if (l.wi === 0) grow(r, E, nid, p, { base: [-w * 0.3, -0.15 - r() * 0.4], dir: Math.PI + (r() - 0.5) * 1.2, len: 0.45 + r() * 0.3, d0: 120, tip: 'curl' });
      l.els = E;
      l.endEls = null;
      var T = [], tr = rng(l.id * 977 + Math.floor(Math.random() * 1e6));
      grow(tr, T, function () { return l.id * 100 + 90 + T.length; }, p, { base: [w * 0.25, -0.1 - tr() * 0.45], dir: (tr() - 0.5) * 1.4, len: 0.45 + tr() * 0.25, d0: 0, tip: 'curl', depth: 1 });
      l.tend = T.filter(function (e) { return e.t === 'stem'; }).slice(0, 1);
    }

    function genEnd(l, rel) {
      var r = rng(l.ws + l.wi * 31 + Math.floor(Math.random() * 1e6)), p = wordParams(l.ws), E = [];
      var k0 = 50, nid = function () { return l.id * 100 + (k0++); };
      var w = mw(l.ch), n = 1 + Math.floor(r() * 2.5); p.w = w;
      for (var i = 0; i < n; i++) {
        var dir = -Math.PI / 2 + 0.6 + (i - (n - 1) / 2) * 0.9 + (r() - 0.5) * 0.4;
        grow(r, E, nid, p, { base: [(r() - 0.2) * w * 0.6, -r() * 0.5], dir: dir, len: 0.4 + r() * 0.45, d0: rel + 40 + i * 90, depth: 1, tip: i === 0 || r() < 0.5 ? 'rose' : 'fan' });
      }
      l.endEls = E;
    }

    function add(ch, now) {
      var A = live(), last = A[A.length - 1];
      if (ch === ' ') {
        if (last && last.ch !== ' ') { last.cut = now; genEnd(last, now - last.birth); }
        letters.push({ ch: ' ', id: uid++, birth: now, els: [] });
        layout(); return;
      }
      var same = last && last.ch !== ' ';
      var l = { ch: ch, id: uid++, birth: now, tb: now, ws: same ? last.ws : Math.floor(Math.random() * 1e9), wi: same ? last.wi + 1 : 0, prev: same ? last : null };
      gen(l);
      letters.push(l);
      layout();
    }

    var B = {
      fill: function (p, col) { g.beginPath(); path(g, p, true); g.fillStyle = col; g.fill(); },
      stroke: function (p, col, w) { g.beginPath(); path(g, p, false); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); },
      rect: function (x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); },
      text: function (ch, x, y, S, col) { g.font = '700 ' + S + 'px ' + F; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = col; g.fillText(ch, x, y); }
    };

    function strokeRange(P, a, b, col, w) {
      var n = P.length - 1, ia = a * n, ib = b * n;
      var lerp = function (t) { var i = Math.min(n - 1, Math.floor(t)), f = t - i; return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f]; };
      var pts = [lerp(ia)];
      for (var i = Math.floor(ia) + 1; i < ib; i++) pts.push(P[i]);
      pts.push(lerp(ib));
      if (pts.length >= 2) B.stroke(pts, col, w);
    }
    function thorn(P, u, s, S) {
      var q = at(P, u), p = q[0], d = q[1] + s * 2.3, L = S * 0.045;
      B.stroke([p, [p[0] + Math.cos(d) * L, p[1] + Math.sin(d) * L]], cc.blue, S * 0.022);
    }
    function leaf(bx, by, a, L, bend) {
      if (L < 0.5) return;
      var ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
      var ax = function (u) { var b = Math.sin(Math.PI * u) * bend * 0.15 * L; return [bx + ca * u * L + px * b, by + sa * u * L + py * b]; };
      var hw = function (u) { return L * 0.18 * Math.sin(Math.PI * Math.pow(u, 0.8)); };
      var N = 12, s1 = [], s2 = [], i;
      for (i = 0; i <= N; i++) { var u = i / N, c = ax(u), w = hw(u); s1.push([c[0] + px * w, c[1] + py * w]); s2.push([c[0] - px * w, c[1] - py * w]); }
      var tip = ax(1), base = ax(0);
      B.fill([base].concat(s1.slice(1, N), [tip, tip], s2.slice(1, N).reverse(), [base]), cc.blue);
      if (L > 6) { var v = []; for (i = 0; i <= 8; i++) v.push(ax(0.08 + 0.72 * i / 8)); B.stroke(v, cc.vein, Math.max(0.8, L * 0.03)); }
    }
    var PETALS = [
      [0, -0.36, 0.56, 0.54, 0, 0, 0],
      [-0.5, -0.06, 0.6, 0.6, -0.35, 0, 0],
      [0.52, -0.06, 0.6, 0.6, 0.35, 0, 0],
      [-0.42, 0.3, 0.62, 0.48, 0.2, 0.12, 1],
      [0.47, 0.3, 0.62, 0.48, -0.2, 0.12, 1],
      [0.05, 0.42, 0.56, 0.38, 0, 0.14, 0]
    ];
    function rose(rcx, rcy, R, rot, e, a, tl) {
      var cr = Math.cos(rot), sr = Math.sin(rot);
      var tm = tl ? Math.hypot(tl[0], tl[1]) : 0, ux = tm ? tl[0] / tm : 0, uy = tm ? tl[1] / tm : 0, sq = -0.28 * tm;
      var T = function (x, y, z) {
        z = z || 0;
        var dx = x * cr - y * sr, dy = x * sr + y * cr;
        if (tm) { var k = (dx * ux + dy * uy) * sq; dx += k * ux + tl[0] * R * z; dy += k * uy + tl[1] * R * z; }
        return [rcx + dx, rcy + dy];
      };
      var ax0 = 0, ay0 = 0.5, lw = Math.max(0.8, R * 0.045), st = 85, i, k, u;
      PETALS.forEach(function (q, i) {
        var s = spr((a - i * st) / 1000, 8, 14); if (s <= 0.001) return;
        var open = (1 - Math.min(1, s)) * (q[0] < 0 ? 0.5 : -0.5), ang = q[4] + open, ca = Math.cos(ang), sa = Math.sin(ang);
        var pt = function (th) {
          var rr = 1 + 0.08 * Math.sin(3 * th + e.ph1 + i) + 0.04 * Math.sin(5 * th + e.ph2);
          var lx = Math.cos(th) * q[2] * rr, ly = Math.sin(th) * q[3] * rr;
          var px = q[0] + lx * ca - ly * sa, py = q[1] + lx * sa + ly * ca;
          return T((ax0 + (px - ax0) * s) * R, (ay0 + (py - ay0) * s) * R, q[5]);
        };
        var pts = []; for (var k = 0; k < 26; k++) pts.push(pt(k / 26 * Math.PI * 2));
        B.fill(pts, cc.red);
        if (q[6] && R >= 12 && s > 0.4) {
          var arc = []; for (k = 0; k <= 14; k++) arc.push(pt(Math.PI * (1.18 + 0.64 * k / 14)));
          strokeRange(arc, 0, Math.min(1, (s - 0.4) / 0.5), cc.line, lw * 0.8);
        }
      });
      var fr = eo((a - PETALS.length * st - 80) / 520);
      if (fr > 0 && R > 3) {
        var sp = [], scl = [];
        var turns = R < 20 ? Math.min(e.turns, 1.3) : R < 32 ? e.turns * 0.8 : e.turns;
        for (i = 0; i <= 70; i++) { u = i / 70; var th = e.ph1 + u * turns * Math.PI * 2, rr = R * (0.08 + 0.57 * u); sp.push(T(Math.cos(th) * rr * 1.05, Math.sin(th) * rr * 0.72 - 0.12 * R, 0.34 - 0.24 * u)); }
        strokeRange(sp, 0, fr, cc.line, lw);
        if (R >= 14) {
          for (k = 0; k <= 36; k++) { u = k / 36; scl.push(T((-0.72 + 1.5 * u) * R, 0.36 * R + 0.16 * R * Math.abs(Math.sin(u * Math.PI * 3)), 0.18)); }
          strokeRange(scl, 0, fr, cc.line, lw);
        }
      }
    }

    function faceTurn(e, x, y) {
      var wx = 0, wy = 0;
      if (mx != null) {
        var dx = mx - x, dy = my - y, d = Math.hypot(dx, dy), reach = 300;
        if (d < reach && d > 0.001) {
          var w = 1 - d / reach, s = w * w * (3 - 2 * w) * Math.min(1, d / 40);
          wx = dx / d * s; wy = dy / d * s;
        }
      }
      var c = fa[e.id] || [0, 0, 0];
      c[0] += (wx - c[0]) * 0.09; c[1] += (wy - c[1]) * 0.09; c[2] = nowT;
      fa[e.id] = c;
      return c;
    }

    function wpt(S, l, x, y) {
      var t = (nowT - l.birth) / 1000;
      if (t > 0 && t < 2.5) {
        var hh = Math.max(0, (l.y - y) / S), dmp = Math.exp(-t * 3.2), dir = (l.id % 2 ? 1 : -1);
        x += S * 0.07 * hh * dmp * Math.sin(t * 11) * dir;
        y += S * 0.035 * hh * dmp * Math.sin(t * 11 + 1.2);
      }
      if (l.lean) {
        var h2 = Math.min(2.5, Math.max(0, (l.y - y) / S)), f = h2 * h2 * 0.5 + h2 * 0.5;
        x += l.lean[0] * S * 0.1 * f;
        y += l.lean[1] * S * 0.05 * f;
      }
      return [x, y];
    }
    function drawStem(e, l, age, kk, S, f, amp, layer, frO) {
      var fr = frO != null ? frO : eo((age - e.d0) / e.dur) * kk; if (fr <= 0) return;
      var j = jit(e.id, f, amp);
      var P = e.pts.map(function (p) { return wpt(S, l, l.x + p[0] * S + j[0], l.y + p[1] * S + j[1]); });
      e.segs.forEach(function (sg) {
        if (sg.layer !== layer) return;
        var b = Math.min(sg.u1, fr); if (b <= sg.u0) return;
        strokeRange(P, sg.u0, b, cc.blue, S * 0.022 * (e.w || 1));
      });
      e.thorns.forEach(function (th) { if (fr > th.u && layerAt(e.segs, th.u) === layer) thorn(P, th.u, th.s, S); });
    }
    function drawEl(e, l, age, kk, S, f, amp) {
      var j = jit(e.id, f, amp), wx = function (x, y) { return wpt(S, l, l.x + x * S + j[0], l.y + y * S + j[1]); }, p;
      if (e.t === 'leaf') {
        var sc = spr((age - e.d0) / 1000, 7, 15) * kk; if (sc <= 0) return;
        p = wx(e.x, e.y); leaf(p[0], p[1], e.a + j[2], e.L * S * sc, e.bend);
      } else if (e.t === 'rose') {
        var a = age - e.d0; if (a < 0) return;
        if (kk <= 0.001) return;
        p = wx(e.x, e.y);
        var tl = faceTurn(e, p[0], p[1]);
        rose(p[0], p[1], e.R * S * kk, e.rot + j[2] + tl[0] * 0.22, e, a, tl);
      }
    }

    function render(now, S, boil) {
      var L = letters, act = live();
      nowT = now;
      L.forEach(function (l) {
        var tx = 0, ty = 0;
        if (!l.dead && l.ch !== ' ' && mx != null) {
          var dx = mx - l.x, dy = my - (l.y - S * 0.6), d = Math.hypot(dx, dy), reach = Math.max(260, S * 3.2);
          if (d < reach && d > 1) { var w = 1 - d / reach, s = w * w * (3 - 2 * w); tx = dx / d * s; ty = dy / d * s; }
        }
        var c = l.lean || (l.lean = [0, 0]);
        c[0] += (tx - c[0]) * 0.07; c[1] += (ty - c[1]) * 0.07;
      });
      var f = boil ? Math.floor(now / 120) : 0, amp = boil ? Math.max(0.8, S * 0.01) : 0;
      var kd = function (l) { return l.dead ? 1 - eo((now - l.dead) / WITHER) : 1; };
      var draw = function (layer) {
        L.forEach(function (l) {
          if (l.ch === ' ' || !l.els) return;
          var age = now - l.birth, kk = kd(l);
          var each = function (e) { if (e.t === 'stem') drawStem(e, l, age, kk, S, f, amp, layer); else if (e.layer === layer) drawEl(e, l, age, kk, S, f, amp); };
          l.els.forEach(each);
          if (l.endEls) l.endEls.forEach(each);
          var i = act.indexOf(l), nx = i >= 0 ? act[i + 1] : null;
          if (l.tend && (l.dead || !nx || nx.ch === ' ')) {
            var fr = eo((now - l.tb - 150) / 450);
            if (l.cut != null) fr *= 1 - eo((now - l.cut) / 150) * Math.min(0.85, RECOIL / (0.6 * S));
            l.tend.forEach(function (e) { drawStem(e, l, age, kk, S, f, amp, layer, fr * kk); });
          }
        });
      };
      draw(0);
      L.forEach(function (l) { if (l.ch !== ' ' && !l.dead) B.text(l.ch, l.x, l.y, S, cc.text); });
      draw(1);
      blooms = blooms.filter(function (b) { return now - b.birth < BLOOM_LIFE; });
      blooms.forEach(function (b) {
        var age = now - b.birth, kk = 1 - eo((age - BLOOM_LIFE + WITHER * 2) / (WITHER * 2));
        var tl = faceTurn(b.e, b.x, b.y);
        rose(b.x, b.y, b.R * kk, b.e.rot + tl[0] * 0.22, b.e, age, tl);
      });
      for (var id in fa) if (fa[id][2] !== now) delete fa[id];
    }

    function paint(now) {
      var p = PAL[palette];
      cc = { red: p[2], blue: p[3], line: p[4], text: p[5], vein: p[1] };
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (transparent) g.clearRect(0, 0, W, H);
      else { g.fillStyle = p[1]; g.fillRect(0, 0, W, H); }
      render(now, Sd, !(rm && rm.matches));
      var S = Sd, on = now - lastKey < 500 || Math.floor(now / 530) % 2 === 0, hf = eo((now - t0) / 600);
      if (on && hf > 0) { var ch = 0.8 * S * hf, cw = Math.max(2, S * 0.03); B.rect(cx - cw / 2, cy - ch / 2, cw, ch, cc.text); }
    }

    function frame() {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      var now = performance.now(), dt = Math.min(64, now - (lt || now)); lt = now;
      if (!W) return;
      var k = 1 - Math.exp(-dt / 80);
      Sd += (St - Sd) * k;
      cx += (caretX - cx) * k; cy += (cty - cy) * k;
      letters.forEach(function (l) { if (!l.dead && l.tx != null) { l.x += (l.tx - l.x) * k; l.y += (l.ty - l.y) * k; } });
      letters = letters.filter(function (l) { return !(l.dead && now - l.dead > 300); });
      paint(now);
    }

    function onMove(e) { var r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }
    function onLeave() { mx = null; }
    function onOut(e) { if (!e.relatedTarget) mx = null; }
    function onUp(e) { if (e.pointerType && e.pointerType !== 'mouse') mx = null; }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('mouseout', onOut);

    resize();
    if (document.fonts) document.fonts.load('700 100px "Playfair Display"').then(function () { if (dead) return; cache = {}; layout(); }).catch(function () {});
    frame();

    return {
      type: function (ch) {
        ch = String(ch);
        if (Array.from(ch).length !== 1) return;
        lastKey = performance.now();
        if (ch === '\n') { letters = []; layout(); return; }
        add(ch, lastKey);
      },
      backspace: function () {
        var now = performance.now(); lastKey = now;
        var A = live(), last = A[A.length - 1];
        if (!last) return;
        last.dead = now;
        var pv = A[A.length - 2];
        if (pv && pv.ch !== ' ') { pv.cut = null; pv.endEls = null; pv.tb = now; }
        layout();
      },
      clear: function () { lastKey = performance.now(); letters = []; layout(); },
      setPalette: function (i) { if (PAL[i]) palette = i | 0; },
      rose: function (x, y) {
        var r = Math.random;
        blooms.push({ x: x, y: y, birth: performance.now(), R: Math.min(W, H) * (0.07 + r() * 0.05), e: { id: -(++bid), rot: (r() - 0.5) * 1.0, ph1: r() * 6.28, ph2: r() * 6.28, turns: 1.8 + r() } });
        if (blooms.length > MAX_BLOOMS) blooms.shift();
      },
      resize: resize,
      destroy: function () {
        dead = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        document.removeEventListener('pointerleave', onLeave);
        document.removeEventListener('mouseout', onOut);
      }
    };
  }

  window.Garden = { create: create };
})();
