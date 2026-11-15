// THE FILM — ประวัติหลวงปู่ขาว อนาลโย. Flat vector, thick outlines, big-headed characters,
// a cut on every bar (2 s) alternating wide shots and close-ups. Every frame is a pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { clock } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H, SF = G.SAFE;
  const CX = SF.x + SF.w / 2;
  const THAI = '"Loma", "Noto Sans Thai", sans-serif';
  const INK = '#2A1E17';
  const SKIN = '#F1C59C', SKIN_D = '#DDA97E';
  const ROBE = '#C47A2C', ROBE_D = '#9E5B1C';

  // ---------- crisp vector helpers (outlined, like the reference) ----------
  const fs = (ctx, fill, lw = 6) => { if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); } };
  const E = (ctx, x, y, rx, ry, fill, lw) => { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2); fs(ctx, fill, lw); };
  const R = (ctx, x, y, w, h, r, fill, lw) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); fs(ctx, fill, lw); };
  const P = (ctx, pts, fill, lw) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); fs(ctx, fill, lw); };
  const L = (ctx, pts, color = INK, lw = 6) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); };
  const Q = (ctx, a, c, b, color = INK, lw = 6) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke(); };
  const grad = (ctx, stops) => { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  const glow = (ctx, x, y, r, color, a = 0.6) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color.replace('A', a)); g.addColorStop(1, color.replace('A', 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
  const blinkAt = (t, seed) => { const p = (t + seed * 0.37) % 3.1; return p < 0.12; };

  // ---------- heads ----------
  // kind: 'old' (หลวงปู่, elderly monk) | 'monk' (young monk) | 'man' (farmer) | 'wife'
  function head(ctx, x, y, r, t, { kind = 'old', eyes = 'open', mouth = 'smile', look = 0, seed = 1 } = {}) {
    const shaved = kind === 'old' || kind === 'monk';
    // ears
    E(ctx, x - r * 0.95, y + r * 0.08, r * 0.17, r * 0.24, SKIN, 5);
    E(ctx, x + r * 0.95, y + r * 0.08, r * 0.17, r * 0.24, SKIN, 5);
    if (kind === 'wife') { E(ctx, x, y - r * 0.95, r * 0.42, r * 0.32, '#1E1A1A', 6); } // hair bun
    E(ctx, x, y, r, r * 1.02, SKIN, 7);
    if (shaved) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, r - 4, r * 1.02 - 4, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = kind === 'old' ? 'rgba(200,196,190,0.55)' : 'rgba(80,60,50,0.18)';
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.55, r * 1.05, r * 0.6, 0, Math.PI, 0); ctx.fill();
      ctx.restore();
    } else if (kind === 'man') {
      P(ctx, [[x - r * 0.98, y - r * 0.1], [x - r * 0.9, y - r * 0.75], [x - r * 0.3, y - r * 1.08], [x + r * 0.5, y - r * 1.02], [x + r * 0.98, y - r * 0.55], [x + r * 0.98, y - r * 0.1], [x + r * 0.6, y - r * 0.5], [x - r * 0.1, y - r * 0.55], [x - r * 0.6, y - r * 0.35]], '#1E1A1A', 6);
    } else if (kind === 'wife') {
      P(ctx, [[x - r * 1.0, y + r * 0.3], [x - r * 0.95, y - r * 0.7], [x - r * 0.2, y - r * 1.08], [x + r * 0.6, y - r * 0.95], [x + r * 1.0, y - r * 0.4], [x + r * 1.0, y + r * 0.3], [x + r * 0.75, y - r * 0.35], [x, y - r * 0.6], [x - r * 0.75, y - r * 0.35]], '#1E1A1A', 6);
    }
    // brows
    const browC = kind === 'old' ? '#EDEDED' : '#2A2020';
    for (const s of [-1, 1]) {
      const bx = x + s * r * 0.38, by = y - r * 0.32;
      if (kind === 'old') { ctx.save(); L(ctx, [[bx - r * 0.18, by + (s < 0 ? 4 : -2)], [bx + r * 0.18, by + (s < 0 ? -2 : 4)]], INK, r * 0.13); L(ctx, [[bx - r * 0.17, by + (s < 0 ? 4 : -2)], [bx + r * 0.17, by + (s < 0 ? -2 : 4)]], browC, r * 0.08); ctx.restore(); }
      else L(ctx, [[bx - r * 0.16, by + 2], [bx + r * 0.16, by - 2 * s]], browC, r * 0.07);
    }
    // eyes: big glossy (reference style), or closed arcs (meditation / peaceful smile)
    const closed = eyes === 'closed' || (eyes === 'open' && blinkAt(t, seed));
    for (const s of [-1, 1]) {
      const ex = x + s * r * 0.36, ey = y - r * 0.05;
      if (closed || eyes === 'happy') {
        Q(ctx, [ex - r * 0.15, ey], [ex, ey + (eyes === 'happy' ? -r * 0.14 : r * 0.1)], [ex + r * 0.15, ey], INK, r * 0.055);
      } else {
        E(ctx, ex, ey, r * 0.17, r * 0.2, '#FFFFFF', 5);
        E(ctx, ex + look * r * 0.05, ey + r * 0.02, r * 0.11, r * 0.14, '#2B1B12', 0);
        E(ctx, ex + look * r * 0.05 - r * 0.04, ey - r * 0.04, r * 0.04, r * 0.045, '#FFFFFF', 0);
      }
    }
    // nose, cheeks, mouth
    Q(ctx, [x - r * 0.06, y + r * 0.2], [x, y + r * 0.27], [x + r * 0.07, y + r * 0.2], SKIN_D, r * 0.05);
    ctx.save(); ctx.globalAlpha = 0.35; E(ctx, x - r * 0.6, y + r * 0.28, r * 0.15, r * 0.09, '#E88A7A', 0); E(ctx, x + r * 0.6, y + r * 0.28, r * 0.15, r * 0.09, '#E88A7A', 0); ctx.restore();
    if (mouth === 'smile') Q(ctx, [x - r * 0.2, y + r * 0.45], [x, y + r * 0.6], [x + r * 0.2, y + r * 0.45], INK, r * 0.05);
    else if (mouth === 'sad') Q(ctx, [x - r * 0.16, y + r * 0.55], [x, y + r * 0.45], [x + r * 0.16, y + r * 0.55], INK, r * 0.05);
    else L(ctx, [[x - r * 0.14, y + r * 0.5], [x + r * 0.14, y + r * 0.5]], INK, r * 0.05);
    if (kind === 'old') { // wrinkles + laugh lines
      L(ctx, [[x - r * 0.3, y - r * 0.62], [x + r * 0.3, y - r * 0.62]], SKIN_D, r * 0.035);
      L(ctx, [[x - r * 0.22, y - r * 0.5], [x + r * 0.22, y - r * 0.5]], SKIN_D, r * 0.035);
      Q(ctx, [x - r * 0.42, y + r * 0.3], [x - r * 0.38, y + r * 0.5], [x - r * 0.28, y + r * 0.6], SKIN_D, r * 0.035);
      Q(ctx, [x + r * 0.42, y + r * 0.3], [x + r * 0.38, y + r * 0.5], [x + r * 0.28, y + r * 0.6], SKIN_D, r * 0.035);
    }
  }

  // ---------- bodies ----------
  // a monk's robe torso (right shoulder bare, sash over the left shoulder), close-up framing
  function bust(ctx, x, y, w, h, kind = 'monk') {
    const top = y + h * 0.12;
    R(ctx, x - w * 0.12, y - h * 0.12, w * 0.24, h * 0.3, w * 0.06, SKIN_D, 6); // neck
    const shoulders = () => { ctx.beginPath(); ctx.moveTo(x - w * 0.5, y + h); ctx.lineTo(x - w * 0.5, top + h * 0.22); ctx.quadraticCurveTo(x - w * 0.5, top, x - w * 0.25, top); ctx.lineTo(x + w * 0.25, top); ctx.quadraticCurveTo(x + w * 0.5, top, x + w * 0.5, top + h * 0.22); ctx.lineTo(x + w * 0.5, y + h); ctx.closePath(); };
    const monk = kind === 'monk';
    shoulders(); fs(ctx, monk ? ROBE : kind === 'shirt' ? '#3E6FA8' : '#E9E2D2', 0);
    ctx.save(); shoulders(); ctx.clip();
    if (monk) {
      // bare right shoulder
      ctx.beginPath(); ctx.moveTo(x + w * 0.02, top - 10); ctx.lineTo(x + w * 0.6, top - 10); ctx.lineTo(x + w * 0.6, top + h * 0.42); ctx.closePath(); fs(ctx, SKIN, 0);
      // the sash, over the left shoulder down to the right side
      ctx.beginPath(); ctx.moveTo(x - w * 0.55, top - 10); ctx.lineTo(x - w * 0.12, top - 10); ctx.lineTo(x + w * 0.6, top + h * 0.5); ctx.lineTo(x + w * 0.6, top + h * 0.75); ctx.closePath(); fs(ctx, ROBE_D, 0);
      L(ctx, [[x - w * 0.12, top - 10], [x + w * 0.6, top + h * 0.5]], INK, 5);
      L(ctx, [[x + w * 0.02, top - 10], [x + w * 0.6, top + h * 0.42]], INK, 5);
      for (let i = 1; i < 4; i++) L(ctx, [[x - w * 0.5 + i * w * 0.08, top + h * 0.35], [x - w * 0.42 + i * w * 0.1, y + h]], 'rgba(120,70,20,0.45)', 4);
    } else {
      L(ctx, [[x - w * 0.12, top], [x, top + h * 0.18], [x + w * 0.12, top]], INK, 5); // collar
      if (kind === 'shirt') for (let i = 0; i < 3; i++) E(ctx, x, top + h * (0.3 + i * 0.18), 9, 9, '#E9E2D2', 3);
    }
    ctx.restore();
    shoulders(); fs(ctx, null, 7);
  }

  // full figure. pose: 'stand' | 'sit' (cross-legged) | 'walk'. who: 'old'|'monk'|'man'|'wife'
  function person(ctx, x, y, s, t, { who = 'old', pose = 'stand', eyes = 'open', mouth = 'smile', walk = 0, umbrella = false, bowl = false, look = 0, seed = 1, bow = 0 } = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const monk = who === 'old' || who === 'monk';
    const top = monk ? ROBE : who === 'man' ? '#3E6FA8' : '#E9E2D2';
    const low = monk ? ROBE : who === 'man' ? '#2F3E57' : '#7A2E3A';
    if (pose === 'sit') {
      P(ctx, [[-150, 0], [-120, -60], [120, -60], [150, 0]], low, 6); // crossed legs
      E(ctx, -95, -8, 40, 18, SKIN, 5); E(ctx, 95, -8, 40, 18, SKIN, 5);
      P(ctx, [[-95, -50], [-80, -200], [-35, -225], [35, -225], [80, -200], [95, -50]], top, 6);
      if (monk) P(ctx, [[30, -222], [78, -200], [88, -110], [40, -150]], SKIN, 5);
      if (monk) P(ctx, [[-80, -200], [-35, -225], [55, -110], [88, -60], [10, -60]], ROBE_D, 5);
      E(ctx, 0, -70, 44, 22, SKIN, 5); // hands in the lap
      ctx.save(); ctx.translate(0, -bow * 30); ctx.rotate(-bow * 0.0);
      head(ctx, 0, -330 + bow * 40, 120, t, { kind: who, eyes, mouth, look, seed });
      ctx.restore();
    } else {
      const sw = pose === 'walk' ? Math.sin(walk * Math.PI * 2) : 0;
      // legs
      R(ctx, -48 + sw * 14, -120, 40, 120, 14, monk ? SKIN : '#3B2A22', 5);
      R(ctx, 8 - sw * 14, -120, 40, 120, 14, monk ? SKIN : '#3B2A22', 5);
      // body / robe
      P(ctx, [[-85, -60], [-75, -260], [-35, -285], [35, -285], [75, -260], [85, -60]], top, 6);
      if (who === 'man') R(ctx, -82, -150, 164, 100, 10, low, 6);
      if (who === 'wife') P(ctx, [[-82, -170], [82, -170], [92, -40], [-92, -40]], low, 6);
      if (monk) { P(ctx, [[30, -282], [75, -260], [80, -170], [35, -210]], SKIN, 5); P(ctx, [[-75, -260], [-35, -285], [60, -175], [82, -90], [-20, -130]], ROBE_D, 5); }
      // arms
      R(ctx, -112, -258, 34, 140, 16, monk ? ROBE : top, 5);
      R(ctx, 78, -258, 34, 140, 16, monk ? SKIN : top, 5);
      E(ctx, -95, -112, 18, 18, SKIN, 4); E(ctx, 95, -112, 18, 18, SKIN, 4);
      if (bowl) { E(ctx, -95, -95, 48, 34, '#2E2A28', 6); E(ctx, -95, -118, 46, 10, '#4A4440', 4); }
      if (umbrella) { // klot: the forest monk's umbrella, carried on the shoulder
        L(ctx, [[95, -112], [150, -430]], '#6B4A2E', 10);
        P(ctx, [[150, -470], [20, -380], [280, -380]], '#E7D9B6', 6);
        L(ctx, [[150, -470], [150, -380]], '#BFAE87', 4);
      }
      head(ctx, 0, -390 + (pose === 'walk' ? Math.abs(sw) * -8 : 0), 120, t, { kind: who, eyes, mouth, look, seed });
    }
    ctx.restore();
  }
  // a devotee kneeling and bowing (kraap)
  function devotee(ctx, x, y, s, t, i) {
    const k = 0.5 + 0.5 * Math.sin((t * 1.6 + i * 0.6) * Math.PI); // slow bow
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    P(ctx, [[-90, 0], [-70, -70], [70, -70], [90, 0]], i % 2 ? '#F2EFE6' : '#E6EEF2', 6);
    ctx.translate(0, -70); ctx.rotate(-0.5 * k);
    P(ctx, [[-60, 0], [-50, -140], [50, -140], [60, 0]], i % 2 ? '#F2EFE6' : '#E6EEF2', 6);
    head(ctx, 0, -220, 90, t, { kind: i % 2 ? 'wife' : 'man', eyes: 'closed', mouth: 'smile', seed: i });
    E(ctx, 0, -140, 22, 30, SKIN, 4); // hands in anjali
    ctx.restore();
  }

  // ---------- scenery ----------
  function trees(ctx, y, color, n, seed, hgt = 260) {
    for (let i = 0; i < n; i++) {
      const x = (i + U.hash(i, seed) * 0.6) * (W / (n - 1)) - 40, h = hgt * (0.7 + U.hash(i, seed + 1) * 0.6);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(x, y - h, h * 0.45, h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 10, y - h * 0.5, 20, h * 0.5);
    }
  }
  function ground(ctx, y, c) { ctx.fillStyle = c; ctx.fillRect(0, y, W, H - y); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  function chedi(ctx, x, y, s, fill = '#F4E3B5') {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    R(ctx, -130, -60, 260, 60, 4, fill, 6); R(ctx, -100, -110, 200, 50, 4, fill, 6);
    ctx.beginPath(); ctx.moveTo(-90, -110); ctx.quadraticCurveTo(-95, -230, 0, -250); ctx.quadraticCurveTo(95, -230, 90, -110); ctx.closePath(); fs(ctx, fill, 6);
    P(ctx, [[-14, -250], [14, -250], [3, -420], [-3, -420]], '#E2B84E', 6);
    ctx.restore();
  }
  function stiltHouse(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (const px of [-140, -50, 50, 140]) R(ctx, px - 8, -120, 16, 120, 3, '#6B4A2E', 5);
    R(ctx, -170, -260, 340, 140, 4, '#B07A4A', 6);
    for (let i = 0; i < 6; i++) L(ctx, [[-170 + i * 57, -260], [-170 + i * 57, -120]], '#8C5D36', 3);
    P(ctx, [[-220, -250], [0, -400], [220, -250]], '#8A5A3A', 6);
    R(ctx, -40, -230, 80, 80, 4, '#3A2618', 5);
    ctx.restore();
  }
  function caption(ctx, sh, t) {
    const u = clamp((t - sh.t - 0.12) / 0.35), out = clamp((t - (sh.end - 0.18)) / 0.18);
    const a = u * (1 - out);
    if (a <= 0) return;
    const size = sh.id === 'title' ? 0 : 60, lh = size * 1.32;
    if (!size) return;
    const n = sh.lines.length, bh = n * lh + 46;
    const y0 = SF.y + 10 - 20 * (1 - ease.outCubic(u));
    ctx.save(); ctx.globalAlpha *= a;
    let bw = 0; for (const l of sh.lines) bw = Math.max(bw, G.measure(ctx, l, size, THAI, 700));
    ctx.fillStyle = 'rgba(25,16,10,0.72)'; ctx.beginPath(); ctx.roundRect(CX - bw / 2 - 40, y0, bw + 80, bh, 26); ctx.fill();
    ctx.strokeStyle = '#E2B84E'; ctx.lineWidth = 4; ctx.stroke();
    sh.lines.forEach((l, i) => G.text(ctx, l, CX, y0 + 23 + size * 0.95 + i * lh, { size, fam: THAI, weight: 700, color: i === 0 && n > 1 ? '#FFE3A3' : '#FFFFFF', align: 'center' }));
    ctx.restore();
  }

  // ---------- the 15 shots ----------
  const shots = {
    title(ctx, t, u) {
      grad(ctx, [[0, '#F6B26B'], [0.55, '#FBD9A0'], [1, '#FBD9A0']]);
      glow(ctx, W / 2, H * 0.5, 420, 'rgba(255,240,200,A)', 0.9);
      E(ctx, W / 2, H * 0.5, 120, 120, '#FFF1C9', 0);
      trees(ctx, H * 0.66, '#6E8B4E', 7, 3, 300);
      chedi(ctx, W / 2, H * 0.68, 1.3);
      for (const tx of [W * 0.06, W * 0.94]) { ctx.fillStyle = '#4E6B38'; ctx.beginPath(); ctx.ellipse(tx, H * 0.62, 120, 150, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(tx - 12, H * 0.62, 24, H * 0.1); }
      ground(ctx, H * 0.72, '#7A9A4F');
      const k = ease.outBack(clamp((t - 0.3) / 0.5), 1.6);
      ctx.save(); ctx.translate(CX, SF.y + 230); ctx.scale(k, k);
      G.text(ctx, 'ประวัติ', 0, -40, { size: 84, fam: THAI, weight: 700, color: '#FFFFFF', align: 'center', stroke: '#7A3E12', strokeW: 18 });
      G.text(ctx, 'หลวงปู่ขาว อนาลโย', 0, 90, { size: 104, fam: THAI, weight: 700, color: '#FFE08A', align: 'center', stroke: '#7A3E12', strokeW: 20 });
      ctx.restore();
    },
    portrait(ctx, t, u) {
      grad(ctx, [[0, '#E9C27A'], [1, '#B88746']]);
      G.rays(ctx, CX, H * 0.42, { n: 24, r0: 300, r1: 1300, color: 'rgba(255,240,200,0.35)', lw: 30, spin: t * 0.05 });
      bust(ctx, CX, H * 0.53, 800, 900);
      head(ctx, CX, H * 0.42, 260, t, { kind: 'old', eyes: 'happy', mouth: 'smile' });
    },
    village(ctx, t, u) {
      grad(ctx, [[0, '#8FD0F0'], [0.5, '#CDEBF5'], [1, '#CDEBF5']]);
      trees(ctx, H * 0.55, '#7FA35A', 6, 11, 240);
      stiltHouse(ctx, W * 0.68, H * 0.6, 1.1);
      ctx.fillStyle = '#9BC85A'; ctx.fillRect(0, H * 0.6, W, H);
      for (let r = 0; r < 9; r++) for (let c = 0; c < 14; c++) { const x = c * 85 + (r % 2) * 40 + Math.sin(t * 2 + c) * 3, y = H * 0.63 + r * 70; L(ctx, [[x, y], [x - 8, y - 30]], '#5E8F33', 6); L(ctx, [[x, y], [x + 8, y - 28]], '#6EA03B', 6); }
      // a boy running along the dyke
      const w = Ch2.walk(t, 0.6); person(ctx, lerp(W * 0.15, W * 0.4, u), H * 0.78, 0.55, t, { who: 'man', pose: 'walk', walk: w, mouth: 'smile' });
    },
    farmer(ctx, t, u) {
      grad(ctx, [[0, '#8FD0F0'], [1, '#CDEBF5']]);
      ctx.fillStyle = '#9BC85A'; ctx.fillRect(0, H * 0.55, W, H);
      bust(ctx, CX, H * 0.57, 780, 900, 'shirt');
      head(ctx, CX, H * 0.45, 240, t, { kind: 'man', mouth: 'smile', seed: 2 });
      // ngob (farmer's hat)
      P(ctx, [[CX - 330, H * 0.38], [CX, H * 0.23], [CX + 330, H * 0.38]], '#D9B46A', 8);
      L(ctx, [[CX - 160, H * 0.32], [CX + 160, H * 0.32]], '#B8914A', 5);
    },
    family(ctx, t, u) {
      grad(ctx, [[0, '#F7C98B'], [1, '#FCE3B9']]);
      trees(ctx, H * 0.62, '#8DAA62', 6, 21, 260);
      stiltHouse(ctx, W * 0.5, H * 0.66, 1.25);
      ground(ctx, H * 0.66, '#C9A46A');
      person(ctx, W * 0.3, H * 0.9, 1.05, t, { who: 'man', mouth: 'smile', look: 1, seed: 3 });
      person(ctx, W * 0.66, H * 0.9, 1.0, t, { who: 'wife', mouth: 'smile', look: -1, seed: 4 });
    },
    think(ctx, t, u) {
      grad(ctx, [[0, '#4C3B6B'], [0.6, '#C8735A'], [1, '#E79A62']]);
      bust(ctx, CX, H * 0.53, 780, 900, 'shirt');
      head(ctx, CX, H * 0.42, 240, t, { kind: 'man', mouth: 'sad', look: 0.8, seed: 5 });
      for (let i = 0; i < 5; i++) { // falling leaves: impermanence
        const p = ((t * 0.25 + i * 0.21) % 1), lx = W * (0.1 + 0.2 * i) + Math.sin(t * 2 + i) * 40, ly = lerp(-50, H * 0.9, p);
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(t * 2 + i); E(ctx, 0, 0, 26, 12, i % 2 ? '#D98B3A' : '#B8662B', 4); ctx.restore();
      }
    },
    ordain(ctx, t, u) {
      grad(ctx, [[0, '#F3D58E'], [1, '#D9A85C']]);
      glow(ctx, CX, H * 0.4, 600, 'rgba(255,250,225,A)', 0.8);
      bust(ctx, CX, H * 0.53, 800, 900);
      head(ctx, CX, H * 0.42, 250, t, { kind: 'monk', eyes: 'open', mouth: 'smile', seed: 6 });
    },
    hall(ctx, t, u) {
      grad(ctx, [[0, '#6B2F23'], [1, '#3D1B14']]);
      // a simple golden Buddha image at the back of the hall, softly lit
      glow(ctx, CX, H * 0.38, 420, 'rgba(255,214,120,A)', 0.55);
      E(ctx, CX, H * 0.5, 190, 90, '#D9A93B', 6);
      P(ctx, [[CX - 150, H * 0.5], [CX - 110, H * 0.33], [CX + 110, H * 0.33], [CX + 150, H * 0.5]], '#E4B84A', 6);
      E(ctx, CX, H * 0.28, 70, 80, '#E4B84A', 6);
      P(ctx, [[CX - 18, H * 0.235], [CX, H * 0.18], [CX + 18, H * 0.235]], '#E4B84A', 5);
      for (const px of [W * 0.08, W * 0.92]) R(ctx, px - 40, 0, 80, H * 0.75, 6, '#8E3E2C', 6);
      ground(ctx, H * 0.6, '#5A2A1E');
      person(ctx, CX, H * 0.9, 1.0, t, { who: 'monk', pose: 'sit', eyes: 'closed', mouth: 'flat', seed: 7 });
    },
    mun(ctx, t, u) {
      grad(ctx, [[0, '#56703F'], [1, '#2F4423']]);
      trees(ctx, H * 0.55, '#3E5A2E', 6, 31, 320);
      ground(ctx, H * 0.6, '#7A6A48');
      R(ctx, W * 0.52, H * 0.66, 440, 80, 10, '#8C6A44', 6); // raised seat of the teacher
      person(ctx, W * 0.72, H * 0.66, 0.95, t, { who: 'old', pose: 'sit', eyes: 'happy', mouth: 'smile', seed: 8 });
      person(ctx, W * 0.27, H * 0.9, 0.9, t, { who: 'monk', pose: 'sit', eyes: 'open', mouth: 'flat', look: 1, seed: 9 });
      ctx.save(); ctx.globalAlpha = 0.9; G.text(ctx, 'หลวงปู่มั่น', W * 0.72, H * 0.66 + 62, { size: 44, fam: THAI, weight: 700, color: '#FFE3A3', align: 'center', stroke: INK, strokeW: 10 }); ctx.restore();
    },
    tudong(ctx, t, u) {
      grad(ctx, [[0, '#A8D1B0'], [1, '#5E8F5A']]);
      trees(ctx, H * 0.6, '#5C8A55', 7, 41, 380);
      trees(ctx, H * 0.7, '#3F6B3B', 6, 43, 300);
      ground(ctx, H * 0.7, '#8C7650');
      person(ctx, lerp(W * 0.3, W * 0.5, u), H * 0.86, 1.1, t, { who: 'monk', pose: 'walk', walk: Ch2.walk(t, 0.55), umbrella: true, bowl: true, mouth: 'flat', look: 1, seed: 10 });
      
    },
    meditate(ctx, t, u) {
      grad(ctx, [[0, '#14243A'], [1, '#22384F']]);
      for (let i = 0; i < 18; i++) { const fx = U.hash(i, 5) * W, fy = H * (0.2 + 0.6 * U.hash(i, 6)) + Math.sin(t * 1.5 + i) * 30, a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)); glow(ctx, fx, fy, 26, 'rgba(255,240,150,A)', a); }
      glow(ctx, CX, H * 0.42, 520, 'rgba(255,220,150,A)', 0.35);
      bust(ctx, CX, H * 0.53, 800, 900);
      head(ctx, CX, H * 0.42, 250, t, { kind: 'monk', eyes: 'closed', mouth: 'flat', seed: 11 });
    },
    cave(ctx, t, u) {
      grad(ctx, [[0, '#9CC9E6'], [1, '#D6ECF5']]);
      // limestone cliff with the cave
      P(ctx, [[-20, H * 0.75], [-20, H * 0.25], [W * 0.2, H * 0.18], [W * 0.45, H * 0.22], [W * 0.7, H * 0.15], [W + 20, H * 0.24], [W + 20, H * 0.75]], '#A89F94', 7);
      for (let i = 0; i < 6; i++) L(ctx, [[W * (0.1 + i * 0.16), H * 0.25], [W * (0.08 + i * 0.16), H * 0.5]], '#8E857A', 5);
      ctx.beginPath(); ctx.ellipse(CX, H * 0.6, 300, 200, 0, Math.PI, 0); ctx.closePath(); fs(ctx, '#3A332D', 7);
      trees(ctx, H * 0.78, '#4E7A3E', 7, 51, 200);
      chedi(ctx, CX, H * 0.74, 0.75, '#FFFFFF');
      ground(ctx, H * 0.78, '#B49C6E');
      ctx.save(); R(ctx, CX - 250, H * 0.79, 500, 80, 10, '#7A3E12', 6);
      G.text(ctx, 'วัดถ้ำกลองเพล', CX, H * 0.79 + 56, { size: 48, fam: THAI, weight: 700, color: '#FFE3A3', align: 'center' }); ctx.restore();
    },
    teach(ctx, t, u) {
      grad(ctx, [[0, '#7A3A26'], [1, '#4A2216']]);
      glow(ctx, CX, H * 0.38, 500, 'rgba(255,214,140,A)', 0.4);
      ground(ctx, H * 0.62, '#6A3424');
      R(ctx, CX - 220, H * 0.6, 440, 80, 10, '#A8763E', 6);
      person(ctx, CX, H * 0.6, 0.95, t, { who: 'old', pose: 'sit', eyes: 'happy', mouth: 'smile', seed: 12 });
      for (let i = 0; i < 4; i++) devotee(ctx, W * (0.15 + i * 0.235), H * 0.86, 0.75, t, i);
    },
    candle(ctx, t, u) {
      grad(ctx, [[0, '#120D0A'], [1, '#2A1A10']]);
      glow(ctx, CX, H * 0.4, 520, 'rgba(255,190,90,A)', 0.55 + 0.05 * Math.sin(t * 9));
      R(ctx, CX - 45, H * 0.4, 90, 300, 10, '#F5EEDC', 6);
      const fl = 1 + 0.08 * Math.sin(t * 13) + 0.05 * Math.sin(t * 7.3);
      ctx.save(); ctx.translate(CX, H * 0.4 - 10); ctx.scale(1, fl);
      ctx.beginPath(); ctx.moveTo(0, -120); ctx.quadraticCurveTo(48, -30, 0, 0); ctx.quadraticCurveTo(-48, -30, 0, -120); fs(ctx, '#FFC94A', 0);
      ctx.beginPath(); ctx.moveTo(0, -70); ctx.quadraticCurveTo(22, -20, 0, 0); ctx.quadraticCurveTo(-22, -20, 0, -70); fs(ctx, '#FFF4C8', 0);
      ctx.restore();
      // lotus
      for (const [dx, dy, rot, c] of [[-150, 0, -0.7, '#F3A0B4'], [150, 0, 0.7, '#F3A0B4'], [-80, -30, -0.35, '#F7B8C8'], [80, -30, 0.35, '#F7B8C8'], [0, -45, 0, '#FBD0DB']]) {
        ctx.save(); ctx.translate(CX + dx, H * 0.6 + 140 + dy); ctx.rotate(rot);
        ctx.beginPath(); ctx.moveTo(0, 60); ctx.quadraticCurveTo(70, -20, 0, -110); ctx.quadraticCurveTo(-70, -20, 0, 60); fs(ctx, c, 6); ctx.restore();
      }
      E(ctx, CX, H * 0.6 + 210, 260, 40, '#4E8A4A', 6);
    },
    end(ctx, t, u) {
      grad(ctx, [[0, '#F0CF86'], [1, '#C48B42']]);
      G.rays(ctx, CX, H * 0.42, { n: 28, r0: 320, r1: 1400, color: 'rgba(255,248,220,0.45)', lw: 34, spin: t * 0.06 });
      E(ctx, CX, H * 0.42, 330, 330, 'rgba(255,245,215,0.6)', 0);
      bust(ctx, CX, H * 0.53, 780, 900);
      head(ctx, CX, H * 0.42, 245, t, { kind: 'old', eyes: 'happy', mouth: 'smile', seed: 13 });
    },
  };
  const Ch2 = { walk: (t, rate) => t * rate * 2 };

  Studio.film({
    draw(ctx, t) {
      const sh = S.SHOTS.find((s) => t >= s.t && t < s.end) || S.SHOTS[S.SHOTS.length - 1];
      const u = clamp((t - sh.t) / (sh.end - sh.t));
      // slow push-in on every shot (the reference's camera)
      const z = 1 + 0.06 * ease.inOutQuad(u);
      ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.45);
      shots[sh.id](ctx, t, u);
      ctx.restore();
      // a soft flash on the cut (stronger with the temple bell)
      const bell = S.bells.includes(sh.t);
      const f = (bell ? 0.55 : 0.25) * Math.exp(-(t - sh.t) * 12);
      if (sh.i > 0 && f > 0.01) { ctx.fillStyle = `rgba(255,248,230,${f})`; ctx.fillRect(0, 0, W, H); }
      caption(ctx, sh, t);
    },
    post: { paper: 0.08, vignette: 0.35, grain: 0.03 },
    fadeOut: 1.2,
  });
})();
