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
  function readFlag(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function writeFlag(key, value) { try { localStorage.setItem(key, String(value)); } catch (e) { /* storage unavailable */ } }

  if (/dark=1/.test(readSave())) document.documentElement.classList.add('dark');

  /* the language: the one picked in Settings (lng= in the save), or the browser's. Same order as the game's list. */
  const LANG_CODES = ['en', 'zh', 'es', 'es-ES', 'ru', 'pt', 'de', 'ja', 'fr', 'ko', 'pl', 'tr', 'pirate'];
  const LANG_PACK = { zh: 'zh', ru: 'ru', ja: 'ja', ko: 'ko' };
  function langFromLocale(l) {
    l = (l || '').toLowerCase().replace('_', '-');
    if (/^es-es/.test(l)) return 'es-ES';
    const k = l.slice(0, 2);
    return ['zh', 'es', 'ru', 'pt', 'de', 'ja', 'fr', 'ko', 'pl', 'tr'].includes(k) ? k : 'en';
  }
  const LANG = (() => { const m = /(?:^|;)lng=(-?\d+)/.exec(readSave()); const i = m ? parseInt(m[1], 10) : -1;
    return i >= 0 && i < LANG_CODES.length ? LANG_CODES[i] : langFromLocale(navigator.language); })();
  /* the page's own few words (the game's are in data/lang_*.txt) */
  const WORDS = {
    load: { en: 'Loading potatoes', zh: '正在加载土豆', es: 'Cargando papas', 'es-ES': 'Cargando patatas', ru: 'Загружаем картошку', pt: 'Carregando batatas', de: 'Kartoffeln werden geladen', ja: 'じゃがいもを読み込み中', fr: 'Chargement des patates', ko: '감자 불러오는 중', pl: 'Ładowanie ziemniaków', tr: 'Patatesler yükleniyor', pirate: 'Haulin\' aboard the spuds' },
    wait: { en: 'This may take a few minutes.', zh: '这可能需要几分钟。', es: 'Esto puede tardar unos minutos.', 'es-ES': 'Esto puede tardar unos minutos.', ru: 'Это может занять несколько минут.', pt: 'Isso pode levar alguns minutos.', de: 'Das kann ein paar Minuten dauern.', ja: '数分かかることがあります。', fr: 'Cela peut prendre quelques minutes.', ko: '몇 분 정도 걸릴 수 있어요.', pl: 'To może potrwać kilka minut.', tr: 'Bu birkaç dakika sürebilir.', pirate: 'This may take a few turns o\' the hourglass.' },
    joke: { en: 'Lol u thought - please wait', zh: '哈哈，想得美——请稍等', es: 'Jaja, eso creías - espera, por favor', 'es-ES': 'Jaja, eso creías - espera, por favor', ru: 'Ха, размечтался - подожди, пожалуйста', pt: 'Kkk achou errado - espera aí', de: 'Haha, dachtest du - bitte warten', ja: 'なーんちゃって - もう少し待ってね', fr: 'Mdr, tu croyais - patiente encore', ko: 'ㅋㅋ 속았지 - 잠시만 기다려 줘', pl: 'Haha, myślałeś - poczekaj chwilę', tr: 'Haha, öyle sandın - lütfen bekle', pirate: 'Har har, ye thought - hold fast' },
    game: { en: 'While you wait for TaterPeeler to load. Play this minigame.', zh: '等待 TaterPeeler 加载时，来玩玩这个小游戏吧。', es: 'Mientras esperas a que cargue TaterPeeler, juega este minijuego.', 'es-ES': 'Mientras esperas a que cargue TaterPeeler, juega a este minijuego.', ru: 'Пока TaterPeeler загружается, сыграй в эту мини-игру.', pt: 'Enquanto o TaterPeeler carrega, jogue este minigame.', de: 'Während TaterPeeler lädt: Spiel dieses Minispiel.', ja: 'TaterPeeler の読み込みを待つ間、このミニゲームで遊んでね。', fr: 'Pendant que TaterPeeler se charge, joue à ce mini-jeu.', ko: 'TaterPeeler가 로딩되는 동안 이 미니게임을 해 보세요.', pl: 'Zanim TaterPeeler się załaduje, zagraj w tę minigrę.', tr: 'TaterPeeler yüklenirken bu mini oyunu oyna.', pirate: 'While ye wait fer TaterPeeler to load. Play this wee game.' },
    swipe: { en: 'Swipe to steer the peeler', zh: '滑动来控制削皮器', es: 'Desliza para mover el pelador', 'es-ES': 'Desliza para mover el pelador', ru: 'Проводи пальцем, чтобы рулить овощечисткой', pt: 'Deslize para guiar o descascador', de: 'Wische, um den Schäler zu lenken', ja: 'スワイプでピーラーを動かそう', fr: 'Glisse pour diriger l\'éplucheur', ko: '밀어서 필러를 움직이세요', pl: 'Przesuń palcem, by sterować obieraczką', tr: 'Soyacağı yönlendirmek için kaydır', pirate: 'Swipe to steer yer peeler' },
    keys: { en: 'Arrow keys or WASD to steer the peeler', zh: '用方向键或 WASD 控制削皮器', es: 'Flechas o WASD para mover el pelador', 'es-ES': 'Flechas o WASD para mover el pelador', ru: 'Стрелки или WASD, чтобы рулить овощечисткой', pt: 'Setas ou WASD para guiar o descascador', de: 'Pfeiltasten oder WASD zum Lenken des Schälers', ja: '矢印キーか WASD でピーラーを動かそう', fr: 'Flèches ou WASD pour diriger l\'éplucheur', ko: '방향키나 WASD로 필러를 움직이세요', pl: 'Strzałki lub WASD, by sterować obieraczką', tr: 'Soyacağı yönlendirmek için ok tuşları veya WASD', pirate: 'Arrow keys or WASD to steer yer peeler' },
    peeled: { en: 'Peeled: ', zh: '已削皮：', es: 'Peladas: ', 'es-ES': 'Peladas: ', ru: 'Очищено: ', pt: 'Descascadas: ', de: 'Geschält: ', ja: 'むいた数：', fr: 'Épluchées : ', ko: '깎은 수: ', pl: 'Obrane: ', tr: 'Soyulan: ', pirate: 'Spuds skinned: ' },
    oops: { en: 'Oops! Again...', zh: '哎呀！再来…', es: '¡Uy! Otra vez...', 'es-ES': '¡Uy! Otra vez...', ru: 'Ой! Ещё раз...', pt: 'Ops! De novo...', de: 'Hoppla! Nochmal...', ja: 'あっ！もう一回…', fr: 'Oups ! Encore...', ko: '앗! 다시...', pl: 'Ups! Jeszcze raz...', tr: 'Hay aksi! Tekrar...', pirate: 'Blimey! Again...' },
    cancel: { en: 'Cancel', zh: '取消', es: 'Cancelar', 'es-ES': 'Cancelar', ru: 'Отмена', pt: 'Cancelar', de: 'Abbrechen', ja: 'キャンセル', fr: 'Annuler', ko: '취소', pl: 'Anuluj', tr: 'İptal', pirate: 'Belay that' },
    ok: { en: 'OK', zh: '确定', es: 'OK', 'es-ES': 'Vale', ru: 'ОК', pt: 'OK', de: 'OK', ja: 'OK', fr: 'OK', ko: '확인', pl: 'OK', tr: 'Tamam', pirate: 'Aye' },
    nowebgl: { en: 'TaterPeeler needs WebGL, which this browser has turned off. Please try another browser.' },
    failed: { en: 'TaterPeeler could not load its files. Reload the page to try again. If this persists please inform me.' }
  };
  function W(k) { const w = WORDS[k]; return (w && (w[LANG] || w.en)) || ''; }
  {
    const m = loader.querySelector('.msg'), sb = loader.querySelector('.msg-sub');
    if (LANG !== 'en') { if (m) m.textContent = W('load'); if (sb) sb.textContent = W('wait'); }
  }

  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance' })
          || canvas.getContext('experimental-webgl', { antialias: true, alpha: false });
  if (!gl) {
    loader.querySelector('.msg').textContent = 'TaterPeeler needs WebGL, which this browser has turned off. Please try another browser.';
    return;
  }
  const extUint = gl.getExtension('OES_element_index_uint');
  const extAniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  const qp = new URLSearchParams(location.search).get('q');
  const quality = qp === null ? 2 : Math.max(0, Math.min(2, parseInt(qp, 10) || 0));

  /* ---------------- random shit called assets ---------------- */
  const big = quality >= 2;
  const FILES = ['font.tpf', 'peeler.tpk', (big && extUint) ? 'potato_l3.tpm' : (quality === 0 ? 'potato_l1.tpm' : 'potato_l2.tpm')];
  const IMAGES = ['font_atlas.png', big ? 'potato_detail_2048.jpg' : 'potato_detail_1024.jpg'].concat(quality >= 1 ? [big ? 'potato_normal_2048.jpg' : 'potato_normal_1024.jpg'] : [])
    .concat([quality >= 1 ? 'logo_512.png' : 'logo_256.png', big ? 'wood_2048.jpg' : (quality >= 1 ? 'wood_1024.jpg' : 'wood_512.jpg')])
    .concat(quality === 0 ? ['potato_mix_1024.png'] : []);
  /* index = SFX_* id in the core; slot 0 (the old synthesized loop) is unused -idk what that means chatgpt told me to fix that */
  const SOUNDS = [null, 'sfx_snap.wav', 'sfx_done.wav', 'sfx_land.wav', 'sfx_tap.wav', 'sfx_unlock.wav', 'sfx_tick.wav', 'sfx_timeup.wav', 'sfx_whoosh.wav']
    .concat([0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => 'sfx_stroke' + i + '.wav'))
    /* fry station ouuu fries yum */
    .concat([0, 1, 2].map(i => 'sfx_cut' + i + '.wav'), [0, 1, 2, 3, 4, 5].map(i => 'sfx_thump' + i + '.wav'),
            [0, 1, 2].map(i => 'sfx_scrape' + i + '.wav'),
            ['sfx_woodtap.wav', 'sfx_plop.wav', 'sfx_fryin.wav', 'sfx_fryloop.wav', 'sfx_clink.wav', 'sfx_paper.wav'])
    /* 2.0: salt shaker, coins, the screaming potato */
    .concat(['sfx_salt0.wav', 'sfx_salt1.wav', 'sfx_salt2.wav', 'sfx_coin.wav', 'sfx_coins.wav', 'sfx_scream0.wav', 'sfx_scream1.wav'])
    /* the Baked Potato's tin foil */
    .concat(['sfx_foil0.wav', 'sfx_foil1.wav', 'sfx_foil2.wav']);
  const files = {}, images = {}, soundData = {};
  let total = FILES.length + IMAGES.length + SOUNDS.filter(Boolean).length + 1, done = 0;
  let joking = false;
  function tick() { done++; if (!joking) bar.style.transform = 'scaleX(' + (done / total).toFixed(3) + ')'; }
  /* still loading after 10 seconds: a little game to play meanwhile. The snake is a peeler, the apples are
     potatoes; run the peeler over one to peel it, and a new one turns up somewhere else. */
  setTimeout(() => { if (done < total && document.getElementById('loader')) waitGame(); }, 10000);
  function waitGame() {
    const st = document.createElement('style');
    st.textContent = `
      #tp-wait { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 18px; opacity: 0; transition: opacity .4s ease; }
      #tp-wait.on { opacity: 1; }
      #tp-wait .t { color: var(--ink); font-size: 15px; font-weight: 600; text-align: center; max-width: 320px; }
      #tp-wait canvas { position: static; width: 336px; height: 252px; max-width: calc(100vw - 32px); height: auto; aspect-ratio: 4 / 3; border-radius: 16px; background: color-mix(in srgb, var(--hair) 45%, var(--bg));
        box-shadow: inset 0 0 0 1px var(--hair); touch-action: none; }
      #tp-wait .h { font-size: 12px; color: var(--soft); }`;
    document.head.appendChild(st);
    const box = document.createElement('div'); box.id = 'tp-wait';
    const title = document.createElement('div'); title.className = 't';
    title.textContent = W('game');
    const cv = document.createElement('canvas');
    const hint = document.createElement('div'); hint.className = 'h';
    hint.textContent = ('ontouchstart' in window) ? W('swipe') : W('keys');
    box.append(title, cv, hint); loader.appendChild(box);
    requestAnimationFrame(() => box.classList.add('on'));
    const COLS = 16, ROWS = 12, CELL = 21, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = COLS * CELL * dpr; cv.height = ROWS * CELL * dpr;
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    /* the UI tap sound for each potato peeled */
    let tap = null;
    try {
      if (window.TP_DATA_B64) fetch('data/sfx_tap.wav.txt').then(r => r.text()).then(t => { tap = new Audio('data:audio/wav;base64,' + t.replace(/\s+/g, '')); });
      else tap = new Audio('data/sfx_tap.wav');
    } catch (e) {}
    const click = () => { try { if (tap) { const a = tap.cloneNode(); a.volume = 0.7; a.play().catch(() => {}); } } catch (e) {} };
    let snake, dir, next, potato, peeled, score, alive, stepMs, last = 0, flash = 0;
    function reset() {
      snake = [{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }]; dir = { x: 1, y: 0 }; next = dir;
      score = 0; alive = true; stepMs = 150; peeled = null; place();
    }
    function place() {
      let p, tries = 0;
      do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
      while (snake.some(c => c.x === p.x && c.y === p.y) && ++tries < 200);
      potato = p;
    }
    function turn(x, y) { if (x === -dir.x && y === -dir.y) return; next = { x, y }; }
    const keys = e => {
      if (!document.getElementById('tp-wait')) { window.removeEventListener('keydown', keys); return; }
      const k = e.key, m = { ArrowUp: [0, -1], w: [0, -1], W: [0, -1], ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0], ArrowRight: [1, 0], d: [1, 0], D: [1, 0] }[k];
      if (m) { turn(m[0], m[1]); e.preventDefault(); }
    };
    window.addEventListener('keydown', keys);
    let sx = 0, sy = 0;
    loader.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    loader.addEventListener('touchmove', e => {
      const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy));
      sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
    function drawPotato(p, pe) {
      const cx = p.x * CELL + CELL / 2, cy = p.y * CELL + CELL / 2;
      g.save(); g.translate(cx, cy); g.rotate(0.35);
      g.fillStyle = pe ? '#F3E6C6' : '#97704E';
      g.beginPath(); g.ellipse(0, 0, 8.5, 6.2, 0, 0, Math.PI * 2); g.fill();
      if (!pe) { g.fillStyle = '#5E4430'; for (const [ex, ey] of [[-3, -1.5], [2.5, 1.8], [4, -2.2]]) { g.beginPath(); g.arc(ex, ey, 0.9, 0, 7); g.fill(); } }
      g.restore();
    }
    function drawPeeler(c, d) {   /* a little Y peeler, blade first */
      const cx = c.x * CELL + CELL / 2, cy = c.y * CELL + CELL / 2;
      g.save(); g.translate(cx, cy); g.rotate(Math.atan2(d.y, d.x) + Math.PI / 2);
      g.strokeStyle = css('--ink'); g.lineWidth = 2.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-6.5, -6); g.quadraticCurveTo(-6, 1, 0, 2); g.quadraticCurveTo(6, 1, 6.5, -6); g.stroke();
      g.lineWidth = 3.2; g.beginPath(); g.moveTo(0, 2); g.lineTo(0, 9.5); g.stroke();
      g.strokeStyle = '#B8BEC6'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6, -6.5); g.lineTo(6, -6.5); g.stroke();
      g.restore();
    }
    function frame(t) {
      if (!document.getElementById('tp-wait')) { window.removeEventListener('keydown', keys); return; }
      requestAnimationFrame(frame);
      if (t - last >= stepMs && alive) {
        last = t; dir = next;
        const h = { x: (snake[0].x + dir.x + COLS) % COLS, y: (snake[0].y + dir.y + ROWS) % ROWS };   /* the walls wrap round */
        if (snake.some(c => c.x === h.x && c.y === h.y)) { alive = false; flash = t; setTimeout(reset, 1100); }
        else {
          snake.unshift(h);
          if (h.x === potato.x && h.y === potato.y) {   /* peeled it */
            score++; click(); peeled = { x: h.x, y: h.y, t };
            place(); stepMs = Math.max(85, stepMs - 3);
          } else snake.pop();
        }
      }
      g.clearRect(0, 0, COLS * CELL, ROWS * CELL);
      if (peeled && t - peeled.t < 280) drawPotato(peeled, true);   /* a moment of bare potato before it's gone */
      drawPotato(potato, false);
      /* the peel trails behind the peeler as one ribbon (broken where it wraps round an edge) */
      g.globalAlpha = alive ? 1 : 0.5;
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const [w, col] of [[11, '#8C6A48'], [5, '#E9D8B4']]) {   /* brown skin, pale inside showing */
        g.lineWidth = w; g.strokeStyle = col; g.beginPath();
        for (let i = 0; i < snake.length; i++) {
          const c = snake[i], X = c.x * CELL + CELL / 2, Y = c.y * CELL + CELL / 2;
          if (i === 0 || Math.abs(c.x - snake[i - 1].x) + Math.abs(c.y - snake[i - 1].y) > 1) g.moveTo(X, Y); else g.lineTo(X, Y);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
      drawPeeler(snake[0], dir);
      g.fillStyle = css('--soft'); g.font = '600 12px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
      g.fillText(W('peeled') + score, 8, 16);
      if (!alive) { g.fillStyle = css('--ink'); g.font = '700 16px -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
        g.textAlign = 'center'; g.fillText(W('oops'), COLS * CELL / 2, ROWS * CELL / 2); g.textAlign = 'left'; }
    }
    reset(); requestAnimationFrame(frame);
  }

  /* a slow connection (over 10 seconds), once per visit: the bar shoots to the end... and slides back */
  setTimeout(() => {
    if (done >= total || !document.getElementById('loader')) return;
    try { if (sessionStorage.getItem('tp.joke')) return; sessionStorage.setItem('tp.joke', '1'); } catch (e) { return; }
    const msg = loader.querySelector('.msg'), sub = loader.querySelector('.msg-sub');
    const was = msg ? msg.textContent : '', wasSub = sub ? sub.textContent : '';
    joking = true;
    bar.style.transition = 'transform .45s cubic-bezier(.2,.9,.3,1)';
    bar.style.transform = 'scaleX(1)';
    setTimeout(() => {
      if (msg) msg.textContent = W('joke');
      if (sub) sub.textContent = '';
      bar.style.transition = 'transform .9s ease-in-out';
      bar.style.transform = 'scaleX(0)';
    }, 900);
    setTimeout(() => {
      joking = false;
      bar.style.transition = '';
      bar.style.transform = 'scaleX(' + (done / total).toFixed(3) + ')';
      if (msg) msg.textContent = was; if (sub) sub.textContent = wasSub;
    }, 3600);
  }, 10000);

  function b64(s) { const bin = atob(s.replace(/\s+/g, '')); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function loadBin(name) {
    /* hosts that only serve common file types get the data as base64 text -#sounded so pro*/
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
  /* a language's words and letters: fetched when it's picked (or before the game starts, for the saved one) */
  const lazyF = {};
  function lazyFile(n) {
    if (files[n] || lazyF[n]) return;
    lazyF[n] = 1;
    fetch('data/' + n).then(r => { if (!r.ok) throw new Error(n); return r.arrayBuffer(); })
      .then(b => { files[n] = new Uint8Array(b); })
      .catch(() => { setTimeout(() => { lazyF[n] = 0; }, 4000); });
  }
  function langFiles(code) {
    if (code === 'en') return { files: [], images: [] };
    const p = LANG_PACK[code];
    return { files: ['lang_' + code + '.txt'].concat(p ? ['font_' + p + '.tpf'] : []), images: p ? ['font_atlas_' + p + '.png'] : [] };
  }
  /* kitchen pictures are fetched the first time the game asks for them, so the page never waits for all of them */
  const lazy = {};
  function lazyImage(n) {
    if (images[n] || lazy[n]) return;
    lazy[n] = 1;
    const im = new Image();
    im.onload = () => { images[n] = im; };
    im.onerror = () => { setTimeout(() => { lazy[n] = 0; }, 4000); };   /* offline for a moment: try again later */
    im.src = 'data/' + n;
  }
  /* the player's own background photo, kept in this browser */
  const PHOTO_KEY = 'taterpeeler.photo.v1';
  const POTATO_KEY = 'taterpeeler.potato.v1';
  let potatoImg = null, potatoTried = false;
  let photoImg = null, photoTried = false;
  function photoFromStore() {
    if (photoTried) return;
    photoTried = true;
    let d = null; try { d = localStorage.getItem(PHOTO_KEY); } catch (e) {}
    if (d) { const im = new Image(); im.onload = () => { photoImg = im; }; im.src = d; }
  }
  function loadSnd(name) { if (!name) return Promise.resolve(); return fetch('data/' + name).then(r => r.arrayBuffer()).then(b => { soundData[name] = b; tick(); }).catch(() => tick()); }
  const wasmP = fetch('taterpeeler.wasm').then(r => r.arrayBuffer()).then(b => { tick(); return b; });

  /* ---------------- audio ---------------- */
  let actx = null, master = null, buffers = [], unlocked = false;
  const music = new Audio();
  /* Android app: the music is handed to the <audio> element as a blob (its media player can't read the app's files directly) */
  if (window.TP_PLATFORM === 'android') fetch('data/music.mp3').then(r => r.blob()).then(b => { music.src = URL.createObjectURL(b); if (musicWanted) music.play().catch(() => {}); }).catch(() => {});
  else music.src = 'data/music.mp3';
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

  const objs = { buf: [null], tex: [null], prog: [null], sh: [null], uni: [null], fb: [null] };
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
    deleteTexture: x => { if (objs.tex[x]) gl.deleteTexture(objs.tex[x]); objs.tex[x] = null; },
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
    genTexture: () => add(objs.tex, gl.createTexture()),
    texImage2D: (t, l, ifmt, w, h, b, fmt, ty, p) => {   /* only ever called to make an empty render target */
      views(); gl.texImage2D(t, l, ifmt, w, h, b, fmt, ty, p ? u8.subarray(p, p + w * h * 4) : null);
    },
    texParameteri: (t, pn, v) => gl.texParameteri(t, pn, v),
    genFramebuffer: () => add(objs.fb, gl.createFramebuffer()),
    bindFramebuffer: (t, f) => gl.bindFramebuffer(t, objs.fb[f] || null),
    framebufferTexture2D: (t, a, tt, x, l) => gl.framebufferTexture2D(t, a, tt, objs.tex[x], l),
    checkFramebufferStatus: t => gl.checkFramebufferStatus(t),
    getIntegerv: (pn, out) => {
      views();
      if (pn === gl.FRAMEBUFFER_BINDING) { const f = gl.getParameter(pn); i32[out >> 2] = f ? Math.max(0, objs.fb.indexOf(f)) : 0; }
      else if (pn === gl.VIEWPORT) { const v = gl.getParameter(pn); for (let k = 0; k < 4; k++) i32[(out >> 2) + k] = v[k]; }
    },
  };

  /* ---- the text box (names, codes, PINs, messages): a small card in the game's own style ---- */
  const netImages = {};
  let textBox = null;
  function openTextBox(req, kind, title, initial, maxlen) {
    if (textBox) textBox.cancel();
    if (!document.getElementById('tp-tb-style')) {
      const st = document.createElement('style'); st.id = 'tp-tb-style';
      st.textContent = `
        @font-face { font-family: "Archivo"; src: url("archivo.woff2") format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; font-display: swap; }
        #tp-tb { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 18px;
          background: rgba(20,18,16,.32); opacity: 0; transition: opacity .16s ease; font-family: Archivo, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
        #tp-tb.on { opacity: 1; }
        #tp-tb .card { width: min(420px, 100%); background: #fff; color: #26221e; border-radius: 22px; padding: 22px 20px 16px;
          box-shadow: 0 24px 60px rgba(0,0,0,.22); transform: translateY(8px); transition: transform .16s ease; }
        #tp-tb.on .card { transform: none; }
        :root.dark #tp-tb .card { background: #26221e; color: #f1ede7; }
        #tp-tb h3 { margin: 0 0 14px; font-size: 19px; font-weight: 640; letter-spacing: -.01em; }
        #tp-tb input, #tp-tb textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 18px; padding: 12px 14px; border-radius: 14px;
          border: 1.5px solid #e2ddd6; background: #faf8f5; color: inherit; outline: none; }
        #tp-tb textarea { min-height: 120px; resize: vertical; font-size: 16px; line-height: 1.45; }
        :root.dark #tp-tb input, :root.dark #tp-tb textarea { background: #1b1916; border-color: #4a4139; }
        #tp-tb input:focus, #tp-tb textarea:focus { border-color: #26221e; }
        :root.dark #tp-tb input:focus, :root.dark #tp-tb textarea:focus { border-color: #f1ede7; }
        #tp-tb input.code { text-transform: uppercase; letter-spacing: .32em; text-align: center; font-weight: 700; font-size: 26px; }
        #tp-tb input.pin { letter-spacing: .4em; text-align: center; font-size: 26px; }
        #tp-tb .row { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
        #tp-tb button { appearance: none; border: 0; border-radius: 999px; font: inherit; font-size: 16px; font-weight: 620; padding: 11px 20px; cursor: pointer; }
        #tp-tb .ok { background: #26221e; color: #fff; }
        :root.dark #tp-tb .ok { background: #f1ede7; color: #1b1916; }
        #tp-tb .no { background: transparent; color: inherit; opacity: .7; }
        #tp-tb .count { font-size: 12px; opacity: .55; margin-top: 6px; text-align: right; }`;
      document.head.appendChild(st);
    }
    const wrap = document.createElement('div'); wrap.id = 'tp-tb';
    const card = document.createElement('div'); card.className = 'card';
    const h = document.createElement('h3'); h.textContent = title;
    const field = document.createElement(kind === 3 ? 'textarea' : 'input');
    field.value = initial || ''; if (maxlen > 0) field.maxLength = maxlen;
    field.autocomplete = 'off'; field.spellcheck = kind === 0 || kind === 3;
    if (kind === 1) { field.className = 'code'; field.autocapitalize = 'characters'; field.inputMode = 'text'; }
    if (kind === 2) { field.className = 'pin'; field.type = 'password'; field.inputMode = 'numeric'; field.autocomplete = 'one-time-code'; }
    const count = document.createElement('div'); count.className = 'count';
    const upd = () => {
      if (kind === 1) { const v = field.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v !== field.value) field.value = v; }
      if (kind === 2) { const v = field.value.replace(/[^0-9]/g, ''); if (v !== field.value) field.value = v; }
      count.textContent = kind === 3 && maxlen > 0 ? field.value.length + ' / ' + maxlen : '';
    };
    field.addEventListener('input', upd); upd();
    const row = document.createElement('div'); row.className = 'row';
    const no = document.createElement('button'); no.className = 'no'; no.textContent = W('cancel');
    const ok = document.createElement('button'); ok.className = 'ok'; ok.textContent = W('ok');
    row.append(no, ok); card.append(h, field, count, row); wrap.appendChild(card);
    let done = false;
    const finish = text => {
      if (done) return;   /* this box only: a fading box never answers for the next one */
      done = true; if (textBox === me) textBox = null;
      wrap.id = ''; wrap.style.pointerEvents = 'none'; wrap.classList.remove('on'); setTimeout(() => wrap.remove(), 180);
      if (!ex) return;
      if (text == null) { ex.tp_text_done(req, 0, 0); return; }
      const b = te.encode(text), p = ex.tp_net_buf(b.length + 1); views(); if (p) u8.set(b, p);
      ex.tp_text_done(req, 1, p ? b.length : 0);
    };
    const me = { cancel: () => finish(null) }; textBox = me;
    no.onclick = () => finish(null);
    ok.onclick = () => finish(field.value.trim());
    wrap.addEventListener('pointerdown', e => { if (e.target === wrap) finish(null); });
    field.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); finish(null); }
      else if (e.key === 'Enter' && (kind !== 3 || e.metaKey || e.ctrlKey)) { e.preventDefault(); finish(field.value.trim()); }
    });
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('on'));
    setTimeout(() => field.focus(), 30);
  }

  let cursorKind = -1;
  const envImports = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, atan2: Math.atan2, exp: Math.exp, pow: Math.pow, acos: Math.acos, log: Math.log,
    logmsg: p => console.log('[TaterPeeler]', str(p)),
    plat_file: (np, sp) => {
      const n = str(np); let f = filePtrs[n];
      if (!f && files[n] && /^(lang_|font_)/.test(n)) {   /* arrived since: copy it in */
        const d = files[n]; const p = ex.tp_malloc(d.length); views(); u8.set(d, p);
        f = filePtrs[n] = { ptr: p, size: d.length };
      }
      views();
      if (!f) { if (/^(lang_|font_)/.test(n)) lazyFile(n); if (sp) i32[sp >> 2] = 0; return 0; }
      if (sp) i32[sp >> 2] = f.size;
      return f.ptr;
    },
    plat_texture: (np, wp, hp, flags) => {
      const n = str(np); const im = images[n];
      if (!im) { if (/^(kitchen_|counter_|potato_mix|font_atlas_)/.test(n)) lazyImage(n); return 0; }
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
    plat_user_photo: (wp, hp) => {
      photoFromStore();
      if (!photoImg) return 0;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, photoImg);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      views();
      if (wp) i32[wp >> 2] = photoImg.naturalWidth; if (hp) i32[hp >> 2] = photoImg.naturalHeight;
      return add(objs.tex, t);
    },
    plat_potato_photo: (wp, hp) => {   /* "your own potato": kept like the background photo, under its own key */
      if (!potatoImg && !potatoTried) {
        potatoTried = true;
        let d = null; try { d = localStorage.getItem(POTATO_KEY); } catch (e) {}
        if (d) { const im = new Image(); im.onload = () => { potatoImg = im; }; im.src = d; }
      }
      if (!potatoImg) return 0;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, potatoImg);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      views();
      if (wp) i32[wp >> 2] = potatoImg.naturalWidth; if (hp) i32[hp >> 2] = potatoImg.naturalHeight;
      return add(objs.tex, t);
    },
    plat_pick_potato_photo: () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) { ex.tp_potato_photo_ready(0); return; }
        const url = URL.createObjectURL(f), im = new Image();
        im.onload = () => {
          const k = Math.min(1, 1024 / Math.max(im.naturalWidth, im.naturalHeight));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          const d = c.toDataURL('image/jpeg', 0.85);
          try { localStorage.setItem(POTATO_KEY, d); } catch (e) { console.warn('[TaterPeeler] potato photo could not be kept for next time'); }
          const im2 = new Image();
          im2.onload = () => { potatoImg = im2; potatoTried = true; ex.tp_potato_photo_ready(1); };
          im2.src = d;
        };
        im.onerror = () => { URL.revokeObjectURL(url); ex.tp_potato_photo_ready(0); };
        im.src = url;
      };
      inp.click();
    },
    plat_pick_photo: () => {   /* called while handling a tap, so the browser lets the file picker open */
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) { ex.tp_photo_ready(0); return; }
        const url = URL.createObjectURL(f), im = new Image();
        im.onload = () => {
          /* at most 1024 pixels across: plenty behind the board, and small enough to keep */
          const k = Math.min(1, 1024 / Math.max(im.naturalWidth, im.naturalHeight));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          const d = c.toDataURL('image/jpeg', 0.85);
          try { localStorage.setItem(PHOTO_KEY, d); } catch (e) { console.warn('[TaterPeeler] photo could not be kept for next time'); }
          const im2 = new Image();
          im2.onload = () => { photoImg = im2; photoTried = true; ex.tp_photo_ready(1); };
          im2.src = d;
        };
        im.onerror = () => { URL.revokeObjectURL(url); ex.tp_photo_ready(0); };
        im.src = url;
      };
      inp.click();
    },
    /* ---- online (2.0) ---- */
    plat_http: (req, up, kp, bp) => {
      const url = str(up), key = str(kp), body = str(bp);
      const deliver = (status, text) => {
        if (!ex) return;
        const b = te.encode(text || ''), p = ex.tp_net_buf(b.length + 1);
        views(); if (p) u8.set(b, p);
        ex.tp_net_done(req, status, p ? b.length : 0);
      };
      fetch(url, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body, cache: 'no-store' })
        .then(r => r.text().then(t => deliver(r.status, t)))
        .catch(() => deliver(0, ''));
    },
    plat_locale: (op, cap) => {
      const b = te.encode(navigator.language || ''); views();
      const n = Math.min(b.length, cap - 1); u8.set(b.subarray(0, n), op); u8[op + n] = 0;
    },
    plat_utc_offset: () => -new Date().getTimezoneOffset(),
    plat_old_web: () => /[?&]oldweb=1/.test(location.search) ? 1 : 0,   /* only old iPads say yes; ?oldweb=1 shows it here */
    plat_random: () => { try { return crypto.getRandomValues(new Uint32Array(1))[0]; } catch (e) { return (Math.random() * 4294967296) >>> 0; } },
    plat_text_input: (req, kind, tp, ip, maxlen) => openTextBox(req, kind, str(tp), str(ip), maxlen),
    plat_image: (kp, dp, wp, hp) => {
      const key = str(kp); let e = netImages[key];
      if (!e) {   /* first ask: start decoding */
        e = netImages[key] = { img: new Image(), ready: false, tex: 0 };
        e.img.onload = () => { e.ready = true; }; e.img.onerror = () => { e.failed = true; };
        e.img.src = str(dp);
      }
      if (!e.ready) return 0;
      if (!e.tex) {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, e.img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        e.tex = add(objs.tex, t);
      }
      views();
      if (wp) i32[wp >> 2] = e.img.naturalWidth; if (hp) i32[hp >> 2] = e.img.naturalHeight;
      return e.tex;
    },
    plat_pick_image: req => {   /* the admin's popup photo: shrunk to 900 px and sent back as a data: URL */
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) { ex.tp_image_picked(req, 0, 0); return; }
        const url = URL.createObjectURL(f), im = new Image();
        im.onload = () => {
          const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          let d = c.toDataURL('image/jpeg', 0.82);
          if (d.length > 560000) d = c.toDataURL('image/jpeg', 0.6);
          const b = te.encode(d), p = ex.tp_net_buf(b.length + 1); views(); if (p) u8.set(b, p);
          ex.tp_image_picked(req, p ? 1 : 0, p ? b.length : 0);
        };
        im.onerror = () => { URL.revokeObjectURL(url); ex.tp_image_picked(req, 0, 0); };
        im.src = url;
      };
      inp.click();
    },
    plat_open_url: p => { const u = str(p); if (/^https:\/\//.test(u)) window.open(u, '_blank', 'noopener'); },
    plat_audio_mode: mix => {   /* Safari 16.4+: "ambient" lets YouTube or Music keep playing alongside the game */
      try { if (navigator.audioSession) navigator.audioSession.type = mix ? 'ambient' : 'auto'; } catch (e) {}
    },
    plat_other_audio: () => 0,
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

  /* The canvas is sized to exactly the area the game lays itself out in. iPad Safari's 100vh is taller than the
     visible page while its toolbars show, which stretched the picture and made taps land off from where they looked. */
  let viewW = 1, viewH = 1;
/* ?rs=0.75 draws at a fraction of the screen's resolution (for slow devices); the browser scales it up */
const RENDER_SCALE = (() => { const v = +(new URLSearchParams(location.search).get('rs') || 1); return v >= 0.4 && v <= 1 ? v : 1; })();
  function resize() {
    const vv = window.visualViewport;
    const cw = Math.max(1, Math.round(vv && vv.scale === 1 ? vv.width : window.innerWidth));
    const ch = Math.max(1, Math.round(vv && vv.scale === 1 ? vv.height : window.innerHeight));
    viewW = cw; viewH = ch;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * RENDER_SCALE;
    const w = Math.max(1, Math.round(cw * dpr)), h = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (ex) ex.tp_resize(w, h, w / cw);
  }

  function hookInput() {
    /* map the touch into the game's own coordinates, whatever size the browser actually shows the canvas at */
    const pos = e => {
      const r = canvas.getBoundingClientRect();
      const sx = r.width > 0 ? viewW / r.width : 1, sy = r.height > 0 ? viewH / r.height : 1;
      return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy];
    };
    const safeCancel = (pointerId, x, y, button, touch) => {
      if (!ex) return;
      const cx = Math.max(0, Math.min(viewW, x));
      const cy = Math.max(0, Math.min(viewH, y));
      try { ex.tp_pointer(5, pointerId, cx, cy, button, touch); } catch (e) {}
      try { ex.tp_pointer(3, pointerId, cx, cy, button, touch); } catch (e) {}
    };
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      const [x, y] = pos(e);
      if (x < -10 || x > viewW + 10 || y < -10 || y > viewH + 10) {
        safeCancel(e.pointerId, x, y, e.button === 2 ? 2 : 0, e.pointerType === 'touch' ? 1 : 0);
        return;
      }
      ex.tp_pointer(0, e.pointerId, x, y, e.button === 2 ? 2 : 0, e.pointerType === 'touch' ? 1 : 0);
    });
    canvas.addEventListener('pointermove', e => {
      const [x, y] = pos(e);
      const touch = e.pointerType === 'touch' ? 1 : 0;
      if (x < -10 || x > viewW + 10 || y < -10 || y > viewH + 10) {
        safeCancel(e.pointerId, x, y, e.buttons ? 0 : 0, touch);
        return;
      }
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
      const list = evs && evs.length ? evs : [e];
      for (const ce of list) {
        const [cx, cy] = ce === e ? [x, y] : pos(ce);
        if (cx < -10 || cx > viewW + 10 || cy < -10 || cy > viewH + 10) {
          safeCancel(ce.pointerId, cx, cy, 0, ce.pointerType === 'touch' ? 1 : 0);
          return;
        }
        ex.tp_pointer(e.buttons ? 1 : 4, ce.pointerId, cx, cy, 0, ce.pointerType === 'touch' ? 1 : 0);
      }
    });
    const up = t => e => { const [x, y] = pos(e); if (x < -10 || x > viewW + 10 || y < -10 || y > viewH + 10) { safeCancel(e.pointerId, x, y, e.button === 2 ? 2 : 0, e.pointerType === 'touch' ? 1 : 0); return; } ex.tp_pointer(t, e.pointerId, x, y, e.button === 2 ? 2 : 0, e.pointerType === 'touch' ? 1 : 0); };
    canvas.addEventListener('pointerup', up(2));
    canvas.addEventListener('pointercancel', up(3));
    canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !e.buttons) { const [x, y] = pos(e); safeCancel(e.pointerId, x, y, 0, 0); } });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      ex.tp_wheel(e.deltaX * k, e.deltaY * k);
    }, { passive: false });
    window.addEventListener('keydown', e => {
      if (textBox) return;   /* typing in the text box */
      const map = { Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
      let k = map[e.key] || (e.key && e.key.length === 1 ? e.key.charCodeAt(0) : 0);
      if (k) { ex.tp_key(k, 1); if (k >= 37 && k <= 40) e.preventDefault(); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { ex.tp_background(); music.pause(); musicStarted = false; }
      else if (musicWanted && unlocked) music.play().then(() => { musicStarted = true; }).catch(() => {});
    });
    window.addEventListener('resize', resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    /* iOS reports the new size a little after it rotates */
    window.addEventListener('orientationchange', () => { resize(); setTimeout(resize, 120); setTimeout(resize, 400); });
    window.addEventListener('blur', () => {
      if (!ex) return;
      try { ex.tp_pointer(5, -1, 0, 0, 0, 0); } catch (_) {}
      try { ex.tp_pointer(3, -1, 0, 0, 0, 0); } catch (_) {}
    });
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
  const LF = langFiles(LANG);   /* the saved language comes with the rest, so the game starts in it (no harm if it fails) */
  total += LF.files.length + LF.images.length;
  Promise.all([wasmP.catch(() => null), ...FILES.map(loadBin), ...IMAGES.map(loadImg), ...SOUNDS.map(loadSnd),
               ...LF.files.map(n => loadBin(n).catch(() => tick())), ...LF.images.map(n => loadImg(n).catch(() => tick()))]).then(([wasmBytes]) => {
    return instantiate(wasmBytes, { env: envImports, gl: glImports });
  }).then(exports => {
    ex = exports; mem = ex.memory;
    for (const n of FILES.concat(LF.files)) {
      const d = files[n]; if (!d) continue;
      const p = ex.tp_malloc(d.length); views(); u8.set(d, p);
      filePtrs[n] = { ptr: p, size: d.length };
    }
    const saveP = putStr(readSave());
    resize();
    ex.tp_init(quality, extUint ? 1 : 0, saveP);
    if (new URLSearchParams(location.search).get('icon')) ex.tp_set_flags(new URLSearchParams(location.search).get("dbg") ? 31 : 15);   /* staged scene used for the app icon */
    else if (window.TP_DOWNLOAD_PAGE) ex.tp_set_flags(32);   /* the website shows a Download button on the menu */
    else if (window.TP_PLATFORM === 'android') ex.tp_set_flags(64);   /* the Android app (it says so when online) */
    /* Android's Back button asks this: 1 = handled, 0 = close the app */
    window.tpBack = () => { if (textBox) { textBox.cancel(); return 1; } return ex.tp_back ? ex.tp_back() : 1; };
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
    loader.querySelector('.msg').textContent = 'TaterPeeler could not load its files. Reload the page to try again. If this persists please inform me.';
  });
})();
