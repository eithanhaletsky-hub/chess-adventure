(function () {
  'use strict';
  const C = window.Chess;
  const LEVELS = window.LEVELS;
  const REGIONS = window.REGIONS;
  const $ = (id) => document.getElementById(id);

  /* ---------- שמירת התקדמות ---------- */
  const KEY = 'drakiChessAdventure';
  let save = { name: '', stars: {}, sound: true };
  try { save = Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* אין שמירה */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* לא נורא */ } }

  const starsOf = (id) => save.stars[id] || 0;
  const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);
  const isUnlocked = (i) => i === 0 || starsOf(LEVELS[i - 1].id) > 0;

  /* ---------- צלילים ---------- */
  let actx = null;
  function tone(freq, dur, type, delay) {
    if (!save.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + (delay || 0);
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* בלי צליל */ }
  }
  const sfx = {
    move: () => tone(420, 0.09, 'triangle'),
    capture: () => { tone(300, 0.1, 'square'); tone(220, 0.12, 'square', 0.06); },
    star: () => { tone(880, 0.1); tone(1320, 0.15, 'sine', 0.08); },
    wrong: () => tone(180, 0.25, 'sawtooth'),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', i * 0.12)),
    check: () => tone(700, 0.15, 'square')
  };

  /* ---------- הדרקון ---------- */
  function dragonSVG(body, belly, mood) {
    const mouth = mood === 'sad'
      ? '<path d="M44 74 Q50 68 56 74" stroke="#2d3142" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : '<path d="M40 68 Q50 80 60 68" stroke="#2d3142" stroke-width="3" fill="#ff7a7a" stroke-linecap="round"/>';
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M78 78 Q98 80 94 60 Q92 70 80 70 Z" fill="${body}"/>
      <path d="M20 46 L4 30 L10 52 L2 58 L20 60 Z" fill="${belly}" opacity=".9"/>
      <path d="M80 46 L96 30 L90 52 L98 58 L80 60 Z" fill="${belly}" opacity=".9"/>
      <path d="M34 22 L30 6 L42 18 Z" fill="#ffd36b"/>
      <path d="M66 22 L70 6 L58 18 Z" fill="#ffd36b"/>
      <ellipse cx="50" cy="56" rx="32" ry="34" fill="${body}"/>
      <ellipse cx="50" cy="70" rx="19" ry="17" fill="${belly}"/>
      <path d="M44 26 L50 16 L56 26 Z" fill="#ffd36b"/>
      <circle cx="38" cy="48" r="9" fill="#fff"/><circle cx="62" cy="48" r="9" fill="#fff"/>
      <circle cx="40" cy="49" r="4.5" fill="#2d3142"/><circle cx="64" cy="49" r="4.5" fill="#2d3142"/>
      <circle cx="41.5" cy="47" r="1.6" fill="#fff"/><circle cx="65.5" cy="47" r="1.6" fill="#fff"/>
      <rect class="dragon-eye-lid" x="28" y="38" width="20" height="20" rx="10" fill="${body}"/>
      <rect class="dragon-eye-lid" x="52" y="38" width="20" height="20" rx="10" fill="${body}"/>
      <circle cx="30" cy="62" r="4" fill="#ff9aa2" opacity=".7"/><circle cx="70" cy="62" r="4" fill="#ff9aa2" opacity=".7"/>
      <circle cx="45" cy="60" r="1.6" fill="#2d3142"/><circle cx="55" cy="60" r="1.6" fill="#2d3142"/>
      ${mouth}
      <ellipse cx="36" cy="90" rx="9" ry="5" fill="${body}"/><ellipse cx="64" cy="90" rx="9" ry="5" fill="${body}"/>
    </svg>`;
  }
  const DRAKI = ['#66bb6a', '#c5e8a5'];
  const FOES = { 1: ['#f4a6c1', '#ffe0ec'], 2: ['#ff9b54', '#ffe0c2'], 3: ['#b23a48', '#f6b8a8'] };

  function setDragon(el, colors, mood) {
    el.innerHTML = dragonSVG(colors[0], colors[1], mood);
    if (mood === 'happy') { el.firstChild.classList.add('dragon-happy'); }
  }
  document.querySelectorAll('[data-dragon]').forEach((el) => setDragon(el, DRAKI));

  function say(text, kind) {
    const b = $('bubble');
    b.textContent = text;
    b.className = 'bubble' + (kind ? ' ' + kind : '');
    if (kind === 'good') setDragon($('guideDragon'), DRAKI, 'happy');
    else if (kind === 'oops') setDragon($('guideDragon'), DRAKI, 'sad');
    else setDragon($('guideDragon'), DRAKI);
  }

  /* ---------- מסכים ---------- */
  function show(id) {
    ['welcome', 'map', 'level'].forEach((s) => $(s).classList.toggle('hidden', s !== id));
    window.scrollTo(0, 0);
  }

  /* ---------- מסך פתיחה ---------- */
  $('startBtn').onclick = () => {
    const n = $('nameInput').value.trim();
    if (!n) { $('nameInput').focus(); $('nameInput').placeholder = 'רגע, מה השם שלך?'; return; }
    save.name = n; persist();
    tone(660, 0.1); openMap();
  };
  $('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('startBtn').click(); });

  /* ---------- מפה ---------- */
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const glyph = (p) => GLYPH[p.toLowerCase()] + '︎';

  function openMap() {
    show('map');
    $('helloText').textContent = `שלום ${save.name}! לאן נמשיך?`;
    $('totalStars').textContent = totalStars();
    $('soundBtn').textContent = save.sound ? '🔊' : '🔇';
    drawMap();
  }

  function drawMap() {
    const svg = $('mapSvg');
    const W = 900, top = 150, step = 115;
    const pts = LEVELS.map((L, i) => ({ x: W / 2 + 270 * Math.sin(i * 0.85), y: top + i * step }));
    // רווח נוסף בין אזורים
    let shift = 0;
    LEVELS.forEach((L, i) => {
      if (i > 0 && L.region !== LEVELS[i - 1].region) shift += 70;
      pts[i].y += shift;
    });
    const H = pts[pts.length - 1].y + 160;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    let html = '';
    // רצועות אזורים
    REGIONS.forEach((R) => {
      const idx = LEVELS.map((L, i) => (L.region === R.id ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) return;
      const y1 = pts[idx[0]].y - 95, y2 = pts[idx[idx.length - 1]].y + 60;
      html += `<rect x="20" y="${y1}" width="${W - 40}" height="${y2 - y1}" rx="50" fill="${R.color}" opacity=".35"/>`;
      const side = Math.sin(idx[0] * 0.85) > 0 ? 70 : W - 70;
      const anchor = side < W / 2 ? 'start' : 'end';
      const big = R.icon.length === 1 && 'PRBNQK'.includes(R.icon) ? glyph(R.icon) : (R.id === 'mate' ? '?' : '🐉');
      html += `<text x="${side}" y="${y1 + 48}" text-anchor="${anchor}" class="region-label" fill="#2d3142">${R.name}</text>`;
      html += `<text x="${W - side}" y="${y1 + 70}" text-anchor="middle" font-size="64" opacity=".25">${big}</text>`;
    });
    // שביל
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      d += ` C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`;
    }
    html += `<path d="${d}" stroke="#fff" stroke-width="16" fill="none" stroke-linecap="round" opacity=".8"/>`;
    html += `<path d="${d}" stroke="#d9a066" stroke-width="5" fill="none" stroke-dasharray="2 14" stroke-linecap="round"/>`;

    // נקודות
    let current = 0;
    LEVELS.forEach((L, i) => { if (isUnlocked(i)) current = i; });
    LEVELS.forEach((L, i) => {
      const p = pts[i];
      const open = isUnlocked(i);
      const R = REGIONS.find((r) => r.id === L.region);
      const st = starsOf(L.id);
      const cls = ['node', open ? '' : 'locked', i === current ? 'current' : ''].join(' ');
      html += `<g class="${cls}" data-i="${i}">`;
      if (i === current) html += `<circle class="ring" cx="${p.x}" cy="${p.y}" r="40" fill="${R.color}"/>`;
      html += `<circle class="base" cx="${p.x}" cy="${p.y}" r="38" fill="${open ? R.color : '#c9cdd6'}" stroke="#fff" stroke-width="6"/>`;
      html += `<text x="${p.x}" y="${p.y + 11}" text-anchor="middle" font-size="30" fill="#fff" stroke="#2d3142" stroke-width="1">${open ? i + 1 : '🔒'}</text>`;
      html += `<text x="${p.x}" y="${p.y + 62}" text-anchor="middle" font-size="20" fill="#2d3142">${L.title}</text>`;
      if (open) {
        let s = '';
        for (let k = 0; k < 3; k++) s += `<tspan fill="${k < st ? '#ffc93c' : '#ffffff'}" stroke="#b58900" stroke-width=".8">★</tspan>`;
        html += `<text x="${p.x}" y="${p.y - 46}" text-anchor="middle" font-size="22">${s}</text>`;
      }
      html += '</g>';
    });
    // דרקי עומד ליד השלב הנוכחי
    const cp = pts[current];
    const dx = cp.x > W / 2 ? -150 : 60;
    html += `<g transform="translate(${cp.x + dx}, ${cp.y - 55})"><g class="map-dragon">${dragonSVG(DRAKI[0], DRAKI[1]).replace('<svg ', '<svg width="90" height="90" ')}</g></g>`;
    svg.innerHTML = html;

    svg.querySelectorAll('.node').forEach((g) => {
      g.addEventListener('click', () => {
        const i = +g.dataset.i;
        if (!isUnlocked(i)) { sfx.wrong(); return; }
        startLevel(i);
      });
    });
    // גלילה לשלב הנוכחי
    requestAnimationFrame(() => {
      const rect = svg.getBoundingClientRect();
      const scale = rect.width / W;
      window.scrollTo({ top: Math.max(0, cp.y * scale - window.innerHeight / 2), behavior: 'smooth' });
    });
  }

  $('soundBtn').onclick = () => { save.sound = !save.sound; persist(); $('soundBtn').textContent = save.sound ? '🔊' : '🔇'; };
  $('menuBtn').onclick = () => {
    modal({
      title: 'הגדרות', text: '',
      html: `<div class="modal-list">שם: <b>${escapeHTML(save.name)}</b><br>כוכבים: ${totalStars()} מתוך ${LEVELS.length * 3}</div>`,
      buttons: [
        { label: 'שינוי שם', alt: true, fn: () => { closeModal(); $('nameInput').value = save.name; show('welcome'); } },
        { label: 'להתחיל את המסע מחדש', alt: true, fn: () => {
          if (confirm('בטוח? כל הכוכבים יימחקו.')) { save.stars = {}; persist(); closeModal(); openMap(); }
        } },
        { label: 'סגור', fn: closeModal }
      ]
    });
  };
  function escapeHTML(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ---------- שלב ---------- */
  let G = null; // מצב השלב הנוכחי

  function startLevel(i) {
    const L = LEVELS[i];
    G = { i, L, sel: -1, moves: [], last: [], busy: false, mistakes: 0, history: [] };
    show('level');
    $('levelTitle').textContent = `${i + 1}. ${L.title}`;
    $('undoBtn').classList.toggle('hidden', L.type !== 'battle');
    $('hintBtn').classList.toggle('hidden', L.type === 'battle');
    if (L.type === 'train') initTrain();
    if (L.type === 'puzzle') { G.pos = 0; loadPuzzle(); }
    if (L.type === 'battle') initBattle();
    say(L.intro);
    render();
  }

  function initTrain() {
    const L = G.L;
    const b = new Array(64).fill(null);
    Object.entries(L.pieces || {}).forEach(([s, p]) => { b[C.sq(s)] = p; });
    Object.entries(L.enemies || {}).forEach(([s, p]) => { b[C.sq(s)] = p; });
    (L.rocks || []).forEach((s) => { b[C.sq(s)] = C.ROCK; });
    G.state = { b, turn: 'w', castle: '', ep: -1 };
    G.stars = new Set((L.stars || []).map(C.sq));
    G.count = 0;
  }

  function loadPuzzle() {
    G.state = C.fromFEN(G.L.positions[G.pos]);
    G.last = []; G.sel = -1; G.busy = false;
  }

  function initBattle() {
    G.state = C.fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    G.plies = 0;
    setDragon($('guideDragon'), DRAKI);
  }

  function updateStats() {
    const L = G.L;
    let t = '';
    if (L.type === 'train') {
      const left = G.stars.size;
      const enemies = G.state.b.filter((p) => p && C.colorOf(p) === 'b').length;
      t = `צעדים: <b>${G.count}</b>`;
      if (L.stars) t += ` &nbsp;|&nbsp; כוכבים שנשארו: <b>${left}</b>`;
      if (L.enemies) t += ` &nbsp;|&nbsp; כלים שחורים: <b>${enemies}</b>`;
      t += `<br><small>3 כוכבים אם תצליח ב-${L.par} צעדים</small>`;
      $('levelProgress').textContent = '';
    } else if (L.type === 'puzzle') {
      t = `טעויות: <b>${G.mistakes}</b>`;
      $('levelProgress').textContent = `חידה ${G.pos + 1}/${L.positions.length}`;
    } else {
      const foe = ['', 'הדרקון התינוק', 'הדרקון הצעיר', 'הדרקון הגדול'][L.ai];
      t = `אתה משחק בלבן ⚪ נגד ${foe} ⚫`;
      $('levelProgress').textContent = '';
    }
    $('stats').innerHTML = t;
    $('undoBtn').disabled = !(G.history && G.history.length) || G.busy;
  }

  function render() {
    const board = $('board');
    const s = G.state;
    const checkSq = (G.L.type !== 'train' && C.inCheck(s)) ? s.b.indexOf(s.turn === 'w' ? 'K' : 'k') : -1;
    const targets = new Map(G.moves.map((m) => [m.to, m]));
    let html = '';
    for (let i = 0; i < 64; i++) {
      const f = i % 8, r = Math.floor(i / 8);
      const cls = ['cell', (f + r) % 2 ? 'dark' : 'light'];
      if (G.last.includes(i)) cls.push('last');
      if (i === G.sel) cls.push('selected');
      if (i === checkSq) cls.push('check');
      let inner = '';
      const p = s.b[i];
      if (p === C.ROCK) inner += rockSVG();
      else if (p) inner += `<span class="piece ${C.colorOf(p)}">${glyph(p)}</span>`;
      else if (G.stars && G.stars.has(i)) inner += '<span class="star-tok">★</span>';
      if (targets.has(i)) inner += p ? '<span class="ring"></span>' : '<span class="dot"></span>';
      if (r === 7) inner += `<span class="coord file">${'abcdefgh'[f]}</span>`;
      if (f === 0) inner += `<span class="coord rank">${8 - r}</span>`;
      html += `<div class="${cls.join(' ')}" data-i="${i}">${inner}</div>`;
    }
    board.innerHTML = html;
    updateStats();
  }

  function rockSVG() {
    return '<svg class="rock" viewBox="0 0 60 50"><path d="M6 44 Q2 30 12 20 Q18 6 32 8 Q48 6 54 22 Q60 36 52 44 Z" fill="#9a9a9a" stroke="#6b6b6b" stroke-width="3"/><path d="M18 22 Q24 16 30 18" stroke="#c8c8c8" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
  }

  $('board').addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (!cell || !G || G.busy) return;
    const i = +cell.dataset.i;
    const s = G.state;
    const m = G.moves.find((x) => x.to === i);
    if (m) { playerMove(m); return; }
    const p = s.b[i];
    if (p && C.colorOf(p) === 'w' && s.turn === 'w') {
      G.sel = i;
      G.moves = C.legalMoves(s, i);
      if (!G.moves.length) say(noMoveText(p, s));
      tone(520, 0.05);
    } else {
      if (p && C.colorOf(p) === 'b' && G.sel < 0) say('זה כלי של היריב. לחץ על אחד הכלים הלבנים שלך.');
      G.sel = -1; G.moves = [];
    }
    render();
  });

  function noMoveText(p, s) {
    if (C.inCheck(s)) return 'המלך שלך בשח! הכלי הזה לא יכול לעזור לו. נסה כלי אחר.';
    return 'לכלי הזה אין לאן לזוז כרגע. נסה כלי אחר.';
  }

  function playerMove(m) {
    const before = G.state;
    const wasCapture = !!before.b[m.to] || m.ep;
    G.state = C.makeMove(before, m);
    G.last = [m.from, m.to]; G.sel = -1; G.moves = [];
    if (G.L.type === 'train') afterTrain(m, wasCapture);
    else if (G.L.type === 'puzzle') afterPuzzle(m, before);
    else afterBattle(m, before, wasCapture);
  }

  /* ----- אימון ----- */
  function afterTrain(m, wasCapture) {
    G.state.turn = 'w'; G.state.ep = -1;
    G.count++;
    let msg = null;
    if (G.stars.has(m.to)) { G.stars.delete(m.to); sfx.star(); msg = ['יש! אספת כוכב!', 'מעולה!', 'כל הכבוד!'][G.stars.size % 3]; }
    else if (wasCapture) { sfx.capture(); msg = 'הם! תפסת אותו!'; }
    else sfx.move();
    if (m.promo) msg = 'וואו! הרגלי הגיע לסוף והפך למלכה! 👑';
    render();
    if (msg) say(msg, 'good');
    const enemies = G.state.b.filter((p) => p && C.colorOf(p) === 'b').length;
    if (G.stars.size === 0 && enemies === 0) {
      const par = G.L.par;
      const st = G.count <= par ? 3 : G.count <= par + 2 ? 2 : 1;
      finish(st, st === 3 ? `סיימת ב-${G.count} צעדים בלבד! מושלם!` : `סיימת ב-${G.count} צעדים. אפשר גם ב-${par} – רוצה לנסות שוב?`);
    }
  }

  /* ----- חידות ----- */
  function afterPuzzle(m, before) {
    const goal = G.L.goal;
    const s = G.state;
    let ok = false;
    if (goal === 'mate') ok = C.status(s) === 'mate';
    if (goal === 'check') ok = C.inCheck(s, 'b');
    if (goal === 'escape') ok = true;
    if (goal === 'castle') ok = !!m.castle;
    if (m.captured || m.ep) sfx.capture(); else sfx.move();
    render();
    G.busy = true;
    if (ok) {
      sfx.star();
      const words = { mate: 'מט!!! מצאת את זה!', check: 'שח! המלך השחור מותקף!', escape: 'הצלת את המלך! מעולה!', castle: 'הצרחה מושלמת! המלך מוגן עכשיו.' };
      say(words[goal], 'good');
      setTimeout(() => {
        G.pos++;
        if (G.pos >= G.L.positions.length) {
          const st = G.mistakes === 0 ? 3 : G.mistakes <= 2 ? 2 : 1;
          finish(st, G.mistakes === 0 ? 'פתרת הכל בלי אף טעות!' : `פתרת הכל! (${G.mistakes} טעויות בדרך)`);
        } else { loadPuzzle(); render(); say('יופי! הנה החידה הבאה.'); }
      }, 1300);
    } else {
      G.mistakes++;
      sfx.wrong();
      let why = 'לא בדיוק... נסה שוב!';
      if (goal === 'mate' && C.inCheck(s, 'b')) why = 'זה שח, אבל המלך השחור יכול לברוח. חפש מהלך אחר!';
      if (goal === 'check') why = 'המהלך הזה לא תוקף את המלך. נסה שוב!';
      if (goal === 'castle') why = 'זו לא הצרחה. לחץ על המלך והזז אותו שתי משבצות לכיוון הצריח.';
      say(why, 'oops');
      setTimeout(() => { G.state = before; G.last = []; G.busy = false; render(); }, 1200);
    }
  }

  /* ----- משחק מול הדרקון ----- */
  function afterBattle(m, before, wasCapture) {
    G.history.push({ state: before, last: [] });
    G.plies++;
    if (wasCapture) sfx.capture(); else sfx.move();
    G.busy = true;
    render();
    if (battleOver()) return;
    if (C.inCheck(G.state)) { sfx.check(); }
    say(C.inCheck(G.state) ? 'שח! הדרקון צריך להציל את המלך שלו!' : 'הדרקון חושב...');
    setTimeout(() => {
      const r = C.bestMove(G.state, G.L.ai);
      const cap = !!G.state.b[r.to] || r.ep;
      G.state = C.makeMove(G.state, r);
      G.plies++;
      G.last = [r.from, r.to];
      G.busy = false;
      if (cap) sfx.capture(); else sfx.move();
      render();
      if (battleOver()) return;
      if (C.inCheck(G.state)) { sfx.check(); say('זהירות! המלך שלך בשח! תציל אותו.', 'oops'); }
      else if (cap) say('אוי, הדרקון אכל לך כלי. שים לב מה מותקף!', 'oops');
      else say(battleTip());
    }, 450);
  }

  const TIPS = [
    'תורך! טיפ: נסה לשלוט במרכז הלוח.',
    'תורך! טיפ: הוצא את הפרשים והרצים מהבית.',
    'תורך! לפני שאתה זז – בדוק: האם הדרקון מאיים על משהו?',
    'תורך! טיפ: הצרחה עוזרת לשמור על המלך.',
    'תורך! אפשר לאכול משהו בלי סכנה?'
  ];
  function battleTip() { return TIPS[Math.floor(G.plies / 2) % TIPS.length]; }

  function battleOver() {
    const st = C.status(G.state);
    if (st === 'play' && G.plies < 300) return false;
    G.busy = true;
    if (st === 'mate' && G.state.turn === 'b') {
      finish(3, 'ניצחת את הדרקון במט! אתה אלוף!');
    } else if (st === 'mate') {
      sfx.wrong();
      setDragon($('guideDragon'), DRAKI, 'sad');
      modal({
        title: 'הדרקון ניצח הפעם', text: 'לא נורא! גם אלופים מפסידים. כל משחק מלמד משהו חדש.', mood: 'sad', stars: 0,
        buttons: [{ label: 'עוד משחק!', fn: () => { closeModal(); startLevel(G.i); } }, { label: 'למפה', alt: true, fn: () => { closeModal(); openMap(); } }]
      });
    } else {
      const why = st === 'stalemate' ? 'פט! למי שבתורו אין שום מהלך, אבל הוא לא בשח – אז זה תיקו.' : 'תיקו! אף אחד לא יכול לנצח פה.';
      finish(1, why, 'תיקו!');
    }
    return true;
  }

  $('undoBtn').onclick = () => {
    if (!G || !G.history.length || G.busy) return;
    const h = G.history.pop();
    G.state = h.state; G.last = h.last; G.sel = -1; G.moves = []; G.plies = Math.max(0, G.plies - 2);
    say('חזרנו מהלך אחורה. תחשוב שוב.');
    render();
  };
  $('restartBtn').onclick = () => { if (G) startLevel(G.i); };
  $('backBtn').onclick = () => { G = null; openMap(); };
  $('hintBtn').onclick = () => {
    if (!G) return;
    say('💡 ' + G.L.hint);
    let from = -1;
    if (G.L.type === 'train') from = G.state.b.findIndex((p) => p && C.colorOf(p) === 'w');
    if (G.L.type === 'puzzle') {
      const good = C.legalMoves(G.state).find((m) => {
        const n = C.makeMove(G.state, Object.assign({}, m));
        const g = G.L.goal;
        return g === 'mate' ? C.status(n) === 'mate' : g === 'check' ? C.inCheck(n, 'b') : g === 'castle' ? !!m.castle : true;
      });
      if (good) from = good.from;
    }
    if (from >= 0) {
      const cell = $('board').querySelector(`[data-i="${from}"]`);
      if (cell) cell.classList.add('hint');
    }
  };

  /* ---------- סיום שלב ---------- */
  function finish(st, text, title) {
    const L = G.L;
    const prev = starsOf(L.id);
    if (st > prev) { save.stars[L.id] = st; persist(); }
    sfx.win();
    if (st >= 2) confetti();
    const next = G.i + 1 < LEVELS.length ? G.i + 1 : -1;
    const buttons = [];
    if (next >= 0) buttons.push({ label: 'לשלב הבא ←', fn: () => { closeModal(); startLevel(next); } });
    buttons.push({ label: 'שוב', alt: true, fn: () => { closeModal(); startLevel(G.i); } });
    buttons.push({ label: 'למפה', alt: true, fn: () => { closeModal(); openMap(); } });
    let extra = '';
    if (next < 0) extra = ` סיימת את כל המסע, ${save.name}! דרקי גאה בך מאוד!`;
    modal({ title: title || ['', 'עברת!', 'יפה מאוד!', 'מושלם!'][st], text: text + extra, stars: st, mood: 'happy', buttons });
  }

  function modal(o) {
    setDragon($('modalDragon'), DRAKI, o.mood);
    $('modalTitle').textContent = o.title;
    $('modalText').textContent = o.text || '';
    if (o.html) $('modalText').innerHTML = o.html;
    const sEl = $('modalStars');
    if (o.stars === undefined) sEl.innerHTML = '';
    else {
      let h = '';
      for (let k = 0; k < 3; k++) h += k < o.stars ? `<span class="on" style="animation-delay:${0.2 + k * 0.25}s">★</span>` : '<span class="off">★</span>';
      sEl.innerHTML = h;
    }
    const a = $('modalActions');
    a.innerHTML = '';
    o.buttons.forEach((b) => {
      const btn = document.createElement('button');
      btn.className = 'btn' + (b.alt ? ' alt' : '');
      btn.textContent = b.label;
      btn.onclick = b.fn;
      a.appendChild(btn);
    });
    $('modal').classList.remove('hidden');
  }
  function closeModal() { $('modal').classList.add('hidden'); }

  function confetti() {
    const box = $('confetti');
    const colors = ['#ff8a3d', '#ffc93c', '#66bb6a', '#6c8ef5', '#e87ea1', '#b08ad9'];
    for (let k = 0; k < 70; k++) {
      const d = document.createElement('div');
      d.className = 'conf';
      d.style.left = Math.random() * 100 + 'vw';
      d.style.background = colors[k % colors.length];
      d.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
      d.style.animationDelay = Math.random() * 0.5 + 's';
      box.appendChild(d);
    }
    setTimeout(() => { box.innerHTML = ''; }, 4500);
  }

  /* ---------- התחלה ---------- */
  if (save.name) openMap(); else show('welcome');
})();
