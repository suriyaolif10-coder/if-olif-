// =====================================================================
// EESINHIAN - all artwork is drawn here with Canvas 2D.
// drawFrame(ctx, T) is a pure function of time T (base timeline, seconds),
// so the browser player and the MP4 exporter produce identical frames.
// =====================================================================
(function () {
  const W = 1080, H = 1920;
  const PI = Math.PI, TAU = PI * 2;

  // ---------- palette (midnight / indigo / charcoal / cold grey) ----------
  const C = {
    ink: "#07080d",
    sky0: "#04060d", sky1: "#0d1628", sky2: "#18233a",
    moon: "#dfe6ef", moonGlow: "rgba(170,190,220,",
    tree: "#0b1318", treeL: "#16242b", leaf: "#122028", leafL: "#1d3038",
    wood: "#2a231f", woodL: "#3a3029", woodD: "#17120f", roof: "#1e1f25",
    ground: "#0b0f17", road: "#2a2a2e", roadL: "#3a3a3f", grass: "#121c1c",
    fog: "rgba(150,165,190,",
    gSkin: "#8b9097", gSkinD: "#61666d", gBlouse: "#4e535c", gSinh: "#1f2744", gSinhL: "#323c62",
    gSinhB: "#141a30", gHair: "#050507", gHairL: "#1b1d24",
    mSkin: "#9a7b66", mSkinD: "#6e5646", mShirt: "#1d2430", mShirtL: "#2b3442", mPants: "#2f2a26",
    mSash1: "#5a3236", mSash2: "#2d3550", mHair: "#0b0b0d",
    red: "#a8413d",
  };

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const easeIO = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const hash = (n) => { const r = rng(n * 977 + 13); r(); return r(); };
  const noise1 = (x, seed = 0) => { const i = Math.floor(x), f = x - i; const a = hash(i + seed * 1000), b = hash(i + 1 + seed * 1000); return lerp(a, b, f * f * (3 - 2 * f)); };

  let OW = 3; // outline width in local units (set per character scale)
  function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(rx, .01), Math.max(ry, .01), rot, 0, TAU); }
  function fillStroke(ctx, fill, lw = OW, stroke = C.ink) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); }
  }
  function poly(ctx, pts, close = true) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); if (close) ctx.closePath(); }
  function limb(ctx, pts, w, col) {
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    poly(ctx, pts, false); ctx.lineWidth = w + OW * 2; ctx.strokeStyle = C.ink; ctx.stroke();
    poly(ctx, pts, false); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
  }
  function line(ctx, pts, w, col) { poly(ctx, pts, false); ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); }
  function vgrad(ctx, y0, y1, stops, x0 = 0, x1 = W) {
    const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  function glow(ctx, x, y, r, rgbaPrefix, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgbaPrefix + a + ")"); g.addColorStop(1, rgbaPrefix + "0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  function camera(ctx, cx, cy, z, rot = 0) { ctx.translate(W / 2, H / 2); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-cx, -cy); }
  function black(ctx, a) { if (a <= 0) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = clamp(a); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  function white(ctx, a) { if (a <= 0) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = clamp(a); ctx.fillStyle = "#e8eef8"; ctx.fillRect(0, 0, W, H); ctx.restore(); }

  // ---------- environment ----------
  function sky(ctx, stops) { vgrad(ctx, -400, H + 400, stops, -800, W + 800); }
  function stars(ctx, seed, n, y1, t, a = 1) {
    const r = rng(seed); ctx.save();
    for (let i = 0; i < n; i++) {
      const x = r() * (W + 600) - 300, y = r() * y1, s = r() * 2 + .6;
      ctx.globalAlpha = a * (.25 + .5 * r()) * (.75 + .25 * Math.sin(t * (1 + r() * 2) + i));
      ctx.fillStyle = "#cfd8ea"; ctx.fillRect(x, y, s, s);
    }
    ctx.restore();
  }
  function moon(ctx, x, y, r, a = 1) {
    ctx.save(); ctx.globalAlpha = a;
    glow(ctx, x, y, r * 6, C.moonGlow, .22); glow(ctx, x, y, r * 2.2, C.moonGlow, .35);
    ellipse(ctx, x, y, r, r); ctx.fillStyle = C.moon; ctx.fill();
    ctx.globalAlpha = a * .12; ctx.fillStyle = "#7b879a";
    [[-.3, -.2, .22], [.25, .1, .16], [-.05, .35, .12], [.35, -.35, .09]].forEach(([dx, dy, rr]) => { ellipse(ctx, x + dx * r, y + dy * r, rr * r, rr * r); ctx.fill(); });
    ctx.restore();
  }
  function fog(ctx, t, y, h, a, speed, seed, x0 = -400, x1 = W + 400) {
    const r = rng(seed); ctx.save();
    for (let i = 0; i < 9; i++) {
      const span = x1 - x0 + 800;
      const bx = ((r() * span + t * speed * (.6 + r() * .8)) % span + span) % span + x0 - 400;
      const by = y + r() * h, rx = 300 + r() * 380, ry = 60 + r() * 90;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, C.fog + a * (.5 + r() * .5) + ")"); g.addColorStop(1, C.fog + "0)");
      ctx.save(); ctx.translate(bx, by); ctx.scale(rx, ry); ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    }
    ctx.restore();
  }
  function treeline(ctx, y, seed, col, h = 120, x0 = -600, x1 = W + 600) {
    const r = rng(seed); ctx.beginPath(); ctx.moveTo(x0, y + 40);
    for (let x = x0; x <= x1; x += 40) ctx.lineTo(x, y - r() * h * (.4 + .6 * noise1(x / 300, seed)));
    ctx.lineTo(x1, y + 400); ctx.lineTo(x0, y + 400); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }
  function sugarPalm(ctx, x, gy, s, t, col = C.tree) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
    const sw = Math.sin(t * .8 + x) * 6;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-4 + sw * .3, -350, sw - 6, -700); ctx.lineTo(sw + 6, -700); ctx.quadraticCurveTo(6 + sw * .3, -350, 9, 0); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    for (let i = 0; i < 16; i++) {
      const a = -PI + i / 15 * PI + Math.sin(t * 1.1 + i) * .04, len = 120 + (i % 3) * 25;
      ctx.beginPath(); ctx.moveTo(sw, -700);
      ctx.lineTo(sw + Math.cos(a - .12) * len, -700 + Math.sin(a - .12) * len * .9 - 10);
      ctx.lineTo(sw + Math.cos(a + .12) * len, -700 + Math.sin(a + .12) * len * .9 - 10); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function roundTree(ctx, x, gy, s, t, col = C.tree, seed = 1) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.fillRect(-14, -260, 28, 260);
    const r = rng(seed); const sw = Math.sin(t * .7 + seed) * 5;
    for (let i = 0; i < 9; i++) { ellipse(ctx, (r() - .5) * 260 + sw, -300 - r() * 200, 90 + r() * 60, 70 + r() * 50); ctx.fill(); }
    ctx.restore();
  }

  // Isan stilt house. Returns window centre (world coords).
  function stiltHouse(ctx, x, gy, s, o = {}) {
    const t = o.t || 0; ctx.save(); ctx.translate(x, gy); ctx.scale(s, s); OW = 3;
    const ab = !!o.abandoned;
    // under-house: water jars & loom posts
    ellipse(ctx, -120, -28, 34, 30); fillStroke(ctx, "#211c19");
    ellipse(ctx, -60, -24, 26, 24); fillStroke(ctx, "#1b1715");
    // stilts
    for (const px of [-190, -95, 0, 95, 190]) { ctx.beginPath(); ctx.rect(px - 9, -275, 18, 275 + (ab && px === 95 ? -10 : 0)); fillStroke(ctx, C.woodD); }
    ctx.beginPath(); ctx.rect(-215, -285, 430, 20); fillStroke(ctx, C.wood);
    // ladder
    line(ctx, [[-250, 0], [-205, -270]], 8, C.woodD); line(ctx, [[-215, 0], [-172, -270]], 8, C.woodD);
    for (let k = 1; k < 7; k++) { const yy = -k * 38; line(ctx, [[-250 + k * 6.6, yy], [-215 + k * 6.4, yy]], 6, C.woodD); }
    // walls
    ctx.save(); if (ab) { ctx.translate(0, -285); ctx.rotate(-.025); ctx.translate(0, 285); }
    ctx.beginPath(); ctx.rect(-200, -500, 400, 220); fillStroke(ctx, C.woodL);
    const r = rng(7);
    for (let px = -190; px < 200; px += 22) {
      line(ctx, [[px, -498], [px, -282]], 2, "rgba(0,0,0,.45)");
      if (ab && r() < .18) { ctx.fillStyle = "#08090c"; ctx.fillRect(px + 2, -480 + r() * 80, 18, 50 + r() * 80); }
    }
    // door
    ctx.beginPath(); ctx.rect(-150, -470, 80, 185); fillStroke(ctx, ab ? "#0a0b0e" : C.wood);
    // window
    const wx = 60, wy = -400, ww = 95, wh = 110;
    ctx.beginPath(); ctx.rect(wx - ww / 2 - 10, wy - wh / 2 - 10, ww + 20, wh + 20); fillStroke(ctx, C.woodD);
    if (o.lit) {
      const fl = .85 + .15 * Math.sin(t * 9) * Math.sin(t * 3.7);
      const g = ctx.createRadialGradient(wx, wy, 5, wx, wy, 80); g.addColorStop(0, `rgba(176,170,140,${.9 * fl})`); g.addColorStop(1, `rgba(70,74,80,${.9 * fl})`);
      ctx.fillStyle = g; ctx.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
    } else { ctx.fillStyle = "#07080b"; ctx.fillRect(wx - ww / 2, wy - wh / 2, ww, wh); }
    if (o.silhouette != null) {
      ctx.save(); ctx.beginPath(); ctx.rect(wx - ww / 2, wy - wh / 2, ww, wh); ctx.clip();
      const sx = wx + o.silhouette; ctx.fillStyle = "rgba(4,4,6,.92)";
      ellipse(ctx, sx, wy - 18, 17, 21); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx - 20, wy - 25); ctx.quadraticCurveTo(sx - 34, wy + 30, sx - 40, wy + 70); ctx.lineTo(sx + 40, wy + 70); ctx.quadraticCurveTo(sx + 34, wy + 30, sx + 20, wy - 25); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    for (const k of [-1, 0, 1]) line(ctx, [[wx + k * 24, wy - wh / 2], [wx + k * 24, wy + wh / 2]], 4, C.woodD);
    ctx.restore();
    // roof (steep gable)
    ctx.save(); if (ab) { ctx.translate(0, -500); ctx.rotate(.03); ctx.translate(0, 500); }
    poly(ctx, [[-270, -480], [0, -690], [270, -480], [250, -465], [0, -660], [-250, -465]]); fillStroke(ctx, C.roof);
    poly(ctx, [[-250, -470], [0, -665], [250, -470]]); fillStroke(ctx, "#25262d");
    for (let k = -4; k <= 4; k++) line(ctx, [[k * 50, -470 - (4 - Math.abs(k)) * 2], [k * 13, -640]], 2, "rgba(0,0,0,.35)");
    if (ab) { ctx.fillStyle = "#06070a"; poly(ctx, [[60, -560], [120, -540], [100, -505], [40, -515]]); ctx.fill(); }
    // gable finials (ngao)
    line(ctx, [[0, -688], [-18, -730]], 7, C.roof); line(ctx, [[0, -688], [18, -730]], 7, C.roof);
    ctx.restore();
    if (o.lamp) { const fl = .7 + .3 * noise1(t * 6, x); glow(ctx, -110, -300, 70, "rgba(190,160,110,", .35 * fl); ellipse(ctx, -110, -300, 5, 8); ctx.fillStyle = `rgba(230,205,150,${fl})`; ctx.fill(); }
    ctx.restore();
    return { x: x + wx * s, y: gy + wy * s };
  }

  function banyan(ctx, x, gy, s, t, o = {}) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s); OW = 3 / Math.sqrt(s);
    const r = rng(41), sway = (i) => Math.sin(t * .6 + i * 1.7) * 6;
    // canopy back
    ctx.fillStyle = o.far ? "#0e171c" : C.leaf;
    for (let i = 0; i < 22; i++) { ellipse(ctx, (r() - .5) * 1150 + sway(i) * .5, -720 - r() * 360, 150 + r() * 120, 110 + r() * 80); ctx.fill(); }
    // branches
    const br = [[-60, -480, -420, -760], [40, -500, 380, -780], [0, -560, -120, -950], [20, -540, 200, -930], [-30, -470, -560, -650], [30, -470, 560, -660]];
    br.forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, b - 60, c, d); ctx.lineWidth = 48; ctx.strokeStyle = C.tree; ctx.lineCap = "round"; ctx.stroke(); });
    // aerial roots
    const r2 = rng(5);
    for (let i = 0; i < 46; i++) {
      const rx = (r2() - .5) * 1000, ry = -650 - r2() * 150, len = 200 + r2() * 420;
      const sw = Math.sin(t * .8 + i) * 8;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(rx + sw, ry + len / 2, rx + sw * 1.6, ry + len);
      ctx.lineWidth = 2.5 + r2() * 3; ctx.strokeStyle = "rgba(10,16,20,.9)"; ctx.stroke();
    }
    // trunk (gnarled)
    poly(ctx, [[-170, 0], [-120, -60], [-95, -300], [-130, -480], [-60, -560], [0, -520], [70, -570], [130, -470], [95, -300], [120, -60], [190, 0]]);
    fillStroke(ctx, C.tree, OW, "#05080a");
    for (let k = 0; k < 7; k++) line(ctx, [[-80 + k * 25, -20], [-70 + k * 22 + Math.sin(k) * 10, -300], [-60 + k * 20, -480]], 3, "rgba(30,44,50,.6)");
    // prop roots
    for (const px of [-260, -210, 240, 300]) line(ctx, [[px, 0], [px * .8, -300], [px * .6, -620]], 14, C.tree);
    // canopy front + moon-rim
    const r3 = rng(77);
    for (let i = 0; i < 16; i++) {
      const cx = (r3() - .5) * 1100 + sway(i), cy = -820 - r3() * 300, rr = 120 + r3() * 90;
      ellipse(ctx, cx, cy, rr, rr * .7); ctx.fillStyle = o.far ? "#101b21" : C.leafL; ctx.fill();
      if (!o.far) { ellipse(ctx, cx + 10, cy - 12, rr * .9, rr * .55); ctx.fillStyle = C.leaf; ctx.fill(); }
    }
    if (o.silhouette > 0) { // faint woman between branches
      ctx.globalAlpha = o.silhouette; ctx.fillStyle = "#020203";
      ellipse(ctx, 150, -760, 22, 28); ctx.fill();
      poly(ctx, [[128, -740], [172, -740], [190, -560], [110, -560]]); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function road(ctx, hy, vx, wb, col = C.road) {
    poly(ctx, [[vx - 12, hy], [vx + 12, hy], [vx + wb / 2, H + 400], [vx - wb / 2, H + 400]]);
    const g = ctx.createLinearGradient(0, hy, 0, H); g.addColorStop(0, "#14151a"); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fill();
    // ruts
    for (const k of [-.22, .22]) line(ctx, [[vx + k * 10, hy], [vx + k * wb, H + 400]], 6, "rgba(0,0,0,.25)");
  }
  function grassTufts(ctx, y, seed, t, n = 40, col = C.grass, h = 50, x0 = -200, x1 = W + 200) {
    const r = rng(seed); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const x = x0 + r() * (x1 - x0), yy = y + r() * 60, hh = h * (.5 + r());
      for (let k = -2; k <= 2; k++) { const sw = Math.sin(t * 1.4 + i + k) * 5; ctx.beginPath(); ctx.moveTo(x + k * 6, yy); ctx.quadraticCurveTo(x + k * 9, yy - hh / 2, x + k * 14 + sw, yy - hh); ctx.stroke(); }
    }
  }
  function riceField(ctx, y0, y1, t, col0 = "#0f1a1b", col1 = "#162426") {
    vgrad(ctx, y0, y1, [col0, col1], -800, W + 800);
    for (let k = 0; k < 14; k++) { const yy = y0 + (y1 - y0) * Math.pow(k / 14, 1.6); line(ctx, [[-800, yy], [W + 800, yy]], 2, "rgba(0,0,0,.25)"); }
  }
  function oilLamp(ctx, x, y, s, t, seed) {
    const fl = .65 + .35 * noise1(t * 7, seed);
    glow(ctx, x, y, 90 * s, "rgba(180,150,105,", .32 * fl);
    ellipse(ctx, x, y, 5 * s, 9 * s * fl); ctx.fillStyle = `rgba(225,200,150,${fl})`; ctx.fill();
  }
  function beam(ctx, x, y, ang, len, spread, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.translate(x, y); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, 0, len, 0); g.addColorStop(0, `rgba(215,225,235,${.55 * a})`); g.addColorStop(1, "rgba(215,225,235,0)");
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(len, -len * spread); ctx.quadraticCurveTo(len * 1.08, 0, len, len * spread); ctx.lineTo(0, 6); ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
  }

  // ---------- CHARACTER A: Eesinhian ghost (feet at 0,0; height ~600) ----------
  function ghost(ctx, x, fy, s, t, o = {}) {
    const view = o.view || "back", lift = o.lift || 0, still = !!o.still;
    ctx.save(); ctx.translate(x, fy); ctx.scale(s, s); ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    OW = Math.min(2.6, 6 / s);
    const wv = (k, sp = .7) => Math.sin(t * sp + k) * (still ? .25 : 1);
    // feet (bare, pale grey)
    for (const sx of [-1, 1]) {
      ellipse(ctx, sx * 20, -8, 20, 9); fillStroke(ctx, C.gSkinD);
      for (let k = 0; k < 4; k++) { ellipse(ctx, sx * 20 + (view === "back" ? 0 : (k - 1.5) * 7), view === "back" ? -10 : -1, 3.5, 3); fillStroke(ctx, C.gSkinD, OW * .5); }
      ctx.beginPath(); ctx.rect(sx * 20 - 8, -72, 16, 64); fillStroke(ctx, C.gSkin);
    }
    // hair (back mass) - drawn before body for front view
    function hairBack() {
      ctx.beginPath(); ctx.moveTo(-36, -560);
      ctx.bezierCurveTo(-58, -480, -66 + wv(1) * 4, -380, -60 + wv(2) * 6, -300);
      for (let k = 0; k <= 10; k++) ctx.lineTo(-60 + k * 12 + wv(k, .9) * 5, -300 + (k % 2) * 16 + Math.sin(k * 3.1) * 8);
      ctx.bezierCurveTo(66 + wv(3) * 4, -380, 58, -480, 36, -560);
      ctx.bezierCurveTo(30, -600, -30, -600, -36, -560); fillStroke(ctx, C.gHair);
      for (let k = 0; k < 9; k++) line(ctx, [[-30 + k * 7.5, -575], [-40 + k * 10 + wv(k) * 3, -440], [-48 + k * 12 + wv(k, 1.1) * 6, -320]], .9, C.gHairL);
    }
    if (view === "front") hairBack();
    // sinh skirt with torn hem
    const r = rng(19);
    const hem = []; for (let i = 0; i <= 18; i++) { const xx = -66 + i * (132 / 18); const deep = r(); hem.push([xx + wv(i, .5) * 1.5, -72 + (deep > .75 ? 28 + deep * 26 : deep * 14) + wv(i * 2, .6) * 3]); }
    ctx.beginPath(); ctx.moveTo(-54, -380); ctx.lineTo(54, -380); ctx.lineTo(66, -72);
    for (let i = hem.length - 1; i >= 0; i--) ctx.lineTo(hem[i][0], hem[i][1]);
    ctx.closePath(); fillStroke(ctx, C.gSinh);
    ctx.save(); ctx.clip();
    for (let yy = -360; yy < -60; yy += 26) { ctx.fillStyle = C.gSinhL; ctx.globalAlpha *= .55; ctx.fillRect(-80, yy, 160, 6); ctx.globalAlpha /= .55; }
    for (let yy = -340; yy < -100; yy += 52) for (let xx = -60; xx < 70; xx += 26) { poly(ctx, [[xx, yy - 8], [xx + 7, yy], [xx, yy + 8], [xx - 7, yy]]); ctx.fillStyle = "rgba(95,105,140,.25)"; ctx.fill(); }
    ctx.fillStyle = C.gSinhB; ctx.fillRect(-80, -130, 160, 120); // tin-sinh border, faded
    for (let xx = -70; xx < 70; xx += 10) line(ctx, [[xx, -125], [xx + 5, -110]], 1.2, "rgba(120,125,140,.25)");
    ctx.restore();
    // loose threads
    for (let i = 0; i < 16; i++) { const h0 = hem[(i * 7) % hem.length]; const len = 10 + (i * 37 % 23); line(ctx, [h0, [h0[0] + wv(i, .8) * 4, h0[1] + len * .5], [h0[0] + wv(i, .6) * 7, h0[1] + len]], .9, "#3a4466"); }
    // waist fold
    ctx.beginPath(); ctx.rect(-56, -392, 112, 18); fillStroke(ctx, "#2a3354");
    // blouse
    ctx.beginPath(); ctx.moveTo(-60, -488); ctx.quadraticCurveTo(-64, -430, -54, -380); ctx.lineTo(54, -380); ctx.quadraticCurveTo(64, -430, 60, -488); ctx.quadraticCurveTo(0, -512, -60, -488); fillStroke(ctx, C.gBlouse);
    for (let k = 0; k < 5; k++) line(ctx, [[-40 + k * 20, -470], [-44 + k * 22, -390]], 1, "rgba(0,0,0,.25)");
    // arms hanging (long sleeves) + long pale hands
    for (const sx of [-1, 1]) {
      limb(ctx, [[sx * 58, -482], [sx * 70, -400], [sx * 68, -318]], 20, C.gBlouse);
      ctx.beginPath(); ctx.moveTo(sx * 60, -318); ctx.lineTo(sx * 76, -318); ctx.lineTo(sx * 74, -268); ctx.lineTo(sx * 64, -262); ctx.closePath(); fillStroke(ctx, C.gSkin);
      for (let k = 0; k < 3; k++) line(ctx, [[sx * (64 + k * 4), -270], [sx * (63 + k * 4.5), -240 - k * 3]], 3, C.gSkin);
    }
    // neck & head
    ctx.save(); ctx.translate(0, -500); ctx.rotate(o.tilt || 0); ctx.translate(0, 500);
    ctx.beginPath(); ctx.rect(-11, -515, 22, 26); fillStroke(ctx, C.gSkin);
    if (view === "back") {
      hairBack();
    } else {
      ellipse(ctx, 0, -545, 33, 42); fillStroke(ctx, C.gSkin);
      // face (only visible through the parting)
      ellipse(ctx, -12, -552, 9, 6); ctx.fillStyle = "#2a2c33"; ctx.fill();
      ellipse(ctx, 12, -552, 9, 6); ctx.fillStyle = "#2a2c33"; ctx.fill();
      eyeball(ctx, -12, -552, 1, lift, t); eyeball(ctx, 12, -552, 1, lift, t);
      line(ctx, [[-3, -532], [0, -527], [3, -532]], 1, "#5a5f66");
      line(ctx, [[-9, -514], [9, -514]], 1.4, "#3d3f45");
      // hair curtain over the face, parting with `lift`
      const gap = 1 + lift * 13, px = -6;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        const inner = px + side * gap;
        ctx.moveTo(px, -590);
        ctx.bezierCurveTo(side * 40, -592, side * 42, -560, side * 40, -500);
        ctx.lineTo(side * 46 + wv(side, .9) * 3, -380);
        for (let k = 0; k <= 5; k++) ctx.lineTo(side * (46 - k * (46 - Math.abs(inner) - 2) / 5) + wv(k + side, 1) * 3, -380 + (k % 2) * 14);
        ctx.lineTo(inner + wv(4, .7) * 2, -470);
        ctx.quadraticCurveTo(inner + side * 2, -560, px, -590);
        ctx.closePath(); fillStroke(ctx, C.gHair, OW * .8);
        for (let k = 1; k < 5; k++) line(ctx, [[px + side * k * 3, -585], [inner + side * k * 7 + wv(k) * 2, -420]], .7, C.gHairL);
      }
    }
    ctx.restore();
    ctx.restore();
  }
  function eyeball(ctx, x, y, s, lift, t) {
    if (lift < .05) return;
    ctx.save(); ctx.globalAlpha *= clamp(lift * 1.5);
    ellipse(ctx, x, y, 7.5 * s, 4.6 * s); ctx.fillStyle = "#bdb9ad"; ctx.fill();
    for (let k = 0; k < 4; k++) line(ctx, [[x - 7 * s, y + (k - 1.5) * 1.2 * s], [x - 4 * s, y + (k - 1.5) * .6 * s]], .25 * s, "rgba(140,40,40,.6)");
    const ir = 3.6 * s; ellipse(ctx, x + Math.sin(t * .3) * .4 * s, y, ir, ir); ctx.fillStyle = "#121214"; ctx.fill();
    ellipse(ctx, x + .9 * s, y - 1 * s, .7 * s, .7 * s); ctx.fillStyle = "rgba(220,225,235,.85)"; ctx.fill();
    ctx.restore();
  }

  // ---------- CHARACTER B: young man (feet at 0,0; height ~640) ----------
  function man(ctx, x, fy, s, t, o = {}) {
    const view = o.view || "front", pose = o.pose || "stand", expr = o.expr || "neutral", dir = o.dir || 1;
    ctx.save(); ctx.translate(x, fy); ctx.scale(s, s); OW = Math.min(2.8, 6.5 / s);
    let ph = 0, amp = 0, lean = 0, bob = 0;
    if (pose === "walk") { ph = t * 5.2; amp = .32 * (o.amp == null ? 1 : o.amp); bob = Math.abs(Math.sin(ph)) * 6 * (o.amp == null ? 1 : o.amp); }
    if (pose === "run") { ph = t * 10; amp = .85; lean = .2 * dir; bob = Math.abs(Math.sin(ph)) * 16; }
    if (pose === "back") { ph = t * 2.2; amp = .12; }
    ctx.translate(0, -bob);
    if (view === "side") {
      ctx.rotate(lean);
      const leg = (sgn, col) => { const a = Math.sin(ph) * amp * sgn; const k = [Math.sin(a) * 150, -150 + (1 - Math.cos(a)) * 30]; const b = a - (pose === "run" ? .9 * Math.max(0, Math.sin(ph * sgn + 1.4)) : .15); const f = [k[0] + Math.sin(b) * 150 - dir * 0, k[1] + Math.cos(b) * 145];
        limb(ctx, [[0, -300], k, f], 36, col); ellipse(ctx, f[0] + dir * 12, f[1] - 4, 22, 9); fillStroke(ctx, "#15120f"); };
      leg(-1, "#262220");
      const arm = (sgn, col) => { const a = -Math.sin(ph) * amp * sgn * 1.1; const e = [Math.sin(a) * 100, -470 + 100]; const h = [e[0] + Math.sin(a + .9 * dir) * 90 * dir, e[1] + 80];
        limb(ctx, [[0, -465], e, h], 24, col); ellipse(ctx, h[0], h[1], 11, 11); fillStroke(ctx, C.mSkin); return h; };
      arm(-1, C.mShirt);
      ctx.beginPath(); ctx.moveTo(-40, -480); ctx.quadraticCurveTo(-46, -380, -40, -300); ctx.lineTo(42, -300); ctx.quadraticCurveTo(48, -380, 42, -480); ctx.quadraticCurveTo(0, -495, -40, -480); fillStroke(ctx, C.mShirt);
      sash(ctx, -44, 44);
      leg(1, C.mPants);
      const hnd = arm(1, C.mShirtL);
      if (o.torch !== false) { ctx.save(); ctx.translate(hnd[0], hnd[1]); ctx.rotate(o.torchAng || 0); ctx.beginPath(); ctx.rect(-6, -8, 34, 16); fillStroke(ctx, "#3b3d42"); ctx.restore(); }
      // head (profile)
      const lb = o.lookBack || 0, hd = dir * (1 - 2 * lb);
      ctx.beginPath(); ctx.rect(-12, -520, 24, 30); fillStroke(ctx, C.mSkin);
      ellipse(ctx, 0, -560, 42, 50); fillStroke(ctx, C.mSkin);
      ctx.beginPath(); ctx.moveTo(hd * 38, -566); ctx.lineTo(hd * 52, -548); ctx.lineTo(hd * 38, -540); fillStroke(ctx, C.mSkin);
      ellipse(ctx, -hd * 8, -556, 9, 12); fillStroke(ctx, C.mSkinD, OW * .7);
      ctx.beginPath(); ctx.moveTo(-42, -560); ctx.quadraticCurveTo(-40, -616, 0, -614); ctx.quadraticCurveTo(44, -612, 44, -575); ctx.quadraticCurveTo(hd > 0 ? 10 : -10, -592, -hd * 30, -545); ctx.closePath(); fillStroke(ctx, C.mHair);
      const ew = expr === "terror" || expr === "scared" ? 7 : 5;
      ellipse(ctx, hd * 26, -566, ew * .7, ew); ctx.fillStyle = "#e6e2da"; ctx.fill(); ellipse(ctx, hd * 28, -566, 2.6, 2.6); ctx.fillStyle = "#111"; ctx.fill();
      line(ctx, [[hd * 16, -584 - (expr === "terror" ? 6 : 0)], [hd * 36, -582]], 3, "#151515");
      if (expr === "terror" || pose === "run") { ellipse(ctx, hd * 30, -530, 6, expr === "terror" ? 9 : 4); ctx.fillStyle = "#1b0e0e"; ctx.fill(); }
      else line(ctx, [[hd * 22, -530], [hd * 36, -532]], 2.5, "#3a2a22");
      ctx.restore(); return;
    }
    // ---- front / back views ----
    const legSw = Math.sin(ph) * amp * 60;
    for (const sx of [-1, 1]) {
      const sw = legSw * sx;
      limb(ctx, [[sx * 24, -300], [sx * 28 + sw * .25, -160], [sx * 26 + sw * .1, -18 - Math.max(0, sw * sx) * .1]], 40, C.mPants);
      ellipse(ctx, sx * 28, -8, 24, 10); fillStroke(ctx, "#15120f");
    }
    ctx.beginPath(); ctx.moveTo(-64, -470); ctx.quadraticCurveTo(-70, -380, -54, -300); ctx.lineTo(54, -300); ctx.quadraticCurveTo(70, -380, 64, -470); ctx.quadraticCurveTo(0, -500, -64, -470); fillStroke(ctx, C.mShirt);
    if (view === "front") { line(ctx, [[-16, -485], [0, -452], [16, -485]], OW, C.ink); for (let k = 0; k < 4; k++) { ellipse(ctx, 0, -440 + k * 35, 2.4, 2.4); ctx.fillStyle = "#5c636e"; ctx.fill(); } }
    sash(ctx, -58, 58);
    // arms
    const armPose = (sx) => {
      const sw = -Math.sin(ph) * amp * 40 * sx;
      if (pose === "tell" && sx === 1) { const k = Math.sin(t * 4) * 10; return [[64, -460], [118, -420], [170 + k, -470]]; }
      if ((o.raise || 0) > 0 && sx === -1) { const r = o.raise; return [[-64, -460], [-90, -400 - 30 * r], [-60 + 10 * r, -470 - 80 * r]]; }
      if (o.torchUp && sx === 1) return [[64, -460], [86, -380], [60, -330]];
      return [[sx * 64, -460], [sx * 78 + sw * .3, -370], [sx * 72 + sw, -280]];
    };
    let hand = null;
    for (const sx of [-1, 1]) { const p = armPose(sx); limb(ctx, p, 26, C.mShirtL); const e = p[2]; ellipse(ctx, e[0], e[1], 13, 13); fillStroke(ctx, C.mSkin); if (sx === 1) hand = e; }
    if (o.torch !== false && hand) { ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(o.torchAng == null ? -PI / 2 : o.torchAng); ctx.beginPath(); ctx.rect(-8, -8, 38, 16); fillStroke(ctx, "#3b3d42"); ctx.restore(); }
    ctx.beginPath(); ctx.rect(-14, -522, 28, 34); fillStroke(ctx, C.mSkin);
    if (view === "back") {
      ellipse(ctx, 0, -560, 42, 50); fillStroke(ctx, C.mSkin);
      ctx.beginPath(); ctx.ellipse(0, -566, 43, 46, 0, PI * 1.02, PI * 1.98 + PI); ctx.closePath(); fillStroke(ctx, C.mHair);
      for (const sx of [-1, 1]) { ellipse(ctx, sx * 42, -560, 7, 12); fillStroke(ctx, C.mSkin); }
      ctx.restore(); return;
    }
    // front head with expressions
    const tn = o.turn || 0;
    for (const sx of [-1, 1]) { ellipse(ctx, sx * 41 - tn * 6, -556, 8, 13); fillStroke(ctx, C.mSkin); }
    ellipse(ctx, 0, -560, 42, 52); fillStroke(ctx, C.mSkin);
    ctx.save(); ellipse(ctx, 0, -560, 42, 52); ctx.clip(); ellipse(ctx, 26 - tn * 10, -540, 26, 50); ctx.fillStyle = "rgba(60,40,30,.25)"; ctx.fill(); ctx.restore();
    // hair
    ctx.beginPath(); ctx.moveTo(-44, -556); ctx.quadraticCurveTo(-46, -618, 0, -616); ctx.quadraticCurveTo(46, -618, 44, -556); ctx.quadraticCurveTo(36, -590, 10 + tn * 8, -588); ctx.quadraticCurveTo(-20, -596, -44, -556); ctx.closePath(); fillStroke(ctx, C.mHair);
    const fx = tn * 12;
    const wide = { neutral: 1, curious: 1, confused: 1, scared: 1.35, terror: 1.6 }[expr] || 1;
    const blink = (t % 3.7) < .1 && expr !== "terror";
    for (const sx of [-1, 1]) {
      const ex = sx * 16 + fx, ey = -566;
      if (blink) { line(ctx, [[ex - 7, ey], [ex + 7, ey]], 2.2, "#1a1410"); }
      else {
        ellipse(ctx, ex, ey, 7.5 * Math.min(wide, 1.25), 4.6 * wide); ctx.fillStyle = "#e2ddd3"; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = "#1a1410"; ctx.stroke();
        const ir = expr === "terror" ? 2.2 : 3.4; ellipse(ctx, ex + (o.look || 0) * 3, ey + .3, ir, ir); ctx.fillStyle = "#16100c"; ctx.fill();
      }
      // brows
      let by = -580, inner = 0, outer = 0;
      if (expr === "confused") { if (sx === 1) { by -= 4; outer = -4; } else inner = 2; }
      if (expr === "scared" || expr === "terror") { inner = -6 - (expr === "terror" ? 3 : 0); outer = 2; by -= 3; }
      if (expr === "curious") { by -= 2; }
      line(ctx, [[sx * 7 + fx, by + inner], [sx * 25 + fx, by + outer]], 3.2, "#120d0a");
    }
    line(ctx, [[fx - 2, -560], [fx - 5, -543], [fx + 3, -541]], 1.6, "#5e4334");
    const talk = o.talk ? Math.abs(Math.sin(t * 13)) * Math.abs(Math.sin(t * 5.3)) : 0;
    if (expr === "terror") { ellipse(ctx, fx, -522, 10, 13); fillStroke(ctx, "#1e0f0d", 1.2); }
    else if (expr === "scared" || talk > .05) { ellipse(ctx, fx, -524, 7 + talk * 3, 3 + talk * 8 + (expr === "scared" ? 3 : 0)); fillStroke(ctx, "#2a1513", 1.2); }
    else if (expr === "confused") line(ctx, [[fx - 9, -522], [fx + 9, -526]], 2.4, "#3a2620");
    else line(ctx, [[fx - 9, -524], [fx + 9, -524]], 2.4, "#3a2620");
    if (o.sweat) { for (const [dx, dy, k] of [[-38, -590, 0], [36, -575, .5]]) { const yy = dy + ((t * .6 + k) % 1) * 30; ellipse(ctx, dx, yy, 2.6, 4); ctx.fillStyle = "rgba(170,195,220,.8)"; ctx.fill(); } }
    ctx.restore();
  }
  function sash(ctx, x0, x1) { // pha khao ma at the waist
    ctx.beginPath(); ctx.rect(x0, -326, x1 - x0, 26); fillStroke(ctx, C.mSash1);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, -326, x1 - x0, 26); ctx.clip();
    for (let xx = x0; xx < x1; xx += 14) { ctx.fillStyle = "rgba(45,53,80,.55)"; ctx.fillRect(xx, -326, 6, 26); }
    ctx.fillStyle = "rgba(45,53,80,.55)"; ctx.fillRect(x0, -316, x1 - x0, 6); ctx.restore();
  }

  // ---------- villagers (simple, consistent style) ----------
  const VIL = [
    { top: "#7f7d76", bot: "#4a3036", hair: "#0d0d0f", skirt: true, bun: true },
    { top: "#2c3550", bot: "#2b2724", hair: "#141414", cloth: true },
    { top: "#2b3346", bot: "#3e2c33", hair: "#8d8f93", skirt: true, bun: true },
    { top: "#55585e", bot: "#2a2a2c", hair: "#0d0d0f" },
    { top: "#3d3730", bot: "#25262a", hair: "#0d0d0f", hat: true },
  ];
  function villager(ctx, x, fy, s, t, o = {}) {
    const v = VIL[o.v || 0]; ctx.save(); ctx.translate(x, fy); ctx.scale(s, s); OW = Math.min(2.8, 6 / s);
    const walk = o.walk ? Math.sin(t * 5 + (o.v || 0)) : 0;
    ctx.translate(0, -Math.abs(walk) * 5);
    for (const sx of [-1, 1]) { limb(ctx, [[sx * 18, -270], [sx * 20 + walk * sx * 14, -20]], 30, v.skirt ? C.gSkinD : v.bot); ellipse(ctx, sx * 22 + walk * sx * 14, -8, 18, 8); fillStroke(ctx, "#141210"); }
    if (v.skirt) { poly(ctx, [[-48, -300], [48, -300], [56, -60], [-56, -60]]); fillStroke(ctx, v.bot); for (let yy = -280; yy < -70; yy += 30) line(ctx, [[-52, yy], [52, yy]], 2, "rgba(0,0,0,.3)"); }
    poly(ctx, [[-54, -440], [54, -440], [50, -290], [-50, -290]]); fillStroke(ctx, v.top);
    const away = o.away || 0; // -1 / 1 looking away
    for (const sx of [-1, 1]) {
      if (o.handMouth && sx === 1) { limb(ctx, [[54, -430], [74, -360], [12, -480]], 20, v.top); ellipse(ctx, 12, -486, 11, 11); fillStroke(ctx, "#8c705e"); continue; }
      if (o.point && sx === 1) { limb(ctx, [[54, -430], [110, -440], [170, -470]], 20, v.top); ellipse(ctx, 172, -472, 10, 10); fillStroke(ctx, "#8c705e"); continue; }
      limb(ctx, [[sx * 54, -430], [sx * 64 - walk * sx * 10, -300]], 20, v.top); ellipse(ctx, sx * 64 - walk * sx * 10, -296, 11, 11); fillStroke(ctx, "#8c705e");
    }
    ctx.beginPath(); ctx.rect(-11, -470, 22, 32); fillStroke(ctx, "#8c705e");
    ellipse(ctx, 0, -505, 36, 44); fillStroke(ctx, "#8c705e");
    // hair / headwear
    if (away) { ctx.beginPath(); ctx.ellipse(-away * 6, -510, 37, 44, 0, 0, TAU); fillStroke(ctx, v.hair); ellipse(ctx, away * 30, -505, 10, 18); fillStroke(ctx, "#8c705e"); }
    else {
      ctx.beginPath(); ctx.ellipse(0, -515, 38, 40, 0, PI, TAU); fillStroke(ctx, v.hair);
      const lk = o.look || 0;
      for (const sx of [-1, 1]) { ellipse(ctx, sx * 13 + lk * 6, -502, 3.4, o.fear ? 4.6 : 3.2); ctx.fillStyle = "#120d0a"; ctx.fill(); line(ctx, [[sx * 5 + lk * 6, -516 - (o.fear ? 3 : 0)], [sx * 21 + lk * 6, -514]], 2.4, "#120d0a"); }
      if (o.fear) { ellipse(ctx, lk * 6, -478, 5, 6); ctx.fillStyle = "#2a1513"; ctx.fill(); } else line(ctx, [[-7 + lk * 6, -478], [7 + lk * 6, -478]], 2, "#3a2620");
    }
    if (v.bun) { ellipse(ctx, -away * 4, -552, 16, 14); fillStroke(ctx, v.hair); }
    if (v.cloth) { ctx.beginPath(); ctx.rect(-40, -545, 80, 18); fillStroke(ctx, C.mSash1); }
    if (v.hat) { poly(ctx, [[-62, -528], [0, -580], [62, -528]]); fillStroke(ctx, "#4b4232"); }
    ctx.restore();
  }

  // =================================================================
  // SCENES - each draws in a 1080x1920 world; lt = local time, d = duration
  // =================================================================
  function nightBase(ctx, t, o = {}) {
    sky(ctx, o.sky || [C.sky0, C.sky1, C.sky2]);
    stars(ctx, o.seed || 3, 160, 1100, t, o.starA == null ? 1 : o.starA);
  }

  const SC = {};

  // 01 - abandoned house, silhouette in the window, push-in
  SC[1] = (ctx, lt, d) => {
    const k = easeIO(lt / d);
    ctx.save(); camera(ctx, lerp(540, 610, k), lerp(1080, 960, k), lerp(1.0, 2.05, k));
    nightBase(ctx, lt); moon(ctx, 860, 330, 64);
    treeline(ctx, 1240, 9, "#070b11", 160, -400, 1500);
    sugarPalm(ctx, 140, 1330, .9, lt, "#060a0e"); sugarPalm(ctx, 960, 1320, .75, lt, "#060a0e");
    vgrad(ctx, 1300, 2300, [C.ground, "#05070b"], -400, 1500);
    const sil = lt < 4.4 ? -18 : lt < 5.6 ? lerp(-18, 60, ease((lt - 4.4) / 1.2)) : 60;
    stiltHouse(ctx, 540, 1450, 1.32, { abandoned: true, lit: true, silhouette: sil, t: lt });
    grassTufts(ctx, 1420, 4, lt, 60, "#0a1212", 60, -300, 1400);
    ctx.restore();
    fog(ctx, lt, 1350, 500, .28, 40, 11);
    fog(ctx, lt, 1600, 400, .38, 70, 12);
  };

  // 02 - village pan with flickering oil lamps (parallax)
  SC[2] = (ctx, lt, d) => {
    const camX = lerp(0, 1100, easeIO(lt / d));
    sky(ctx, [C.sky0, "#0f1830", "#1c2740"]); stars(ctx, 5, 170, 1050, lt);
    const layer = (f, fn) => { ctx.save(); ctx.translate(-camX * f, 0); fn(); ctx.restore(); };
    layer(.05, () => moon(ctx, 300, 360, 52));
    layer(.3, () => { treeline(ctx, 1130, 21, "#0a1018", 110, -400, 2400); for (let i = 0; i < 9; i++) sugarPalm(ctx, 60 + i * 260, 1170, .55 + (i % 3) * .08, lt, "#0a1016"); });
    layer(.6, () => { riceField(ctx, 1160, 1330, lt); for (let i = 0; i < 4; i++) roundTree(ctx, 250 + i * 520, 1240, .6, lt, "#0c141a", i + 2); });
    layer(1, () => {
      vgrad(ctx, 1320, 1920, ["#10141c", "#07090d"], -400, 3000);
      road(ctx, 1320, 1100, 1500, "#1b1c21");
      [[220, .82], [820, .9], [1480, .86], [2080, .8]].forEach(([hx, sc], i) => stiltHouse(ctx, hx, 1440, sc, { lit: i !== 2, lamp: true, t: lt + i }));
      for (let i = 0; i < 6; i++) oilLamp(ctx, 120 + i * 380, 1500, 1, lt, i);
      grassTufts(ctx, 1480, 8, lt, 90, "#0b1414", 55, -300, 2800);
    });
    layer(1.35, () => { roundTree(ctx, 1450, 2050, 1.6, lt, "#04070a", 9); });
    fog(ctx, lt, 1250, 300, .22, 30, 21, -400, W + 400);
    // title card while the name is spoken
    const ta = clamp((lt - 5.0) / .9) * clamp((d - lt) / .7);
    if (ta > 0) titleCard(ctx, ta, lt);
  };

  // 03 - ghost on the road, back to camera, tilt up from her feet
  SC[3] = (ctx, lt, d) => {
    const k = easeIO(lt / d);
    ctx.save(); camera(ctx, 540, lerp(1560, 1010, k), lerp(2.3, 1.08, k));
    nightBase(ctx, lt, { sky: ["#03050a", "#0b1426", "#1b2740"] });
    moon(ctx, 560, 700, 120);
    treeline(ctx, 1080, 33, "#060a10", 120, -400, 1500);
    sugarPalm(ctx, 120, 1100, .7, lt, "#05080c"); sugarPalm(ctx, 990, 1100, .62, lt, "#05080c");
    vgrad(ctx, 1060, 2300, ["#0b0e15", "#06070a"], -400, 1500);
    road(ctx, 1060, 540, 1300, "#25262c");
    grassTufts(ctx, 1150, 14, lt, 50, "#0b1313", 60, -300, 260); grassTufts(ctx, 1150, 15, lt, 50, "#0b1313", 60, 820, 1400);
    glow(ctx, 540, 1150, 380, "rgba(150,170,205,", .18);
    ghost(ctx, 540, 1600, 1.62, lt, { view: "back" });
    ctx.restore();
    fog(ctx, lt, 1550, 420, .3, 35, 31);
  };

  // 04 - villagers look away, then macro on the torn hem
  SC[4] = (ctx, lt, d) => {
    if (lt < 3.2) {
      ctx.save(); camera(ctx, 540, 1150, 1.05);
      nightBase(ctx, lt); moon(ctx, 200, 420, 48);
      treeline(ctx, 1100, 41, "#070b11", 120);
      vgrad(ctx, 1080, 2300, ["#0c1018", "#06070a"], -300, 1400);
      road(ctx, 1080, 540, 1600, "#202126");
      ghost(ctx, 860, 1360, .78, lt, { view: "front", still: true });
      const wx = lerp(-120, 760, lt / 3.2);
      villager(ctx, wx, 1640, .95, lt, { v: 0, walk: 1, away: -1 });
      villager(ctx, wx - 190, 1680, 1.0, lt, { v: 1, walk: 1, away: -1 });
      villager(ctx, wx - 370, 1650, .9, lt, { v: 2, walk: 1, away: -1 });
      ctx.restore();
      fog(ctx, lt, 1500, 400, .25, 40, 44);
      black(ctx, clamp((lt - 2.9) / .3));
      return;
    }
    const l2 = lt - 3.2, k = easeIO(l2 / (d - 3.2));
    ctx.save(); camera(ctx, 540, lerp(1240, 1420, k), lerp(1.0, 1.35, k));
    vgrad(ctx, -200, 2200, ["#05060b", "#0d1220", "#141822"], -400, 1500);
    vgrad(ctx, 1500, 2300, ["#15161b", "#08090c"], -400, 1500);
    for (let i = 0; i < 18; i++) { const r = rng(i + 90); ellipse(ctx, r() * 1400 - 150, 1600 + r() * 250, 30 + r() * 40, 6 + r() * 5); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill(); }
    glow(ctx, 540, 1500, 700, "rgba(120,140,180,", .14);
    ghost(ctx, 540, 1690, 4.4, lt, { view: "back" });
    ctx.restore();
    fog(ctx, lt, 1700, 260, .22, 25, 47);
    black(ctx, 1 - clamp(l2 / .35));
  };

  // 05 - follow shot behind the man, banyan ahead; then his face
  SC[5] = (ctx, lt, d) => {
    if (lt < 6.0) {
      const k = easeIO(lt / 6), stop = clamp((lt - 4.6) / .8), walkAmp = 1 - stop;
      ctx.save(); camera(ctx, 540, 1100, 1.0);
      nightBase(ctx, lt); moon(ctx, 880, 260, 46);
      treeline(ctx, 1040, 51, "#070b11", 100);
      vgrad(ctx, 1020, 2300, ["#0b0e15", "#06070a"], -300, 1400);
      road(ctx, 1020, 560, 1400, "#24252b");
      const ts = lerp(.42, .58, k);
      banyan(ctx, 600, 1060, ts, lt, { far: true });
      ghost(ctx, 650, 1060, ts * .42, lt, { view: "front", still: true, alpha: .9 });
      // road scrolling under his feet
      for (let i = 0; i < 9; i++) { const yy = 1300 + ((i * 90 + lt * 60 * walkAmp) % 800); ellipse(ctx, 420 + (i % 3) * 130, yy, 22 + (yy - 1100) * .03, 5 + (yy - 1100) * .01); ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fill(); }
      const ang = -PI / 2 - .25 + Math.sin(lt * 1.3) * .18;
      beam(ctx, 640, 1200, ang + PI * 0 , 900, .16, .9);
      man(ctx, 520, 1880, 1.45, lt, { view: "back", pose: "walk", amp: walkAmp, torchUp: true });
      ctx.restore();
      fog(ctx, lt, 1150, 280, .2, 30, 52);
      return;
    }
    const l2 = lt - 6, k = easeIO(l2 / (d - 6));
    ctx.save(); camera(ctx, 540, lerp(1000, 960, k), lerp(1.0, 1.08, k));
    vgrad(ctx, -200, 2200, ["#05070d", "#0b1220", "#090c12"], -300, 1400);
    ctx.save(); ctx.filter = "blur(10px)"; banyan(ctx, 860, 1500, .7, lt, { far: true }); ctx.restore();
    glow(ctx, 540, 1500, 700, "rgba(200,210,225,", .12);
    man(ctx, 520, 2780, 3.25, lt, { view: "front", expr: l2 < 1.2 ? "curious" : "confused", turn: lerp(0, .7, ease(l2 / 1.2)), look: .8, talk: l2 > .7 && l2 < 3.8, torch: false });
    ctx.restore();
    black(ctx, clamp((lt - (d - .3)) / .2));
  };

  // 06 - no answer: alternate ghost / man, flicker, shadows creeping
  SC[6] = (ctx, lt, d) => {
    const seg = Math.min(3, Math.floor(lt / 2.5)), l2 = lt - seg * 2.5;
    const flick = (tt) => (noise1(tt * 9, 3) > .32 ? 1 : .15);
    if (seg === 0 || seg === 2) {
      const z = seg === 0 ? lerp(1.0, 1.25, l2 / 2.5) : lerp(1.6, 2.1, l2 / 2.5);
      ctx.save(); camera(ctx, 540, seg === 0 ? 1050 : 960, z);
      nightBase(ctx, lt, { starA: .5 });
      vgrad(ctx, 1250, 2300, ["#0b0e15", "#05060a"], -300, 1400);
      banyan(ctx, 540, 1350, 1.0, lt);
      // creeping shadows on the ground
      for (let i = 0; i < 5; i++) { const pr = (lt * .18 + i * .2) % 1; ellipse(ctx, 540 + Math.sin(i * 2.3) * 300 * (1 - pr), 1360 + pr * 500, 70 + pr * 160, 12 + pr * 30); ctx.fillStyle = `rgba(0,0,0,${.55 * Math.sin(pr * PI)})`; ctx.fill(); }
      glow(ctx, 540, 1180, 300, "rgba(200,210,225,", .12 * flick(lt));
      ghost(ctx, 560, 1360, 1.0, lt, { view: "front", still: true });
      ctx.restore();
      fog(ctx, lt, 1300, 350, .26, 50, 61);
    } else {
      ctx.save();
      const back = seg === 1 ? lerp(0, 1, l2 / 2.5) : 1;
      camera(ctx, 540, 1000, lerp(1.0, .93, back * .4));
      vgrad(ctx, -200, 2200, ["#04060b", "#090f1b", "#06080d"], -300, 1400);
      ctx.save(); ctx.filter = "blur(10px)"; banyan(ctx, 200, 1500, .7, lt, { far: true }); ctx.restore();
      const f = flick(lt);
      glow(ctx, 600, 1400, 650, "rgba(200,210,225,", .14 * f);
      man(ctx, 540, 2800 - back * 40, 3.25, lt, { view: "front", expr: seg === 1 ? "scared" : "terror", look: -.6, sweat: true, torch: false, pose: "back" });
      ctx.restore();
      black(ctx, (1 - f) * .45);
    }
  };

  // 07 - running, looks back, she is right in front of him
  SC[7] = (ctx, lt, d) => {
    if (lt < 6.0) {
      const sp = lt < 4.8 ? 1 : lerp(1, .25, (lt - 4.8) / 1.2);
      const px = lt * 900 * (lt < 4.8 ? 1 : 1);
      sky(ctx, ["#03050a", "#0a1222", "#141e33"]); stars(ctx, 7, 120, 900, lt, .6);
      const layer = (f, fn) => { ctx.save(); ctx.translate(-((px * f) % 2400), 0); fn(0); ctx.translate(2400, 0); fn(1); ctx.restore(); };
      layer(.08, () => moon(ctx, 700, 420, 40));
      layer(.25, () => { treeline(ctx, 1150, 71, "#070b11", 110, 0, 2400); for (let i = 0; i < 8; i++) sugarPalm(ctx, 100 + i * 300, 1180, .55, lt, "#060a0e"); });
      layer(.55, () => { vgrad(ctx, 1170, 1350, ["#0c1218", "#0a0e14"], 0, 2400); for (let i = 0; i < 3; i++) stiltHouse(ctx, 300 + i * 800, 1340, .55, { lit: i === 1, t: lt }); });
      layer(1, () => { vgrad(ctx, 1340, 1920, ["#1e1f24", "#0b0c10"], 0, 2400); for (let i = 0; i < 24; i++) { ellipse(ctx, i * 100 + 30, 1700 + (i % 3) * 50, 30, 6); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill(); } });
      ctx.save(); const lb = clamp((lt - 4.6) / .5);
      man(ctx, 540, 1720, 1.45, lt * (lt < 4.8 ? 1 : sp), { view: "side", dir: 1, pose: lt < 5.2 ? "run" : "stand", expr: lb > .5 ? "terror" : "scared", lookBack: lb, torch: true });
      ctx.restore();
      layer(1.6, () => { grassTufts(ctx, 1860, 77, lt, 26, "#05080a", 120, 0, 2400); });
      // whip pan
      if (lt > 5.7) { ctx.save(); ctx.globalAlpha = clamp((lt - 5.7) / .3); ctx.fillStyle = "#0a0d14"; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      return;
    }
    const l2 = lt - 6;
    const shake = l2 < .8 ? (1 - l2 / .8) : 0;
    ctx.save();
    camera(ctx, 540 + Math.sin(l2 * 80) * 18 * shake, 1000 + Math.cos(l2 * 66) * 14 * shake, lerp(1.0, 1.12, easeIO(l2 / 5)));
    vgrad(ctx, -200, 2200, ["#020308", "#070b14", "#030406"], -300, 1400);
    glow(ctx, 380, 900, 600, "rgba(200,215,235,", .12);
    man(ctx, 360, 2150, 2.1, l2, { view: "front", expr: "terror", torch: false, sweat: true });
    // ghost huge in the foreground
    ghost(ctx, 820, 2900, 4.6, l2, { view: "front", still: true, lift: .15, tilt: -.08 });
    ctx.restore();
    white(ctx, l2 < .45 ? (1 - l2 / .45) * .9 : 0);
  };

  // 08 - grey-blue morning, villagers listen, zoom toward the banyan
  SC[8] = (ctx, lt, d) => {
    const k = easeIO(clamp((lt - 3.8) / (d - 3.8)));
    ctx.save(); camera(ctx, lerp(540, 860, k), lerp(1050, 880, k), lerp(1.0, 2.5, k));
    sky(ctx, ["#4c5868", "#77838f", "#9aa3aa"]);
    glow(ctx, 760, 600, 500, "rgba(220,225,230,", .25);
    treeline(ctx, 1150, 81, "#3b4650", 100, -400, 1500);
    banyan(ctx, 880, 1180, .48, lt, { silhouette: clamp((lt - 6) / 2) * .55 });
    riceField(ctx, 1170, 1340, lt, "#46524f", "#3a4543");
    vgrad(ctx, 1330, 2300, ["#4b4e50", "#2f3134"], -400, 1500);
    stiltHouse(ctx, 230, 1420, .9, { t: lt });
    const vs = [[420, 0, 1.0], [560, 3, .98], [700, 2, .95], [830, 4, 1.0], [960, 1, .97]];
    vs.forEach(([vx, v, sc], i) => villager(ctx, vx, 1700 + (i % 2) * 40, sc, lt, { v, look: 1, fear: lt > 2.5, handMouth: i === 2 && lt > 3 }));
    man(ctx, 290, 1760, 1.0, lt, { view: "front", pose: "tell", expr: "scared", talk: lt < 6, torch: false, turn: -.3 });
    ctx.restore();
    fog(ctx, lt, 1200, 300, .25, 20, 83);
  };

  // 09 - empty road at night, she appears, raises her head, eye close-up, black
  SC[9] = (ctx, lt, d) => {
    if (lt >= 12.2) { black(ctx, 1); return; }
    if (lt < 9.6) {
      const k = easeIO(lt / 9.6);
      ctx.save(); camera(ctx, 540, lerp(1080, 1010, k), lerp(1.0, 2.0, Math.pow(k, 1.3)));
      nightBase(ctx, lt, { sky: ["#020308", "#070c18", "#0e1628"], starA: .6 });
      moon(ctx, 820, 380, 34, .55);
      treeline(ctx, 1060, 91, "#04070b", 110);
      vgrad(ctx, 1050, 2300, ["#090b11", "#040508"], -300, 1400);
      road(ctx, 1050, 540, 1500, "#1d1e23");
      grassTufts(ctx, 1120, 92, lt, 40, "#081010", 50, -300, 280); grassTufts(ctx, 1120, 93, lt, 40, "#081010", 50, 800, 1400);
      const ga = clamp((lt - 2.0) / 2.6);
      ghost(ctx, 540, 1320, .95, lt, { view: "front", alpha: ga, still: true, lift: clamp((lt - 7.5) / 2.5) * .35, tilt: Math.sin(lt * .4) * .06 });
      ctx.restore();
      fog(ctx, lt, 1300, 400, .22, 22, 94);
      return;
    }
    if (lt < 11.6) {
      const l2 = lt - 9.6;
      ctx.save(); camera(ctx, 540, 900, lerp(1.0, 1.25, l2 / 2));
      vgrad(ctx, -200, 2200, ["#020308", "#070b14", "#030406"], -300, 1400);
      ghost(ctx, 540, 2420, 3.1, lt, { view: "front", lift: lerp(.35, .85, ease(l2 / 2)), tilt: lerp(-.04, -.16, ease(l2 / 2)) });
      ctx.restore();
      return;
    }
    const l3 = lt - 11.6;
    ctx.save(); camera(ctx, 540 + Math.sin(l3 * 90) * 8, 960, lerp(1.0, 1.15, l3 / .6));
    vgrad(ctx, -200, 2200, ["#020308", "#05070d"], -300, 1400);
    ghost(ctx, 650, 6200, 10.2, lt, { view: "front", lift: 1 });
    ctx.restore();
    white(ctx, l3 < .25 ? (1 - l3 / .25) * .7 : 0);
  };

  function titleCard(ctx, a, lt) {
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, 330, 0, 820); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.5, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 330, W, 490);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `bold 150px ${FONT}`;
    ctx.shadowColor = "rgba(168,65,61,.7)"; ctx.shadowBlur = 30;
    const jit = Math.sin(lt * 23) * 1.5;
    ctx.lineWidth = 10; ctx.strokeStyle = "#050507"; ctx.strokeText(STORY.title, 540 + jit, 540);
    ctx.fillStyle = "#d9dde4"; ctx.fillText(STORY.title, 540 + jit, 540);
    ctx.shadowBlur = 0; ctx.font = `bold 64px ${FONT}`;
    ctx.strokeText(STORY.subtitle, 540, 680); ctx.fillStyle = C.red; ctx.fillText(STORY.subtitle, 540, 680);
    ctx.font = `30px ${FONT}`; ctx.fillStyle = "rgba(200,205,215,.75)"; ctx.fillText(STORY.disclaimer, 540, 770);
    ctx.restore();
  }

  // ---------- subtitles ----------
  const FONT = '"LomaBold","Loma","Sarabun","Noto Sans Thai",sans-serif';
  function drawSubtitles(ctx, T) {
    const cue = STORY.cues.find((c) => T >= c.s && T < c.e);
    if (!cue) return;
    const a = clamp((T - cue.s) / .15) * clamp((cue.e - T) / .15);
    const lines = cue.text.split("\n").slice(0, 2);
    ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = "middle";
    const size = 62, lh = 84, y0 = 1560 - (lines.length - 1) * lh / 2;
    ctx.font = `bold ${size}px ${FONT}`; ctx.lineJoin = "round";
    lines.forEach((ln, i) => {
      const segs = []; ln.split("*").forEach((p, j) => { if (p) segs.push({ p, red: j % 2 === 1 }); });
      // emphasis can span lines: track open state across the cue
      const total = segs.reduce((w, s) => w + ctx.measureText(s.p).width, 0);
      let x = 540 - total / 2; const y = y0 + i * lh;
      segs.forEach((s) => { ctx.lineWidth = 12; ctx.strokeStyle = "rgba(4,5,8,.95)"; ctx.textAlign = "left"; ctx.strokeText(s.p, x, y); x += ctx.measureText(s.p).width; });
      x = 540 - total / 2;
      segs.forEach((s) => { ctx.fillStyle = s.red ? "#c4524c" : "#f4f5f7"; ctx.fillText(s.p, x, y); x += ctx.measureText(s.p).width; });
    });
    ctx.restore();
  }

  // ---------- grain, vignette, transitions ----------
  let grainCanvas = null;
  function grain(ctx, T) {
    if (!grainCanvas) {
      grainCanvas = document.createElement("canvas"); grainCanvas.width = grainCanvas.height = 256;
      const g = grainCanvas.getContext("2d"), id = g.createImageData(256, 256), r = rng(99);
      for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      g.putImageData(id, 0, 0);
    }
    const f = Math.floor(T * 30), r = rng(f + 1);
    ctx.save(); ctx.globalAlpha = .06; ctx.globalCompositeOperation = "overlay";
    ctx.translate(-r() * 256, -r() * 256); ctx.fillStyle = ctx.createPattern(grainCanvas, "repeat"); ctx.fillRect(0, 0, W + 512, H + 512);
    ctx.restore();
  }
  function vignette(ctx, a = .6) {
    const g = ctx.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, 1200);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function grade(ctx, day) { // cold midnight-blue grade (lighter grey-blue for the morning scene)
    ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = day ? "rgb(190,200,215)" : "rgb(150,165,205)"; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "screen"; ctx.fillStyle = "rgba(10,16,34,1)"; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  // transitions: [fadeInFromBlack, fadeOutToBlack, dissolveIn]
  const TR = { 1: [1.0, .8, 0], 2: [.8, 0, 0], 3: [0, .8, 1.2], 4: [.6, 0, 0], 5: [0, 0, 0], 6: [0, 0, 0], 7: [0, 0, 0], 8: [0, 0, 0], 9: [0, 0, 1.6] };

  let offCanvas = null;
  function renderScene(ctx, sc, lt) {
    const d = sc.end - sc.start;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    SC[sc.id](ctx, clamp(lt, 0, d), d);
    ctx.restore();
    ctx.save(); grade(ctx, sc.id === 8); ctx.restore();
  }

  function drawFrame(ctx, T) {
    const S = STORY.scenes;
    let i = S.findIndex((s) => T >= s.start && T < s.end); if (i < 0) i = T < 0 ? 0 : S.length - 1;
    const sc = S[i], lt = T - sc.start, d = sc.end - sc.start, tr = TR[sc.id];
    renderScene(ctx, sc, lt);
    if (tr[2] > 0 && lt < tr[2] && i > 0) {
      if (!offCanvas) { offCanvas = document.createElement("canvas"); offCanvas.width = W; offCanvas.height = H; }
      const oc = offCanvas.getContext("2d"); const prev = S[i - 1];
      renderScene(oc, prev, prev.end - prev.start - .001 + lt);
      ctx.save(); ctx.globalAlpha = 1 - ease(lt / tr[2]); ctx.drawImage(offCanvas, 0, 0); ctx.restore();
    }
    vignette(ctx, .62);
    black(ctx, tr[0] > 0 ? 1 - clamp(lt / tr[0]) : 0);
    black(ctx, tr[1] > 0 ? clamp((lt - (d - tr[1])) / tr[1]) : 0);
    if (!(sc.id === 9 && lt >= 12.2)) grain(ctx, T);
    drawSubtitles(ctx, T);
  }

  window.ART = { W, H, drawFrame };
})();
