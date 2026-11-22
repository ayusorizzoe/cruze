/* ========== MAIN ========== */
(function () {
  'use strict';
  var bar = document.querySelector('.sl-bar');
  if (!bar) return;
  var root = document.documentElement;
  var SHOW_AFTER = 80;
  root.classList.add('sl-bar-auto');
  var queued = false;
  function update() {
    queued = false;
    root.classList.toggle('sl-bar-on', window.scrollY > SHOW_AFTER);
  }
  window.addEventListener('scroll', function () {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* Home */
(function () {
  'use strict';

  if (!document.querySelector('.sl-wordmark')) return;

  document.documentElement.classList.add('sl-js-root');
  document.body.classList.add('sl-js');

  /* Wordmark */

  (function fitWordmarks() {
    var marks = [
      { el: document.querySelector('.sl-wordmark'), scale: 1 },
      { el: document.querySelector('.sl-footer__mark span'), scale: 1.03 }
    ].filter(function (m) { return m.el; });

    function fit() {
      marks.forEach(function (m) {
        var box = m.el.closest('.sl-opening, .sl-footer');
        var cs = getComputedStyle(box);
        var avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var target = m.el.classList.contains('sl-wordmark') ? m.el : m.el.parentNode;
        target.style.fontSize = '100px';
        var range = document.createRange();
        range.selectNodeContents(target);
        var w = range.getBoundingClientRect().width;
        if (w) target.style.fontSize = (100 * avail / w * m.scale).toFixed(2) + 'px';
      });
    }

    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.addEventListener('resize', fit);
  })();

  /* Directory */

  (function directory() {
    var list = document.querySelector('.sl-directory__switch');
    if (!list) return;
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });

    list.hidden = false;
    select(tabs[0], false);
  })();
})();

/* ========== PROJECTS ========== */
(function () {
  'use strict';

  if (!document.body.classList.contains('pj')) return;

  document.body.classList.add('pj-js');

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hoverMQ = window.matchMedia('(hover: hover)');

  /* WebGL helper */

  var VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';

  function shaderWork(fragSource, opts) {
    return function (canvas) {
      var gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
      if (!gl) return null;

      function compile(type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          if (window.console) console.warn(gl.getShaderInfoLog(s));
          return null;
        }
        return s;
      }
      var vs = compile(gl.VERTEX_SHADER, VERT);
      var fs = compile(gl.FRAGMENT_SHADER, fragSource);
      if (!vs || !fs) return null;
      var prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      var uR = gl.getUniformLocation(prog, 'R');
      var uT = gl.getUniformLocation(prog, 'T');

      return {
        gl: gl,
        scale: opts.scale,
        minScale: opts.minScale,
        maxScale: opts.scale,
        dprCap: opts.dprCap,
        fps: opts.fps,
        resize: function (w, h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        },
        render: function (t) {
          gl.uniform2f(uR, canvas.width, canvas.height);
          gl.uniform1f(uT, t);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        lost: function () { return gl.isContextLost(); }
      };
    };
  }

  /* Harbor Festival */

  var HARBOR = [
    'precision highp float;',
    'uniform vec2 R;uniform float T;',
    'float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}',
    'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n2(p);p=p*2.03+17.1;a*=.5;}return s;}',
    'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',

    'float caustic(vec2 uv,float t){',
    ' vec2 p=mod(uv*6.2832,6.2832)-250.;vec2 i=p;float c=1.;float k=.005;',
    ' for(int n=0;n<4;n++){float tt=t*(1.-(3.5/float(n+1)));',
    '  i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));',
    '  c+=1./length(vec2(p.x/(sin(i.x+tt)/k),p.y/(cos(i.y+tt)/k)));}',
    ' c/=4.;c=1.17-pow(c,1.4);return clamp(pow(abs(c),5.),0.,1.);}',

    'vec3 pal(float t){t=fract(t);',
    ' vec3 c0=vec3(.16,.80,.70),c1=vec3(.22,.72,1.),c2=vec3(.26,.40,1.),c3=vec3(.48,.34,1.),c4=vec3(.72,.38,.96);',
    ' float x=t*5.;',
    ' vec3 c=mix(c0,c1,clamp(x,0.,1.));c=mix(c,c2,clamp(x-1.,0.,1.));c=mix(c,c3,clamp(x-2.,0.,1.));',
    ' c=mix(c,c4,clamp(x-3.,0.,1.));return mix(c,c0,clamp(x-4.,0.,1.));}',

    'void main(){',
    ' vec2 p=(gl_FragCoord.xy-.5*R)/R.y;',
    ' float px=1./R.y;',
    ' float asp=R.x/R.y;',
    ' float tc=T*.11;',

    ' vec2 cp=p*.75+vec2(T*.006,-T*.004);',
    ' float cs=caustic(cp,tc)*.62+caustic(rot(.6)*cp*1.37+vec2(3.1,1.7),tc*1.13)*.38;',
    ' cs*=.55+.9*fbm(p*.8+vec2(-T*.01,T*.007));',
    ' float cl=smoothstep(.14,.8,cs);',
    ' vec2 rf=vec2(sin(p.y*6.+T*.42+1.4*sin(p.x*2.6+T*.19)),sin(p.x*5.2-T*.36+1.4*sin(p.y*2.2-T*.15)));',

    ' vec2 q=p;',
    ' vec2 w=vec2(fbm(p*1.1+vec2(0.,T*.021)),fbm(p*1.1+vec2(5.2,-T*.017)))-.5;',
    ' q+=w*.42;',
    ' q.y+=.09*sin(q.x*1.7+T*.031)*cos(q.x*.6-T*.013);',
    ' q+=rf*.016;',
    ' q=rot(.7854)*q;',
    ' float dens=11.+5.*fbm(p*.45-T*.008);',
    ' vec2 gf=abs(fract(q*dens)-.5);',
    ' float dl=(.5-max(gf.x,gf.y))/dens;',
    ' float netMask=smoothstep(.4,.66,fbm(p*.55+vec2(T*.007,-T*.004)+3.));',
    ' float net=(smoothstep(px*1.8,0.,dl)*.75+exp(-dl/(px*7.))*.22)*netMask;',
    ' float knot=smoothstep(px*4.,0.,length(.5-gf)/dens)*netMask;',

    // colour and light
    ' float hue=fbm(p*.6+vec2(T*.01,-T*.006))*1.3+T*.004;',
    ' vec3 col=vec3(.006,.010,.026)+vec3(.004,.008,.03)*(1.-abs(p.y)*1.4);',
    ' col+=pal(hue)*(net*(.05+2.3*cl)+knot*(.06+1.4*cl));',
    ' col+=pal(hue+.35)*cl*cl*.22;',
    ' col*=1.-.35*dot(p/vec2(asp*.62,.62),p/vec2(asp*.62,.62));',
    ' col=1.-exp(-col*1.35);',
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  /* Flow */

  var SMOKE = [
    'precision highp float;',
    'uniform vec2 R;uniform float T;',
    'float h21(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}',
    'float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+1.),f.x),f.y);}',
    'const mat2 M=mat2(1.6,1.2,-1.2,1.6);',
    'float fbm4(vec2 p){float s=.5*n2(p);p=M*p;s+=.25*n2(p);p=M*p;s+=.125*n2(p);p=M*p;s+=.0625*n2(p);return s/.9375;}',
    'float fbm2(vec2 p){return .65*n2(p)+.35*n2(M*p);}',

    'const vec3 BLUE=vec3(.56,.82,.97);',
    'const vec3 PINK=vec3(.97,.70,.78);',
    'const vec3 WHITE=vec3(.96,.96,.97);',

    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;',
    ' float asp=R.x/R.y;',
    ' vec2 bx=vec2(min(.6,asp*.5-.1),.4);',
    ' if(asp<1.){bx.x=asp*.5*.84;bx.y=min(.42,bx.x*2.6);}',
    ' vec3 col=mix(vec3(.012,.013,.02),vec3(.026,.028,.04),smoothstep(-.6,.6,uv.y));',
    ' vec2 dd=abs(uv)-bx;',
    ' float sd=length(max(dd,0.))+min(max(dd.x,dd.y),0.);',
    ' float inside=1.-smoothstep(-min(.13,bx.x*.28),0.,sd);',
    ' if(inside<=0.){gl_FragColor=vec4(col,1.);return;}',
    ' vec2 b=uv/bx;',
    ' float t=T*.05;',
    ' vec2 q=uv/bx.y;',
    ' q+=vec2(.18*sin(q.y*1.5-t*.9)*sign(q.x),-.12*cos(q.x*1.4+t*.7))*smoothstep(0.,1.,abs(b.x));',
    ' vec2 w=vec2(fbm4(q*.9+vec2(0.,-t)),fbm4(q*.9+vec2(5.2,t*.8)))-.5;',
    ' vec2 s=q*1.5+w*2.4+vec2(t*.2,-t*1.2);',
    ' s+=(vec2(fbm2(s*.8+vec2(t,2.)),fbm2(s*.8+vec2(7.,-t)))-.5)*1.2;',
    ' float f=fbm4(s);',
    ' float ridge=1.-abs(2.*f-1.);',
    ' ridge=pow(ridge,7.);',
    ' float g=fbm4(s*1.9+vec2(3.,-t*.6));',
    ' float fine=1.-abs(2.*g-1.);',
    ' fine=pow(fine,10.);',
    ' float body=smoothstep(.42,.8,fbm2(b*vec2(1.,.62)*1.25+w*1.4+vec2(t*.25,-t*.4)));',
    ' float lid=smoothstep(-.1,1.,b.y);',
    ' float wall=smoothstep(.6,1.,abs(b.x));',
    ' float den=(ridge*1.1+fine*.4)*(.12+1.05*body)*(.5+.35*lid+.25*wall)*inside;',
    ' den=clamp(den,0.,1.);',
    ' vec3 tint=mix(BLUE,PINK,smoothstep(.32,.68,fbm2(q*1.1+w*.8+vec2(t*.15,-t*.2))));',
    ' tint=mix(tint,WHITE,smoothstep(.25,.9,den)*.55);',
    ' col=mix(col,tint,den*.6);',
    ' gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n');

  /* Currents */

  function makeNoise(seed) {
    var perm = new Uint8Array(512);
    var p = [];
    var s = seed;
    for (var i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      var j = s % (i + 1);
      var t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    var val = new Float32Array(256);
    for (i = 0; i < 256; i++) { s = (s * 16807) % 2147483647; val[i] = s / 2147483647; }
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function v(x, y, z) { return val[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]]; }
    return function (x, y, z) {
      var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      var xf = x - xi, yf = y - yi, zf = z - zi;
      var u = fade(xf), w = fade(yf), q = fade(zf);
      var x00 = v(xi, yi, zi) + (v(xi + 1, yi, zi) - v(xi, yi, zi)) * u;
      var x10 = v(xi, yi + 1, zi) + (v(xi + 1, yi + 1, zi) - v(xi, yi + 1, zi)) * u;
      var x01 = v(xi, yi, zi + 1) + (v(xi + 1, yi, zi + 1) - v(xi, yi, zi + 1)) * u;
      var x11 = v(xi, yi + 1, zi + 1) + (v(xi + 1, yi + 1, zi + 1) - v(xi, yi + 1, zi + 1)) * u;
      var y0 = x00 + (x10 - x00) * w;
      var y1 = x01 + (x11 - x01) * w;
      return y0 + (y1 - y0) * q;
    };
  }

  function currentsWork(canvas) {
    var ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;
    var noise = makeNoise(90731);
    var W = 0, H = 0, unit = 1, major = 1, minor = 1, AX = 0, AY = 0;
    var ps, lane, spd, kind, n = 0;
    var MAXN = 5000;
    var cx = new Float32Array(MAXN), cy = new Float32Array(MAXN);
    var nx = new Float32Array(MAXN), ny = new Float32Array(MAXN);
    var count = 0, ds = 3, total = 1;
    var BG = '#030809';
    var INK = ['rgba(34, 116, 108, 0.9)', 'rgba(28, 88, 124, 0.9)', 'rgba(96, 176, 164, 0.85)'];
    function course(t) {
      var lam = 1.32 * minor * (1 + 0.1 * Math.sin(t * 0.013));
      var th0 = 1.22 + 0.5 * Math.sin(t * 0.027) + 0.16 * Math.sin(t * 0.061 + 1.1);
      var ph = t * 0.05;
      var x = 0, y = 0, i = 0, sumPerp = 0;
      var need = major * 1.12;
      for (i = 0; i < MAXN; i++) {
        var s = i * ds / lam;
        var a = th0 * (1 + 0.3 * Math.sin(6.2832 * s * 0.37 - t * 0.021 + 0.7));
        if (a > 2.1) a = 2.1;
        var k = 6.2832 * s - ph;
        var th = a * Math.sin(k) + a * a * a / 32 * Math.cos(3 * k) +
                 0.3 * (noise(s * 1.3, 1.7, t * 0.02) - 0.5);
        var c = Math.cos(th), sn = Math.sin(th);
        var tx = c * AX - sn * AY, ty = c * AY + sn * AX;
        cx[i] = x; cy[i] = y; nx[i] = -ty; ny[i] = tx;
        sumPerp += -x * AY + y * AX;
        if (x * AX + y * AY > need) { i++; break; }
        x += tx * ds; y += ty * ds;
      }
      count = i; total = (count - 1) * ds;
      var off = sumPerp / count;
      var ox = W * 0.5 - AX * major * 0.56 + AY * off;
      var oy = H * 0.5 - AY * major * 0.56 - AX * off;
      for (i = 0; i < count; i++) { cx[i] += ox; cy[i] += oy; }
    }
    function width(p, t) {
      return minor * 0.05 * (0.7 + 0.6 * noise(p / minor * 2.2 + 11, 7.7, t * 0.05));
    }
    function seed(i, anywhere) {
      ps[i] = anywhere ? Math.random() * total : Math.random() * 4 * unit;
      lane[i] = (Math.random() + Math.random() + Math.random()) / 1.5 - 1;
      spd[i] = 0.75 + Math.random() * 0.5;
    }
    function step(t, frames) {
      course(t);
      var base = 1.35 * unit * frames;
      for (var i = 0; i < n; i++) {
        var l = lane[i];
        ps[i] += base * spd[i] * (1 - 0.45 * l * l);
        l += (Math.random() - 0.5) * 0.012 * frames;
        lane[i] = l > 1 ? 1 : l < -1 ? -1 : l;
        if (ps[i] >= total) seed(i, false);
      }
    }
    function draw(t, fade) {
      ctx.globalAlpha = fade;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      var s = 1.15 * unit;
      for (var pass = 0; pass < 3; pass++) {
        ctx.fillStyle = INK[pass];
        for (var i = 0; i < n; i++) {
          if (kind[i] !== pass) continue;
          var f = ps[i] / ds, j = f | 0;
          if (j >= count - 1) continue;
          var r = f - j, o = width(ps[i], t) * lane[i];
          var px = cx[j] + (cx[j + 1] - cx[j]) * r + nx[j] * o;
          var py = cy[j] + (cy[j + 1] - cy[j]) * r + ny[j] * o;
          ctx.fillRect(px, py, s, s);
        }
      }
    }
    return {
      scale: 1, minScale: 1, maxScale: 1,
      dprCap: 1.5,
      resize: function (w, h, dpr) {
        canvas.width = w;
        canvas.height = h;
        W = w; H = h; unit = dpr;
        major = Math.max(w, h); minor = Math.min(w, h);
        var ang = w >= h ? 0.08 : Math.PI / 2 + 0.08;
        AX = Math.cos(ang); AY = Math.sin(ang);
        ds = 3 * dpr;
        var cssArea = (w / dpr) * (h / dpr);
        n = Math.round(Math.max(2500, Math.min(9000, cssArea / 120)));
        ps = new Float32Array(n); lane = new Float32Array(n);
        spd = new Float32Array(n); kind = new Uint8Array(n);
        course(0);
        for (var i = 0; i < n; i++) {
          seed(i, true);
          var r = Math.random();
          kind[i] = r < 0.5 ? 0 : r < 0.88 ? 1 : 2;
        }
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, H);
      },
      render: function (t, dt, still) {
        if (still) {
          ctx.fillStyle = BG;
          ctx.fillRect(0, 0, W, H);
          course(t - 2);
          for (var i = 0; i < n; i++) ps[i] = Math.random() * total;
          for (var k = 0; k < 120; k++) { var tk = t - (120 - k) / 60; step(tk, 1); draw(tk, 0.05); }
          return;
        }
        var frames = Math.min(3, dt * 60);
        step(t, frames);
        draw(t, 0.05 * frames);
      },
      lost: function () { return false; }
    };
  }

  var WORKS = {
    harbor: shaderWork(HARBOR, { scale: 0.55, minScale: 0.3, dprCap: 1.5, fps: 30 }),
    currents: currentsWork,
    smoke: shaderWork(SMOKE, { scale: 0.6, minScale: 0.3, dprCap: 1, fps: 30 })
  };

  var START = { harbor: 40, currents: 36, smoke: 24 };

  /* Runtime */

  var ICON_OPEN = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M2 7V2h5M13 2h5v5M18 13v5h-5M7 18H2v-5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M7 2v5H2M18 7h-5V2M13 18v-5h5M2 13h5v5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

  var running = [];
  var raf = 0;
  var last = 0;

  function Work(section) {
    var self = this;
    var kind = section.getAttribute('data-work');
    var stage = section.querySelector('.pj-stage');
    var canvas = document.createElement('canvas');
    stage.insertBefore(canvas, stage.firstChild);

    this.section = section;
    this.canvas = canvas;
    this.t = parseFloat(section.getAttribute('data-start')) || START[kind] || 0;
    this.visible = false;
    this.slow = 0;
    this.dirty = true;

    var impl = null;
    try { impl = WORKS[kind](canvas); } catch (e) { impl = null; }
    if (!impl) { this.fail(); return; }
    this.impl = impl;
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.fail(); });

    this.size();
  }

  Work.prototype.fail = function () {
    this.impl = null;
    this.section.classList.add('is-fallback');
    stop(this);
  };

  Work.prototype.size = function () {
    if (!this.impl) return;
    var dpr = Math.min(window.devicePixelRatio || 1, this.impl.dprCap || 2);
    var s = this.impl.scale;
    var w = Math.max(1, Math.round(this.section.clientWidth * dpr * s));
    var h = Math.max(1, Math.round(this.section.clientHeight * dpr * s));
    if (w === this.canvas.width && h === this.canvas.height) return;
    this.impl.resize(w, h, dpr * s);
    this.dirty = true;
  };

  Work.prototype.still = function () {
    if (!this.impl) return;
    this.impl.render(this.t, 0, true);
    this.dirty = false;
  };

  Work.prototype.adapt = function (dt, step) {
    var impl = this.impl;
    if (!impl || impl.scale <= impl.minScale) return;
    this.slow = dt > Math.max(0.034, (step || 0) * 1.5) ? this.slow + 1 : Math.max(0, this.slow - 1);
    if (this.slow > (step ? 20 : 40)) {
      impl.scale = Math.max(impl.minScale, impl.scale * 0.8);
      this.slow = 0;
      this.size();
    }
  };

  function frame(now) {
    raf = 0;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
    last = now;
    running.forEach(function (w) {
      if (!w.impl) return;
      w.t += dt;
      w.wait = (w.wait || 0) + dt;
      var step = w.impl.fps ? 1 / w.impl.fps : 0;
      if (w.wait + 0.004 < step) return;
      w.impl.render(w.t, w.wait, false);
      w.adapt(w.wait, step);
      w.wait = 0;
    });
    if (running.length) raf = requestAnimationFrame(frame);
  }

  function start(w) {
    if (!w.impl || reduceMQ.matches || document.hidden) return;
    if (running.indexOf(w) === -1) running.push(w);
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }

  function stop(w) {
    var i = running.indexOf(w);
    if (i !== -1) running.splice(i, 1);
  }

  function refresh(w) {
    if (!w.impl) return;
    w.size();
    if (w.visible && !reduceMQ.matches && !document.hidden) start(w);
    else {
      stop(w);
      if (w.visible && (w.dirty || reduceMQ.matches)) w.still();
    }
  }

  var works = Array.prototype.map.call(document.querySelectorAll('.pj-work'), function (s) { return new Work(s); });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (entry) {
        works.forEach(function (w) {
          if (w.section !== entry.target) return;
          w.visible = entry.isIntersecting;
          refresh(w);
        });
      });
    }, { rootMargin: '80px 0px' });
    works.forEach(function (w) { io.observe(w.section); });
  } else {
    works.forEach(function (w) { w.visible = true; refresh(w); });
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { works.forEach(refresh); }, 120);
  });
  document.addEventListener('visibilitychange', function () { works.forEach(refresh); });
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', function () { works.forEach(refresh); });

  /* Overlay */

  var canFull = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

  function fullElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }

  function isFull(w) { return fullElement() === w.section || w.section.classList.contains('is-full'); }

  function label(w) {
    var btn = w.section.querySelector('.pj-full');
    var name = w.section.querySelector('.pj-name').textContent;
    var on = isFull(w);
    btn.innerHTML = on ? ICON_CLOSE : ICON_OPEN;
    btn.setAttribute('aria-label', (on ? 'Exit fullscreen, ' : 'View fullscreen, ') + name);
  }

  function enter(w) {
    var el = w.section;
    if (canFull) {
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      var p = req.call(el);
      if (p && p.catch) p.catch(function () { fake(w, true); });
    } else {
      fake(w, true);
    }
  }

  function exit(w) {
    if (w.section.classList.contains('is-full')) { fake(w, false); return; }
    var ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (ex) ex.call(document);
  }

  function fake(w, on) {
    w.section.classList.toggle('is-full', on);
    document.documentElement.classList.toggle('pj-full-lock', on);
    label(w);
    refresh(w);
    w.section.querySelector('.pj-full').focus();
  }

  works.forEach(function (w) {
    var section = w.section;
    var btn = section.querySelector('.pj-full');
    btn.hidden = false;
    label(w);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (isFull(w)) exit(w); else enter(w);
    });

    section.addEventListener('click', function (e) {
      if (hoverMQ.matches && !isFull(w)) return;
      if (e.target.closest('.pj-full')) return;
      section.classList.toggle('is-revealed');
    });
  });

  document.addEventListener('click', function (e) {
    works.forEach(function (w) {
      if (!w.section.contains(e.target)) w.section.classList.remove('is-revealed');
    });
  });

  function onFullChange() {
    works.forEach(function (w) { label(w); refresh(w); });
  }
  document.addEventListener('fullscreenchange', onFullChange);
  document.addEventListener('webkitfullscreenchange', onFullChange);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    works.forEach(function (w) { if (w.section.classList.contains('is-full')) fake(w, false); });
  });
})();

/* ========== ROOM ========== */
(function () {
  'use strict';

  if (!document.body.classList.contains('rm')) return;

  var BASE_ADDRESS = 'salome.art/room';
  var BASE_TITLE = 'The room | Salome';
  var PRINTABLE = ['shared-calendar', 'access-to-the-space'];
  var CATEGORIES = ['conversations', 'documents', 'notices'];
  var NO_SUBJECT = '(no subject)';

  var root = document.body;
  var side = document.getElementById('rm-home');
  var nav = document.getElementById('rm-nav');
  var sw = side.querySelector('.rm-switch');
  var links = Array.prototype.slice.call(nav.querySelectorAll('.rm-nav__link'));
  var entries = Array.prototype.slice.call(document.querySelectorAll('.rm-entry'));
  var narrow = window.matchMedia('(max-width: 720px)');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var current = null;

  root.classList.add('sl-js', 'rm-js');

  /* Focus */

  var keyboard = false;
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('.browser-bar')) return;
    keyboard = true;
  }, true);
  document.addEventListener('pointerdown', function () { keyboard = false; }, true);

  function moveFocus(el) {
    el.classList.toggle('rm-quiet', !keyboard);
    if (!keyboard) {
      el.addEventListener('blur', function off() {
        el.classList.remove('rm-quiet');
        el.removeEventListener('blur', off);
      });
    }
    el.focus({ preventScroll: true });
  }

  /* Reply references */

  document.querySelectorAll('.rm-quote').forEach(function (q) {
    q.addEventListener('click', function (e) {
      var target = document.getElementById(q.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      target.classList.remove('is-flash');
      void target.offsetWidth;
      target.classList.add('is-flash');
      clearTimeout(target._flash);
      target._flash = setTimeout(function () { target.classList.remove('is-flash'); }, reduceMotion ? 1200 : 1900);
      moveFocus(target);
    });
  });

  /* Dialog */

  var DIALOGS = {
    'new': {
      title: 'new conversation',
      text: 'only Salome members and guest members can start conversations.'
    },
    reply: {
      title: 'reply to conversation',
      text: 'only Salome members and guest members can reply to conversations.'
    }
  };
  var dialog = document.getElementById('rm-dialog');
  var dialogClose = dialog.querySelector('.rm-dialog__close');
  var opener = null;
  var nativeDialog = typeof dialog.showModal === 'function';

  function openDialog(kind, btn) {
    opener = btn;
    dialog.querySelector('.rm-dialog__title').textContent = DIALOGS[kind].title;
    dialog.querySelector('.rm-dialog__text').textContent = DIALOGS[kind].text;
    if (nativeDialog) dialog.showModal();
    else dialog.setAttribute('open', '');
    dialogClose.focus();
  }

  function closeDialog() {
    if (nativeDialog) { if (dialog.open) dialog.close(); }
    else { dialog.removeAttribute('open'); afterClose(); }
  }

  function afterClose() {
    if (opener) opener.focus();
    opener = null;
  }

  dialog.addEventListener('close', afterClose);
  dialogClose.addEventListener('click', closeDialog);
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });
  if (!nativeDialog) {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && dialog.hasAttribute('open')) closeDialog();
    });
  }

  document.querySelectorAll('[data-dialog]').forEach(function (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      openDialog(btn.getAttribute('data-dialog'), btn);
    });
  });

  /* Expandable documents */

  function setOpen(btn, open) {
    var target = document.getElementById(btn.getAttribute('aria-controls'));
    target.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = btn.getAttribute(open ? 'data-close' : 'data-open');
    if (target.classList.contains('rm-plan')) sizePlan(target);
    var scroller = target.querySelector('.rm-plan__sheets');
    if (scroller) {
      if (open) {
        scroller.setAttribute('tabindex', '0');
        scroller.setAttribute('role', 'group');
        scroller.setAttribute('aria-label', 'floor plans, enlarged');
      } else {
        scroller.removeAttribute('tabindex');
        scroller.removeAttribute('role');
        scroller.removeAttribute('aria-label');
      }
    }
  }

  function sizePlan(plan) {
    plan.style.width = '';
    if (!plan.classList.contains('is-open') || narrow.matches || !plan.offsetParent) return;
    var main = document.getElementById('rm-main');
    var right = document.documentElement.clientWidth - parseFloat(getComputedStyle(main).paddingRight);
    var w = Math.min(1240, right - plan.getBoundingClientRect().left);
    if (w > plan.parentNode.clientWidth) plan.style.width = w + 'px';
  }
  window.addEventListener('resize', function () {
    document.querySelectorAll('.rm-plan').forEach(sizePlan);
  });

  var toggles = Array.prototype.slice.call(document.querySelectorAll('.rm-doc__toggle'));
  toggles.forEach(function (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () {
      setOpen(btn, btn.getAttribute('aria-expanded') !== 'true');
    });
  });

  /* Print view */

  var printId = new URLSearchParams(location.search).get('print');
  if (PRINTABLE.indexOf(printId) !== -1) {
    var doc = document.getElementById(printId);
    root.classList.add('rm-print');
    side.hidden = true;
    entries.forEach(function (e) { e.hidden = e !== doc; });
    toggles.forEach(function (btn) { if (doc.contains(btn)) setOpen(btn, true); });
    var bar = document.getElementById('rm-printbar');
    bar.hidden = false;
    bar.querySelector('.rm-printbar__back').setAttribute('href', 'salomeRoom.html#' + printId);
    bar.querySelector('.rm-printbar__print').addEventListener('click', function () { window.print(); });
    document.title = printId + '.pdf | ' + BASE_TITLE;
    document.documentElement.setAttribute('data-browser-address', BASE_ADDRESS + '/' + printId + '.pdf');
    return;
  }

  /* Mobile */

  function setSwitch(open) {
    sw.setAttribute('aria-expanded', open ? 'true' : 'false');
    side.classList.toggle('is-switching', open);
  }
  sw.hidden = false;
  sw.addEventListener('click', function () {
    setSwitch(sw.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', function (e) {
    if (dialog.open || dialog.hasAttribute('open')) return;
    if (e.key === 'Escape' && sw.getAttribute('aria-expanded') === 'true') {
      setSwitch(false);
      sw.focus();
    }
  });
  document.addEventListener('click', function (e) {
    if (!side.contains(e.target)) setSwitch(false);
  });

  /* Address */

  function entryFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return null;
    for (var i = 0; i < entries.length; i++) if (entries[i].id === id) return entries[i];
    return null;
  }

  function addressFor(entry) {
    return entry ? BASE_ADDRESS + '/' + entry.id : BASE_ADDRESS;
  }
  document.documentElement.setAttribute('data-browser-address', addressFor(entryFromHash()));

  function syncBar(entry) {
    var input = document.querySelector('.browser-bar .browser-input');
    if (input && document.activeElement !== input) input.value = addressFor(entry);
  }

  function linkFor(entry) {
    for (var i = 0; i < links.length; i++) if (links[i].getAttribute('href') === '#' + entry.id) return links[i];
    return null;
  }

  /* Routing */

  function showHome(hash) {
    var from = current;
    current = null;
    root.classList.add('rm-at-home');
    root.classList.remove('rm-at-entry');
    entries.forEach(function (e) { e.hidden = true; });
    links.forEach(function (a) { a.removeAttribute('aria-current'); });
    setSwitch(false);
    document.title = BASE_TITLE;
    syncBar(null);
    if (CATEGORIES.indexOf(hash) !== -1) {
      var label = document.getElementById('rm-nav-' + hash);
      if (label) label.scrollIntoView({ block: 'start' });
      return;
    }
    window.scrollTo(0, 0);
    if (from) {
      var link = linkFor(from);
      if (link) moveFocus(link);
    }
  }

  function showEntry(entry) {
    var switching = !!current;
    current = entry;
    root.classList.remove('rm-at-home');
    root.classList.add('rm-at-entry');
    entries.forEach(function (e) { e.hidden = e !== entry; });
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + entry.id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    var title = entry.querySelector('.rm-entry__title');
    var cat = entry.querySelector('.rm-entry__cat');
    sw.querySelector('.rm-switch__cat').textContent = cat ? cat.textContent : '';
    var subject = title.textContent.trim() || NO_SUBJECT;
    sw.querySelector('.rm-switch__title').textContent = subject;
    setSwitch(false);

    document.title = subject + ' | ' + BASE_TITLE;
    syncBar(entry);
    entry.querySelectorAll('.rm-plan').forEach(sizePlan);

    if (!switching || window.scrollY > 0) window.scrollTo(0, 0);
    moveFocus(title);
  }

  function route() {
    var entry = entryFromHash();
    if (entry) showEntry(entry);
    else showHome(decodeURIComponent(location.hash.slice(1)));
  }

  window.addEventListener('hashchange', route);
  route();
})();

/* ========== AFTERIMAGE ========== */
(function () {
  'use strict';

  function afterimage(stage) {
    if (!stage) return false;

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    var gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false });
    if (!gl) return false;

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    var VERT = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';

    var NOISE = [
      'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
      'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }',
      'float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }'
    ].join('\n');

    var SIM = [
      'precision highp float;',
      'varying vec2 uv;',
      'uniform sampler2D prev; uniform vec2 res; uniform float t;',
      NOISE,
      'void main(){',
      '  float asp = res.x / res.y;',
      '  vec2 q = uv - 0.5; q.x *= asp;',
      '  float a = 0.0016 * sin(t * 0.07);',
      '  q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q * 0.9965;',
      '  vec2 w = vec2(fbm(q * 2.4 + vec2(t * 0.031, 0.0)), fbm(q * 2.4 + vec2(5.2, -t * 0.027))) - 0.5;',
      '  q += w * 0.0042;',
      '  q.x /= asp; vec2 s = q + 0.5;',
      '  vec2 d = vec2(0.0007, 0.0002);',
      '  vec3 c = vec3(texture2D(prev, s + d).r, texture2D(prev, s).g, texture2D(prev, s - d).b);',
      '  c = c * 0.955 - 0.003;',
      '  vec2 e = smoothstep(0.0, 0.03, s) * smoothstep(1.0, 0.97, s);',
      '  c *= e.x * e.y;',
      '  vec2 r = uv; r.x *= asp;',
      '  float f = fbm(r * 1.6 + vec2(t * 0.018, -t * 0.012) + w * 1.5);',
      '  float line = smoothstep(0.035, 0.0, 0.475 - abs(fract(f * 6.0 + t * 0.035) - 0.5));',
      '  float band = 0.25 + 0.75 * smoothstep(0.38, 0.62, fbm(r * 0.9 - t * 0.01));',
      '  c += vec3(0.95, 0.93, 0.88) * line * band * 0.13;',
      '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
      '}'
    ].join('\n');

    var SHOW = [
      'precision highp float;',
      'varying vec2 uv;',
      'uniform sampler2D img; uniform float t; uniform vec2 res;',
      'float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
      'void main(){',
      '  vec3 c = texture2D(img, uv).rgb;',
      '  c = 1.0 - exp(-c * 2.0);',
      '  c = pow(c, vec3(1.08));',
      '  float g = hash(uv * res + fract(t) * 91.0) - 0.5;',
      '  float a = max(c.r, max(c.g, c.b));',
      '  c = clamp(c + g * 0.035 * a, 0.0, 1.0);',
      '  a = max(c.r, max(c.g, c.b));',
      '  gl_FragColor = vec4(vec3(0.96, 0.95, 0.925) * c, a);',
      '}'
    ].join('\n');

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function program(frag) {
      var pr = gl.createProgram();
      gl.attachShader(pr, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, frag));
      gl.bindAttribLocation(pr, 0, 'p');
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      var u = {};
      var n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) {
        var name = gl.getActiveUniform(pr, i).name;
        u[name] = gl.getUniformLocation(pr, name);
      }
      return { p: pr, u: u };
    }

    var sim, show;
    try {
      sim = program(SIM);
      show = program(SHOW);
    } catch (err) {
      return false;
    }

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var targets = [];
    var simW = 0, simH = 0, viewW = 0, viewH = 0;

    function makeTarget(w, h) {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex: tex, fb: fb };
    }

    function resize() {
      var rect = stage.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      var w = Math.max(2, Math.round(rect.width * dpr));
      var h = Math.max(2, Math.round(rect.height * dpr));
      if (w === viewW && h === viewH) return;
      viewW = canvas.width = w;
      viewH = canvas.height = h;
      var scale = Math.min(1, 900 / Math.max(w, h));
      simW = Math.max(2, Math.round(w * scale));
      simH = Math.max(2, Math.round(h * scale));
      targets.forEach(function (tg) { gl.deleteTexture(tg.tex); gl.deleteFramebuffer(tg.fb); });
      targets = [makeTarget(simW, simH), makeTarget(simW, simH)];
      warm(90);
      draw();
    }

    var t = Math.random() * 100;
    var frame = 0;

    function step(dt) {
      t += dt;
      var src = targets[frame % 2], dst = targets[(frame + 1) % 2];
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
      gl.viewport(0, 0, simW, simH);
      gl.useProgram(sim.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(sim.u.prev, 0);
      gl.uniform2f(sim.u.res, simW, simH);
      gl.uniform1f(sim.u.t, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frame++;
    }

    function draw() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, viewW, viewH);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(show.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targets[frame % 2].tex);
      gl.uniform1i(show.u.img, 0);
      gl.uniform1f(show.u.t, reduce.matches ? 0 : t);
      gl.uniform2f(show.u.res, viewW, viewH);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function warm(n) {
      for (var i = 0; i < n; i++) step(1 / 30);
    }

    var visible = false, running = false, prevTime = 0;

    function shouldRun() {
      return visible && !document.hidden && !reduce.matches;
    }

    var STEP = 1 / 60, acc = 0;

    function loop(now) {
      if (!shouldRun()) { running = false; return; }
      acc += Math.min(0.1, (now - prevTime) / 1000 || 0);
      prevTime = now;
      var n = 0;
      while (acc >= STEP && n < 4) { step(STEP); acc -= STEP; n++; }
      if (n === 4) acc = 0;
      if (n) draw();
      requestAnimationFrame(loop);
    }

    function wake() {
      if (running || !shouldRun()) return;
      running = true;
      prevTime = performance.now();
      requestAnimationFrame(loop);
    }

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      running = false;
      visible = false;
      stage.classList.remove('is-live');
      if (fallback) stage.appendChild(fallback);
    });

    var fallback = stage.querySelector('.sl-work__fallback');
    stage.insertBefore(canvas, stage.firstChild);
    stage.classList.add('is-live');
    if (fallback) stage.removeChild(fallback);
    resize();

    if (typeof window.ResizeObserver === 'function') new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);

    if (typeof window.IntersectionObserver === 'function') {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        wake();
      }, { rootMargin: '100px' }).observe(stage);
    } else {
      visible = true;
      wake();
    }

    document.addEventListener('visibilitychange', wake);
    if (reduce.addEventListener) reduce.addEventListener('change', wake);
    return true;
  }

  window.SalomeAfterimage = afterimage;
})();
