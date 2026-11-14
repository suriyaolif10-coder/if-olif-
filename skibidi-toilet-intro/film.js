// THE FILM — Skibidi Toilet in 20 seconds. Every frame is a pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { BEAT, ev, clock, T } = S;
  const { clamp, lerp, ease, pulse } = U;
  const W = G.W, H = G.H, SF = G.SAFE;
  const CX = SF.x + SF.w / 2; // centre of the safe area (the right edge is covered by platform buttons)
  const THAI = '"Loma", "Noto Sans Thai", sans-serif';
  const INK = '#1B1B2A';
  const beatK = (t) => Math.max(0, 1 - clock.phase(t) * 4); // 1 right on each beat
  const lastBeat = (t) => t - clock.phase(t) * BEAT;

  // ---------- characters (original, simplified designs) ----------
  function head(ctx, x, y, r, t, { sing = true, look = 0, mood = 'sing' } = {}) {
    // neck
    G.rrect(ctx, x - r * 0.38, y + r * 0.5, r * 0.76, r * 0.9, r * 0.2, { fill: '#E2A77E', lw: 4 });
    G.ellipse(ctx, x, y, r * 0.92, r, { fill: '#F2C094', lw: 5 });
    // hair
    G.shape(ctx, G.ellPts(x, y - r * 0.62, r * 0.82, r * 0.42).filter((p) => p[1] <= y - r * 0.5), { fill: '#3A2A20', lw: 4 });
    // eyes: wide, intense
    for (const s of [-1, 1]) {
      const ex = x + s * r * 0.36, ey = y - r * 0.12;
      G.ellipse(ctx, ex, ey, r * 0.2, r * 0.17, { fill: '#FFFFFF', lw: 4 });
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ex + look * r * 0.07, ey, r * 0.08, 0, Math.PI * 2); ctx.fill();
      // brows
      G.line(ctx, [[ex - s * r * 0.2, ey - r * 0.3], [ex + s * r * 0.18, ey - r * 0.2]], { color: INK, lw: r * 0.08 });
    }
    // mouth: singing, opens on every beat
    const open = sing ? 0.35 + 0.65 * beatK(t) : 0.25;
    const mw = r * 0.34, mh = r * 0.32 * open;
    G.ellipse(ctx, x, y + r * 0.45, mw, Math.max(4, mh), { fill: '#6B1E2A', lw: 4 });
    if (mh > 10) G.ellipse(ctx, x, y + r * 0.45 + mh * 0.5, mw * 0.55, mh * 0.35, { fill: '#E46C7A', lw: 0 });
  }

  // a toilet whose head pops out: origin = floor centre. pop 0..1 = how far the head is out, lid 0..1 = open
  function toilet(ctx, x, y, s, t, { pop = 1, lid = 1, shake = true, look = 0 } = {}) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    const rimY = -150;
    // tank
    G.rrect(ctx, -95, -330, 190, 150, 18, { fill: '#E9EEF3', lw: 6 });
    G.rrect(ctx, -105, -345, 210, 30, 10, { fill: '#F7FAFC', lw: 6 });
    G.rrect(ctx, 50, -310, 30, 12, 6, { fill: '#B8C2CC', lw: 3 }); // flush handle
    // lid standing open against the tank
    if (lid > 0.5) G.ellipse(ctx, 0, rimY - 120 * lid, 115, 120 * lid * 0.8, { fill: '#F7FAFC', lw: 6 });
    // inside of the bowl
    G.ellipse(ctx, 0, rimY, 125, 42, { fill: '#F7FAFC', lw: 6 });
    G.ellipse(ctx, 0, rimY + 4, 95, 28, { fill: '#8FB7D6', lw: 3 });
    // the head
    if (pop > 0) {
      const r = 78;
      const rot = shake ? Math.sin(Math.PI * 2 * clock.beatPos(t) / 2) * 0.22 : 0;
      ctx.save();
      // clip so the head only shows above the front rim
      ctx.beginPath(); ctx.rect(-400, -900, 800, 900 + rimY + 6); ctx.ellipse(0, rimY, 125, 42, 0, 0, Math.PI); ctx.clip();
      ctx.translate(0, rimY + 40 - pop * 175);
      ctx.rotate(rot);
      head(ctx, 0, 0, r, t, { look });
      ctx.restore();
    }
    // bowl body + front rim
    G.shape(ctx, [[125, rimY], [112, rimY + 70], [62, -40], [72, 0], [-72, 0], [-62, -40], [-112, rimY + 70], [-125, rimY], ...Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (i / 12); return [-Math.cos(a) * 125, rimY + Math.sin(a) * 42]; })], { fill: '#F7FAFC', lw: 6 });
    G.line(ctx, Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (i / 12); return [-Math.cos(a) * 125, rimY + Math.sin(a) * 42]; }), { color: INK, lw: 6 });
    // closed lid (before it flips)
    if (lid <= 0.5) G.ellipse(ctx, 0, rimY - 6, 128, 46 * (1 - lid * 2) + 4, { fill: '#F7FAFC', lw: 6 });
    ctx.restore();
  }

  // a suited agent with a gadget for a head: origin = feet
  function agent(ctx, kind, x, y, s, t, { sy = 1 } = {}) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s * sy);
    const suit = '#26324A';
    G.rrect(ctx, -52, -170, 44, 170, 12, { fill: suit, lw: 5 });
    G.rrect(ctx, 8, -170, 44, 170, 12, { fill: suit, lw: 5 });
    G.rrect(ctx, -60, -12, 56, 18, 8, { fill: '#111', lw: 4 });
    G.rrect(ctx, 4, -12, 56, 18, 8, { fill: '#111', lw: 4 });
    G.rrect(ctx, -110, -360, 38, 180, 18, { fill: suit, lw: 5 }); // arms
    G.rrect(ctx, 72, -360, 38, 180, 18, { fill: suit, lw: 5 });
    G.rrect(ctx, -82, -385, 164, 230, 26, { fill: suit, lw: 5 }); // torso
    G.poly(ctx, [[-34, -385], [34, -385], [0, -310]], { fill: '#FFFFFF', lw: 4 });
    G.poly(ctx, [[-9, -372], [9, -372], [14, -300], [0, -282], [-14, -300]], { fill: '#C8343C', lw: 3 });
    G.rrect(ctx, -14, -405, 28, 26, 6, { fill: '#2B2B2B', lw: 4 }); // neck mount
    if (kind === 'camera') {
      G.rrect(ctx, -90, -520, 180, 120, 18, { fill: '#5B6270', lw: 6 });
      G.rrect(ctx, -60, -548, 70, 34, 8, { fill: '#454B57', lw: 5 });
      G.ellipse(ctx, 0, -460, 46, 46, { fill: '#1E2330', lw: 6 });
      G.ellipse(ctx, 0, -460, 26, 26, { fill: '#3C6FB6', lw: 3 });
      G.ellipse(ctx, -10, -470, 7, 7, { fill: '#FFFFFF', lw: 0 });
      const blink = Math.floor(t * 4) % 2 ? '#FF3B3B' : '#7A1F1F';
      G.ellipse(ctx, 68, -500, 9, 9, { fill: blink, lw: 3 });
    } else if (kind === 'speaker') {
      G.rrect(ctx, -70, -590, 140, 190, 14, { fill: '#2A2A2E', lw: 6 });
      const k = 1 + 0.12 * beatK(t);
      G.ellipse(ctx, 0, -545, 30 * k, 30 * k, { fill: '#4A4A52', lw: 5 });
      G.ellipse(ctx, 0, -460, 48 * k, 48 * k, { fill: '#4A4A52', lw: 5 });
      G.ellipse(ctx, 0, -460, 18, 18, { fill: '#1A1A1E', lw: 3 });
    } else {
      G.line(ctx, [[-20, -530], [-60, -600]], { color: INK, lw: 6 });
      G.line(ctx, [[20, -530], [60, -600]], { color: INK, lw: 6 });
      G.rrect(ctx, -105, -535, 210, 145, 16, { fill: '#6E5A47', lw: 6 });
      G.rrect(ctx, -88, -520, 150, 115, 12, { fill: '#3FA7E0', lw: 4 });
      ctx.save(); ctx.globalAlpha *= 0.35; for (let i = 0; i < 8; i++) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-86, -518 + ((i * 15 + t * 60) % 112), 146, 3); } ctx.restore();
      G.ellipse(ctx, 82, -495, 8, 8, { fill: '#D9C38C', lw: 3 });
      G.ellipse(ctx, 82, -465, 8, 8, { fill: '#D9C38C', lw: 3 });
    }
    ctx.restore();
  }

  // ---------- text ----------
  function caption(ctx, c, t) {
    if (t < c.t || t > c.end + 0.15) return;
    const u = clamp((t - c.t) / 0.28), out = clamp((t - c.end) / 0.15);
    const k = (0.6 + 0.4 * ease.outBack(u, 2.4)) * (1 - 0.2 * out);
    const lh = c.size * 1.3;
    const y0 = SF.y + 70;
    ctx.save();
    ctx.globalAlpha *= clamp(u * 4) * (1 - out);
    ctx.translate(CX, y0); ctx.scale(k, k);
    c.lines.forEach((ln, i) => G.text(ctx, ln, 0, i * lh, { size: c.size, fam: THAI, weight: 700, color: '#FFFFFF', align: 'center', stroke: INK, strokeW: c.size * 0.22 }));
    ctx.restore();
  }
  function stamp(ctx, str, x, y, size, t, t0, { color = '#FFD23F', rot = -0.06, fam = 'Bungee', stroke = INK } = {}) {
    if (t < t0) return;
    const u = clamp((t - t0) / 0.12);
    const k = lerp(2.2, 1, ease.outCubic(u)) + 0.08 * U.springKick(t, t0 + 0.12, 4, 8);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k); ctx.globalAlpha *= clamp(u * 3);
    G.text(ctx, str, 0, size * 0.35, { size, fam, weight: 400, color, align: 'center', stroke, strokeW: size * 0.2 });
    ctx.restore();
  }

  // ---------- backgrounds ----------
  function tiles(ctx, c1, c2, size = 120) {
    ctx.fillStyle = c1; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = c2; ctx.lineWidth = 5;
    for (let x = 0; x <= W; x += size) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += size) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  function burst(ctx, x, y, t, c1, c2, n = 18) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.4);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? c1 : c2;
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, R = 2400;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); ctx.lineTo(Math.cos(a1) * R, Math.sin(a1) * R); ctx.fill();
    }
    ctx.restore();
  }
  const FLOOR = H * 0.76;

  // ---------- shots ----------
  function shotIntro(ctx, t) {
    tiles(ctx, '#BFE3F2', '#A3D2E6');
    ctx.fillStyle = '#7FB3C9'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    const zoom = 1 + 0.04 * (t / T(2));
    ctx.save(); ctx.translate(CX, FLOOR); ctx.scale(zoom, zoom); ctx.translate(-CX, -FLOOR);
    const lid = clamp((t - ev.lid + 0.08) / 0.16);
    const pop = t < ev.headPop ? 0 : ease.outBack(clamp((t - ev.headPop) / 0.25), 2.5);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(CX, FLOOR + 6, 240, 30, 0, 0, Math.PI * 2); ctx.fill();
    toilet(ctx, CX, FLOOR, 1.6, t, { pop, lid, shake: t > ev.headPop + 0.3 });
    ctx.restore();
    if (t >= ev.headPop && t < ev.headPop + 0.4) G.rays(ctx, CX, FLOOR - 1.6 * 300, { n: 12, r0: 230, r1: 330, color: INK, lw: 8, alpha: 1 - (t - ev.headPop) / 0.4 });
    stamp(ctx, 'SKIBIDI', CX, SF.y + 230, 150, t, ev.title1, { rot: -0.07 });
    stamp(ctx, 'TOILET', CX, SF.y + 390, 150, t, ev.title2, { rot: 0.05, color: '#FFFFFF' });
  }

  function shotSeries(ctx, t) {
    ctx.fillStyle = '#5B3FA8'; ctx.fillRect(0, 0, W, H);
    burst(ctx, CX, H * 0.52, t, '#5B3FA8', '#6C50BC');
    const pw = SF.w - 20, ph = pw * 9 / 16, px = CX - pw / 2, py = SF.y + 380;
    const k = ease.outBack(clamp((t - ev.series) / 0.3), 2);
    ctx.save(); ctx.translate(CX, py + ph / 2); ctx.scale(k, k); ctx.translate(-CX, -(py + ph / 2));
    G.rrect(ctx, px - 18, py - 18, pw + 36, ph + 110, 28, { fill: '#FFFFFF', lw: 6 });
    G.rrect(ctx, px, py, pw, ph, 14, { fill: '#BFE3F2', lw: 4 });
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    ctx.fillStyle = '#7FB3C9'; ctx.fillRect(px, py + ph * 0.78, pw, ph);
    const playing = t >= ev.play;
    toilet(ctx, CX - (playing ? Math.sin((t - ev.play) * 3) * 40 : 0), py + ph * 0.82, 0.85, t, { pop: playing ? 1 : 0.7, shake: playing });
    ctx.restore();
    // progress bar
    const prog = playing ? clamp((t - ev.play) / 3) : 0;
    G.rrect(ctx, px, py + ph + 30, pw, 16, 8, { fill: '#DDDDE6', lw: 0 });
    G.rrect(ctx, px, py + ph + 30, Math.max(16, pw * prog), 16, 8, { fill: '#E53935', lw: 0 });
    // play button: pressed on the beat, then gone
    if (t < ev.play + 0.2) {
      const pk = t < ev.play ? 1 + 0.06 * Math.sin(t * 14) : 1 - clamp((t - ev.play) / 0.2);
      ctx.save(); ctx.translate(CX, py + ph / 2); ctx.scale(pk, pk);
      G.rrect(ctx, -90, -62, 180, 124, 34, { fill: '#E53935', lw: 6 });
      G.poly(ctx, [[-24, -34], [40, 0], [-24, 34]], { fill: '#FFFFFF', lw: 4 });
      ctx.restore();
    }
    ctx.restore();
    if (t >= ev.views) {
      G.rays(ctx, CX, py + ph + 330, { n: 16, r0: 190, r1: 270, color: '#FFD23F', lw: 10, alpha: 0.9, spin: t * 0.5 });
      stamp(ctx, '1,000,000,000+', CX, py + ph + 300, 84, t, ev.views, { rot: -0.05 });
      stamp(ctx, 'VIEWS', CX, py + ph + 410, 70, t, ev.views + 0.06, { rot: -0.05, color: '#FFFFFF' });
    }
  }

  function city(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#F27A54'); g.addColorStop(0.6, '#FBC66B'); g.addColorStop(1, '#FBC66B');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#FFE8A3'; ctx.beginPath(); ctx.arc(W * 0.7, H * 0.36, 120, 0, Math.PI * 2); ctx.fill();
    let x = -20, i = 0;
    while (x < W) {
      const bw = 90 + U.hash(i, 1) * 110, bh = 260 + U.hash(i, 2) * 420;
      ctx.fillStyle = i % 2 ? '#7B4A7A' : '#8E5A86';
      ctx.fillRect(x, H * 0.62 - bh, bw, bh + 10);
      ctx.fillStyle = 'rgba(255,230,150,0.55)';
      for (let wy = H * 0.62 - bh + 24; wy < H * 0.6; wy += 46) for (let wx = x + 14; wx < x + bw - 24; wx += 34) if (U.hash(wx, wy) > 0.45) ctx.fillRect(wx, wy, 16, 22);
      x += bw + 8; i++;
    }
    ctx.fillStyle = '#5A6B7C'; ctx.fillRect(0, H * 0.6, W, H);
    ctx.fillStyle = '#F2D06B'; for (let k = 0; k < 6; k++) ctx.fillRect(k * 220 - ((t * 200) % 220), H * 0.8, 120, 14);
  }
  function shotArmy(ctx, t) {
    city(ctx, t);
    const sorted = [...S.army].sort((a, b) => a.y - b.y);
    for (const a of sorted) {
      if (t < a.t) continue;
      const k = ease.outBack(clamp((t - a.t) / 0.22), 2.6);
      const hop = 18 * Math.sin(Math.PI * clock.phase(t)) * (t > a.t + 0.25 ? 1 : 0);
      ctx.save(); ctx.translate(a.x, a.y); ctx.scale(k, k); ctx.translate(-a.x, -a.y);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(a.x, a.y + 4, 70 * a.s, 12, 0, 0, Math.PI * 2); ctx.fill();
      toilet(ctx, a.x, a.y - hop, 0.78 * a.s, t + a.i * 0.11, { pop: 1, look: Math.sin(a.i) });
      ctx.restore();
    }
  }

  function shotAgents(ctx, t) {
    const breath = t >= ev.breath;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0F1B3D'); g.addColorStop(1, '#283C74');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const ground = H * 0.7;
    ctx.fillStyle = '#1A2550'; ctx.fillRect(0, ground, W, H);
    for (const a of S.agents) {
      if (t < a.t - 0.25) continue;
      // spotlight
      ctx.save(); ctx.globalAlpha = 0.18 * clamp((t - a.t + 0.25) / 0.2);
      ctx.fillStyle = '#BFE1FF'; ctx.beginPath(); ctx.moveTo(a.x - 30, 0); ctx.lineTo(a.x + 30, 0); ctx.lineTo(a.x + 170, ground + 20); ctx.lineTo(a.x - 170, ground + 20); ctx.fill(); ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(a.x, ground + 6, 110, 18, 0, 0, Math.PI * 2); ctx.fill();
      let y = ground, sy = 1;
      if (t < a.t) y = lerp(-200, ground, ease.inQuad(clamp((t - a.t + 0.25) / 0.25)));
      else { const land = Math.exp(-(t - a.t) * 10); sy = 1 - 0.18 * land; }
      if (breath) sy = 0.94;
      agent(ctx, a.kind, a.x, y, 0.72, t, { sy });
      if (t >= a.t) {
        const u = ease.outBack(clamp((t - a.t) / 0.25), 2);
        ctx.save(); ctx.translate(a.x, ground + 90); ctx.scale(u, u);
        const tw = G.measure(ctx, a.label, 40, THAI, 700);
        G.rrect(ctx, -tw / 2 - 22, -38, tw + 44, 64, 30, { fill: '#FFD23F', lw: 5 });
        G.text(ctx, a.label, 0, 8, { size: 40, fam: THAI, weight: 700, color: INK, align: 'center' });
        ctx.restore();
      }
    }
    if (breath) { ctx.fillStyle = 'rgba(5,5,15,0.45)'; ctx.fillRect(0, 0, W, H); }
  }

  function shotVS(ctx, t) {
    const sh = 22 * Math.exp(-(t - ev.drop) * 5);
    ctx.save(); ctx.translate(U.noise1(t * 30, 1) * sh, U.noise1(t * 30, 2) * sh);
    // diagonal split
    ctx.fillStyle = '#E53935'; ctx.fillRect(-50, -50, W + 100, H + 100);
    burst(ctx, W * 0.25, H * 0.42, t, '#E53935', '#EF5A4E', 14);
    ctx.save(); ctx.beginPath(); ctx.moveTo(W * 0.62, -50); ctx.lineTo(W + 50, -50); ctx.lineTo(W + 50, H + 50); ctx.lineTo(W * 0.38, H + 50); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#1E5BD6'; ctx.fillRect(0, 0, W, H);
    burst(ctx, W * 0.75, H * 0.62, -t, '#1E5BD6', '#2E6CE6', 14);
    ctx.restore();
    const slide = ease.outCubic(clamp((t - ev.drop) / 0.3));
    toilet(ctx, lerp(-200, W * 0.28, slide), H * 0.58, 1.05, t, { pop: 1 });
    agent(ctx, 'camera', lerp(W + 200, W * 0.72, slide), H * 0.8, 0.95, t);
    ctx.restore();
    stamp(ctx, 'VS', W * 0.5, H * 0.5, 210, t, ev.drop, { rot: -0.1, color: '#FFD23F' });
  }

  function shotEnd(ctx, t) {
    ctx.fillStyle = '#FFD23F'; ctx.fillRect(0, 0, W, H);
    burst(ctx, CX, H * 0.55, t, '#FFD23F', '#FFC21A', 20);
    const k = ease.outBack(clamp((t - ev.end) / 0.3), 2);
    ctx.save(); ctx.translate(CX, H * 0.74); ctx.scale(k, k); ctx.translate(-CX, -H * 0.74);
    toilet(ctx, CX, H * 0.74, 1.3, t, { pop: 1 });
    ctx.restore();
    stamp(ctx, 'SKIBIDI', CX, SF.y + 180, 140, t, ev.end, { rot: -0.06, color: '#FFFFFF' });
    stamp(ctx, 'TOILET', CX, SF.y + 340, 140, t, ev.end + 0.08, { rot: 0.04, color: '#FFFFFF' });
    if (t > ev.end + 0.35) {
      const a = clamp((t - ev.end - 0.35) / 0.3);
      G.text(ctx, 'มีมไวรัลที่ดังไปทั่วโลก', CX, SF.y + 500, { size: 60, fam: THAI, weight: 700, color: INK, align: 'center', alpha: a });
    }
  }

  Studio.film({
    draw(ctx, t) {
      if (t < ev.series) shotIntro(ctx, t);
      else if (t < ev.army) shotSeries(ctx, t);
      else if (t < ev.agents) shotArmy(ctx, t);
      else if (t < ev.drop) shotAgents(ctx, t);
      else if (t < ev.end) shotVS(ctx, t);
      else shotEnd(ctx, t);
      // cut flashes
      for (const tc of [ev.series, ev.army, ev.agents, ev.drop, ev.end]) {
        const f = t >= tc ? 0.7 * Math.exp(-(t - tc) * 14) : 0;
        if (f > 0.01) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H); }
      }
      for (const tc of [ev.headPop, ev.title1, ev.title2, ...S.agents.slice(1).map((x) => x.t)]) {
        const f = t >= tc ? 0.45 * Math.exp(-(t - tc) * 18) : 0;
        if (f > 0.01) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H); }
      }
      if (t >= ev.views && t < ev.army) { const f = 0.5 * Math.exp(-(t - ev.views) * 14); if (f > 0.01) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H); } }
      for (const c of S.captions) caption(ctx, c, t);
    },
    post: { paper: 0.15, vignette: 0.25, grain: 0.03 },
    fadeOut: 0.8,
  });
})();
