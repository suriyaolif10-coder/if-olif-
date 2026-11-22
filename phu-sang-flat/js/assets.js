/* ============================================================
   assets.js — editable illustration assets for "ภูซาง"
   · PAL       : fixed palette of the recurring cast (same look in all scenes)
   · person()  : the cast — narrator (today), Isan villager (1960s–70s),
                 movement member (generic, not a real person), state official
   · props     : stilt house, rice field, 1960s truck, police station,
                 forest hut, stupa, museum, newspaper, radio
   · map       : simplified Isan map (approximate outlines, for illustration)
   Every figure here is a reconstructed illustration, not a real person.
   ============================================================ */
'use strict';

/* channel logo for the outro (assets/logo.png) */
const LOGO = new Image();
LOGO.src = 'assets/logo.png';

/* ---------------- the cast ---------------- */
const PAL = {
  narrator: { skin: '#e2a77c', skinS: '#c2875c', top: '#e9a23b', topS: '#c4801f', pants: '#3d5a80', pantsS: '#2c4462', hair: '#1c1410', shoe: '#f4f4f0', sleeve: 'skin' },
  villager: { skin: '#c98b5c', skinS: '#a86d42', top: '#2f3f6b', topS: '#223052', pants: '#2f3f6b', pantsS: '#223052', hair: '#15100c', shoe: '#c98b5c', sleeve: 'top', hat: '#e0c27a', hatS: '#b99a52' },
  member:   { skin: '#d19a6c', skinS: '#b07a4e', top: '#5e6b4a', topS: '#48533a', pants: '#4d5a3c', pantsS: '#3b462d', hair: '#15100c', shoe: '#3a2d22', sleeve: 'top', cap: '#4d5a3c', capS: '#3b462d', pack: '#7a5a35', packS: '#5c4224' },
  officer:  { skin: '#dca47a', skinS: '#bb8458', top: '#b8975c', topS: '#977a43', pants: '#a88a52', pantsS: '#8a6f3c', hair: '#15100c', shoe: '#1d1a18', sleeve: 'top', cap: '#8f7442', capS: '#705a30' },
};

const POSES = {
  idle:   t => ({ r: [0.12 + Math.sin(t * 2) * 0.03, -0.1], l: [0.12 - Math.sin(t * 2) * 0.03, -0.1] }),
  wonder: t => ({ r: [0.5, -2.3 + Math.sin(t * 2) * 0.08], l: [0.12, -0.1] }),
  talk:   t => ({ r: [0.8 + Math.sin(t * 3.1) * 0.25, -1.3 + Math.sin(t * 4.3) * 0.2], l: [0.12, -0.1] }),
  point:  t => ({ r: [1.5 + Math.sin(t * 3) * 0.05, -0.05], l: [0.12, -0.1] }),
  plan:   t => ({ r: [0.6, -1.5], l: [0.6, -1.5], plan: true }),
  hoe:    t => ({ r: [1.2 + Math.sin(t * 5) * 0.6, -0.9], l: [1.0 + Math.sin(t * 5) * 0.6, -1.1], hoe: true }),
  carry:  t => ({ r: [0.3, -1.9], l: [0.3, -1.9] }),
  arms:   t => ({ r: [0.5, -2.0], l: [0.5, -2.0] }),
  wai:    t => ({ r: [0.55, -2.35], l: [0.55, -2.35] }),
};
/* flat Thai-cartoon look: egg-shaped heads, thin dark-brown line, flat colours (no cel shading) */
const SKIN = { narrator: '#eaa673', villager: '#d98b55', member: '#e09a62', officer: '#eeb084' };
function flat(c, path, fill, lw = 6) { ink(c, path, fill, null, { lw }); }

function person(c, kind, o) {
  const p = PAL[kind], s = o.s || 1, t = o.t || 0, seed = o.seed || 1, skin = SKIN[kind];
  const pose = (POSES[o.pose || 'idle'] || POSES.idle)(t + seed);
  c.save(); c.translate(o.x, o.y); c.scale(o.flip ? -s : s, s);
  if (o.alpha != null) c.globalAlpha = o.alpha;
  const br = Math.sin(t * 2.2 + seed) * 3, walk = o.walk ? Math.sin(t * 7 + seed) : 0;
  c.translate(0, o.walk ? Math.abs(Math.cos(t * 7 + seed)) * -7 : 0);
  if (kind === 'member') flat(c, P.rr(-82, -318 + br, 164, 150, 26), p.pack);
  // legs (short) + feet
  for (const sd of [-1, 1]) {
    const sw = sd * walk * 22;
    flat(c, P.rr(sd * 30 - 22 + sw * 0.4, -160, 44, 125, 10), p.pants);
    flat(c, P.rect(sd * 30 - 18 + sw, -42, 36, 34), kind === 'villager' ? skin : (kind === 'narrator' ? skin : p.pants));
    flat(c, P.ell(sd * 30 + sw + sd * 6, -6, 30, 12), kind === 'villager' ? skin : p.shoe);
  }
  // torso
  flat(c, P.rr(-78, -330 + br, 156, 200 - br, 22), p.top);
  if (kind === 'narrator') { checker(c, -78, -330 + br, 52, 22); checker(c, 26, -330 + br, 52, 22); checker(c, 36, -312 + br, 26, 110); }
  if (kind === 'villager') checker(c, -78, -158, 156, 24);
  if (kind === 'officer') { flat(c, P.rect(-78, -160, 156, 18), '#4a3424', 5); for (let k = 0; k < 3; k++) flat(c, P.ell(0, -300 + k * 45 + br, 6, 6), '#d8c070', 3); }
  if (kind === 'member') { line(c, [[-50, -328 + br], [-44, -170]], '#5c4224', 10); line(c, [[50, -328 + br], [44, -170]], '#5c4224', 10); }
  armF(c, -1, pose.l, p, br, pose, t, skin, kind); armF(c, 1, pose.r, p, br, pose, t, skin, kind);
  headF(c, kind, p, t, o, br, seed, skin);
  if (pose.plan) { flat(c, P.rect(-110, -300 + br, 220, 120), '#e9e2c6'); for (let k = 0; k < 3; k++) line(c, [[-90, -275 + k * 30 + br], [90, -275 + k * 30 + br]], '#6a86b0', 3); }
  c.restore();
}
function checker(c, x, y, w, h, a = '#c2362d', b = '#f3ece0') {
  ink(c, P.rect(x, y, w, h), b, null, { lw: 4 });
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.fillStyle = a;
  for (let i = 0; i < w; i += 16) c.fillRect(x + i, y, 7, h);
  c.globalAlpha = 0.6; for (let j = 0; j < h; j += 16) c.fillRect(x, y + j, w, 7);
  c.restore();
}
function armF(c, side, ang, p, br, pose, t, skin, kind) {
  const [a1, a2] = ang, sx = side * 70, sy = -312 + br, L1 = 80, L2 = 74;
  const ex = sx + side * Math.sin(a1) * L1, ey = sy + Math.cos(a1) * L1;
  const a = a1 + a2, hx = ex + side * Math.sin(a) * L2, hy = ey + Math.cos(a) * L2;
  const sleeve = kind === 'narrator' ? skin : p.top;
  limb(c, [[sx, sy], [ex, ey]], kind === 'narrator' ? p.top : sleeve, 32, 5);
  limb(c, [[ex, ey], [hx, hy]], sleeve, 28, 5);
  if (pose.hoe && side === 1) { c.save(); c.translate(hx, hy); c.rotate(-a * side + 0.6); limb(c, [[0, -50], [0, 140]], '#8a6238', 10, 4); flat(c, P.poly([[-34, 132], [34, 132], [26, 164], [-26, 164]]), '#9aa2a6', 4); c.restore(); }
  flat(c, P.ell(hx, hy, 19, 21), skin, 5);
}
function headF(c, kind, p, t, o, br, seed, skin) {
  const cy = -470 + br, look = o.look ?? 0, ex_ = o.expr || 'neutral';
  const egg = P.smooth([[0, cy - 135], [70, cy - 120], [104, cy - 60], [112, cy + 10], [98, cy + 75], [52, cy + 115], [0, cy + 124], [-52, cy + 115], [-98, cy + 75], [-112, cy + 10], [-104, cy - 60], [-70, cy - 120]]);
  for (const sd of [-1, 1]) {                                     // C-shaped ears
    flat(c, P.ell(sd * 108, cy + 12, 26, 30), skin, 6);
    c.save(); c.beginPath(); c.arc(sd * 108, cy + 12, 13, sd > 0 ? -1.3 : 1.8, sd > 0 ? 1.3 : 4.4); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); c.restore();
  }
  flat(c, egg, skin, 6);
  // hair cap (clip egg above the hairline)
  if (kind === 'narrator' || kind === 'villager' || kind === 'officer') {
    c.save(); c.beginPath(); egg(c); c.clip(); c.fillStyle = p.hair;
    c.beginPath(); c.moveTo(-130, cy - 200); c.lineTo(130, cy - 200); c.lineTo(130, cy - 50); c.quadraticCurveTo(40, cy - 82, -10, cy - 64); c.quadraticCurveTo(-70, cy - 50, -130, cy - 40); c.closePath(); c.fill();
    c.restore(); flat(c, egg, 'rgba(0,0,0,0)', 6);
  }
  // eyes: round whites with dot pupils, right eye slightly bigger
  const blink = ((t + seed * 1.7) % 3.6) < 0.12;
  [[-34, 15, 19], [34, 18, 22]].forEach(([x, rx, ry]) => {
    if (blink) { line(c, [[x - rx, cy - 4], [x + rx, cy - 4]], INK, 5); return; }
    flat(c, P.ell(x, cy - 6, rx, ry), '#ffffff', 4);
    flat(c, P.ell(x + look * 6, cy - 10 + (o.up ? -6 : 0), 6.5, 7.5), INK, 0);
    if (ex_ === 'worried' || ex_ === 'sad') line(c, [[x - rx, cy - ry - 2], [x + rx, cy - ry + (x < 0 ? 6 : -2)]], INK, 4);   // heavy lid
  });
  // brows
  const bA = { worried: 0.3, sad: 0.35, serious: -0.25, curious: 0.12 }[ex_] || 0;
  [[-34, -1], [34, 1]].forEach(([x, sd]) => { c.save(); c.translate(x, cy - 40 - (ex_ === 'curious' && sd > 0 ? 8 : 0)); c.rotate(sd * bA); line(c, [[-14, 0], [14, 0]], INK, 5); c.restore(); });
  // nose: little hook
  c.save(); c.beginPath(); c.moveTo(4, cy + 12); c.quadraticCurveTo(-12, cy + 34, 2, cy + 40); c.strokeStyle = INK; c.lineWidth = 4; c.lineCap = 'round'; c.stroke(); c.restore();
  // mouth
  const talk = o.talk ? E.clamp(0.5 + 0.5 * Math.sin(t * 15 + seed) + E.noise(t * 9 + seed) * 0.4) : 0;
  if (talk > 0.25) { flat(c, P.ell(0, cy + 72, 20, 10 + talk * 16), '#c0313f', 4); flat(c, P.ell(0, cy + 80 + talk * 8, 11, 6), '#f08aa0', 0); }
  else {
    c.save(); c.beginPath();
    if (ex_ === 'worried' || ex_ === 'serious' || ex_ === 'sad') { c.moveTo(-16, cy + 74); c.quadraticCurveTo(0, cy + 64, 16, cy + 74); }
    else { c.moveTo(-18, cy + 64); c.quadraticCurveTo(0, cy + 78, 18, cy + 64); }
    c.strokeStyle = INK; c.lineWidth = 5; c.lineCap = 'round'; c.stroke(); c.restore();
  }
  // headgear
  if (kind === 'villager' && o.hat !== false) {
    flat(c, P.poly([[-150, cy - 92], [0, cy - 190], [150, cy - 92]]), p.hat);
    for (let k = 1; k < 3; k++) line(c, [[-150 + k * 50, cy - 92 - k * 33], [150 - k * 50, cy - 92 - k * 33]], '#b99a52', 3);
  } else if (kind === 'member') {
    flat(c, P.smooth([[-108, cy - 60], [-96, cy - 120], [0, cy - 150], [96, cy - 120], [108, cy - 60], [0, cy - 78]]), p.cap);
    flat(c, P.ell(0, cy - 64, 118, 14), p.cap, 5);
  } else if (kind === 'officer') {
    flat(c, P.rr(-104, cy - 170, 208, 80, 22), p.cap);
    flat(c, P.ell(0, cy - 92, 122, 16), '#2a231c', 5);
    flat(c, P.ell(0, cy - 135, 14, 16), '#d8c070', 4);
  }
}

/* big blurred head seen from behind, close to the lens (foreground depth layer) */
function backHead(c, x, y, s, kind) {
  const p = PAL[kind];
  c.save(); c.translate(x, y); c.scale(s, s);
  flat(c, P.ell(0, 0, 230, 250), kind === 'villager' ? '#15100c' : (kind === 'member' ? p.cap : '#15100c'), 10);
  if (kind === 'villager') { flat(c, P.poly([[-330, -40], [0, -260], [330, -40]]), p.hat, 10); }
  for (const sd of [-1, 1]) flat(c, P.ell(sd * 230, 30, 40, 55), SKIN[kind], 8);
  c.restore();
}

/* ---------------- props ---------------- */
function stiltHouse(c, x, y, s, col = '#9a6a3e', roof = '#6f4a2a', dark = false) {
  c.save(); c.translate(x, y); c.scale(s, s);
  for (const px of [-160, -60, 60, 160]) ink(c, P.rect(px - 10, -200, 20, 200), '#7a5232', null, { lw: 5 });
  ink(c, P.rect(-200, -360, 400, 170), col, mix(col, '#000000', 0.25), { lw: 7 });
  for (let k = 1; k < 8; k++) line(c, [[-200 + k * 50, -360], [-200 + k * 50, -190]], mix(col, '#000000', 0.2), 3);
  ink(c, P.rect(-40, -330, 70, 110), dark ? '#ffcf6b' : '#3b2a1c', null, { lw: 5 });
  ink(c, P.poly([[-250, -350], [0, -520], [250, -350]]), roof, mix(roof, '#000000', 0.3), { lw: 8 });
  limb(c, [[150, -190], [230, 0]], '#7a5232', 10, 4);
  c.restore();
}

function truck(c, x, y, s, t, moving = 0) {     // generic 1960s dump truck
  c.save(); c.translate(x, y); c.scale(s, s);
  const vib = Math.sin(t * 40) * 2 * (moving ? 1 : 0.4);
  c.translate(0, vib);
  ink(c, P.poly([[-300, -200], [40, -200], [60, -60], [-300, -60]]), '#c2862f', '#9d6a1e', { lw: 8 });   // bed
  ink(c, P.poly([[60, -230], [200, -230], [250, -140], [260, -60], [60, -60]]), '#3f7d6b', '#2e5f51', { lw: 8 });  // cab
  ink(c, P.poly([[90, -210], [180, -210], [215, -145], [90, -145]]), '#a9d6e4', '#6fa4b6', { lw: 5 });
  ink(c, P.rect(-310, -70, 590, 30), '#3a3530', null, { lw: 6 });
  for (const wx of [-200, 170]) { ink(c, P.ell(wx, -30, 58, 58), '#2a2622', null, { lw: 7 }); ink(c, P.ell(wx, -30, 22, 22), '#9a958c', null, { lw: 4 }); }
  if (moving) for (let k = 0; k < 3; k++) { const f = ((t * 1.5 + k / 3) % 1); blobs(c, [[-320 - f * 140, -80 - f * 40, 16 + 26 * f]], '#cfcac0', '#aaa49a', { lw: 5, alpha: 1 - f }); }
  c.restore();
}

function policeStation(c, x, y, s, lit = 1) {   // generic 1960s provincial station (illustration)
  c.save(); c.translate(x, y); c.scale(s, s);
  ink(c, P.rect(-360, -300, 720, 300), '#5a5f74', '#464a5c', { lw: 8, dx: -22, dy: -10 });
  ink(c, P.poly([[-400, -290], [0, -440], [400, -290]]), '#3a3346', '#2c2735', { lw: 8 });
  for (const wx of [-260, -130, 130, 260]) ink(c, P.rect(wx - 40, -230, 80, 100), lit ? '#ffd36b' : '#2a2c38', null, { lw: 6 });
  ink(c, P.rect(-55, -200, 110, 200), '#2a2430', null, { lw: 6 });
  ink(c, P.rr(-190, -350, 380, 56, 8), '#e8e2d0', '#c8c0a8', { lw: 6 });
  txt(c, 'สถานีตำรวจ', 0, -322, 36, { col: '#2a2430', stroke: false });
  c.restore();
}

function hut(c, x, y, s) {   // simple forest shelter (thatch roof on poles)
  c.save(); c.translate(x, y); c.scale(s, s);
  for (const px of [-120, 120]) ink(c, P.rect(px - 9, -170, 18, 170), '#6b4a2d', null, { lw: 5 });
  ink(c, P.rect(-130, -90, 260, 22), '#7a5232', null, { lw: 5 });
  ink(c, P.poly([[-190, -150], [0, -270], [190, -150]]), '#b99a5a', '#937a3e', { lw: 7 });
  for (let k = 0; k < 8; k++) line(c, [[-170 + k * 48, -150], [-150 + k * 44, -180]], '#8a6e36', 3);
  c.restore();
}

function stupa(c, x, y, s, glow = 0) {   // memorial stupa, drawn after its real shape: square base, tall white spire, finial
  c.save(); c.translate(x, y); c.scale(s, s);
  if (glow > 0) { c.save(); c.globalAlpha = glow * 0.5; ink(c, P.ell(0, -330, 280, 400), '#fff3c4', null, { lw: 0 }); c.restore(); }
  const W_ = '#f4f2ec', WS = '#d4cfc4', G = '#d9a93a', GS = '#b38726';
  ink(c, P.rect(-230, -40, 460, 40), W_, WS, { lw: 7 });                                   // plinth
  ink(c, P.rect(-200, -200, 400, 160), W_, WS, { lw: 8, dx: -16 });                        // square base
  for (const px of [-140, 0, 140]) ink(c, P.rect(px - 50, -170, 100, 40), '#2f2a24', null, { lw: 4 });   // plaques
  ink(c, P.rr(-34, -140, 68, 100, 30), '#f7efd8', null, { lw: 5, stroke: G });           // arched niche
  ink(c, P.rect(-230, -215, 460, 22), G, GS, { lw: 6 });                                   // gold cornice
  ink(c, P.poly([[-210, -215], [-120, -470], [120, -470], [210, -215]]), W_, WS, { lw: 8, dx: -22 });   // lower pyramid
  ink(c, P.rect(-128, -484, 256, 16), G, GS, { lw: 5 });
  ink(c, P.poly([[-116, -484], [-60, -650], [60, -650], [116, -484]]), W_, WS, { lw: 7, dx: -16 });
  ink(c, P.rect(-66, -662, 132, 14), G, GS, { lw: 5 });
  ink(c, P.poly([[-56, -662], [-10, -900], [10, -900], [56, -662]]), W_, WS, { lw: 7, dx: -10 });     // slender spire
  limb(c, [[0, -900], [0, -960]], '#8d8a84', 8, 4);
  c.save(); c.translate(0, -965);                                                          // finial
  c.beginPath(); c.moveTo(-70, 10); c.quadraticCurveTo(-30, -10, 0, 0); c.quadraticCurveTo(30, -10, 70, 10);
  c.strokeStyle = INK; c.lineWidth = 16; c.lineCap = 'round'; c.stroke(); c.strokeStyle = '#8d8a84'; c.lineWidth = 8; c.stroke();
  c.restore();
  c.restore();
}

function museum(c, x, y, s) {   // simple single-storey exhibition hall (illustration)
  c.save(); c.translate(x, y); c.scale(s, s);
  ink(c, P.rect(-300, -220, 600, 220), '#e9dcc0', '#cbbd9e', { lw: 8, dx: -20 });
  ink(c, P.poly([[-340, -210], [0, -330], [340, -210]]), '#a3523a', '#7f3c29', { lw: 8 });
  ink(c, P.rect(-60, -150, 120, 150), '#6b4a2d', null, { lw: 6 });
  for (const wx of [-210, 210]) ink(c, P.rect(wx - 50, -170, 100, 80), '#a9d6e4', '#6fa4b6', { lw: 5 });
  ink(c, P.rr(-200, -280, 400, 50, 8), '#fff8e6', null, { lw: 5 });
  txt(c, 'พิพิธภัณฑ์', 0, -255, 34, { col: '#5a3a24', stroke: false });
  c.restore();
}

function newspaper(c, x, y, s, rot, k) {   // generic paper — headline lines only, no invented headline text
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s * E.outBack(E.clamp(k)), s * E.outBack(E.clamp(k)));
  ink(c, P.rect(-300 + 12, -380 + 14, 600, 760), INK, null, { lw: 0 });
  ink(c, P.rect(-300, -380, 600, 760), '#efe6cf', '#d9cdae', { lw: 8 });
  ink(c, P.rect(-260, -340, 520, 70), '#3a332a', null, { lw: 0 });
  for (let k2 = 0; k2 < 3; k2++) ink(c, P.rect(-260, -250 + k2 * 40, 520 - k2 * 90, 20), '#8a8170', null, { lw: 0 });
  ink(c, P.rect(-260, -120, 250, 200), '#b8ad94', null, { lw: 4 });
  for (let k2 = 0; k2 < 14; k2++) line(c, [[20, -110 + k2 * 22], [260, -110 + k2 * 22]], '#9b917c', 5);
  for (let k2 = 0; k2 < 8; k2++) line(c, [[-260, 110 + k2 * 26], [260, 110 + k2 * 26]], '#9b917c', 5);
  c.restore();
}

function radio(c, x, y, s, t) {   // 1960s transistor radio
  c.save(); c.translate(x, y); c.scale(s, s);
  ink(c, P.rr(-150, -110, 300, 200, 26), '#9a3b2c', '#7b2c20', { lw: 8 });
  ink(c, P.ell(-55, -10, 70, 70), '#d8cba8', null, { lw: 6 });
  for (let k = -3; k <= 3; k++) line(c, [[-55 + k * 18, -60], [-55 + k * 18, 40]], '#a6987a', 4);
  ink(c, P.rr(40, -70, 80, 40, 6), '#f1e5c2', null, { lw: 4 });
  line(c, [[60 + Math.sin(t * 2) * 15, -66], [60 + Math.sin(t * 2) * 15, -34]], '#c2362d', 4);
  ink(c, P.ell(80, 30, 22, 22), '#3a332a', null, { lw: 4 });
  limb(c, [[110, -110], [200, -300]], '#c9ccd0', 5, 3);
  for (let k = 0; k < 3; k++) { const f = (t * 0.8 + k / 3) % 1; c.save(); c.globalAlpha = 1 - f; c.beginPath(); c.arc(200, -300, 20 + f * 90, -1.2, 0.2); c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.stroke(); c.restore(); }
  c.restore();
}

function mist(c, y, h, t, alpha = 0.45, speed = 18) {   // drifting fog bands
  for (let i = 0; i < 6; i++) {
    const x = ((i * 380 + t * speed * (1 + i % 3 * 0.3)) % (W + 800)) - 400;
    c.save(); c.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(i + t * 0.3));
    const g = c.createRadialGradient(x, y + (i % 3) * h * 0.3, 10, x, y + (i % 3) * h * 0.3, 360);
    g.addColorStop(0, 'rgba(235,240,238,1)'); g.addColorStop(1, 'rgba(235,240,238,0)');
    c.fillStyle = g; c.fillRect(x - 400, y - 300, 800, h + 600); c.restore();
  }
}

/* ---------------- Isan map (reuses the Thailand / Laos outlines; approximate) ---------------- */
const GEO = (() => {
  const TL = [[100.1, 20.4], [100.5, 20.15], [100.6, 19.6], [101.2, 19.5], [101.1, 18.4], [101.05, 17.9], [101.7, 17.6], [102.1, 18.2], [102.7, 17.9], [103.0, 18.3], [103.4, 18.4], [104.0, 17.6], [104.75, 16.6], [104.8, 16.0], [105.6, 15.7], [105.5, 14.35]];
  const TC = [[105.5, 14.35], [104.5, 14.4], [103.0, 14.35], [102.4, 13.6], [102.6, 12.6], [102.75, 12.0], [102.9, 11.7]];
  const TCE = [[102.9, 11.7], [102.3, 12.2], [101.7, 12.65], [100.95, 12.65], [100.9, 13.45], [100.5, 13.5], [100.0, 13.35], [99.95, 12.6], [99.8, 11.8], [99.3, 10.8]];
  const TWL = [[99.3, 10.8], [99.6, 11.7], [99.2, 12.3], [99.15, 13.0], [98.9, 14.0], [98.5, 14.9], [98.2, 15.1], [98.6, 16.1], [97.8, 17.7], [97.7, 18.5], [98.0, 19.7], [98.9, 19.8], [99.5, 20.15], [100.1, 20.4]];
  const laos = [[100.1, 20.4], [100.5, 21.0], [101.15, 21.55], [101.8, 22.45], [102.15, 22.4], [102.9, 21.7], [103.0, 21.2], [104.0, 20.95], [104.6, 20.55], [104.4, 20.0], [104.9, 19.8], [104.2, 19.5], [105.1, 18.8], [105.6, 18.4], [106.5, 17.5], [106.6, 16.5], [107.3, 16.1], [107.6, 15.4], [107.55, 14.7], [106.8, 14.3], [106.0, 13.95], [105.5, 14.35], ...TL.slice().reverse().slice(1)];
  return {
    thailand: [...TL, ...TC.slice(1), ...TCE.slice(1), ...TWL.slice(1)],
    laos,
    cambodia: [[102.9, 11.7], [103.6, 10.5], [104.45, 10.4], [106.1, 11.0], [107.5, 12.3], [107.55, 14.7], [106.8, 14.3], [106.0, 13.95], [105.5, 14.35], ...TC.slice().reverse().slice(1)],
    places: {   // province towns (approximate coordinates)
      nongbua: [102.44, 17.20], udon: [102.79, 17.41], khonkaen: [102.83, 16.43], loei: [101.72, 17.49], sakon: [104.15, 17.16],
    },
    phuphan: [[102.35, 17.15], [102.9, 17.0], [103.5, 16.85], [104.1, 16.65], [104.6, 16.45]],   // indicative line only
    phusang: [102.3, 17.0],   // indicative only — the script gives no coordinates
  };
})();

function mapView(lon0, lon1, lat0, lat1, x, y, w, h) { return { lon0, lon1, lat0, lat1, x, y, w, h }; }
function proj(v, p) { return [v.x + (p[0] - v.lon0) / (v.lon1 - v.lon0) * v.w, v.y + (v.lat1 - p[1]) / (v.lat1 - v.lat0) * v.h]; }

/* old-paper map of Isan */
function drawIsanMap(c, v, t, o = {}) {
  const pts = a => a.map(p => proj(v, p));
  c.save();
  c.fillStyle = '#7fb2b8'; c.fillRect(-2000, -2000, 6000, 6000);                         // Mekong / sea tone
  ink(c, P.poly(pts(GEO.laos)), '#c9b98f', '#b3a379', { lw: 6 });
  ink(c, P.poly(pts(GEO.cambodia)), '#c9b98f', '#b3a379', { lw: 6 });
  ink(c, P.poly(pts(GEO.thailand)), '#e8d6a6', '#cdb983', { lw: 8, dx: -10, dy: -10 });
  c.save(); c.globalAlpha = 0.18;                                                          // paper fibres
  for (let i = 0; i < 60; i++) line(c, [[E.hash(i) * W * 1.4 - 200, E.hash(i * 3) * H], [E.hash(i) * W * 1.4 - 120, E.hash(i * 3) * H + 6]], '#6b5636', 3);
  c.restore();
  const lk = o.labels ?? 1;
  if (lk > 0) {
    const [lx, ly] = proj(v, [104.3, 18.6]); txt(c, 'ลาว', lx, ly, 46, { alpha: lk * 0.8 });
    const [ix, iy] = proj(v, [103.6, 15.4]); txt(c, 'ภาคอีสาน', ix, iy, 54, { alpha: lk });
  }
  c.restore();
}

function townDot(c, v, key, label, k, dir = 1, col = '#3a2a1a') {
  if (k <= 0) return;
  const [x, y] = proj(v, GEO.places[key]), s = E.outBack(E.clamp(k));
  ink(c, P.ell(x, y, 13 * s, 13 * s), col, null, { lw: 5, stroke: '#ffffff' });
  txt(c, label, x + dir * 24, y, 34, { align: dir > 0 ? 'left' : 'right', alpha: E.clamp(k * 2 - 0.6) });
}

/* indicative zone blob: grows with k, always labelled "approximate" by the scenes */
function zoneBlob(c, v, center, rDeg, k, t, col = 'rgba(196,58,40,0.35)') {
  if (k <= 0) return;
  const [cx, cy] = proj(v, center), r = rDeg / (v.lon1 - v.lon0) * v.w * E.out(E.clamp(k));
  const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, rr = r * (0.82 + 0.25 * E.hash(i * 4.2)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.85]); }
  ink(c, P.smooth(pts), col, null, { lw: 0 });
  c.save(); c.lineDashOffset = -t * 30; c.setLineDash([16, 12]); c.beginPath(); P.smooth(pts)(c); c.strokeStyle = '#a3241a'; c.lineWidth = 6; c.stroke(); c.restore();
}

function mountainSymbols(c, v, line_, k) {   // little hand-drawn peaks along the Phu Phan line
  const n = 9;
  for (let i = 0; i < n; i++) {
    if (i / n > k) break;
    const f = i / (n - 1), seg = f * (line_.length - 1), a = line_[Math.floor(seg)], b = line_[Math.min(line_.length - 1, Math.floor(seg) + 1)], u = seg % 1;
    const [x, y] = proj(v, [E.lerp(a[0], b[0], u), E.lerp(a[1], b[1], u)]);
    ink(c, P.poly([[x - 30, y + 14], [x, y - 30], [x + 30, y + 14]]), '#6f8f4e', '#55733a', { lw: 5 });
  }
}
