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
  const V = window.TP_V ? '?v=' + window.TP_V : '';   /* the website stamps each release: no old cached files after an update */
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
    photo: { en: 'Choose a photo', zh: '选择一张照片', es: 'Elige una foto', 'es-ES': 'Elige una foto', ru: 'Выбери фото', pt: 'Escolha uma foto', de: 'Wähl ein Foto', ja: '写真を選ぶ', fr: 'Choisis une photo', ko: '사진 고르기', pl: 'Wybierz zdjęcie', tr: 'Bir fotoğraf seç', pirate: 'Pick a paintin\'' },
    photos: { en: 'Open photos', zh: '打开照片', es: 'Abrir fotos', 'es-ES': 'Abrir fotos', ru: 'Открыть фото', pt: 'Abrir fotos', de: 'Fotos öffnen', ja: '写真を開く', fr: 'Ouvrir les photos', ko: '사진 열기', pl: 'Otwórz zdjęcia', tr: 'Fotoğrafları aç', pirate: 'Open the gallery' },
    sgame: { en: 'Getting the game', zh: '正在获取游戏', es: 'Descargando el juego', 'es-ES': 'Descargando el juego', ru: 'Скачиваем игру', pt: 'Baixando o jogo', de: 'Lade das Spiel', ja: 'ゲームを取得中', fr: 'Téléchargement du jeu', ko: '게임 받는 중', pl: 'Pobieranie gry', tr: 'Oyun indiriliyor', pirate: 'Haulin\' in the game' },
    spotato: { en: 'Getting the potatoes', zh: '正在获取土豆', es: 'Descargando las papas', 'es-ES': 'Descargando las patatas', ru: 'Скачиваем картошку', pt: 'Baixando as batatas', de: 'Lade die Kartoffeln', ja: 'じゃがいもを取得中', fr: 'Téléchargement des patates', ko: '감자 받는 중', pl: 'Pobieranie ziemniaków', tr: 'Patatesler indiriliyor', pirate: 'Haulin\' in the spuds' },
    speeler: { en: 'Sharpening the peeler', zh: '正在磨削皮器', es: 'Afilando el pelador', 'es-ES': 'Afilando el pelador', ru: 'Точим овощечистку', pt: 'Afiando o descascador', de: 'Schärfe den Schäler', ja: 'ピーラーを研いでいます', fr: 'Affûtage de l\'éplucheur', ko: '필러 가는 중', pl: 'Ostrzenie obieraczki', tr: 'Soyacak bileniyor', pirate: 'Sharpenin\' the peeler' },
    swords: { en: 'Getting the words', zh: '正在获取文字', es: 'Descargando los textos', 'es-ES': 'Descargando los textos', ru: 'Скачиваем тексты', pt: 'Baixando os textos', de: 'Lade die Texte', ja: '文字を取得中', fr: 'Téléchargement des textes', ko: '글자 받는 중', pl: 'Pobieranie tekstów', tr: 'Yazılar indiriliyor', pirate: 'Fetchin\' the scrolls' },
    skitchen: { en: 'Setting up the kitchen', zh: '正在布置厨房', es: 'Preparando la cocina', 'es-ES': 'Preparando la cocina', ru: 'Готовим кухню', pt: 'Arrumando a cozinha', de: 'Richte die Küche ein', ja: 'キッチンを準備中', fr: 'Installation de la cuisine', ko: '주방 준비 중', pl: 'Przygotowanie kuchni', tr: 'Mutfak hazırlanıyor', pirate: 'Riggin\' the galley' },
    sstart: { en: 'Starting up', zh: '正在启动', es: 'Iniciando', 'es-ES': 'Iniciando', ru: 'Запускаем', pt: 'Iniciando', de: 'Starte', ja: '起動中', fr: 'Démarrage', ko: '시작하는 중', pl: 'Uruchamianie', tr: 'Başlatılıyor', pirate: 'Hoistin\' the sails' },
    lefts: { en: 'about # s left', zh: '还剩约 # 秒', es: 'faltan unos # s', 'es-ES': 'faltan unos # s', ru: 'осталось ~# с', pt: 'faltam uns # s', de: 'noch etwa # s', ja: '残り約 # 秒', fr: 'encore ~# s', ko: '약 #초 남음', pl: 'jeszcze ok. # s', tr: 'yaklaşık # sn kaldı', pirate: 'about # ticks left' },
    leftm: { en: 'about # min left', zh: '还剩约 # 分钟', es: 'faltan unos # min', 'es-ES': 'faltan unos # min', ru: 'осталось ~# мин', pt: 'faltam uns # min', de: 'noch etwa # Min.', ja: '残り約 # 分', fr: 'encore ~# min', ko: '약 #분 남음', pl: 'jeszcze ok. # min', tr: 'yaklaşık # dk kaldı', pirate: 'about # turns o\' the glass left' },
    nowebgl: { en: 'TaterPeeler needs WebGL, which this browser has turned off. Please try another browser.' },
    failed: { en: 'TaterPeeler could not load its files. Reload the page to try again. If this persists try using the web app or website.' }
  };
  function W(k) { const w = WORDS[k]; return (w && (w[LANG] || w.en)) || ''; }
  {
    const m = loader.querySelector('.msg'), sb = loader.querySelector('.msg-sub');
    if (LANG !== 'en') { if (m) m.textContent = W('load'); if (sb) sb.textContent = W('wait'); }
  }

  /* how much this device can take. ?q= wins; otherwise a guess from the screen, the processor and memory, lowered
     further if an earlier visit found it struggling (remembered in perf). Watches, a Rabbit R1, old phones: quality 0. */
  const PERF_KEY = 'taterpeeler.perf.v1';
  let perf = {}; try { perf = JSON.parse(localStorage.getItem(PERF_KEY) || '{}') || {}; } catch (e) { perf = {}; }
  const savePerf = () => { try { localStorage.setItem(PERF_KEY, JSON.stringify(perf)); } catch (e) {} };
  const qp = new URLSearchParams(location.search).get('q');
  const tinyScreen = Math.min(screen.width || 999, screen.height || 999) <= 320;
  const cores = navigator.hardwareConcurrency || 4, devMem = navigator.deviceMemory || 4;
  let autoQ = (tinyScreen || cores <= 2 || devMem <= 1) ? 0 : (cores <= 4 && devMem <= 2) ? 1 : 2;
  if (typeof perf.q === 'number') autoQ = Math.min(autoQ, perf.q);
  const quality = qp === null ? autoQ : Math.max(0, Math.min(2, parseInt(qp, 10) || 0));
  const gl = canvas.getContext('webgl', { antialias: quality >= 1, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance' })
          || canvas.getContext('experimental-webgl', { antialias: quality >= 1, alpha: false });
  if (!gl) {
    loader.querySelector('.msg').textContent = 'TaterPeeler needs WebGL, which this browser has turned off. Please try another browser.';
    return;
  }
  const extUint = gl.getExtension('OES_element_index_uint');
  const extAniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');

  /* ---------------- random shit called assets ---------------- */
  const big = quality >= 2;
  const FILES = ['font.tpf', 'peeler.tpk', (big && extUint) ? 'potato_l3.tpm' : (quality === 0 ? 'potato_l1.tpm' : 'potato_l2.tpm')];
  /* 4.0: the sharpest pictures (2048) come AFTER the game has started; it starts on the 1024 ones and swaps them in
     place when they arrive (about 3.5 MB less to wait for) */
  const SHARP = big ? { 'potato_detail_2048.jpg': 'potato_detail_1024.jpg', 'potato_normal_2048.jpg': 'potato_normal_1024.jpg', 'wood_2048.jpg': 'wood_1024.jpg' } : {};
  const IMAGES = ['font_atlas.png', 'potato_detail_1024.jpg'].concat(quality >= 1 ? ['potato_normal_1024.jpg'] : [])
    .concat([quality >= 1 ? 'logo_512.png' : 'logo_256.png', quality >= 1 ? 'wood_1024.jpg' : 'wood_512.jpg'])
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
    .concat(['sfx_foil0.wav', 'sfx_foil1.wav', 'sfx_foil2.wav'])
    /* 3.0: blowing out the birthday candles */
    .concat(['sfx_blow0.wav', 'sfx_blow1.wav', 'sfx_tape0.wav', 'sfx_tape1.wav', 'sfx_gobble0.wav', 'sfx_gobble1.wav'])
    /* 3.0: TaterAngle's drive-thru */
    .concat(['sfx_car_in.wav', 'sfx_car_out.wav', 'sfx_driveoff.wav', 'sfx_horn0.wav', 'sfx_horn1.wav', 'sfx_micro_run.wav',
             'sfx_micro_beep.wav', 'sfx_micro_door.wav', 'sfx_micro_open.wav', 'sfx_register.wav', 'sfx_squelch0.wav', 'sfx_squelch1.wav',
             'sfx_sink_plop0.wav', 'sfx_sink_plop1.wav', 'sfx_sink_on.wav', 'sfx_sink_off.wav', 'sfx_sink_run.wav', 'sfx_scrub.wav',
             'sfx_ev_spill.wav', 'sfx_ev_door.wav', 'sfx_ev_hum.wav', 'sfx_ev_flicker.wav', 'sfx_ev_breaker.wav', 'sfx_ev_growl0.wav', 'sfx_ev_growl1.wav', 'sfx_ev_growl2.wav', 'sfx_ev_roar.wav', 'sfx_ev_heart.wav', 'sfx_ev_run.wav', 'sfx_ev_meow.wav', 'sfx_ev_mrrp.wav', 'sfx_ev_purr.wav', 'sfx_ev_sweep0.wav', 'sfx_ev_sweep1.wav', 'sfx_ev_sweep2.wav', 'sfx_tractor.wav']);
  const files = {}, images = {}, soundData = {};
  let total = FILES.length + IMAGES.length + 1, done = 0;   /* (the sounds load after the game has started) */
  let joking = false;
  /* 4.0: under the bar, what it's getting, how fast, and about how long is left. Sizes are guesses until each file
     answers (then its real size); the bar follows the bytes, so it moves smoothly instead of in jumps. */
  const GUESS = { 'taterpeeler.wasm': 260e3, 'peeler.tpk': 1.49e6, 'potato_l3.tpm': 1.26e6, 'potato_l2.tpm': 330e3, 'potato_l1.tpm': 82e3, 'font.tpf': 22e3,
    'font_atlas.png': 230e3, 'potato_detail_1024.jpg': 957e3, 'potato_normal_1024.jpg': 325e3, 'logo_512.png': 158e3, 'logo_256.png': 50e3,
    'wood_1024.jpg': 192e3, 'wood_512.jpg': 50e3, 'potato_mix_1024.png': 2.81e6 };
  const prog = {};   /* name -> [got, size] */
  let t0 = performance.now(), speedT = t0, speed = 0, infoShown = false, infoTimer = 0;
  const info = document.createElement('div'); info.className = 'msg-info';
  { const tr = loader.querySelector('.track'); if (tr && tr.parentNode) tr.parentNode.insertBefore(info, tr.nextSibling); }
  function stageOf(n) { return /\.wasm$/.test(n) ? 'sgame' : /^potato_l|^potato_detail|^potato_normal|^potato_mix/.test(n) ? 'spotato' : /^peeler/.test(n) ? 'speeler' : /^font|^lang_/.test(n) ? 'swords' : 'skitchen'; }
  function want(n) { if (!prog[n]) prog[n] = [0, GUESS[n] || 150e3]; }
  function got(n, bytes, size) { want(n); const p = prog[n]; if (size > 0) p[1] = size; p[0] = Math.min(p[1], bytes); showInfo(); }
  function bytesNow() { let g = 0, t = 0; for (const k in prog) { g += prog[k][0]; t += prog[k][1]; } return [g, t]; }
  let lastG = 0;
  function showInfo() {
    const now = performance.now(), [g, t] = bytesNow();
    if (now - speedT > 400) { const inst = (g - lastG) / ((now - speedT) / 1000); speed = speed ? speed * 0.6 + inst * 0.4 : inst; lastG = g; speedT = now; }
    if (!joking) bar.style.transform = 'scaleX(' + Math.min(1, t ? g / t * 0.96 + done / total * 0.04 : done / total).toFixed(3) + ')';
    if (infoTimer) return;
    infoTimer = setTimeout(() => { infoTimer = 0; drawInfo(); }, 250);
  }
  function drawInfo() {
    if (!document.getElementById('loader')) return;
    const [g, t] = bytesNow();
    let what = 'sstart';
    for (const k in prog) if (prog[k][0] < prog[k][1]) { what = stageOf(k); if (what === 'spotato' || what === 'sgame') break; }
    let line = W(what);
    const el = (performance.now() - t0) / 1000;
    if (what !== 'sstart' && el > 0.8 && speed > 1000) {
      line += ' \u00b7 ' + (speed >= 1e6 ? (speed / 1e6).toFixed(1) + ' MB/s' : Math.round(speed / 1e3) + ' KB/s');
      const left = Math.max(0, t - g) / speed;
      if (left >= 1) line += ' \u00b7 ' + W(left < 60 ? 'lefts' : 'leftm').replace('#', left < 60 ? Math.ceil(left) : Math.ceil(left / 60));
    }
    info.textContent = line;
    if (!infoShown) { infoShown = true; info.classList.add('on'); const sb = loader.querySelector('.msg-sub'); if (sb && !joking) sb.style.display = 'none'; }
  }
  function tick() { done++; showInfo(); }
  /* a fetch, counted as it arrives (when the browser can stream it) */
  function counted(name, r) {
    const size = +(r.headers.get('content-length') || 0), enc = r.headers.get('content-encoding');
    want(name);
    if (size && !enc) prog[name][1] = size;   /* (gzip: the header is the packed size; the guess is closer) */
    if (!r.body || !r.body.getReader || typeof Response === 'undefined') return r.arrayBuffer().then(b => { got(name, b.byteLength, b.byteLength); return b; });
    const rd = r.body.getReader(), parts = []; let n = 0;
    const pump = () => rd.read().then(({ done: d, value }) => {
      if (d) { const out = new Uint8Array(n); let o = 0; for (const c of parts) { out.set(c, o); o += c.length; } prog[name][1] = n; got(name, n, n); return out.buffer; }
      parts.push(value); n += value.length; got(name, n, Math.max(prog[name][1], n)); return pump();
    });
    return pump();
  }
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

  /* a flaky connection (school wifi, a slow phone) loses a file now and then: try each one up to 6 times, waiting a
     little longer each time, and ask past any half-saved copy on the later tries */
  function fetchRetry(url, tries) {
    tries = tries || 6;
    const go = n => fetch(n ? url + (url.indexOf('?') < 0 ? '?' : '&') + 'r=' + n : url, n ? { cache: 'reload' } : undefined)
      .then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r; })
      .catch(e => { if (n + 1 >= tries) throw e; return new Promise(res => setTimeout(res, 500 * Math.pow(2, n))).then(() => go(n + 1)); });
    return go(0);
  }
  function imgRetry(src, tries) {
    tries = tries || 6;
    return new Promise((res, rej) => {
      const go = n => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => { if (n + 1 >= tries) rej(new Error(src)); else setTimeout(() => go(n + 1), 500 * Math.pow(2, n)); };
        im.src = n ? src + (src.indexOf('?') < 0 ? '?' : '&') + 'r=' + n : src;
      };
      go(0);
    });
  }
  function b64(s) { const bin = atob(s.replace(/\s+/g, '')); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function loadBin(name) {
    /* hosts that only serve common file types get the data as base64 text -#sounded so pro*/
    if (window.TP_DATA_B64) return fetchRetry('data/' + name + '.txt' + V).then(r => r.text()).then(t => { files[name] = b64(t); tick(); });
    want(name);
    return fetchRetry('data/' + name + V).then(r => counted(name, r)).then(b => { files[name] = new Uint8Array(b); tick(); });
  }
  /* pictures come through fetch too (so they're counted), then become an <img>; a plain <img> if that fails */
  function loadImg(name) {
    want(name);
    const viaImg = () => imgRetry('data/' + name + V).then(im => { images[name] = im; got(name, prog[name][1], prog[name][1]); tick(); });
    if (typeof URL === 'undefined' || !URL.createObjectURL || typeof Blob === 'undefined') return viaImg();
    return fetchRetry('data/' + name + V).then(r => counted(name, r)).then(b => new Promise((res, rej) => {
      const u = URL.createObjectURL(new Blob([b], { type: /\.png$/.test(name) ? 'image/png' : 'image/jpeg' }));
      const im = new Image(); im.onload = () => { images[name] = im; res(); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error(name)); }; im.src = u;
    })).then(tick, viaImg);
  }
  /* a language's words and letters: fetched when it's picked (or before the game starts, for the saved one) */
  const lazyF = {};
  function lazyFile(n) {
    if (files[n] || lazyF[n]) return;
    lazyF[n] = 1;
    fetchRetry('data/' + n + V, 3).then(r => r.arrayBuffer())
      .then(b => { files[n] = new Uint8Array(b); })
      .catch(() => { setTimeout(() => { lazyF[n] = 0; }, 4000); });
  }
  function langFiles(code) {
    if (code === 'en') return { files: [], images: [] };
    const p = LANG_PACK[code];
    return { files: ['lang_' + code + '.txt'].concat(p ? ['font_' + p + '.tpf'] : []), images: p ? ['font_atlas_' + p + '.png'] : [] };
  }
  /* the credits: credits.txt at the top of the website (Andres edits it on GitHub) is read fresh every visit;
     the copy in data/ is the fallback (and what the apps use) */
  (window.TP_DOWNLOAD_PAGE ? fetch('credits.txt', { cache: 'no-store' }).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
    : Promise.reject(0)).catch(() => fetchRetry('data/credits.txt' + V, 3).then(r => r.arrayBuffer()))
    .then(b => { files['credits.txt'] = new Uint8Array(b); }).catch(() => {});
  /* kitchen pictures are fetched the first time the game asks for them, so the page never waits for all of them */
  const lazy = {};
  function lazyImage(n) {
    if (images[n] || lazy[n]) return;
    lazy[n] = 1;
    const im = new Image();
    im.onload = () => { images[n] = im; };
    im.onerror = () => { setTimeout(() => { lazy[n] = 0; }, 4000); };   /* offline for a moment: try again later */
    im.src = 'data/' + n + V;
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
  function loadSnd(name) {
    if (!name) return Promise.resolve();
    return fetchRetry('data/' + name + V).then(r => r.arrayBuffer()).then(b => {
      soundData[name] = b;
      const i = SOUNDS.indexOf(name);   /* audio already on: ready to play right away */
      if (actx && i > 0) actx.decodeAudioData(b.slice(0), buf => { buffers[i] = buf; }, () => {});
    }).catch(() => {});
  }
  want('taterpeeler.wasm');
  const wasmP = fetchRetry('taterpeeler.wasm' + V).then(r => counted('taterpeeler.wasm', r)).then(b => { tick(); return b; });

  /* ---------------- audio ---------------- */
  let actx = null, master = null, buffers = [], unlocked = false;
  const music = new Audio();
  /* Android app: the music is handed to the <audio> element as a blob (its media player can't read the app's files directly) */
  let mainBlob = null;
  if (window.TP_PLATFORM === 'android') fetch('data/music.mp3').then(r => r.blob()).then(b => { mainBlob = URL.createObjectURL(b); if (musicTrack === 0) { music.src = mainBlob; if (musicWanted) music.play().catch(() => {}); } }).catch(() => {});
  else music.src = 'data/music.mp3';
  music.loop = true; music.preload = 'none'; music.volume = 0.54;   /* fetched once the game is running */
  let minFrameMs = 0, lastFrameT = -1e9;   /* battery saver skips every other display frame */
  let musicWanted = false;
  /* the credits' own music (3.0: the 1,000th potato). It plays in the SAME <audio> element as the game's music, with
     its address swapped: Safari only lets an element play by itself once a tap has started it, so a second element
     would wait for another tap (the credits' music only started when you tapped). */
  const TRACKS = ['data/music.mp3', 'data/credits_music.mp3' + V];
  let musicTrack = 0;
  const trackBlobs = {};
  function useTrack(t) {
    musicTrack = t;
    if (window.TP_PLATFORM === 'android') {   /* (as blobs there, see above) */
      if (trackBlobs[t]) { music.src = trackBlobs[t]; return true; }
      if (t === 0 && mainBlob) { music.src = trackBlobs[0] = mainBlob; return true; }
      fetch(TRACKS[t].replace(V, '')).then(r => r.blob()).then(b => {
        trackBlobs[t] = URL.createObjectURL(b);
        if (musicTrack === t) { music.src = trackBlobs[t]; if (musicWanted) music.play().then(() => { musicStarted = true; }).catch(() => {}); }
      }).catch(() => {});
      return false;
    }
    music.src = TRACKS[t];
    return true;
  }
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
  function tbStyle() {
    if (!document.getElementById('tp-tb-style')) {
      const st = document.createElement('style'); st.id = 'tp-tb-style';
      st.textContent = `
        @font-face { font-family: "Archivo"; src: url("archivo.woff2") format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; font-display: swap; }
        #tp-tb { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; padding: 18px;
          background: rgba(20,18,16,.32); opacity: 0; transition: opacity .09s ease; font-family: Archivo, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
        #tp-tb.on { opacity: 1; }
        #tp-tb .card { width: min(420px, 100%); background: #fff; color: #26221e; border-radius: 22px; padding: 22px 20px 16px;
          box-shadow: 0 24px 60px rgba(0,0,0,.22); transform: translateY(6px); transition: transform .09s ease; }
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
  }
  /* ---- the photo pickers (your own potato, the kitchen photo, the admin's popup picture) ----
     The file box stays in the page until it answers (iPhone can lose a detached one). Browsers only open it during
     a tap, and the game answers a tap on its next frame: Chrome allows that, but Safari (and every iPhone/iPad
     browser) doesn't, so there a small card asks for one more tap, which opens the photos right away. */
  const webkitTouch = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  function pickFile(onFile, onNone) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
    document.body.appendChild(inp);
    let answered = false;
    const done = f => { if (answered) return; answered = true; inp.remove(); if (f) onFile(f); else onNone(); };
    inp.addEventListener('change', () => done(inp.files && inp.files[0]));
    inp.addEventListener('cancel', () => done(null));
    const direct = !webkitTouch && !safari && (!navigator.userActivation || navigator.userActivation.isActive);
    if (direct) { inp.click(); return; }
    tbStyle();
    if (textBox) textBox.cancel();
    const wrap = document.createElement('div'); wrap.id = 'tp-tb';
    const card = document.createElement('div'); card.className = 'card';
    const h = document.createElement('h3'); h.textContent = W('photo');
    const row = document.createElement('div'); row.className = 'row';
    const no = document.createElement('button'); no.className = 'no'; no.textContent = W('cancel');
    const ok = document.createElement('button'); ok.className = 'ok'; ok.textContent = W('photos');
    row.append(no, ok); card.append(h, row); wrap.appendChild(card);
    const close = () => { wrap.id = ''; wrap.style.pointerEvents = 'none'; wrap.classList.remove('on'); setTimeout(() => wrap.remove(), 180); };
    no.onclick = () => { close(); done(null); };
    ok.onclick = () => { close(); inp.click(); };   /* this tap opens the photos */
    wrap.addEventListener('pointerdown', e => { if (e.target === wrap) { close(); done(null); } });
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('on'));
  }
  /* a picked photo, shrunk to at most `max` pixels across; bad(): the browser couldn't open it (HEIC on Windows, say) */
  function shrinkPhoto(f, max, quality, good, bad) {
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      good(c, c.toDataURL('image/jpeg', quality));
    };
    im.onerror = () => { URL.revokeObjectURL(url); bad(); };
    im.src = url;
  }
  function openTextBox(req, kind, title, initial, maxlen) {
    if (textBox) textBox.cancel();
    tbStyle();
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
    void wrap.offsetWidth; wrap.classList.add('on');   /* (at once, not on the next frame) */
    try { field.focus(); } catch (e) {}
  }

  /* 4.0: game controllers (the Gamepad API): the first one connected, every frame, into the game */
  let padWas = false;
  function pollPads() {
    if (!ex || !ex.tp_pad || !navigator.getGamepads) return;
    let gp = null;
    try { for (const g of navigator.getGamepads()) if (g && g.connected) { gp = g; break; } } catch (e) { return; }
    if (!gp) { if (padWas) { ex.tp_pad(0, 0, 0, 0, 0); padWas = false; } return; }
    const B = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
    let b = 0;
    if (B(0)) b |= 1; if (B(1)) b |= 2; if (B(2)) b |= 4; if (B(3)) b |= 8; if (B(4)) b |= 16; if (B(5)) b |= 32;
    if (B(8)) b |= 64; if (B(9)) b |= 128; if (B(12)) b |= 256; if (B(13)) b |= 512; if (B(14)) b |= 1024; if (B(15)) b |= 2048;
    const a = gp.axes || [];
    ex.tp_pad(a[0] || 0, a[1] || 0, a[2] || 0, a[3] || 0, b); padWas = true;
  }
  let cursorKind = -1;
  const envImports = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, atan2: Math.atan2, exp: Math.exp, pow: Math.pow, acos: Math.acos, log: Math.log,
    logmsg: p => console.log('[TaterPeeler]', str(p)),
    plat_file: (np, sp) => {
      const n = str(np); let f = filePtrs[n];
      if (!f && files[n] && /^(lang_|font_|credits|candle|disco|turkey|potato_l1|tc_)/.test(n)) {   /* arrived since: copy it in */
        const d = files[n]; const p = ex.tp_malloc(d.length); views(); u8.set(d, p);
        f = filePtrs[n] = { ptr: p, size: d.length };
      }
      views();
      if (!f) { if (/^(lang_|font_|candle|disco|turkey|credits_roll|potato_l1|tc_)/.test(n)) lazyFile(n); if (sp) i32[sp >> 2] = 0; return 0; }
      if (sp) i32[sp >> 2] = f.size;
      return f.ptr;
    },
    plat_texture: (np, wp, hp, flags) => {
      const n = str(np); let im = images[n];
      if (!im && SHARP[n] && images[SHARP[n]]) im = images[SHARP[n]];   /* the sharp one isn't here yet: start on the 1024 */
      if (!im) { if (/^(kitchen_|counter_|potato_mix|font_atlas_|ad\.jpg|leaf|ta_|tc_|fry_tut|share_)/.test(n)) lazyImage(n); return 0; }
      const t = gl.createTexture();
      if (SHARP[n] && !images[n]) sharpWait.push([n, t, flags]);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      const fmt = (flags & 2) ? gl.LUMINANCE : (flags & 8) ? gl.RGBA : gl.RGB;   /* 8: keep its transparency (the leaf) */
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, im);
      const mip = !(flags & 4) && ((flags & 1) || (flags & 2));
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      const clamp = (flags & 2) || (flags & 4);   /* 4: a picture of any size (the ad): clamped, so WebGL 1 can draw it */
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT);
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
    plat_pick_potato_photo: () => pickFile(f => shrinkPhoto(f, 1024, 0.85, (c, d) => {
        try { localStorage.setItem(POTATO_KEY, d); } catch (e) { console.warn('[TaterPeeler] potato photo could not be kept for next time'); }
        const im2 = new Image();
        im2.onload = () => { potatoImg = im2; potatoTried = true; ex.tp_potato_photo_ready(1); };
        im2.onerror = () => ex.tp_potato_photo_ready(-1);
        im2.src = d;
      }, () => ex.tp_potato_photo_ready(-1)), () => ex.tp_potato_photo_ready(0)),
    plat_pick_photo: () => pickFile(f => shrinkPhoto(f, 1024, 0.85, (c, d) => {   /* at most 1024 px: plenty behind the board, small enough to keep */
        try { localStorage.setItem(PHOTO_KEY, d); } catch (e) { console.warn('[TaterPeeler] photo could not be kept for next time'); }
        const im2 = new Image();
        im2.onload = () => { photoImg = im2; photoTried = true; ex.tp_photo_ready(1); };
        im2.onerror = () => ex.tp_photo_ready(-1);
        im2.src = d;
      }, () => ex.tp_photo_ready(-1)), () => ex.tp_photo_ready(0)),
    /* ---- online (2.0) ---- */
    plat_http: (req, up, kp, bp) => {
      const url = str(up), key = str(kp), body = str(bp);
      if (key && url.indexOf('/rest/v1/rpc/') > 0) { rpcBase = url.slice(0, url.indexOf('/rest/v1/rpc/') + 13); rpcKey = key; }   /* (for a crash report) */
      const deliver = (status, text) => {
        if (!ex) return;
        const b = te.encode(text || ''), p = ex.tp_net_buf(b.length + 1);
        views(); if (p) u8.set(b, p);
        ex.tp_net_done(req, status, p ? b.length : 0);
      };
      (bp && kp ? fetch(url, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body, cache: 'no-store' })
          : bp ? fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, cache: 'no-store', redirect: 'follow' })   /* no key: the backup route (a relay), sent so it needs no CORS preflight */
          : fetch(url, { cache: 'no-store' }))   /* no body: a plain GET (events.txt) */
        .then(r => r.text().then(t => deliver(r.status, t)))
        .catch(() => deliver(0, ''));
    },
    plat_locale: (op, cap) => {
      const b = te.encode(navigator.language || ''); views();
      const n = Math.min(b.length, cap - 1); u8.set(b.subarray(0, n), op); u8[op + n] = 0;
    },
    plat_utc_offset: () => -new Date().getTimezoneOffset(),
    plat_today: () => { const m = /[?&]today=(\d{8})/.exec(location.search); if (m) return +m[1]; const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); },
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
    plat_pick_image: req => pickFile(f => shrinkPhoto(f, req >= 1000000 ? 320 : 900, 0.82, (c, d) => {   /* the admin's popup photo (or, 4.0, a small portfolio photo), as a data: URL */
        if (req >= 1000000) { if (d.length > 88000) d = c.toDataURL('image/jpeg', 0.6); if (d.length > 88000) d = c.toDataURL('image/jpeg', 0.4); }
        else if (d.length > 560000) d = c.toDataURL('image/jpeg', 0.6);
        const b = te.encode(d), p = ex.tp_net_buf(b.length + 1); views(); if (p) u8.set(b, p);
        ex.tp_image_picked(req, p ? 1 : 0, p ? b.length : 0);
      }, () => ex.tp_image_picked(req, 0, 0)), () => ex.tp_image_picked(req, 0, 0)),
    plat_open_url: p => { const u = str(p); if (/^https:\/\//.test(u)) window.open(u, '_blank', 'noopener'); },
    plat_copy_text: p => {   /* 4.0: Share: the link onto the clipboard */
      const t = str(p);
      const old = () => { const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); };
      try { if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).catch(old); else old(); } catch (e) { old(); }
    },
    plat_save_image: (np, sp) => {   /* 4.0: Share: the QR code, downloaded */
      const a = document.createElement('a'); a.href = 'data/' + str(np); a.download = str(sp);
      document.body.appendChild(a); a.click(); a.remove();
    },
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
    plat_push_state: () => window.TP_PUSH ? window.TP_PUSH.state() : 0,   /* (the website's push.js; the apps have none) */
    plat_push_ask: () => { if (window.TP_PUSH) window.TP_PUSH.ask(); },
    plat_music_track: t => {   /* 0 the game's music, 1 the credits' (from the start) */
      t = t === 1 ? 1 : 0;
      if (t === musicTrack && t === 0) return;
      music.pause(); musicStarted = false;
      const ready = useTrack(t);
      try { music.currentTime = 0; } catch (e) {}
      if (ready && musicWanted && unlocked) music.play().then(() => { musicStarted = true; }).catch(() => {});
    },
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
const RS_FIXED = (() => { const v = +(new URLSearchParams(location.search).get('rs') || 0); return v >= 0.4 && v <= 1 ? v : 0; })();
  /* otherwise it adapts: if frames come too slowly the game draws at a lower resolution (the browser scales it up),
     and climbs back when there's room. The level a device settles on is remembered for next time. */
  let renderScale = RS_FIXED || (typeof perf.rs === 'number' ? Math.max(0.5, Math.min(1, perf.rs)) : (tinyScreen ? 0.75 : 1));
  const perfWin = []; let perfGood = 0, perfSince = 0;
  function perfSample(dt) {
    if (RS_FIXED || minFrameMs > 0 || dt > 250 || document.hidden) return;
    perfWin.push(dt); if (perfWin.length < 90) return;
    const m = perfWin.slice().sort((a, b) => a - b)[45]; perfWin.length = 0;
    if (++perfSince < 2) return;   /* skip the first few seconds (loading, shaders warming up) */
    if (m > 26 && renderScale > 0.5) {
      renderScale = Math.max(0.5, Math.round(renderScale * 0.85 * 100) / 100); perfGood = 0;
      perf.rs = renderScale; savePerf(); resize();
    } else if (m > 26 && renderScale <= 0.5 && quality > 0 && perf.q !== quality - 1) {
      perf.q = quality - 1; savePerf();   /* still slow at the lowest resolution: lighter settings from the next visit */
    } else if (m < 15 && renderScale < 1) {
      if (++perfGood >= 3) { renderScale = Math.min(1, Math.round(renderScale * 1.1 * 100) / 100); perfGood = 0; perf.rs = renderScale; savePerf(); resize(); }
    } else perfGood = 0;
  }
  function resize() {
    const vv = window.visualViewport;
    const cw = Math.max(1, Math.round(vv && vv.scale === 1 ? vv.width : window.innerWidth));
    const ch = Math.max(1, Math.round(vv && vv.scale === 1 ? vv.height : window.innerHeight));
    viewW = cw; viewH = ch;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * renderScale;
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
      /* 4.0: TV remotes: OK is Enter; their Back button (webOS 461, Tizen 10009, others GoBack) goes back */
      if (e.key === 'GoBack' || e.key === 'BrowserBack' || e.keyCode === 461 || e.keyCode === 10009) { e.preventDefault(); ex.tp_back(); return; }
      const map = { Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Enter: 13 };
      let k = map[e.key] || (e.key && e.key.length === 1 ? e.key.charCodeAt(0) : 0);
      if (k) { ex.tp_key(k, 1); if ((k >= 37 && k <= 40) || k === 13) e.preventDefault(); }
    });
    window.addEventListener('keyup', e => {   /* 4.0: TaterCorner walks while a key is held */
      if (textBox) return;
      const map = { Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Enter: 13 };
      let k = map[e.key] || (e.key && e.key.length === 1 ? e.key.charCodeAt(0) : 0);
      if (k) ex.tp_key(k, 0);
    });
    window.addEventListener('blur', () => { try { ex.tp_key(-1, 0); } catch (e) {} });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { ex.tp_background(); music.pause(); musicStarted = false; }
      else {
        if (gl.isContextLost && gl.isContextLost()) { relaunch(); return; }
        if (musicWanted && unlocked) music.play().then(() => { musicStarted = true; }).catch(() => {});
      }
    });
    /* 3.0: when a device sleeps (a watch, a phone, a TV) the browser can take the graphics away; the picture went grey
       and stayed grey. Now the game starts again where it was as soon as it's back (it saves as you play). */
    let relaunching = false;
    function relaunch() { if (relaunching) return; relaunching = true; try { ex.tp_background(); } catch (e) {} setTimeout(() => location.reload(), 150); }
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); try { ex.tp_background(); } catch (e2) {} }, false);
    canvas.addEventListener('webglcontextrestored', () => relaunch(), false);
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
  /* 3.0: a crash inside the game (a WebAssembly trap) used to stop everything: the picture froze half-drawn, and online
     you were dropped from the room. Now every call into the game is caught: that frame (or tap) is skipped and the game
     carries on; the first one is sent to the owner's ideas list as a crash report, and if it keeps happening the page
     reloads (your progress is saved as you play). */
  let crashes = 0, crashRun = 0, crashSent = false, rpcBase = '', rpcKey = '';
  function crashed(name, e) {
    crashes++; crashRun++;
    console.error('[TaterPeeler] crash in ' + name + ': ' + String((e && e.stack) || e));
    if (!crashSent && rpcBase) {
      crashSent = true;
      const st = String((e && e.stack) || e).replace(/https?:\/\/[^\s)]+\//g, '').slice(0, 700);
      const text = '[crash report] 4.0 ' + (window.TP_PLATFORM || 'web') + ' in ' + name + ': ' + String(e && e.message || e).slice(0, 120) + ' | ' + st + ' | ' + navigator.userAgent.slice(0, 120);
      fetch(rpcBase + 'tp_suggest', { method: 'POST', headers: { apikey: rpcKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_device: 'crash-report', p_name: 'Crash report', p_text: text }) }).catch(() => {});
    }
    if (crashRun > 45) {   /* every frame for a while: start fresh */
      crashRun = -1e9;
      try { ex.tp_background && ex.tp_background(1); } catch (e2) {}
      setTimeout(() => location.reload(), 300);
    }
  }
  function guard(raw) {
    const g = {};
    for (const k of Object.keys(raw)) {
      const f = raw[k];
      if (typeof f !== 'function') { g[k] = f; continue; }
      g[k] = k === 'tp_frame'
        ? function () { try { const r = f.apply(null, arguments); if (crashRun > 0) crashRun--; return r; } catch (e) { crashed(k, e); return 0; } }
        : function () { try { return f.apply(null, arguments); } catch (e) { crashed(k, e); return 0; } };
    }
    return g;
  }
  /* the sharp pictures: re-filled into the same textures the game already holds, between frames */
  const sharpWait = [], sharpReady = [];
  function sharpSwap() {
    const n = sharpReady.shift(), im = images[n];
    const prevUnit = gl.getParameter(gl.ACTIVE_TEXTURE); gl.activeTexture(gl.TEXTURE0);
    const prev = gl.getParameter(gl.TEXTURE_BINDING_2D);
    for (let i = sharpWait.length - 1; i >= 0; i--) {
      if (sharpWait[i][0] !== n) continue;
      const [, t, flags] = sharpWait[i]; sharpWait.splice(i, 1);
      if (gl.isContextLost()) continue;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      if (flags & 1) gl.generateMipmap(gl.TEXTURE_2D);
    }
    gl.bindTexture(gl.TEXTURE_2D, prev); gl.activeTexture(prevUnit);
  }
  function instantiate(bytes, imports) {
    const fallback = err => {
      console.warn('[TaterPeeler] WebAssembly unavailable, using the JavaScript build', err && err.message);
      return new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'taterpeeler.asm.js' + V;
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
  Promise.all([wasmP.catch(() => null), ...FILES.map(loadBin), ...IMAGES.map(loadImg),
               ...LF.files.map(n => loadBin(n).catch(() => tick())), ...LF.images.map(n => loadImg(n).catch(() => tick()))]).then(([wasmBytes]) => {
    if (infoShown) { clearTimeout(infoTimer); infoTimer = 0; info.textContent = W('sstart'); }
    return instantiate(wasmBytes, { env: envImports, gl: glImports });
  }).then(exports => {
    ex = guard(exports); mem = ex.memory;
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
      if (sharpReady.length) sharpSwap();
      perfSample(t - lastFrameT);
      lastFrameT = t; pollPads(); ex.tp_frame(t / 1000);
    };
    requestAnimationFrame(frame);
    window.__taterpeeler = { exports: ex, crashes: () => crashes };
    setTimeout(tbStyle, 1500);   /* the text box's style and font, ready before it's first needed (it opens faster) */
    /* now the sounds and the music, so they never hold up the start */
    SOUNDS.reduce((p, n) => p.then(() => loadSnd(n)), Promise.resolve());
    /* and the sharp pictures, one after another, swapped in as each arrives */
    Object.keys(SHARP).reduce((p, n) => p.then(() => imgRetry('data/' + n + V, 3).then(im => { images[n] = im; sharpReady.push(n); }).catch(() => {})), new Promise(r => setTimeout(r, 1500)));
    if (window.TP_PLATFORM !== 'android') { music.preload = 'auto'; music.load(); }
  }).catch(err => {
    console.error(err);
    loader.querySelector('.msg').textContent = 'TaterPeeler could not load its files. Reload the page to try again. If this persists try using the web app or website.';
  });
})();
