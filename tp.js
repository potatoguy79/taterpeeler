/* TaterPeeler web shell — WebGL / WebAudio / storage glue for the C game core (WebAssembly).
 * Made by Andres Campos. */
(function () {
  'use strict';
  const SAVE_KEY = 'taterpeeler.save.v1';
  const canvas = document.getElementById('game');
  const loader = document.getElementById('loader');
  const bar = document.getElementById('loader-bar');

  function readSave() { try { return localStorage.getItem(SAVE_KEY) || ''; } catch (e) { return ''; } }
  function writeSave(s) { try { localStorage.setItem(SAVE_KEY, s); } catch (e) { /* storage unavailable */ } }
  if (/dark=1/.test(readSave())) document.documentElement.classList.add('dark');

  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance' })
          || canvas.getContext('experimental-webgl', { antialias: true, alpha: false });
  if (!gl) {
    loader.querySelector('.msg').textContent = 'TaterPeeler needs WebGL, which this browser has turned off.';
    return;
  }
  const extUint = gl.getExtension('OES_element_index_uint');
  const extAniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  const qp = new URLSearchParams(location.search).get('q');
  const quality = qp === null ? 2 : Math.max(0, Math.min(2, parseInt(qp, 10) || 0));

  /* ---------------- assets ---------------- */
  const big = quality >= 2;
  const FILES = ['font.tpf', 'peeler.tpk', (big && extUint) ? 'potato_l3.tpm' : 'potato_l2.tpm'];
  const IMAGES = ['font_atlas.png', big ? 'potato_detail_2048.jpg' : 'potato_detail_1024.jpg'].concat(quality >= 1 ? [big ? 'potato_normal_2048.jpg' : 'potato_normal_1024.jpg'] : [])
    .concat([quality >= 1 ? 'logo_512.png' : 'logo_256.png', big ? 'wood_2048.jpg' : (quality >= 1 ? 'wood_1024.jpg' : 'wood_512.jpg')]);
  /* index = SFX_* id in the core; slot 0 (the old synthesized loop) is unused */
  const SOUNDS = [null, 'sfx_snap.wav', 'sfx_done.wav', 'sfx_land.wav', 'sfx_tap.wav', 'sfx_unlock.wav', 'sfx_tick.wav', 'sfx_timeup.wav', 'sfx_whoosh.wav']
    .concat([0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => 'sfx_stroke' + i + '.wav'))
    /* fry station */
    .concat([0, 1, 2].map(i => 'sfx_cut' + i + '.wav'), [0, 1, 2, 3, 4, 5].map(i => 'sfx_thump' + i + '.wav'),
            [0, 1, 2].map(i => 'sfx_scrape' + i + '.wav'),
            ['sfx_woodtap.wav', 'sfx_plop.wav', 'sfx_fryin.wav', 'sfx_fryloop.wav', 'sfx_clink.wav', 'sfx_paper.wav']);
  const files = {}, images = {}, soundData = {};
  let total = FILES.length + IMAGES.length + SOUNDS.filter(Boolean).length + 1, done = 0;
  function tick() { done++; bar.style.transform = 'scaleX(' + (done / total).toFixed(3) + ')'; }

  function b64(s) { const bin = atob(s.replace(/\s+/g, '')); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function loadBin(name) {
    /* hosts that only serve common file types get the data as base64 text */
    if (window.TP_DATA_B64) return fetch('data/' + name + '.txt').then(r => { if (!r.ok) throw new Error(name); return r.text(); }).then(t => { files[name] = b64(t); tick(); });
    return fetch('data/' + name).then(r => { if (!r.ok) throw new Error(name); return r.arrayBuffer(); }).then(b => { files[name] = new Uint8Array(b); tick(); });
  }
  function loadImg(name) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => { images[name] = im; tick(); res(); };
      im.onerror = () => rej(new Error(name));
      im.src = 'data/' + name;
    });
  }
  function loadSnd(name) { if (!name) return Promise.resolve(); return fetch('data/' + name).then(r => r.arrayBuffer()).then(b => { soundData[name] = b; tick(); }).catch(() => tick()); }
  const wasmP = fetch('taterpeeler.wasm').then(r => r.arrayBuffer()).then(b => { tick(); return b; });

  /* ---------------- audio ---------------- */
  let actx = null, master = null, buffers = [], unlocked = false;
  const music = new Audio('data/music.mp3');
  music.loop = true; music.preload = 'auto'; music.volume = 0.54;
  let minFrameMs = 0, lastFrameT = -1e9;   /* battery saver skips every other display frame */
  let musicWanted = false;
  const loops = {};
  function ensureAudio() {
    if (actx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    master = actx.createGain(); master.gain.value = 0.9; master.connect(actx.destination);
    SOUNDS.forEach((n, i) => {
      const data = n && soundData[n];
      if (!data) return;
      actx.decodeAudioData(data.slice(0), buf => { buffers[i] = buf; }, () => {});
    });
  }
  /* iOS: Web Audio follows the silent switch / Silent Mode unless the page asks for media playback,
     which is why the music (an <audio> element) played while the effects stayed quiet */
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
  let musicStarted = false;
  function unlockAudio() {
    ensureAudio();
    if (actx && actx.state !== 'running') {
      try { actx.resume(); } catch (e) {}
      /* a silent buffer started inside the touch is what finally wakes Safari's audio output */
      try { const b = actx.createBuffer(1, 1, 22050), s = actx.createBufferSource(); s.buffer = b; s.connect(actx.destination); s.start(0); } catch (e) {}
    }
    unlocked = true;
    if (musicWanted && !musicStarted) music.play().then(() => { musicStarted = true; }).catch(() => {});
  }
  /* keep listening: iOS only counts some gestures, and it suspends audio again after backgrounding */
  ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'keydown'].forEach(ev => window.addEventListener(ev, unlockAudio, { passive: true, capture: true }));

  /* ---------------- wasm instance ---------------- */
  let mem, u8, i32, f32, ex;
  function views() { if (!u8 || u8.buffer !== mem.buffer) { u8 = new Uint8Array(mem.buffer); i32 = new Int32Array(mem.buffer); f32 = new Float32Array(mem.buffer); } }
  const td = new TextDecoder('utf-8'), te = new TextEncoder();
  function str(p) { views(); let e = p; while (u8[e]) e++; return td.decode(u8.subarray(p, e)); }
  function putStr(s) { const b = te.encode(s + '\0'); const p = ex.tp_malloc(b.length); views(); u8.set(b, p); return p; }
  const filePtrs = {};

  const objs = { buf: [null], tex: [null], prog: [null], sh: [null], uni: [null] };
  function add(list, o) { list.push(o); return list.length - 1; }
  const uniCache = new Map();

  const glImports = {
    activeTexture: t => gl.activeTexture(t),
    attachShader: (p, s) => gl.attachShader(objs.prog[p], objs.sh[s]),
    bindAttribLocation: (p, i, n) => gl.bindAttribLocation(objs.prog[p], i, str(n)),
    bindBuffer: (t, b) => gl.bindBuffer(t, objs.buf[b]),
    bindTexture: (t, x) => gl.bindTexture(t, objs.tex[x]),
    blendFunc: (a, b) => gl.blendFunc(a, b),
    blendFuncSeparate: (a, b, c, d) => gl.blendFuncSeparate(a, b, c, d),
    bufferData: (t, size, ptr, usage) => { if (!ptr) gl.bufferData(t, size, usage); else { views(); gl.bufferData(t, u8.subarray(ptr, ptr + size), usage); } },
    bufferSubData: (t, off, size, ptr) => { views(); gl.bufferSubData(t, off, u8.subarray(ptr, ptr + size)); },
    clear: m => gl.clear(m),
    clearColor: (r, g, b, a) => gl.clearColor(r, g, b, a),
    compileShader: s => gl.compileShader(objs.sh[s]),
    createProgram: () => add(objs.prog, gl.createProgram()),
    createShader: t => add(objs.sh, gl.createShader(t)),
    cullFace: m => gl.cullFace(m),
    depthFunc: f => gl.depthFunc(f),
    depthMask: f => gl.depthMask(!!f),
    disable: c => gl.disable(c),
    disableVertexAttribArray: i => gl.disableVertexAttribArray(i),
    drawArrays: (m, f, c) => gl.drawArrays(m, f, c),
    drawElements: (m, c, t, o) => gl.drawElements(m, c, t, o),
    enable: c => gl.enable(c),
    enableVertexAttribArray: i => gl.enableVertexAttribArray(i),
    frontFace: m => gl.frontFace(m),
    genBuffer: () => add(objs.buf, gl.createBuffer()),
    getProgramiv: (p, pn, out) => { views(); i32[out >> 2] = gl.getProgramParameter(objs.prog[p], pn) ? 1 : 0; },
    getShaderiv: (s, pn, out) => { views(); i32[out >> 2] = gl.getShaderParameter(objs.sh[s], pn) ? 1 : 0; },
    getShaderInfoLog: (s, max, lenp, bufp) => { const l = (gl.getShaderInfoLog(objs.sh[s]) || '').slice(0, max - 1); console.warn(l); views(); const b = te.encode(l); u8.set(b, bufp); u8[bufp + b.length] = 0; if (lenp) i32[lenp >> 2] = b.length; },
    getProgramInfoLog: (p, max, lenp, bufp) => { const l = (gl.getProgramInfoLog(objs.prog[p]) || '').slice(0, max - 1); console.warn(l); views(); const b = te.encode(l); u8.set(b, bufp); u8[bufp + b.length] = 0; if (lenp) i32[lenp >> 2] = b.length; },
    getUniformLocation: (p, n) => { const loc = gl.getUniformLocation(objs.prog[p], str(n)); return loc ? add(objs.uni, loc) : -1; },
    linkProgram: p => gl.linkProgram(objs.prog[p]),
    scissor: (x, y, w, h) => gl.scissor(x, y, w, h),
    shaderSource1: (s, p) => gl.shaderSource(objs.sh[s], str(p)),
    uniform1f: (l, x) => { if (l > 0) gl.uniform1f(objs.uni[l], x); },
    uniform1i: (l, x) => { if (l > 0) gl.uniform1i(objs.uni[l], x); },
    uniform2f: (l, x, y) => { if (l > 0) gl.uniform2f(objs.uni[l], x, y); },
    uniform3f: (l, x, y, z) => { if (l > 0) gl.uniform3f(objs.uni[l], x, y, z); },
    uniform4f: (l, x, y, z, w) => { if (l > 0) gl.uniform4f(objs.uni[l], x, y, z, w); },
    uniform3fv: (l, n, p) => { if (l > 0) { views(); gl.uniform3fv(objs.uni[l], f32.subarray(p >> 2, (p >> 2) + 3 * n)); } },
    uniform4fv: (l, n, p) => { if (l > 0) { views(); gl.uniform4fv(objs.uni[l], f32.subarray(p >> 2, (p >> 2) + 4 * n)); } },
    uniformMatrix4fv: (l, n, t, p) => { if (l > 0) { views(); gl.uniformMatrix4fv(objs.uni[l], false, f32.subarray(p >> 2, (p >> 2) + 16 * n)); } },
    useProgram: p => gl.useProgram(objs.prog[p]),
    vertexAttribPointer: (i, s, t, n, st, o) => gl.vertexAttribPointer(i, s, t, !!n, st, o),
    viewport: (x, y, w, h) => gl.viewport(x, y, w, h),
    colorMask: (r, g, b, a) => gl.colorMask(!!r, !!g, !!b, !!a),
    vertexAttrib4f: (i, x, y, z, w) => gl.vertexAttrib4f(i, x, y, z, w),
  };

  let cursorKind = -1;
  const envImports = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, atan2: Math.atan2, exp: Math.exp, pow: Math.pow, acos: Math.acos, log: Math.log,
    logmsg: p => console.log('[TaterPeeler]', str(p)),
    plat_file: (np, sp) => {
      const n = str(np); const f = filePtrs[n];
      views();
      if (!f) { if (sp) i32[sp >> 2] = 0; return 0; }
      if (sp) i32[sp >> 2] = f.size;
      return f.ptr;
    },
    plat_texture: (np, wp, hp, flags) => {
      const n = str(np); const im = images[n];
      if (!im) return 0;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      const fmt = (flags & 2) ? gl.LUMINANCE : gl.RGB;
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, im);
      const mip = (flags & 1) || (flags & 2);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, (flags & 2) ? gl.CLAMP_TO_EDGE : gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, (flags & 2) ? gl.CLAMP_TO_EDGE : gl.REPEAT);
      if (extAniso && !(flags & 2)) gl.texParameterf(gl.TEXTURE_2D, extAniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(extAniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      views();
      if (wp) i32[wp >> 2] = im.naturalWidth; if (hp) i32[hp >> 2] = im.naturalHeight;
      return add(objs.tex, t);
    },
    plat_save: p => { const s = str(p); writeSave(s); document.documentElement.classList.toggle('dark', /dark=1/.test(s)); },
    plat_sound: (id, vol, rate) => {
      if (!actx || !buffers[id] || actx.state !== 'running') return;
      const src = actx.createBufferSource(); src.buffer = buffers[id]; src.playbackRate.value = rate;
      const g = actx.createGain(); g.gain.value = vol; src.connect(g); g.connect(master); src.start();
    },
    plat_loop: (id, vol, rate) => {   /* a looping sound (the fryer); faded rather than cut */
      if (!actx || !buffers[id] || actx.state !== 'running') return;
      let L = loops[id];
      const now = actx.currentTime;
      if (vol <= 0.001) {
        if (L && !L.stopped && !L.stopAt) {
          L.g.gain.setTargetAtTime(0, now, 0.08); L.stopAt = now + 0.6;
          setTimeout(() => { if (L.stopAt && actx.currentTime >= L.stopAt - 0.05) { try { L.src.stop(); } catch (e) {} L.stopped = true; } }, 700);
        }
        return;
      }
      if (!L || L.stopped) {
        const src = actx.createBufferSource(); src.buffer = buffers[id]; src.loop = true;
        const g = actx.createGain(); g.gain.value = 0; src.connect(g); g.connect(master);
        src.start(0, Math.random() * buffers[id].duration);
        L = loops[id] = { src, g, stopped: false, stopAt: 0 };
      }
      L.stopAt = 0;
      L.g.gain.setTargetAtTime(vol, now, 0.05);
      L.src.playbackRate.value = rate;
    },
    plat_download: () => { if (window.TP_DOWNLOAD_PAGE) location.href = window.TP_DOWNLOAD_PAGE; },
    plat_music_volume: v => { music.volume = Math.max(0, Math.min(1, v * 1.1)); },
    plat_frame_rate: fps => { minFrameMs = fps >= 60 ? 0 : 1000 / fps - 4; },
    plat_music: on => { musicWanted = !!on; if (on) { if (unlocked) music.play().then(() => { musicStarted = true; }).catch(() => {}); } else { music.pause(); musicStarted = false; } },
    plat_cursor: k => {
      if (k === cursorKind) return; cursorKind = k;
      canvas.style.cursor = k === 1 ? 'pointer' : k === 2 ? 'grabbing' : k === 3 ? 'none' : 'default';
    },
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(window.innerWidth * dpr)), h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (ex) ex.tp_resize(w, h, w / window.innerWidth);
  }

  function hookInput() {
    const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      const [x, y] = pos(e);
      ex.tp_pointer(0, e.pointerId, x, y, e.button === 2 ? 2 : 0, e.pointerType === 'touch' ? 1 : 0);
    });
    canvas.addEventListener('pointermove', e => {
      const [x, y] = pos(e);
      const touch = e.pointerType === 'touch' ? 1 : 0;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      const list = evs && evs.length ? evs : [e];
      for (const ce of list) {
        const [cx, cy] = ce === e ? [x, y] : pos(ce);
        ex.tp_pointer(e.buttons ? 1 : 4, e.pointerId, cx, cy, 0, touch);
      }
    });
    const up = t => e => { const [x, y] = pos(e); ex.tp_pointer(t, e.pointerId, x, y, e.button === 2 ? 2 : 0, e.pointerType === 'touch' ? 1 : 0); };
    canvas.addEventListener('pointerup', up(2));
    canvas.addEventListener('pointercancel', up(3));
    canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !e.buttons) { const [x, y] = pos(e); ex.tp_pointer(5, e.pointerId, x, y, 0, 0); } });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      ex.tp_wheel(e.deltaX * k, e.deltaY * k);
    }, { passive: false });
    window.addEventListener('keydown', e => {
      const map = { Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
      let k = map[e.key] || (e.key && e.key.length === 1 ? e.key.charCodeAt(0) : 0);
      if (k) { ex.tp_key(k, 1); if (k >= 37 && k <= 40) e.preventDefault(); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { ex.tp_background(); music.pause(); musicStarted = false; }
      else if (musicWanted && unlocked) music.play().then(() => { musicStarted = true; }).catch(() => {});
    });
    window.addEventListener('resize', resize);
  }

  /* WebAssembly first; a plain-JavaScript build of the same core covers hosts that block it */
  function instantiate(bytes, imports) {
    const fallback = err => {
      console.warn('[TaterPeeler] WebAssembly unavailable, using the JavaScript build', err && err.message);
      return new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'taterpeeler.asm.js';
        s.onload = () => { try { res(window.__tpAsmFactory(imports)); } catch (e) { rej(e); } };
        s.onerror = () => rej(new Error('taterpeeler.asm.js'));
        document.head.appendChild(s);
      });
    };
    if (!bytes || typeof WebAssembly === 'undefined' || /nowasm/.test(location.search)) return fallback(new Error('no WebAssembly'));
    try { return WebAssembly.instantiate(bytes, imports).then(r => r.instance.exports, fallback); }
    catch (e) { return fallback(e); }
  }
  Promise.all([wasmP.catch(() => null), ...FILES.map(loadBin), ...IMAGES.map(loadImg), ...SOUNDS.map(loadSnd)]).then(([wasmBytes]) => {
    return instantiate(wasmBytes, { env: envImports, gl: glImports });
  }).then(exports => {
    ex = exports; mem = ex.memory;
    for (const n of FILES) {
      const d = files[n]; const p = ex.tp_malloc(d.length); views(); u8.set(d, p);
      filePtrs[n] = { ptr: p, size: d.length };
    }
    const saveP = putStr(readSave());
    resize();
    ex.tp_init(quality, extUint ? 1 : 0, saveP);
    if (new URLSearchParams(location.search).get('icon')) ex.tp_set_flags(new URLSearchParams(location.search).get("dbg") ? 31 : 15);   /* staged scene used for the app icon */
    else if (window.TP_DOWNLOAD_PAGE) ex.tp_set_flags(32);   /* the website shows a Download button on the menu */
    resize();
    hookInput();
    loader.classList.add('gone');
    setTimeout(() => loader.remove(), 600);
    const frame = t => {
      requestAnimationFrame(frame);
      if (t - lastFrameT < minFrameMs) return;
      lastFrameT = t; ex.tp_frame(t / 1000);
    };
    requestAnimationFrame(frame);
    window.__taterpeeler = { exports: ex };
  }).catch(err => {
    console.error(err);
    loader.querySelector('.msg').textContent = 'TaterPeeler could not load its files. Reload the page to try again.';
  });
})();
