(function () {
  'use strict';

  var root = document.body;
  root.classList.add('ts-js');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var FRAME_MS = 1000 / 30;

  /* ========== MAIN ========== */

  /* Helpers */

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  // small deterministic value noise
  function hash(i, j) {
    var h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function noise(x, y) {
    var i = Math.floor(x), j = Math.floor(y);
    var fx = x - i, fy = y - j;
    var ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    var a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  function fbm(x, y) {
    var v = 0, amp = 0.5;
    for (var o = 0; o < 4; o++) { v += amp * noise(x, y); x *= 2.03; y *= 2.03; amp *= 0.5; }
    return v;
  }
  function rand(seed) { return hash(seed * 1.37, seed * 7.91); }

  function loop(el, draw) {
    var visible = false, raf = 0, last = 0;
    function tick(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      raf = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      last = now;
      draw(now / 1000);
    }
    function start() { if (!raf) raf = requestAnimationFrame(tick); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) start();
      }).observe(el);
    } else { visible = true; start(); }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) start(); });
  }

  function fit(canvas) {
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width * DPR)), h = Math.max(1, Math.round(r.height * DPR));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; return true; }
    return false;
  }

  /* The world */

  var LAND = [200, 193, 166], SEA = [95, 169, 198], ACC = [138, 143, 240], TXT = [233, 235, 241];
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }

  function coast(zw) { return 0.42 + 0.28 * Math.sin(zw * 0.55) + 0.12 * Math.sin(zw * 1.7 + 1.3); }
  function border(zw) { return -0.13 + 0.1 * Math.sin(zw * 0.38 + 2.1) + 0.03 * Math.sin(zw * 1.45); }
  function height(x, zw, t) {
    var c = coast(zw);
    if (x > c) return 0.008 * Math.sin(x * 11 + zw * 6 + t * 1.2);
    var land = smooth(0, 0.5, c - x);
    var ridge = 1 - Math.abs(fbm(x * 1.1 + 4.2, zw * 0.9) * 2 - 1);
    return land * (0.025 + 0.2 * Math.pow(ridge, 2.4) + 0.04 * fbm(x * 3, zw * 3));
  }
  var POST_EVERY = 0.5;
  function postLabel(k) { return 'BND ' + (20 + (k / 4) % 80).toFixed(0) + '.' + ('0' + Math.floor(rand(k) * 100)).slice(-2); }
  var MONO = '"IBM Plex Mono", ui-monospace, monospace';

  /* Header and navigation */

  var header = document.querySelector('.ts-header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var reveals = Array.prototype.slice.call(document.querySelectorAll('.ts-reveal'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { revealIO.observe(el); });
  }

  /* ========== HOME ========== */

  /* Hero */

  var heroCanvas = document.querySelector('.ts-hero__canvas');
  if (heroCanvas && heroCanvas.getContext) {
    var hc = heroCanvas.getContext('2d');
    var hero = document.querySelector('.ts-hero');
    var Z_NEAR = 0.55, Z_FAR = 7.2, DZ = 0.13, CAM_H = 0.5;
    var SPEED = 0.05;
    var t0 = 1.9;

    var W, H, f, cx, hz;
    function route(tr, sp) {
      return [-1.4 + tr * 0.9 + sp * (2.6 - tr * 0.8),
              Z_FAR - 0.6 - sp * (Z_FAR - 2.2) + tr * 0.4,
              0.95 + tr * 0.18 + 0.08 * Math.sin(sp * 6)];
    }
    function layout() {
      fit(heroCanvas);
      W = heroCanvas.width; H = heroCanvas.height;
      var narrowView = W / DPR < 720;
      f = H * (narrowView ? 0.62 : 0.78);
      cx = W * (narrowView ? 0.5 : 0.64);
      hz = H * (narrowView ? 0.36 : 0.4);
    }
    function px(x, z) { return cx + (x * f) / z; }
    function py(h, z, camH) { return hz + ((camH - h) * f) / z; }

    function drawHero(t) {
      var lift = clamp(window.scrollY / Math.max(1, hero.offsetHeight), 0, 1);
      var camH = CAM_H + lift * 0.35;
      var zOff = t * SPEED;
      var mono = Math.round(10 * DPR) + 'px ' + MONO;

      // sky and ground
      var g = hc.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#05070b');
      g.addColorStop(hz / H, '#0d121c');
      g.addColorStop(Math.min(1, hz / H + 0.002), '#070a10');
      g.addColorStop(1, '#06080c');
      hc.fillStyle = g;
      hc.fillRect(0, 0, W, H);

      // horizon line
      hc.strokeStyle = rgba(TXT, 0.12);
      hc.lineWidth = DPR;
      hc.beginPath(); hc.moveTo(0, hz + 0.5); hc.lineTo(W, hz + 0.5); hc.stroke();

      var nodes = [];
      for (var k = Math.floor(zOff / 0.6); k < (zOff + Z_FAR) / 0.6; k++) {
        for (var q = 0; q < 2; q++) {
          var id = k * 2 + q;
          var zn = k * 0.6 + rand(id) * 0.6 - zOff;
          if (zn < 2.2 || zn > Z_FAR) continue;
          var xn = (rand(id + 91) * 2 - 1) * 1.1 * zn * 0.42 + 0.3;
          var an = 0.95 + rand(id + 47) * 0.4;
          nodes.push({ x: px(xn, zn), y: py(an, zn, camH), z: zn, gx: xn, gz: zn, id: id });
        }
      }
      hc.lineWidth = DPR;
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].gx - nodes[b].gx, dzz = nodes[a].gz - nodes[b].gz;
          var dist = Math.sqrt(dx * dx + dzz * dzz);
          if (dist > 1.05) continue;
          var fade = (1 - dist / 1.05) * clamp(1.6 - (nodes[a].z + nodes[b].z) / 2 / Z_FAR * 1.6, 0, 1);
          hc.strokeStyle = rgba(ACC, 0.32 * fade);
          hc.beginPath(); hc.moveTo(nodes[a].x, nodes[a].y); hc.lineTo(nodes[b].x, nodes[b].y); hc.stroke();
        }
      }
      nodes.forEach(function (nd) {
        var al = clamp(1.4 - nd.z / Z_FAR * 1.4, 0, 1);
        var s = Math.max(2, 5 * DPR / Math.sqrt(nd.z));
        hc.fillStyle = rgba(ACC, 0.85 * al);
        hc.fillRect(nd.x - s / 2, nd.y - s / 2, s, s);
        if (rand(nd.id + 13) > 0.8 && nd.z > 3) {
          hc.strokeStyle = rgba(ACC, 0.22 * al);
          hc.setLineDash([2 * DPR, 4 * DPR]);
          hc.beginPath(); hc.moveTo(nd.x, nd.y); hc.lineTo(nd.x, py(height(nd.gx, nd.gz + zOff, t), nd.z, camH)); hc.stroke();
          hc.setLineDash([]);
        }
      });

      var first = Math.ceil((zOff + Z_FAR) / DZ), lastRow = Math.ceil((zOff + Z_NEAR) / DZ);
      var postEvery = POST_EVERY, prevZ = null;
      for (var r = first; r >= lastRow; r--) {
        var zw = r * DZ, z = zw - zOff;
        var x0 = (-cx - 20 * DPR) * z / f, x1 = (W - cx + 20 * DPR) * z / f;
        var steps = W / DPR < 720 ? 70 : 120;
        var pts = [];
        for (var s2 = 0; s2 <= steps; s2++) {
          var xw = x0 + (x1 - x0) * s2 / steps;
          var hh = height(xw, zw, t);
          pts.push(px(xw, z), py(hh, z, camH), xw > coast(zw) ? 1 : 0);
        }
        // occlude
        hc.fillStyle = '#06080c';
        hc.beginPath();
        hc.moveTo(pts[0], H);
        for (var p = 0; p < pts.length; p += 3) hc.lineTo(pts[p], pts[p + 1]);
        hc.lineTo(pts[pts.length - 3], H);
        hc.closePath();
        hc.fill();

        var depth = (z - Z_NEAR) / (Z_FAR - Z_NEAR);
        var al = Math.pow(1 - depth, 1.3) * 0.62 + 0.05;
        if (z > Z_FAR - 0.8) al *= (Z_FAR - z) / 0.8;
        hc.lineWidth = DPR * (depth < 0.25 ? 1.2 : 1);
        var p2 = 0;
        while (p2 < pts.length - 3) {
          var sea = pts[p2 + 2];
          hc.strokeStyle = sea ? rgba(SEA, al * 0.75) : rgba(LAND, al * 0.55);
          hc.beginPath();
          hc.moveTo(pts[p2], pts[p2 + 1]);
          while (p2 < pts.length - 3 && pts[p2 + 2] === sea) { p2 += 3; hc.lineTo(pts[p2], pts[p2 + 1]); }
          hc.stroke();
        }

        if (prevZ !== null) {
          var za = z, zb = z - DZ;
          seg(function (zz) { return coast(zz + zOff) + 0.5; }, function () { return 0.004; }, za, zb, rgba(SEA, al * 1.2), [4 * DPR, 5 * DPR]);
          // the boundary on land
          seg(function (zz) { return border(zz + zOff); }, function (xx, zz) { return height(xx, zz + zOff, t) + 0.006; }, za, zb, rgba(TXT, Math.min(0.95, 0.2 + al * 2)), null, 1.7);
          var k0 = Math.ceil((zb + zOff) / postEvery), k1 = Math.floor((za + zOff) / postEvery);
          for (var kk = k0; kk <= k1; kk++) {
            var zp = kk * postEvery - zOff;
            if (zp < Z_NEAR + 0.05) continue;
            var xb = border(kk * postEvery), hb = height(xb, kk * postEvery, t);
            var sx = px(xb, zp), sy = py(hb, zp, camH);
            var size = Math.max(2 * DPR, 7 * DPR / zp);
            var pal = clamp(1.4 - zp / Z_FAR * 1.4, 0, 1);
            hc.strokeStyle = rgba(TXT, 0.8 * pal);
            hc.lineWidth = DPR;
            hc.strokeRect(sx - size / 2, sy - size / 2, size, size);
            if (kk % 4 === 0 && zp < 4.2 && W / DPR >= 720) {
              var lh = 26 * DPR / Math.sqrt(zp);
              hc.strokeStyle = rgba(TXT, 0.35 * pal);
              hc.beginPath(); hc.moveTo(sx, sy - size / 2); hc.lineTo(sx, sy - lh); hc.lineTo(sx + 10 * DPR, sy - lh); hc.stroke();
              hc.fillStyle = rgba(TXT, 0.62 * pal);
              hc.font = mono;
              hc.fillText(postLabel(kk), sx + 14 * DPR, sy - lh + 3.5 * DPR);
            }
          }
        }
        prevZ = z;
      }

      for (var tr = 0; tr < 3; tr++) {
        var period = 38 + tr * 9;
        var ph = ((t + tr * 17.3) % period) / period;
        var trail = 0.22;
        hc.lineWidth = DPR;
        var head = null;
        for (var u = 0; u <= 24; u++) {
          var sp = ph - trail + trail * u / 24;
          if (sp < 0) continue;
          var rp = route(tr, sp);
          var az = rp[1];
          var hx = px(rp[0], az), hy = py(rp[2], az, camH);
          if (head) {
            hc.strokeStyle = rgba(TXT, 0.4 * u / 24);
            hc.beginPath(); hc.moveTo(head[0], head[1]); hc.lineTo(hx, hy); hc.stroke();
          }
          head = [hx, hy, az];
        }
        if (head && ph > 0.02 && ph < 0.98) {
          var hs = Math.max(3 * DPR, 9 * DPR / Math.sqrt(head[2]));
          var edge = Math.min(ph / 0.06, (1 - ph) / 0.06, 1);
          hc.strokeStyle = rgba(TXT, 0.9 * edge);
          hc.beginPath();
          hc.moveTo(head[0], head[1] - hs / 2); hc.lineTo(head[0] + hs / 2, head[1]);
          hc.lineTo(head[0], head[1] + hs / 2); hc.lineTo(head[0] - hs / 2, head[1]); hc.closePath();
          hc.stroke();
        }
      }

      function seg(xf, hf, za, zb, color, dash, weight) {
        var n2 = 3, prev = null;
        hc.strokeStyle = color;
        hc.lineWidth = DPR * (weight || 1.2);
        if (dash) hc.setLineDash(dash);
        hc.beginPath();
        for (var i2 = 0; i2 <= n2; i2++) {
          var zz = za + (zb - za) * i2 / n2;
          if (zz < Z_NEAR) break;
          var xx = xf(zz), yy = py(hf(xx, zz), zz, camH), sxx = px(xx, zz);
          if (prev) hc.lineTo(sxx, yy); else hc.moveTo(sxx, yy);
          prev = true;
        }
        hc.stroke();
        if (dash) hc.setLineDash([]);
      }
    }

    layout();
    var heroStart = null;
    if (reduceMotion) {
      drawHero(t0);
      window.addEventListener('resize', function () { layout(); drawHero(t0); });
      window.addEventListener('scroll', function () { drawHero(t0); }, { passive: true });
    } else {
      window.addEventListener('resize', layout);
      loop(heroCanvas, function (now) {
        if (heroStart === null) heroStart = now - t0;
        drawHero(now - heroStart);
      });
    }
  }

  /* ========== INNER PAGES ========== */

  function pageY(el) { return el.getBoundingClientRect().top + window.scrollY; }

  function framePage(canvas, md) {
    var barTop = document.documentElement.classList.contains('has-browser-frame')
      ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--browser-bar-h')) || 0) : 0;
    var VH = window.innerHeight - barTop;
    var PW = document.documentElement.clientWidth;
    var PH = document.documentElement.scrollHeight;
    canvas.width = Math.round(PW * md); canvas.height = Math.round(VH * md);
    canvas.style.top = barTop + 'px'; canvas.style.width = PW + 'px'; canvas.style.height = VH + 'px';
    return { barTop: barTop, VH: VH, PW: PW, PH: PH };
  }

  function gutterX(grid, PW, ratio) {
    var two = grid && getComputedStyle(grid).gridTemplateColumns.split(' ').length > 1;
    if (!two) return { x: PW * ratio, twoCols: false };
    var l = grid.children[0].getBoundingClientRect(), r = grid.children[1].getBoundingClientRect();
    return { x: (l.right + r.left) / 2, twoCols: true };
  }

  function drivePage(build, draw, still, animate) {
    var start = null, lastT = still, queued = false;
    function redraw() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; draw(lastT); });
    }
    function rebuild() { build(); redraw(); }
    rebuild();
    window.addEventListener('scroll', redraw, { passive: true });
    window.addEventListener('resize', rebuild);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
    window.addEventListener('load', rebuild);
    if ('ResizeObserver' in window) {
      var lastH = 0;
      new ResizeObserver(function () {
        var h = document.documentElement.scrollHeight;
        if (Math.abs(h - lastH) > 2) { lastH = h; rebuild(); }
      }).observe(document.body);
    }
    if (animate && !reduceMotion) {
      var lastFrame = 0;
      (function tick(now) {
        requestAnimationFrame(tick);
        if (document.hidden || now - lastFrame < 66) return;
        lastFrame = now;
        if (start === null) start = now / 1000 - still;
        lastT = now / 1000 - start;
        draw(lastT);
      })(0);
    }
  }

  /* ========== BORDER SECURITY ========== */

  var bg = document.querySelector('.ts-mapbg');
  if (bg && bg.getContext) {
    var bc = bg.getContext('2d');
    var layer = document.createElement('canvas');
    var lc = layer.getContext('2d');
    var MD = Math.min(window.devicePixelRatio || 1, 1.25);
    var VH, PW, PH, S, AX, ZTOP, barTop = 0;
    var sensors = [], roads = [], refs = [];

    function mx(x) { return (AX + (x + 0.13) * S) * MD; }
    function my(zw) { return (zw - ZTOP) * S * MD; }
    function zAt(yPage) { return ZTOP + yPage / S; }

    function westEast(zBase, amp, freq, phase) {
      var pts = [], xStart = -0.13 - AX / S - 0.1, xEnd = xStart + PW / S + 0.2;
      for (var x = xStart; x < xEnd; x += 0.02) {
        var zw = zBase + amp * Math.sin(x * freq + phase) + amp * 0.35 * Math.sin(x * freq * 2.7);
        pts.push([x, zw]);
        if (x > coast(zw)) break;
      }
      return pts;
    }
    function polyline(c, pts) {
      c.beginPath();
      pts.forEach(function (p, i) { if (i) c.lineTo(mx(p[0]), my(p[1])); else c.moveTo(mx(p[0]), my(p[1])); });
      c.stroke();
    }
    function alongZ(fx) {
      var pts = [], z1 = zAt(PH), n = Math.ceil(PH / 6);
      for (var i = 0; i <= n; i++) { var zw = ZTOP + (z1 - ZTOP) * i / n; pts.push([fx(zw), zw]); }
      return pts;
    }
    function contours(c, g, nx, ny, cell, level) {
      function lerp(a2, b2) { return (level - a2) / (b2 - a2); }
      c.beginPath();
      for (var j = 0; j < ny - 1; j++) {
        for (var i = 0; i < nx - 1; i++) {
          var v0 = g[j * nx + i], v1 = g[j * nx + i + 1], v2 = g[(j + 1) * nx + i + 1], v3 = g[(j + 1) * nx + i];
          var idx = (v0 > level ? 8 : 0) | (v1 > level ? 4 : 0) | (v2 > level ? 2 : 0) | (v3 > level ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          var x = i * cell, y = j * cell;
          var e = [[x + cell * lerp(v0, v1), y], [x + cell, y + cell * lerp(v1, v2)],
                   [x + cell * lerp(v3, v2), y + cell], [x, y + cell * lerp(v0, v3)]];
          var segs = {1: [3, 2], 2: [2, 1], 3: [3, 1], 4: [0, 1], 5: [3, 0, 2, 1], 6: [0, 2], 7: [3, 0],
                      8: [3, 0], 9: [0, 2], 10: [3, 2, 0, 1], 11: [0, 1], 12: [3, 1], 13: [1, 2], 14: [3, 2]}[idx];
          for (var q = 0; q < segs.length; q += 2) {
            c.moveTo(e[segs[q]][0], e[segs[q]][1]);
            c.lineTo(e[segs[q + 1]][0], e[segs[q + 1]][1]);
          }
        }
      }
      c.stroke();
    }
    function buildMap() {
      var fr = framePage(bg, MD);
      barTop = fr.barTop; VH = fr.VH; PW = fr.PW; PH = fr.PH;

      var gut = gutterX(document.querySelector('.ts-pg-section__grid'), PW, 0.84);
      var twoCols = gut.twoCols;
      AX = gut.x;
      S = twoCols ? Math.max(280, PW / 3.4) : Math.max(160, PW / 1.6);
      ZTOP = 1.2;

      layer.width = Math.round(PW * MD); layer.height = Math.round(PH * MD);
      var c = lc, W2 = layer.width, H2 = layer.height;
      c.clearRect(0, 0, W2, H2);
      c.lineJoin = 'round';

      // survey grid
      c.strokeStyle = 'rgba(233,235,241,0.05)';
      c.lineWidth = MD;
      c.beginPath();
      var xs = -0.13 - AX / S, xe = xs + PW / S;
      for (var gx = Math.ceil(xs / 0.25) * 0.25; gx < xe; gx += 0.25) { c.moveTo(mx(gx), 0); c.lineTo(mx(gx), H2); }
      for (var gz = Math.ceil(ZTOP / 0.25) * 0.25; gz < zAt(PH); gz += 0.25) { c.moveTo(0, my(gz)); c.lineTo(W2, my(gz)); }
      c.stroke();

      // sea and depth lines
      var shore = alongZ(coast);
      c.fillStyle = 'rgba(95,169,198,0.06)';
      c.beginPath();
      shore.forEach(function (p, i) { if (i) c.lineTo(mx(p[0]), my(p[1])); else c.moveTo(mx(p[0]), my(p[1])); });
      c.lineTo(W2, H2); c.lineTo(W2, 0); c.closePath();
      c.fill();
      [0.1, 0.22, 0.36].forEach(function (d, i) {
        c.strokeStyle = rgba(SEA, 0.22 - i * 0.05);
        c.lineWidth = MD;
        polyline(c, alongZ(function (zw) { return coast(zw) + d; }));
      });

      // land contours
      var cell = 7 * MD;
      var nx = Math.ceil(W2 / cell) + 1, ny = Math.ceil(H2 / cell) + 1;
      var g = new Float32Array(nx * ny);
      for (var j = 0; j < ny; j++) {
        var zw = zAt(j * cell / MD);
        for (var i = 0; i < nx; i++) g[j * nx + i] = height(-0.13 + (i * cell / MD - AX) / S, zw, 0);
      }
      [0.035, 0.06, 0.085, 0.11, 0.135, 0.16, 0.185].forEach(function (lv, k) {
        c.strokeStyle = rgba(LAND, 0.2 + k * 0.045);
        c.lineWidth = MD;
        contours(c, g, nx, ny, cell, lv);
      });

      roads = [];
      var zEnd = zAt(PH);
      for (var zr = ZTOP + 0.9, n = 0; zr < zEnd; zr += 1.15, n++) {
        if (n % 3 === 1) {
          c.strokeStyle = rgba(SEA, 0.55);
          c.lineWidth = MD * 1.3;
          c.setLineDash([]);
          polyline(c, westEast(zr, 0.09, 2.2, n));
        } else {
          var road = westEast(zr, 0.06, 1.7, n * 1.3);
          roads.push(road);
          c.strokeStyle = 'rgba(233,235,241,0.32)';
          c.lineWidth = MD;
          c.setLineDash([6 * MD, 4 * MD]);
          polyline(c, road);
          c.setLineDash([]);
        }
      }

      // coastline and the offshore line
      c.strokeStyle = rgba(SEA, 0.7);
      c.lineWidth = MD * 1.2;
      polyline(c, shore);
      c.strokeStyle = rgba(SEA, 0.45);
      c.setLineDash([4 * MD, 5 * MD]);
      polyline(c, alongZ(function (zw) { return coast(zw) + 0.5; }));
      c.setLineDash([]);

      // the border and its posts
      c.strokeStyle = rgba(TXT, 0.75);
      c.lineWidth = MD * 1.5;
      polyline(c, alongZ(border));
      function post(zp, label) {
        var px2 = mx(border(zp)), py2 = my(zp), ps = 5 * MD;
        c.fillStyle = '#06080c';
        c.fillRect(px2 - ps / 2, py2 - ps / 2, ps, ps);
        c.strokeStyle = rgba(TXT, 0.8);
        c.lineWidth = MD;
        c.strokeRect(px2 - ps / 2, py2 - ps / 2, ps, ps);
        if (label) {
          c.fillStyle = rgba(TXT, 0.7);
          c.font = Math.round(10 * MD) + 'px ' + MONO;
          c.textBaseline = 'bottom';
          var lw = c.measureText(label).width;
          var lx = px2 + 9 * MD + lw > W2 - 8 * MD ? px2 - 9 * MD - lw : px2 + 9 * MD;
          c.fillText(label, lx, py2 - 3 * MD);
        }
      }
      sensors = [];
      refs = Array.prototype.slice.call(document.querySelectorAll('.ts-pg-ref'));
      var refZ = refs.map(function (el) { return zAt(pageY(el) + 0.5); });
      for (var k = Math.ceil(ZTOP / POST_EVERY); k * POST_EVERY < zEnd; k++) {
        var near = refZ.some(function (z) { return Math.abs(z - k * POST_EVERY) < 0.15; });
        if (!near) post(k * POST_EVERY, null);
        if (k % 3 === 1) sensors.push({ x: border(k * POST_EVERY), zw: k * POST_EVERY, r: 0.27, c: ACC });
      }
      refs.forEach(function (el, i) { post(refZ[i], el.getAttribute('data-post')); });
      // coastal sensors over the water
      for (var zc = ZTOP + 1.6; zc < zEnd; zc += 2.6) sensors.push({ x: coast(zc) - 0.02, zw: zc, r: 0.42, c: SEA });
      sensors.forEach(function (sn) {
        c.beginPath();
        c.arc(mx(sn.x), my(sn.zw), sn.r * S * MD, 0, Math.PI * 2);
        c.fillStyle = rgba(sn.c, 0.04);
        c.fill();
        c.strokeStyle = rgba(sn.c, 0.22);
        c.lineWidth = MD;
        c.stroke();
      });
    }

    function trackAt(i, u) {
      if (i % 3 === 2) {
        var zv = ZTOP + 0.4 + (i * 1.9) % Math.max(1, zAt(PH) - ZTOP - 0.8) + u * 1.2;
        return [coast(zv) + 0.72, zv];
      }
      var r = roads[i % roads.length];
      if (!r) return null;
      var f = (i % 2 ? 1 - u : u) * (r.length - 1);
      var a2 = r[Math.floor(f)], b2 = r[Math.min(r.length - 1, Math.floor(f) + 1)], t2 = f - Math.floor(f);
      return [a2[0] + (b2[0] - a2[0]) * t2, a2[1] + (b2[1] - a2[1]) * t2];
    }

    function drawMap(t) {
      var top = window.scrollY + barTop;
      var W2 = bg.width, H2 = bg.height;
      bc.clearRect(0, 0, W2, H2);
      bc.drawImage(layer, 0, Math.round(top * MD), W2, H2, 0, 0, W2, H2);
      bc.save();
      bc.translate(0, -top * MD);
      var y0 = top * MD - 60 * MD, y1 = top * MD + H2 + 60 * MD;
      sensors.forEach(function (sn, i) {
        var cy = my(sn.zw);
        if (cy < y0 - sn.r * S * MD || cy > y1 + sn.r * S * MD) return;
        var a = -Math.PI / 2 + 1.1 * Math.sin(t * 0.08 + i * 1.7);
        var cx2 = mx(sn.x);
        bc.beginPath();
        bc.moveTo(cx2, cy);
        bc.arc(cx2, cy, sn.r * S * MD, a - 0.3, a + 0.3);
        bc.closePath();
        bc.fillStyle = rgba(sn.c, 0.06);
        bc.fill();
      });
      var nTracks = roads.length + Math.ceil(roads.length / 2);
      for (var i = 0; i < nTracks; i++) {
        var period = 70 + (i * 23) % 40;
        var u = ((t + i * 37) % period) / period;
        if (u > 0.6) continue;
        var span = u / 0.6, vis = Math.sin(Math.PI * span);
        var p = trackAt(i, span), q = trackAt(i, Math.max(0, span - 0.05));
        if (!p || !q) continue;
        var X = mx(p[0]), Y = my(p[1]);
        if (Y < y0 || Y > y1) continue;
        var col = i % 3 === 2 ? SEA : TXT;
        bc.strokeStyle = rgba(col, 0.3 * vis);
        bc.lineWidth = MD;
        bc.setLineDash([2 * MD, 3 * MD]);
        bc.beginPath(); bc.moveTo(mx(q[0]), my(q[1])); bc.lineTo(X, Y); bc.stroke();
        bc.setLineDash([]);
        var hs = 4 * MD;
        bc.strokeStyle = rgba(col, 0.8 * vis);
        bc.beginPath();
        bc.moveTo(X, Y - hs); bc.lineTo(X + hs, Y); bc.lineTo(X, Y + hs); bc.lineTo(X - hs, Y); bc.closePath();
        bc.stroke();
      }
      bc.restore();
    }

    drivePage(buildMap, drawMap, 30, true);
  }

  /* ========== BRACKWATER OPERATIONS ========== */

  var pb = document.querySelector('.ts-planbg');
  if (pb && pb.getContext) {
    var pc = pb.getContext('2d');
    var player = document.createElement('canvas');
    var plc = player.getContext('2d');
    var PMD = Math.min(window.devicePixelRatio || 1, 1.25);
    var pf = null, facility = null;
    var CELL = 28;

    function sectionBox(name) {
      var el = document.querySelector('[data-plan="' + name + '"]');
      if (!el) return null;
      var top = pageY(el), head = el.querySelector('.ts-pg-section__head'), copy = el.querySelector('.ts-pg-copy');
      return {
        top: top, h: el.offsetHeight, mid: top + el.offsetHeight / 2, bottom: top + el.offsetHeight,
        headBottom: head ? pageY(head) + head.offsetHeight : top,
        copyBottom: copy ? pageY(copy) + copy.offsetHeight : top
      };
    }

    function buildPlan() {
      pf = framePage(pb, PMD);
      var W = pf.PW, H = pf.PH, narrowMap = W < 861;
      player.width = Math.round(W * PMD); player.height = Math.round(H * PMD);
      var c = plc;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, player.width, player.height);
      c.setTransform(PMD, 0, 0, PMD, 0, 0);

      // the grid
      c.strokeStyle = 'rgba(233,235,241,0.05)';
      c.lineWidth = 1;
      c.beginPath();
      for (var gx = 0; gx <= W; gx += CELL) { c.moveTo(gx + 0.5, 0); c.lineTo(gx + 0.5, H); }
      for (var gy = 0; gy <= H; gy += CELL) { c.moveTo(0, gy + 0.5); c.lineTo(W, gy + 0.5); }
      c.stroke();

      var comp = sectionBox('facility'), water = sectionBox('reservoir'), town = sectionBox('town');
      function shore(y) { return W * (narrowMap ? 0.93 : 0.9) + Math.sin(y / 340) * W * 0.025 + Math.sin(y / 97) * 6; }
      var basin = water && { x: W * (narrowMap ? 0.42 : 0.3), y: water.mid, rx: W * (narrowMap ? 0.3 : 0.17), ry: Math.min(water.h * 0.42, 220) };
      facility = comp && (function () {
        var cols = narrowMap ? 3 : 5, rows = 2;
        var x0 = Math.floor((shore(comp.mid) - (cols + 2) * CELL) / CELL) * CELL;
        var y0 = Math.ceil((comp.copyBottom + 28) / CELL) * CELL;
        if (y0 + rows * CELL > comp.bottom) y0 = Math.floor((comp.bottom - rows * CELL) / CELL) * CELL;
        return { x0: x0, y0: y0, x1: x0 + cols * CELL, y1: y0 + rows * CELL };
      })();
      var schools = [];
      if (town) {
        var free = narrowMap ? [town.copyBottom, town.bottom] : [town.headBottom + CELL, town.bottom - CELL];
        schools = (narrowMap ? [[0.93, 0.15], [0.86, 0.5], [0.93, 0.85]] : [[0.1, 0.12], [0.26, 0.5], [0.17, 0.88]]).map(function (f) {
          var y = narrowMap ? town.top + town.h * (0.3 + f[1] * 0.6) : free[0] + (free[1] - free[0] - CELL) * f[1];
          return [Math.floor(Math.min(W * f[0], W - CELL - 2) / CELL) * CELL, Math.floor(y / CELL) * CELL];
        });
      }

      // the ground, one square per cell
      for (var y = 0; y < H; y += CELL) {
        var sx = shore(y + CELL / 2);
        for (var x = 0; x < W; x += CELL) {
          var cx = x + CELL / 2, cy = y + CELL / 2;
          if (cx > sx) continue;
          if (facility && x >= facility.x0 && x < facility.x1 && y >= facility.y0 && y < facility.y1) continue;
          var v = fbm(x / 260 + 3.1, y / 260 + 7.7);
          v = v * Math.min(1, (sx - cx) / 90 + 0.3);
          if (basin) {
            var d = Math.pow((cx - basin.x) / basin.rx, 2) + Math.pow((cy - basin.y) / basin.ry, 2);
            if (d < 1) v = 0.472;
            else if (d < 1.4) v = Math.max(v, 0.64 - (d - 1) * 0.35);
          }
          if (v < 0.46) continue;
          var k = Math.min(1, (v - 0.46) / 0.3);
          var size = 3 + k * (CELL - 12);
          c.fillStyle = rgba(SEA, 0.08 + k * 0.32);
          c.fillRect(x + (CELL - size) / 2, y + (CELL - size) / 2, size, size);
        }
      }

      // the shoreline, as the grid's edge
      c.strokeStyle = rgba(SEA, 0.28);
      c.beginPath();
      for (var yy = 0; yy <= H; yy += 8) { if (yy) c.lineTo(shore(yy), yy); else c.moveTo(shore(yy), yy); }
      c.stroke();

      // the schools: three cells, quietly outlined
      schools.forEach(function (sc) {
        c.strokeStyle = rgba(LAND, 0.4);
        c.strokeRect(sc[0] + 4.5, sc[1] + 4.5, CELL - 9, CELL - 9);
        c.fillStyle = rgba(LAND, 0.22);
        c.fillRect(sc[0] + 10, sc[1] + 10, CELL - 20, CELL - 20);
      });
    }

    function drawPlan(t) {
      var top = window.scrollY + pf.barTop;
      var W2 = pb.width, H2 = pb.height;
      pc.setTransform(1, 0, 0, 1, 0, 0);
      pc.clearRect(0, 0, W2, H2);
      pc.drawImage(player, 0, Math.round(top * PMD), W2, H2, 0, 0, W2, H2);
      if (!facility) return;
      pc.setTransform(PMD, 0, 0, PMD, 0, -top * PMD);
      var i = 0;
      for (var y = facility.y0; y < facility.y1; y += CELL) {
        for (var x = facility.x0; x < facility.x1; x += CELL, i++) {
          var a = 0.35 + 0.2 * Math.sin(t * 0.5 + i * 0.7);
          pc.fillStyle = rgba(ACC, a);
          pc.fillRect(x + 6, y + 6, CELL - 12, CELL - 12);
        }
      }
      pc.strokeStyle = rgba(ACC, 0.45);
      pc.lineWidth = 1;
      pc.strokeRect(facility.x0 + 0.5, facility.y0 + 0.5, facility.x1 - facility.x0, facility.y1 - facility.y0);
    }

    drivePage(buildPlan, drawPlan, 12, true);
  }
})();
