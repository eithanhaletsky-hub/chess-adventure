/* מנוע שחמט קטן: חוקים, מהלכים חוקיים, שח, מט, פט ויריב ממוחשב */
(function (global) {
  'use strict';

  const FILES = 'abcdefgh';
  const ROCK = 'X'; // סלע – מכשול בשלבי הלימוד

  const sq = (name) => (8 - parseInt(name[1], 10)) * 8 + FILES.indexOf(name[0]);
  const name = (i) => FILES[i % 8] + (8 - Math.floor(i / 8));
  const colorOf = (p) => (!p || p === ROCK ? null : p === p.toUpperCase() ? 'w' : 'b');
  const fileOf = (i) => i % 8;
  const rankRow = (i) => Math.floor(i / 8);

  const DIRS = {
    n: [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]],
    b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
    r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
    k: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]
  };
  DIRS.q = DIRS.k;

  function at(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8 ? r * 8 + f : -1; }

  function fromFEN(fen) {
    const [placement, turn, castle, ep] = fen.trim().split(/\s+/);
    const b = new Array(64).fill(null);
    let i = 0;
    for (const ch of placement) {
      if (ch === '/') continue;
      if (/\d/.test(ch)) i += parseInt(ch, 10);
      else b[i++] = ch;
    }
    return {
      b,
      turn: turn || 'w',
      castle: castle && castle !== '-' ? castle : '',
      ep: ep && ep !== '-' ? sq(ep) : -1
    };
  }

  function clone(s) {
    return { b: s.b.slice(), turn: s.turn, castle: s.castle, ep: s.ep };
  }

  // האם המשבצת מותקפת על ידי צבע by
  function attacked(s, i, by) {
    const f = fileOf(i), r = rankRow(i);
    const b = s.b;
    const isBy = (p, t) => p && colorOf(p) === by && p.toLowerCase() === t;
    // רגלים
    const pr = by === 'w' ? r + 1 : r - 1;
    for (const df of [-1, 1]) {
      const j = at(f + df, pr);
      if (j >= 0 && isBy(b[j], 'p')) return true;
    }
    for (const [df, dr] of DIRS.n) {
      const j = at(f + df, r + dr);
      if (j >= 0 && isBy(b[j], 'n')) return true;
    }
    for (const [df, dr] of DIRS.k) {
      const j = at(f + df, r + dr);
      if (j >= 0 && isBy(b[j], 'k')) return true;
    }
    for (const [df, dr] of DIRS.k) {
      const diag = df !== 0 && dr !== 0;
      let ff = f + df, rr = r + dr;
      while (true) {
        const j = at(ff, rr);
        if (j < 0) break;
        const p = b[j];
        if (p) {
          if (colorOf(p) === by) {
            const t = p.toLowerCase();
            if (t === 'q' || (diag && t === 'b') || (!diag && t === 'r')) return true;
          }
          break;
        }
        ff += df; rr += dr;
      }
    }
    return false;
  }

  function kingSquare(s, c) {
    const k = c === 'w' ? 'K' : 'k';
    return s.b.indexOf(k);
  }

  function inCheck(s, c) {
    const k = kingSquare(s, c || s.turn);
    if (k < 0) return false;
    return attacked(s, k, (c || s.turn) === 'w' ? 'b' : 'w');
  }

  // מהלכים "פסאודו" – בלי לבדוק אם המלך נשאר בשח
  function pseudoMoves(s, fromOnly) {
    const moves = [];
    const c = s.turn;
    const b = s.b;
    const enemy = (p) => p && p !== ROCK && colorOf(p) !== c;
    for (let i = 0; i < 64; i++) {
      if (fromOnly !== undefined && i !== fromOnly) continue;
      const p = b[i];
      if (!p || colorOf(p) !== c) continue;
      const t = p.toLowerCase();
      const f = fileOf(i), r = rankRow(i);
      if (t === 'p') {
        const dir = c === 'w' ? -1 : 1;
        const startRow = c === 'w' ? 6 : 1;
        const lastRow = c === 'w' ? 0 : 7;
        const one = at(f, r + dir);
        if (one >= 0 && !b[one]) {
          moves.push({ from: i, to: one, promo: rankRow(one) === lastRow });
          const two = at(f, r + 2 * dir);
          if (r === startRow && two >= 0 && !b[two]) moves.push({ from: i, to: two, double: true });
        }
        for (const df of [-1, 1]) {
          const j = at(f + df, r + dir);
          if (j < 0) continue;
          if (enemy(b[j])) moves.push({ from: i, to: j, capture: true, promo: rankRow(j) === lastRow });
          else if (j === s.ep) moves.push({ from: i, to: j, capture: true, ep: true });
        }
      } else if (t === 'n' || t === 'k') {
        for (const [df, dr] of DIRS[t]) {
          const j = at(f + df, r + dr);
          if (j < 0) continue;
          if (!b[j]) moves.push({ from: i, to: j });
          else if (enemy(b[j])) moves.push({ from: i, to: j, capture: true });
        }
        if (t === 'k') addCastles(s, i, moves);
      } else {
        for (const [df, dr] of DIRS[t]) {
          let ff = f + df, rr = r + dr;
          while (true) {
            const j = at(ff, rr);
            if (j < 0) break;
            if (!b[j]) moves.push({ from: i, to: j });
            else { if (enemy(b[j])) moves.push({ from: i, to: j, capture: true }); break; }
            ff += df; rr += dr;
          }
        }
      }
    }
    return moves;
  }

  function addCastles(s, i, moves) {
    const c = s.turn;
    const home = c === 'w' ? sq('e1') : sq('e8');
    if (i !== home) return;
    const opp = c === 'w' ? 'b' : 'w';
    const rook = c === 'w' ? 'R' : 'r';
    const K = c === 'w' ? 'K' : 'k', Q = c === 'w' ? 'Q' : 'q';
    const b = s.b;
    if (attacked(s, i, opp)) return;
    if (s.castle.includes(K) && !b[i + 1] && !b[i + 2] && b[i + 3] === rook &&
        !attacked(s, i + 1, opp) && !attacked(s, i + 2, opp)) {
      moves.push({ from: i, to: i + 2, castle: 'k' });
    }
    if (s.castle.includes(Q) && !b[i - 1] && !b[i - 2] && !b[i - 3] && b[i - 4] === rook &&
        !attacked(s, i - 1, opp) && !attacked(s, i - 2, opp)) {
      moves.push({ from: i, to: i - 2, castle: 'q' });
    }
  }

  function makeMove(s, m) {
    const n = clone(s);
    const b = n.b;
    const p = b[m.from];
    const c = s.turn;
    m.captured = b[m.to] || null;
    b[m.to] = p;
    b[m.from] = null;
    if (m.ep) {
      const capSq = m.to + (c === 'w' ? 8 : -8);
      m.captured = b[capSq];
      b[capSq] = null;
    }
    if (m.promo) b[m.to] = c === 'w' ? (m.promoTo || 'Q') : (m.promoTo || 'q');
    if (m.castle === 'k') { b[m.from + 1] = b[m.from + 3]; b[m.from + 3] = null; }
    if (m.castle === 'q') { b[m.from - 1] = b[m.from - 4]; b[m.from - 4] = null; }
    // זכויות הצרחה
    let cr = n.castle;
    const strip = (chars) => { for (const ch of chars) cr = cr.replace(ch, ''); };
    if (p === 'K') strip('KQ');
    if (p === 'k') strip('kq');
    [m.from, m.to].forEach((x) => {
      if (x === sq('h1')) strip('K');
      if (x === sq('a1')) strip('Q');
      if (x === sq('h8')) strip('k');
      if (x === sq('a8')) strip('q');
    });
    n.castle = cr;
    n.ep = m.double ? (m.from + m.to) / 2 : -1;
    n.turn = c === 'w' ? 'b' : 'w';
    return n;
  }

  function legalMoves(s, fromOnly) {
    return pseudoMoves(s, fromOnly).filter((m) => {
      const n = makeMove(s, Object.assign({}, m));
      return !inCheck(n, s.turn);
    });
  }

  function insufficient(s) {
    const pieces = s.b.filter((p) => p && p !== ROCK && p.toLowerCase() !== 'k');
    if (pieces.length === 0) return true;
    if (pieces.length === 1 && 'nb'.includes(pieces[0].toLowerCase())) return true;
    return false;
  }

  // מצב המשחק: 'play' | 'mate' | 'stalemate' | 'draw'
  function status(s) {
    const moves = legalMoves(s);
    if (moves.length === 0) return inCheck(s) ? 'mate' : 'stalemate';
    if (insufficient(s)) return 'draw';
    return 'play';
  }

  /* ---------- יריב ממוחשב ---------- */
  const VAL = { p: 100, n: 300, b: 320, r: 500, q: 900, k: 0 };
  const CENTER = [];
  for (let i = 0; i < 64; i++) {
    const f = fileOf(i), r = rankRow(i);
    const d = Math.abs(3.5 - f) + Math.abs(3.5 - r);
    CENTER[i] = Math.round((7 - d) * 3);
  }

  function evaluate(s) {
    // ערך מנקודת מבט של הלבן
    let score = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i];
      if (!p || p === ROCK) continue;
      const t = p.toLowerCase();
      const sign = colorOf(p) === 'w' ? 1 : -1;
      let v = VAL[t];
      if (t === 'n' || t === 'b') v += CENTER[i];
      if (t === 'p') {
        const adv = colorOf(p) === 'w' ? 6 - rankRow(i) : rankRow(i) - 1;
        v += adv * 6 + (fileOf(i) > 1 && fileOf(i) < 6 ? CENTER[i] / 2 : 0);
      }
      score += sign * v;
    }
    return score;
  }

  function orderMoves(s, moves) {
    return moves.sort((a, b) => {
      const va = (s.b[a.to] ? VAL[s.b[a.to].toLowerCase()] : 0) + (a.promo ? 800 : 0);
      const vb = (s.b[b.to] ? VAL[s.b[b.to].toLowerCase()] : 0) + (b.promo ? 800 : 0);
      return vb - va;
    });
  }

  function search(s, depth, alpha, beta, ply) {
    const moves = legalMoves(s);
    if (moves.length === 0) {
      if (inCheck(s)) return -100000 + ply; // מט – רע למי שבתורו
      return 0;
    }
    if (depth === 0) {
      const e = evaluate(s);
      return s.turn === 'w' ? e : -e;
    }
    let best = -Infinity;
    for (const m of orderMoves(s, moves)) {
      const v = -search(makeMove(s, m), depth - 1, -beta, -alpha, ply + 1);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  // level: 1 = קל מאוד, 2 = בינוני, 3 = קשה יותר
  function bestMove(s, level) {
    const moves = legalMoves(s);
    if (!moves.length) return null;
    const depth = level === 1 ? 1 : level === 2 ? 2 : 3;
    const noise = level === 1 ? 250 : level === 2 ? 60 : 15;
    // בדרגה הקלה – לפעמים פשוט מהלך אקראי
    if (level === 1 && Math.random() < 0.3) return moves[Math.floor(Math.random() * moves.length)];
    let best = null, bestV = -Infinity;
    for (const m of orderMoves(s, moves)) {
      let v = -search(makeMove(s, m), depth - 1, -Infinity, Infinity, 1);
      v += Math.random() * noise;
      if (v > bestV) { bestV = v; best = m; }
    }
    return best;
  }

  global.Chess = {
    ROCK, sq, name, colorOf, fromFEN, clone, legalMoves, pseudoMoves,
    makeMove, inCheck, status, bestMove, attacked
  };
})(typeof window !== 'undefined' ? window : globalThis);
