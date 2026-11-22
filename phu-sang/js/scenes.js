/* ============================================================
   scenes.js — 9-scene timeline for "ภูซาง หนองบัวลำภู" (EDIT ME)
   Each scene: { id, title, design, transition, sfx[], draw(ctx, t) }
     · draw() is authored in `design` seconds; the real duration
       follows the narration (syncScenesToNarration) and the
       animation is stretched to fit.
     · transition = how the scene ENTERS: fade | slash | iris | ink | panel | none
     · sfx = [{ at, type, dur, vol }] in design seconds.
       ambience: wind birds insects footsteps radio clock truck dig paper
       accents : whoosh pop stamp thud
   All drawings are reconstructed illustrations — real photos only
   appear through images.js and are labelled as such.
   ============================================================ */
'use strict';

const SC = {};

function filmLook(c, t, sepia = 0.3, scratches = true) {   // old-film tint + flicker + scratches
  c.save();
  c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(150,105,55,${sepia})`; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = `rgba(255,240,210,${0.05 + 0.05 * E.hash(Math.floor(t * 12))})`; c.fillRect(0, 0, W, H);
  if (scratches) for (let i = 0; i < 3; i++) {
    const x = E.hash(Math.floor(t * 10) * 7 + i) * W;
    if (E.hash(Math.floor(t * 10) + i * 3) > 0.5) line(c, [[x, 0], [x + 10, H]], 'rgba(40,25,10,0.25)', 2);
  }
  c.restore();
}
function lightRays(c, x, y, t, col = 'rgba(255,190,110,') {
  c.save(); c.globalCompositeOperation = 'screen';
  for (let i = 0; i < 6; i++) {
    const a = 0.35 + i * 0.12 + Math.sin(t * 0.5 + i) * 0.02;
    c.fillStyle = col + (0.06 + 0.04 * Math.sin(t + i)) + ')';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 2400 - 60, y + Math.sin(a) * 2400); c.lineTo(x + Math.cos(a) * 2400 + 60, y + Math.sin(a) * 2400); c.closePath(); c.fill();
  }
  c.restore();
}
function birds(c, t, n = 5, y0 = 420, speed = 50, seed = 0) {
  for (let k = 0; k < n; k++) {
    const x = ((t * speed + k * 90 + seed * 200) % (W + 300)) - 150, y = y0 + Math.sin(k * 2 + t) * 20 + k * 16, fl = Math.sin(t * 9 + k) * 9;
    line(c, [[x - 16, y - fl], [x, y], [x + 16, y - fl]], '#1d1a18', 5);
  }
}
function trunk(c, x, w, col, shade) { ink(c, P.poly([[x - w / 2, -50], [x + w / 2, -50], [x + w / 2 + 14, H + 50], [x - w / 2 - 14, H + 50]]), col, shade, { lw: 8, dx: -14, dy: 0 }); }

/* 1 ─ A forest with a secret */
SC.forest = (c, t) => {
  const k = E.inOut(E.seg(t, 0, 10)), camY = E.lerp(0, 180, k), z = E.lerp(1, 1.3, k);
  camera(c, { x: 540, y: 960 + camY, z }, () => {
    skyGrad(c, ['#22394a', '#4d6f73', '#d99a5c'], -200, 1300);
    ink(c, P.ell(760, 560, 90, 90), '#ffd9a0', null, { lw: 0 });
    for (let i = 0; i < 3; i++) cloud(c, ((i * 470 + t * 14) % 1600) - 300, 200 + i * 90, 0.9, '#e7d9c6', '#bfae98');
    ridge(c, { seed: 2, base: 980, amp: 300, col: '#3e5f5a', shade: '#30504b', step: 30 });
    mist(c, 960, 200, t, 0.5, 14);
    ridge(c, { seed: 5, base: 1180, amp: 320, col: '#2f4f46', shade: '#243f37', step: 30 });
    lightRays(c, 760, 560, t);
    jungle(c, 1320 + k * 120, t * 10, 3, '#355e45', '#28503a', 76, 92);
    mist(c, 1300, 200, t + 3, 0.4, 22);
    jungle(c, 1640 + k * 260, t * 26, 9, '#24493a', '#1b3a2e', 96, 110);
  });
  birds(c, t, 5, 520, 55);
  const tk = E.outBack(E.seg(t, 0.8, 1.5));
  if (tk > 0) {
    c.save(); c.translate(540, 300); c.rotate(-0.03); c.scale(tk, tk);
    ink(c, P.rect(-420 + 14, -110 + 16, 840, 220), INK, null, { lw: 0 });
    ink(c, P.rect(-420, -110, 840, 220), '#c2362d', '#9a2a22', { lw: 10, dx: -18, dy: -14 });
    txt(c, 'WHAT IF HISTORY?', 0, -26, 92, { col: '#ffd84a', sw: 16 });
    txt(c, 'ภูซาง · หนองบัวลำภู', 0, 62, 50, { col: '#ffffff', sw: 10 });
    c.restore();
  }
  const nk = E.seg(t, 3.2, 4.4);
  if (nk > 0) person(c, 'narrator', { x: E.lerp(1250, 800, E.out(nk)), y: 1500, s: 0.64, pose: nk < 1 ? 'idle' : 'wonder', walk: nk < 1, t, look: -1, expr: 'curious', seed: 1, flip: true });
};

/* 2 ─ "เขตงานภูซาง" on the map */
SC.map = (c, t) => {
  const v = mapView(100.6, 105.9, 14.3, 18.9, -60, 380, 1200, 1150);
  const zk = E.inOut(E.seg(t, 7.0, 10));
  const [zx, zy] = proj(v, GEO.phusang);
  const ap = E.out(E.seg(t, 0, 0.9));
  camera(c, { x: E.lerp(540, zx, zk), y: E.lerp(960, zy, zk), z: E.lerp(0.92 + 0.08 * ap, 2.6, zk), r: (1 - ap) * 0.05 }, () => {
    drawIsanMap(c, v, t, { labels: E.seg(t, 0.6, 1.2) });
    mountainSymbols(c, v, GEO.phuphan, E.seg(t, 3.0, 5.0));
    if (t > 4.2) { const [px, py] = proj(v, [103.6, 16.5]); txt(c, 'เทือกเขาภูพาน (แนวโดยประมาณ)', px, py + 70, 30, { alpha: E.seg(t, 4.2, 4.8) }); }
    zoneBlob(c, v, GEO.phusang, 0.45, E.seg(t, 1.6, 2.8), t);
    const towns = [['udon', 'อุดรธานี', 1], ['loei', 'เลย', -1], ['khonkaen', 'ขอนแก่น', 1], ['sakon', 'สกลนคร', 1]];
    towns.forEach(([key, label, dir], i) => {
      const k = E.seg(t, 4.8 + i * 0.3, 5.3 + i * 0.3); if (k <= 0) return;
      const a = proj(v, GEO.phusang), b = proj(v, GEO.places[key]);
      c.save(); c.lineDashOffset = -t * 30; line(c, [a, [E.lerp(a[0], b[0], E.out(k)), E.lerp(a[1], b[1], E.out(k))]], '#6b4a2d', 5, [10, 10]); c.restore();
      townDot(c, v, key, label, k, dir);
    });
    townDot(c, v, 'nongbua', 'หนองบัวลำภู', E.seg(t, 1.0, 1.5), 1, '#c2362d');
    if (t > 2.4) { const [x, y] = proj(v, GEO.phusang); txt(c, 'เขตงานภูซาง', x - 20, y + 70, 44, { col: '#ffd84a', alpha: E.seg(t, 2.4, 3.0) }); }
  });
  caption(c, 'เขตงานภูซาง · แนวเทือกเขาภูพาน\nบริเวณรอยต่อของหลายจังหวัด', 540, 210, { size: 40, k: E.outBack(E.seg(t, 2.0, 2.6)) });
  txt(c, 'แผนที่และขอบเขตเป็นภาพประกอบโดยประมาณ ไม่ใช่พิกัดจริง', 540, 1470, 28, { alpha: E.seg(t, 3.0, 3.6) * (1 - E.seg(t, 8, 8.5)) });
  if (zk > 0.6) { c.save(); c.globalAlpha = E.seg(t, 9.0, 10); c.fillStyle = '#24493a'; c.fillRect(0, 0, W, H); c.restore(); }
};

/* 3 ─ Thailand in a time of conflict (2500–2510) */
SC.village = (c, t) => {
  const partB = t >= 5.4;
  if (!partB) {
    const camX = E.lerp(0, 120, E.seg(t, 0, 5.4));
    skyGrad(c, ['#9cc9d6', '#e4dcb8'], 0, 1150);
    ridge(c, { seed: 8, base: 1000, amp: 120, off: camX * 0.2, col: '#88a274', shade: '#6f8a5e', step: 40 });
    ink(c, P.rect(-60, 1080, W + 120, 900), '#a8b468', '#8f9b52', { lw: 8, dx: 0, dy: -30 });
    c.save(); c.translate(-camX * 0.6, 0);
    stiltHouse(c, 260, 1100, 0.95); stiltHouse(c, 900, 1060, 0.75, '#8d6038', '#64432a');
    c.restore();
    c.save(); c.translate(-camX, 0);
    person(c, 'villager', { x: 300, y: 1560, s: 0.56, pose: 'talk', talk: true, t, look: 1, expr: 'worried', seed: 1 });
    person(c, 'villager', { x: 560, y: 1580, s: 0.58, pose: 'arms', t, look: -1, expr: 'serious', seed: 2, hat: false });
    person(c, 'villager', { x: 800, y: 1560, s: 0.55, pose: 'idle', t, look: -1, expr: 'worried', seed: 3 });
    c.restore();
    photoSlot(c, 's3_archive', 540, 700, 760, -0.03, E.seg(t, 1.5, 2.0) * (1 - E.seg(t, 5.0, 5.3)));
  } else {
    const u = t - 5.4;
    skyGrad(c, ['#5d5446', '#9a8a6e'], 0, H);
    ink(c, P.rect(-60, 1200, W + 120, 800), '#6b5a44', '#584936', { lw: 8, dx: 0, dy: -30 });   // table
    radio(c, 300, 1110, 1.0, t);
    newspaper(c, 640, 760, 0.85, 0.08, E.seg(u, 0.2, 0.7));
    person(c, 'officer', { x: 820, y: 1580, s: 0.6, pose: 'arms', t, look: -1, expr: 'serious', seed: 4 });
  }
  filmLook(c, t, 0.32);
  stamp(c, 'พ.ศ. 2500–2510', 540, 260, E.seg(t, 0.4, 0.8), -0.06, '#9a2a22', 80);
};

/* 4 ─ The road that changed history (2504) */
SC.road = (c, t) => {
  const camX = E.lerp(0, 700, E.inOut(E.seg(t, 0, 10)));
  skyGrad(c, ['#86c6e8', '#f3e2a8'], 0, 1150);
  ink(c, P.ell(300 - camX * 0.05, 330, 80, 80), '#fff0b0', '#ffd96b', { lw: 6 });
  for (let i = 0; i < 3; i++) cloud(c, ((i * 520 + t * 12 - camX * 0.1) % 1600) - 300, 220 + i * 80, 0.8);
  ridge(c, { seed: 4, base: 1030, amp: 110, off: camX * 0.25, col: '#8fae73', shade: '#76955c', step: 40 });
  ink(c, P.rect(-60, 1060, W + 120, 900), '#b7c46b', '#9eab55', { lw: 8, dx: 0, dy: -30 });
  c.save(); c.translate(-camX * 0.5, 0);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) ink(c, P.rect(-100 + i * 280, 1090 + j * 60, 260, 50), '#c8d47a', '#aeba62', { lw: 4 });
  c.restore();
  c.save(); c.translate(-camX, 0);
  // road: finished (gravel) part on the left, raw earth on the right
  ink(c, P.rect(-200, 1250, 2300, 170), '#c49762', '#a67b4a', { lw: 8, dx: 0, dy: -16 });
  ink(c, P.rect(-200, 1250, 1000, 170), '#9a948a', '#7f7a72', { lw: 8, dx: 0, dy: -16 });
  for (let k = 0; k < 30; k++) ink(c, P.ell(-180 + E.hash(k) * 960, 1270 + E.hash(k * 3) * 130, 6, 4), '#6f6a62', null, { lw: 0 });
  ink(c, P.rr(80, 1010, 360, 120, 10), '#fbf4dc', '#ddd2ae', { lw: 7 });                         // signboard
  txt(c, '← อุดรธานี', 180, 1048, 34, { col: '#3a2a1a', stroke: false }); txt(c, 'หนองบัวลำภู →', 330, 1094, 34, { col: '#3a2a1a', stroke: false });
  limb(c, [[260, 1130], [260, 1250]], '#7a5232', 12, 4);
  truck(c, E.lerp(-300, 1150, E.seg(t, 0.3, 8.5)), 1330, 0.7, t, 1);
  person(c, 'villager', { x: 1000, y: 1560, s: 0.5, pose: 'hoe', t, look: 1, seed: 2 });
  person(c, 'villager', { x: 1180, y: 1570, s: 0.52, pose: 'hoe', t: t + 0.4, look: -1, seed: 5 });
  dust(c, 1060, 1450, (t * 1.6) % 1, Math.floor(t * 1.6));
  person(c, 'villager', { x: 1380, y: 1580, s: 0.56, pose: 'plan', t, look: 1, seed: 6, hat: false });
  person(c, 'villager', { x: 1600, y: 1570, s: 0.52, pose: 'talk', talk: true, t, look: -1, seed: 7 });
  person(c, 'villager', { x: 1760, y: 1575, s: 0.52, pose: 'arms', t, look: -1, seed: 8, hat: false, expr: 'serious' });
  c.restore();
  stamp(c, 'พ.ศ. 2504', 800, 380, E.seg(t, 0.4, 0.8), 0.1, '#9a2a22', 78);
  caption(c, 'ถนนสายอุดรธานี – หนองบัวลำภู', 400, 230, { size: 42, k: E.outBack(E.seg(t, 1.0, 1.6)), rot: -0.02 });
};

/* 5 ─ The turning point, 2509 (no graphic violence is depicted) */
SC.turning = (c, t) => {
  skyGrad(c, ['#070b1e', '#1a2347', '#3a2c4a'], 0, 1300);
  for (let i = 0; i < 40; i++) { c.save(); c.globalAlpha = 0.4 + 0.6 * E.hash(i + Math.floor(t * 3) * 0.01); ink(c, P.ell(E.hash(i) * W, E.hash(i * 5) * 900, 3, 3), '#fff8e0', null, { lw: 0 }); c.restore(); }
  ink(c, P.ell(860, 260, 60, 60), '#f3ecd0', '#d8cfae', { lw: 0 });
  ridge(c, { seed: 6, base: 1060, amp: 160, col: '#1a2233', shade: '#141a28', step: 40 });
  ink(c, P.rect(-60, 1100, W + 120, 900), '#1c2230', null, { lw: 8 });
  policeStation(c, 540, 1240, 0.95, 0.75 + 0.25 * Math.sin(t * 7) * (t > 3 && t < 4 ? 1 : 0.2));
  // distant shadow figures only — silhouettes, no weapons, no action shown
  c.save(); c.filter = 'brightness(0)';
  for (let i = 0; i < 3; i++) person(c, 'member', { x: E.lerp(-80, 140, E.seg(t, 2.0, 6.0)) - i * 70, y: 1260, s: 0.22, walk: true, t: t + i * 0.3, seed: i + 2, alpha: 0.85 });
  c.restore();
  c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = `rgba(160,40,40,${0.08 + 0.05 * Math.sin(t * 2)})`; c.fillRect(0, 0, W, H); c.restore();
  // big year
  const yk = E.outBack(E.seg(t, 0.3, 0.9)), ys = E.seg(t, 3.0, 3.8);
  if (yk > 0) txt(c, '2509', 540, E.lerp(760, 300, E.inOut(ys)), E.lerp(260, 110, E.inOut(ys)) * yk, { col: '#ffd84a', sw: 22 });
  if (t > 3.5) txt(c, 'พ.ศ.', 340, E.lerp(760, 300, E.inOut(ys)) - 6, 50 * E.inOut(ys), { col: '#ffffff' });
  // newspaper + small map (generic, no invented text)
  const nk = E.seg(t, 5.6, 6.2);
  if (nk > 0) {
    c.save(); c.globalAlpha = 0.85 * nk; c.fillStyle = '#0a0d18'; c.fillRect(0, 0, W, H); c.restore();
    newspaper(c, 400, 860, 0.8, -0.07, nk);
    const mk = E.outBack(E.seg(t, 6.3, 6.9));
    if (mk > 0) {
      c.save(); c.translate(810, 1080); c.rotate(0.06); c.scale(mk, mk);
      ink(c, P.rect(-180, -150, 360, 300), '#9cc0c4', null, { lw: 0 });
      const v = mapView(101.6, 103.4, 16.3, 18.0, -170, -140, 340, 280);
      c.save(); c.beginPath(); c.rect(-180, -150, 360, 300); c.clip();
      ink(c, P.poly(GEO.thailand.map(p => proj(v, p))), '#e8d6a6', '#cdb983', { lw: 4 });
      c.restore(); ink(c, P.rect(-180, -150, 360, 300), 'rgba(0,0,0,0)', null, { lw: 7 });
      const [x, y] = proj(v, GEO.places.nongbua); ink(c, P.ell(x, y, 14, 14), '#c2362d', null, { lw: 5 });
      txt(c, 'หนองบัวลำภู', x, y + 40, 26);
      c.restore();
    }
    photoSlot(c, 's5_archive', 540, 820, 700, 0.03, E.seg(t, 6.0, 6.5));
  }
  const dk = E.seg(t, 8.0, 8.6);
  if (dk > 0) {
    caption(c, 'มีผู้เสียชีวิต 2 คนในเหตุการณ์นั้น', 540, 1400, { size: 40, bg: '#e9e4da', k: E.outBack(dk) });
    for (const cx of [250, 830]) { ink(c, P.rr(cx - 12, 1460, 24, 60, 4), '#f6f0e0', null, { lw: 4 }); blobs(c, [[cx, 1450 + Math.sin(t * 9 + cx) * 2, 11]], '#ffcf6b', null, { lw: 3, alpha: 0.9 * dk }); }
  }
  caption(c, 'สถานีตำรวจหนองบัวลำภู · ภาพจำลอง', 540, 1520, { size: 32, bg: '#ffffff', k: E.outBack(E.seg(t, 1.5, 2.0)) * (1 - E.seg(t, 5.4, 5.6)) });
  filmLook(c, t, 0.15);
};

/* 6 ─ The forest becomes a stronghold */
SC.stronghold = (c, t) => {
  const camX = t * 60;
  skyGrad(c, ['#3d5c4f', '#7e9a82', '#c7cfae'], 0, 1300);
  ridge(c, { seed: 3, base: 900, amp: 260, off: camX * 0.15, col: '#5c7f68', shade: '#4b6c57', step: 30 });
  mist(c, 900, 240, t, 0.45, 12);
  for (let i = 0; i < 7; i++) { const x = ((i * 220 - camX * 0.4) % 1540 + 1540) % 1540 - 230; trunk(c, x, 46, '#4a3a2a', '#3a2c1f'); }
  jungle(c, 760, camX * 0.4, 4, '#3f6b4b', '#305a3c', 80, 95);
  ink(c, P.rect(-60, 1240, W + 120, 800), '#4f6b3c', '#405a30', { lw: 8, dx: 0, dy: -30 });
  ink(c, P.poly([[-60, 1420], [W + 60, 1330], [W + 60, 1400], [-60, 1500]]), '#8a6e48', '#6f5636', { lw: 6 });   // trail
  c.save(); c.translate(-((camX * 0.6) % 1600) + 300, 0);
  hut(c, 300, 1280, 1.0); hut(c, 1900, 1280, 0.9);
  c.restore();
  const wk = E.seg(t, 0.5, 9.5);
  for (let i = 0; i < 3; i++) { const x = ((i * 640 - camX * 1.6) % 1900 + 1900) % 1900 - 300; trunk(c, x, 90, '#2a2119', '#1d1712'); }   // fast foreground trunks
  person(c, 'member', { x: E.lerp(1150, 300, wk), y: 1520, s: 0.58, walk: true, t, look: -1, flip: true, seed: 1 });
  person(c, 'member', { x: E.lerp(1380, 530, wk), y: 1505, s: 0.55, walk: true, t: t + 0.4, look: -1, flip: true, seed: 3 });
  jungle(c, 1820, camX * 1.6, 11, '#22402e', '#182f22', 110, 120);
  mist(c, 1300, 200, t + 2, 0.3, 20);
  const mk = E.outBack(E.seg(t, 6.0, 6.6));
  if (mk > 0) {   // small indicative map card
    c.save(); c.translate(800, 470); c.rotate(0.05); c.scale(mk, mk);
    ink(c, P.rect(-200 + 10, -170 + 12, 400, 340), INK, null, { lw: 0 });
    ink(c, P.rect(-200, -170, 400, 340), '#9cc0c4', null, { lw: 0 });
    const v = mapView(101.6, 103.3, 16.3, 17.9, -190, -160, 380, 320);
    c.save(); c.beginPath(); c.rect(-200, -170, 400, 340); c.clip();
    ink(c, P.poly(GEO.thailand.map(p => proj(v, p))), '#e8d6a6', '#cdb983', { lw: 4 });
    zoneBlob(c, v, GEO.phusang, 0.28, 1, t);
    c.restore(); ink(c, P.rect(-200, -170, 400, 340), 'rgba(0,0,0,0)', null, { lw: 7 });
    txt(c, 'ภูซาง', ...proj(v, GEO.phusang), 34, { col: '#ffd84a' });
    txt(c, '(โดยประมาณ)', 0, 140, 24, { col: INK, stroke: false });
    c.restore();
  }
  caption(c, 'ป่าลึกของเทือกเขาภูซาง', 360, 230, { size: 42, k: E.outBack(E.seg(t, 1.0, 1.6)), rot: -0.02 });
};

/* 7 ─ Expansion 2515–2518, and the state's response (shown side by side) */
SC.expansion = (c, t) => {
  if (t < 4.4) {
    const v = mapView(101.2, 103.6, 15.8, 18.2, -40, 420, 1160, 1150);
    drawIsanMap(c, v, t, { labels: 0 });
    zoneBlob(c, v, GEO.phusang, E.lerp(0.25, 0.6, E.inOut(E.seg(t, 0.6, 3.6))), 1, t);
    townDot(c, v, 'nongbua', 'หนองบัวลำภู', 1, 1, '#c2362d'); townDot(c, v, 'udon', 'อุดรธานี', 1, 1);
    const yr = 2515 + Math.floor(E.seg(t, 0.4, 3.0) * 3.999);
    txt(c, 'พ.ศ. ' + yr, 540, 300, 110, { col: '#ffd84a', sw: 18 });
    txt(c, 'ภาพประกอบ: ขอบเขตโดยประมาณ ไม่ใช่ข้อมูลแผนที่จริง', 540, 1450, 28);
  } else if (t < 8.0) {
    const u = t - 4.4;
    c.fillStyle = '#1b1712'; c.fillRect(0, 0, W, H);
    const lk = E.out(E.seg(u, 0, 0.5)), rk = E.out(E.seg(u, 0.3, 0.8));
    // left panel: forest camp
    c.save(); c.translate(-(1 - lk) * 600, 0); c.beginPath(); c.rect(30, 380, 500, 1060); c.clip();
    skyGrad(c, ['#3d5c4f', '#9cae86'], 380, 1440); jungle(c, 900, u * 10, 2, '#3f6b4b', '#305a3c', 70, 85);
    hut(c, 280, 1160, 0.8);
    person(c, 'member', { x: 190, y: 1400, s: 0.42, pose: 'talk', talk: true, t, look: 1, seed: 1 });
    person(c, 'member', { x: 390, y: 1410, s: 0.42, pose: 'idle', t, look: -1, seed: 3, flip: true });
    c.restore(); ink(c, P.rect(30 - (1 - lk) * 600, 380, 500, 1060), 'rgba(0,0,0,0)', null, { lw: 10 });
    // right panel: state officials planning around a map table
    c.save(); c.translate((1 - rk) * 600, 0); c.beginPath(); c.rect(550, 380, 500, 1060); c.clip();
    skyGrad(c, ['#5b6273', '#a7a99b'], 380, 1440);
    ink(c, P.rect(560, 860, 480, 400), '#d8d0bd', '#bdb39c', { lw: 7 });                 // wall map
    ink(c, P.smooth([[700, 960], [860, 930], [940, 1050], [860, 1170], [720, 1130]]), '#cfd7a8', '#b4bc8e', { lw: 5 });
    person(c, 'officer', { x: 680, y: 1420, s: 0.42, pose: 'point', t, look: 1, seed: 4 });
    person(c, 'officer', { x: 900, y: 1430, s: 0.42, pose: 'arms', t, look: -1, seed: 6, expr: 'serious' });
    c.restore(); ink(c, P.rect(550 + (1 - rk) * 600, 380, 500, 1060), 'rgba(0,0,0,0)', null, { lw: 10 });
    caption(c, 'ขบวนการขยายตัว', 280, 330, { size: 34, k: E.outBack(E.seg(u, 0.5, 0.9)), bg: '#ffffff' });
    caption(c, 'รัฐเพิ่มมาตรการ', 800, 330, { size: 34, k: E.outBack(E.seg(u, 0.8, 1.2)), bg: '#ffffff' });
    if (u > 1.2) radio(c, 960, 1300, 0.35, t);
  } else {
    const u = t - 8.0, z = E.lerp(1.5, 1.0, E.out(E.seg(u, 0, 2)));
    camera(c, { x: 540, y: 1000, z }, () => {
      skyGrad(c, ['#4a6a78', '#d7b07c'], 0, 1300);
      ridge(c, { seed: 9, base: 900, amp: 320, col: '#6d8a7a', shade: '#5a7666', step: 28 });
      mist(c, 900, 200, t, 0.4);
      ridge(c, { seed: 12, base: 1150, amp: 380, col: '#3f6250', shade: '#325241', step: 28 });
      jungle(c, 1500, 0, 6, '#2d5040', '#223e31', 90, 100);
    });
    txt(c, 'เทือกเขาภูซาง', 540, 360, 90, { col: '#ffffff', sw: 16, alpha: E.seg(u, 0.4, 1.0) });
  }
  stamp(c, '2515–2518', 840, 200, t < 4.4 ? 0 : E.seg(t, 4.4, 4.7), 0.08, '#c2362d', 56);
};

/* 8 ─ Memory that remains: stupa and museum (illustrations) */
SC.memory = (c, t) => {
  const camX = E.lerp(0, 300, E.inOut(E.seg(t, 0, 10)));
  skyGrad(c, ['#f2c47a', '#fbe3b0', '#fff5dc'], 0, 1200);
  lightRays(c, 900, 200, t, 'rgba(255,230,160,');
  ridge(c, { seed: 14, base: 1000, amp: 140, off: camX * 0.2, col: '#9cb27c', shade: '#84996a', step: 40 });
  ink(c, P.rect(-60, 1100, W + 120, 900), '#8fb06a', '#789655', { lw: 8, dx: 0, dy: -30 });
  c.save(); c.translate(-camX * 0.6, 0);
  museum(c, 1180, 1160, 0.75);
  stupa(c, 420, 1240, 1.15, 0.5 + 0.3 * Math.sin(t * 1.5));
  c.restore();
  person(c, 'narrator', { x: E.lerp(1100, 760, E.seg(t, 0.5, 5)), y: 1500, s: 0.5, walk: t < 5, t, look: -1, flip: true, seed: 1 });
  const fl = [];   // flowers in the foreground
  for (let i = 0; i < 14; i++) fl.push([((i * 90 - camX * 1.2) % 1300 + 1300) % 1300 - 100, 1460 + E.hash(i) * 40, 20 + E.hash(i * 2) * 10]);
  ink(c, P.rect(-60, 1450, W + 120, 600), '#6f9a4f', '#5c8441', { lw: 8, dx: 0, dy: -20 });
  fl.forEach(([x, y, r], i) => blobs(c, [[x, y + Math.sin(t * 2 + i) * 4, r]], ['#f4d35e', '#ee964b', '#f95738', '#ffffff'][i % 4], null, { lw: 5 }));
  caption(c, 'สถูปและพิพิธภัณฑ์เขตงานภูซาง', 540, 230, { size: 42, k: E.outBack(E.seg(t, 1.0, 1.6)) });
  txt(c, 'ภาพวาดจำลอง ไม่ใช่รูปลักษณ์จริงของสถานที่', 540, 330, 28, { alpha: E.seg(t, 1.4, 2.0) });
  photoSlot(c, 's8_stupa', 540, 760, 720, -0.03, E.seg(t, 2.4, 2.9) * (1 - E.seg(t, 5.8, 6.1)));
  photoSlot(c, 's8_museum', 540, 760, 720, 0.03, E.seg(t, 6.1, 6.6));
};

/* 9 ─ A lesson from the past + end card */
SC.lesson = (c, t) => {
  const z = E.lerp(1.15, 1.0, E.out(E.seg(t, 0, 10)));
  camera(c, { x: 540, y: 1000, z }, () => {
    skyGrad(c, ['#1d2b55', '#7a4a78', '#f08a4b', '#ffd08a'], 0, 1250);
    ink(c, P.ell(540, 1050, 220, 220), '#ffd08a', '#ffb45a', { lw: 0 });
    ridge(c, { seed: 21, base: 1080, amp: 260, col: '#4b3a5c', shade: '#3a2c48', step: 30 });
    ridge(c, { seed: 24, base: 1260, amp: 230, col: '#2e2a40', shade: '#231f32', step: 30 });
    ink(c, P.rect(-100, 1400, W + 200, 800), '#1f1c2c', null, { lw: 8 });
  });
  // the past fades over the present (ghost figures), then fades away
  const gk = E.seg(t, 1.0, 2.5) * (1 - E.seg(t, 5.5, 7.0));
  if (gk > 0) {
    c.save(); c.globalAlpha = gk * 0.45; c.filter = 'sepia(1) brightness(1.3)';
    person(c, 'villager', { x: 200, y: 1330, s: 0.42, t, seed: 1 });
    person(c, 'member', { x: 380, y: 1320, s: 0.4, t, seed: 2 });
    person(c, 'officer', { x: 560, y: 1330, s: 0.42, t, seed: 3 });
    c.restore();
  }
  person(c, 'narrator', { x: 850, y: 1560, s: 0.6, pose: 'arms', t, look: -1, flip: true, seed: 5 });
  const ck = E.outBack(E.seg(t, 8.3, 8.9));
  if (ck > 0) { c.save(); c.translate(540, 420); c.scale(ck, ck); txt(c, 'ประวัติศาสตร์', 0, -60, 100, { col: '#ffd84a', sw: 16 }); txt(c, 'มีไว้ให้เรียนรู้', 0, 60, 84, { col: '#ffffff', sw: 14 }); c.restore(); }
  const ek = E.seg(t, 10.6, 11.3);
  if (ek > 0) {
    c.save(); c.globalAlpha = ek * 0.86; c.fillStyle = '#0d0a10'; c.fillRect(0, 0, W, H); c.restore();
    c.save(); c.globalAlpha = ek;
    txt(c, 'WHAT IF HISTORY', 540, 520, 80, { col: '#ffd84a', sw: 14 });
    txt(c, 'ภูซาง · หนองบัวลำภู', 540, 620, 60, { col: '#ffffff', sw: 10 });
    const notes = ['ภาพในคลิปเป็นภาพวาดจำลองทางประวัติศาสตร์ ไม่ใช่ภาพถ่ายจริง',
      'ตัวละครเป็นตัวละครประกอบ ไม่ได้แทนบุคคลจริง',
      'นำเสนอเพื่อการศึกษา ไม่ได้สนับสนุนความรุนแรงหรือฝ่ายใด',
      'อ้างอิงเนื้อหา: เดอะอีสานเรคคอร์ด (theisaanrecord.co)'];
    notes.forEach((s, i) => txt(c, s, 540, 790 + i * 62, 32, { col: i === 3 ? '#d9cfbf' : '#ffffff', stroke: false }));
    c.restore();
  }
};

const SCENES = [
  { id: 'forest',     title: 'ป่าที่มีความลับ',              design: 10, transition: 'fade',  draw: SC.forest,
    sfx: [{ at: 0, type: 'wind', dur: 10, vol: 0.8 }, { at: 0, type: 'birds', dur: 10, vol: 0.8 }, { at: 0.8, type: 'stamp' }, { at: 3.2, type: 'footsteps', dur: 1.3, vol: 0.6 }] },
  { id: 'map',        title: 'เขตงานภูซาง',                  design: 10, transition: 'iris',  draw: SC.map,
    sfx: [{ at: 0.1, type: 'paper' }, { at: 1.0, type: 'pop' }, { at: 1.6, type: 'whoosh', dur: 0.8 }, ...[0, 1, 2, 3].map(i => ({ at: 4.8 + i * 0.3, type: 'pop' })), { at: 7.2, type: 'whoosh', dur: 1.2 }] },
  { id: 'village',    title: 'ยุคความขัดแย้ง',               design: 10, transition: 'slash', draw: SC.village,
    sfx: [{ at: 0, type: 'wind', dur: 5.4, vol: 0.5 }, { at: 0.4, type: 'stamp' }, { at: 5.4, type: 'radio', dur: 4.6, vol: 0.7 }, { at: 5.6, type: 'paper' }] },
  { id: 'road',       title: 'ถนนที่เปลี่ยนประวัติศาสตร์',   design: 10, transition: 'panel', draw: SC.road,
    sfx: [{ at: 0.2, type: 'truck', dur: 8.5, vol: 0.7 }, { at: 0.5, type: 'dig', dur: 9, vol: 0.6 }, { at: 0.4, type: 'stamp' }, { at: 0, type: 'birds', dur: 10, vol: 0.4 }] },
  { id: 'turning',    title: 'จุดเปลี่ยนปี 2509',            design: 10, transition: 'fade',  draw: SC.turning,
    sfx: [{ at: 0, type: 'clock', dur: 8, vol: 0.7 }, { at: 0, type: 'wind', dur: 10, vol: 0.6 }, { at: 0.3, type: 'thud' }, { at: 5.6, type: 'paper' }, { at: 8.0, type: 'thud', vol: 0.5 }] },
  { id: 'stronghold', title: 'ป่ากลายเป็นฐานที่มั่น',         design: 10, transition: 'ink',   draw: SC.stronghold,
    sfx: [{ at: 0, type: 'insects', dur: 10, vol: 0.7 }, { at: 0.5, type: 'footsteps', dur: 9, vol: 0.6 }, { at: 0, type: 'wind', dur: 10, vol: 0.4 }, { at: 6.0, type: 'paper' }] },
  { id: 'expansion',  title: 'พ.ศ. 2515–2518',              design: 10, transition: 'slash', draw: SC.expansion,
    sfx: [{ at: 0.2, type: 'paper' }, { at: 4.4, type: 'whoosh', dur: 0.6 }, { at: 4.4, type: 'stamp' }, { at: 5.6, type: 'radio', dur: 2.4, vol: 0.5 }, { at: 8.0, type: 'wind', dur: 2, vol: 0.6 }] },
  { id: 'memory',     title: 'ความทรงจำที่ยังอยู่',           design: 10, transition: 'iris',  draw: SC.memory,
    sfx: [{ at: 0, type: 'birds', dur: 10, vol: 0.7 }, { at: 0, type: 'wind', dur: 10, vol: 0.35 }, { at: 0.5, type: 'footsteps', dur: 4.5, vol: 0.4 }] },
  { id: 'lesson',     title: 'บทเรียนจากอดีต',               design: 14, transition: 'fade',  draw: SC.lesson,
    sfx: [{ at: 0, type: 'wind', dur: 13, vol: 0.5 }, { at: 8.3, type: 'stamp', vol: 0.6 }, { at: 10.6, type: 'whoosh', dur: 0.9 }] },
];

/* scene lengths follow the narration: each cut sits halfway between two paragraphs */
var DURATION = 0;
function syncScenesToNarration() {
  const L = NARRATION.lines;
  let s = 0;
  SCENES.forEach((sc, i) => {
    const cur = L.find(l => l.scene === i + 1), next = L.find(l => l.scene === i + 2);
    const end = next ? (cur.end + next.start) / 2 : cur.end + 4.2;    // last scene keeps ~4 s for the end card
    sc.start = s; sc.dur = Math.max(2, end - s); s = end;
  });
  DURATION = s;
  window.DURATION = DURATION;
}
syncScenesToNarration();
