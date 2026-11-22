/* ============================================================
   assets.js — editable scene assets
   · PAL      : the fixed colour palette for every character
   · person() : the recurring cast (same costume & proportions in every scene)
   · aircraft : 1960s types — F-4 / RF-4C Phantom II, Pilatus PC-6 Porter,
                Fairchild C-123 Provider, Sikorsky H-34, Bell UH-1 "Huey"
   · map      : simplified Indochina map (shapes are approximate, for illustration)
   All drawings are illustrations, not reproductions of real photographs.
   ============================================================ */
'use strict';

/* channel logo for the outro (assets/logo.png) */
const LOGO = new Image();
LOGO.src = 'assets/logo.png';

/* ---------------- the cast ----------------
   crew   : USAF ground crew chief, olive-drab 1960s utility uniform + OD cap
   pilot  : Air America pilot — civilian short-sleeve shirt, khaki trousers, aviator sunglasses
   mech   : Thai civilian aircraft mechanic, blue coveralls, white towel
   airman : downed US aircrew in sage-green flight suit + white flight helmet          */
const PAL = {
  crew:   { skin: '#e8b088', skinS: '#c98a62', top: '#5d6b37', topS: '#46522a', pants: '#5d6b37', pantsS: '#46522a', hair: '#6b4426', cap: '#58662f', capS: '#414c22', shoe: '#2b211b', sleeve: 'skin' },
  pilot:  { skin: '#f0c29a', skinS: '#cf9870', top: '#eef3f6', topS: '#b9c9d6', pants: '#c8ab76', pantsS: '#a4874f', hair: '#3a281b', shoe: '#4a3324', sleeve: 'skin' },
  mech:   { skin: '#c98d5e', skinS: '#a76f45', top: '#3c6fa0', topS: '#2c5479', pants: '#3c6fa0', pantsS: '#2c5479', hair: '#18120e', shoe: '#2b211b', sleeve: 'top' },
  airman: { skin: '#eab48c', skinS: '#c78c64', top: '#7f8a5c', topS: '#646d45', pants: '#7f8a5c', pantsS: '#646d45', hair: '#8a5a2b', helmet: '#f2f2ea', helmetS: '#c9c9be', shoe: '#2b211b', sleeve: 'top' },
};

const POSES = {
  idle:    t => ({ r: [0.16 + Math.sin(t * 2) * 0.03, -0.12], l: [0.16 - Math.sin(t * 2) * 0.03, -0.12] }),
  wave:    t => ({ r: [2.65, -0.4 + Math.sin(t * 11) * 0.45], l: [0.18, -0.1] }),
  marshal: t => ({ r: [2.35 + Math.sin(t * 4) * 0.45, 0.35], l: [2.35 + Math.sin(t * 4) * 0.45, 0.35], wands: true }),
  point:   t => ({ r: [1.5 + Math.sin(t * 3) * 0.05, -0.05], l: [0.18, -0.1] }),
  talk:    t => ({ r: [0.75 + Math.sin(t * 3.1) * 0.25, -1.25 + Math.sin(t * 4.3) * 0.2], l: [0.18, -0.1] }),
  clip:    t => ({ r: [0.75 + Math.sin(t * 3.1) * 0.2, -1.2], l: [0.35, -1.75], clip: true }),
  wrench:  t => ({ r: [2.0, -0.7 + Math.sin(t * 9) * 0.35], l: [0.2, -0.1], wrench: true }),
};

function person(c, kind, o) {
  const p = PAL[kind], s = o.s || 1, t = o.t || 0, seed = o.seed || 1;
  const pose = (POSES[o.pose || 'idle'] || POSES.idle)(t + seed);
  c.save(); c.translate(o.x, o.y); c.scale(o.flip ? -s : s, s);
  c.rotate(E.boil(t, seed, 0.012));
  const br = Math.sin(t * 2.2 + seed) * 4;
  const walk = o.walk ? Math.sin(t * 8 + seed) : 0;
  const bob = o.walk ? Math.abs(Math.cos(t * 8 + seed)) * -8 : 0;
  c.translate(0, bob);
  // legs + shoes
  limb(c, [[-30, -250], [-30 - walk * 18, -130], [-32 - walk * 34, -16]], p.pants, 52);
  limb(c, [[30, -250], [30 + walk * 18, -130], [32 + walk * 34, -16]], p.pants, 52);
  ink(c, P.ell(-44 - walk * 34, -10, 42, 20), p.shoe, null, { lw: 6 });
  ink(c, P.ell(44 + walk * 34, -10, 42, 20), p.shoe, null, { lw: 6 });
  // torso
  ink(c, P.rr(-86, -455 + br, 172, 220 - br, 48), p.top, p.topS, { dx: -18, dy: -8 });
  torsoDetail(c, kind, p, br);
  // arms (behind-ish arm first)
  arm(c, -1, pose.l, p, br, pose, t);
  arm(c, 1, pose.r, p, br, pose, t);
  headDraw(c, kind, p, t, o, br, seed);
  c.restore();
}

function torsoDetail(c, kind, p, br) {
  if (kind === 'crew') {
    ink(c, P.rect(-86, -262, 172, 22), '#3c3324', null, { lw: 5 });             // web belt
    ink(c, P.rect(20, -405 + br, 50, 16), '#e9e2c9', null, { lw: 3 });           // name tape
    ink(c, P.rect(-70, -405 + br, 50, 16), '#e9e2c9', null, { lw: 3 });
    txt(c, 'U.S. AIR FORCE', -45, -397 + br, 8, { col: INK, stroke: false });
    ink(c, P.rr(-70, -385 + br, 46, 50, 6), p.top, p.topS, { lw: 4, dx: -4, dy: -4 }); // pockets
    ink(c, P.rr(24, -385 + br, 46, 50, 6), p.top, p.topS, { lw: 4, dx: -4, dy: -4 });
  } else if (kind === 'pilot') {
    line(c, [[0, -450 + br], [0, -250]], '#9fb2c0', 4);
    ink(c, P.rr(18, -400 + br, 46, 46, 6), p.top, p.topS, { lw: 4, dx: -4, dy: -4 });
    limb(c, [[-20, -300], [10, -300]], '#7a5f3a', 3, 2);
    ink(c, P.rect(-86, -262, 172, 20), '#6b4a2d', null, { lw: 5 });
    ink(c, P.rect(-12, -264, 24, 24), '#d6b35a', null, { lw: 4 });
  } else if (kind === 'mech') {
    line(c, [[0, -450 + br], [0, -260]], '#2a4b6d', 5);
    blobs(c, [[-50, -440 + br, 26], [50, -440 + br, 26], [0, -448 + br, 26]], '#f7f7f0', '#d3d3c8', { lw: 5 });   // towel
    ink(c, P.rr(-70, -330, 50, 44, 6), p.top, p.topS, { lw: 4, dx: -4, dy: -4 });
  } else if (kind === 'airman') {
    ink(c, P.rect(-86, -275, 172, 18), '#55603c', null, { lw: 5 });
    ink(c, P.rr(-72, -420 + br, 50, 70, 8), p.top, p.topS, { lw: 4, dx: -4, dy: -4 });
    ink(c, P.rr(-30, -360, 60, 36, 6), '#f08a24', '#c86a12', { lw: 4 });          // survival-vest pouch
  }
}

function arm(c, side, ang, p, br, pose, t) {
  const [a1, a2] = ang, sx = side * 82, sy = -428 + br, L1 = 105, L2 = 98;
  const ex = sx + side * Math.sin(a1) * L1, ey = sy + Math.cos(a1) * L1;
  const a = a1 + a2, hx = ex + side * Math.sin(a) * L2, hy = ey + Math.cos(a) * L2;
  limb(c, [[sx, sy], [ex, ey]], p.top, 46);
  limb(c, [[ex, ey], [hx, hy]], p.sleeve === 'top' ? p.top : p.skin, 36);
  if (pose.wands) limb(c, [[hx, hy], [hx + side * Math.sin(a) * 90, hy + Math.cos(a) * 90]], '#ff7a1a', 16, 5);
  if (pose.wrench && side === 1) {
    c.save(); c.translate(hx, hy); c.rotate(-a * side + Math.PI / 2);
    ink(c, P.rr(-8, -90, 16, 90, 6), '#b9c2c8', '#8b959c', { lw: 5 });
    ink(c, P.ell(0, -96, 22, 18), '#b9c2c8', '#8b959c', { lw: 5 });
    c.restore();
  }
  if (pose.clip && side === -1) {
    ink(c, P.rr(hx - 10, hy - 70, 92, 120, 8), '#9b6b3e', '#7c522c', { lw: 6 });
    ink(c, P.rect(hx, hy - 58, 72, 96), '#fbf6e8', null, { lw: 3 });
    for (let k = 0; k < 4; k++) line(c, [[hx + 10, hy - 40 + k * 20], [hx + 60, hy - 40 + k * 20]], '#8a8a8a', 3);
  }
  ink(c, P.ell(hx, hy, 23, 23), p.skin, p.skinS, { lw: 6, dx: -6, dy: -6 });
}

function headDraw(c, kind, p, t, o, br, seed) {
  const hy = -545 + br, look = o.look ?? 0;
  ink(c, P.rect(-24, hy + 60, 48, 50), p.skin, p.skinS, { lw: 6 });
  ink(c, P.ell(-78, hy + 8, 17, 25), p.skin, p.skinS, { lw: 6, dx: -4, dy: -4 });
  ink(c, P.ell(78, hy + 8, 17, 25), p.skin, p.skinS, { lw: 6, dx: -4, dy: -4 });
  const face = P.smooth([[0, hy - 94], [64, hy - 80], [84, hy - 8], [66, hy + 62], [0, hy + 94], [-66, hy + 62], [-84, hy - 8], [-64, hy - 80]]);
  ink(c, face, p.skin, p.skinS, { dx: -18, dy: -10 });

  // hair / headgear (back part)
  if (kind === 'pilot') {
    ink(c, P.smooth([[-80, hy - 20], [-78, hy - 80], [-20, hy - 112], [60, hy - 100], [86, hy - 40], [70, hy - 50], [20, hy - 74], [-40, hy - 62]]), p.hair, '#22170f', { lw: 7 });
  } else if (kind === 'mech') {
    const spikes = []; for (let k = 0; k < 9; k++) spikes.push([-80 + k * 20, hy - 70 - (k % 2) * 34 - 20], [-70 + k * 20, hy - 60]);
    ink(c, P.poly([[-84, hy - 10], ...spikes, [86, hy - 10], [70, hy - 50], [-70, hy - 50]]), p.hair, null, { lw: 7 });
  } else if (kind === 'crew') {
    ink(c, P.rect(-82, hy - 40, 164, 26), p.hair, null, { lw: 6 });
  }

  // eyes / brows
  const blink = ((t + seed * 1.7) % 3.7) < 0.12;
  const ex = 30, ey = hy - 4;
  const ex_ = o.expr || 'neutral';
  if (kind !== 'pilot') {
    for (const sx of [-1, 1]) {
      if (blink) line(c, [[sx * ex - 14, ey], [sx * ex + 14, ey]], INK, 6);
      else {
        ink(c, P.ell(sx * ex, ey, 15, 19), '#ffffff', null, { lw: 4 });
        ink(c, P.ell(sx * ex + look * 6, ey + 3, 7, 9), INK, null, { lw: 0 });
        ink(c, P.ell(sx * ex + look * 6 + 2, ey - 1, 2.5, 2.5), '#ffffff', null, { lw: 0 });
      }
    }
  } else {   // aviator sunglasses
    for (const sx of [-1, 1]) ink(c, P.smooth([[sx * 8, ey - 18], [sx * 52, ey - 20], [sx * 54, ey + 6], [sx * 32, ey + 22], [sx * 10, ey + 4]]), '#2b3b47', '#1a252e', { lw: 5 });
    line(c, [[-10, ey - 14], [10, ey - 14]], INK, 5);
    const g = (t * 0.6 + seed) % 3; if (g < 0.5) line(c, [[-44 + g * 60, ey - 12], [-34 + g * 60, ey + 2]], '#ffffff', 5);
  }
  const bAng = ex_ === 'worried' ? 0.25 : ex_ === 'serious' ? -0.2 : 0;
  for (const sx of [-1, 1]) {
    c.save(); c.translate(sx * ex, ey - 34); c.rotate(sx * bAng);
    line(c, [[-16, 0], [16, -3]], kind === 'pilot' ? p.hair : INK, 7); c.restore();
  }
  // nose
  c.save(); c.beginPath(); c.moveTo(2, hy + 14); c.quadraticCurveTo(14, hy + 34, -2, hy + 38);
  c.strokeStyle = INK; c.lineWidth = 5; c.lineCap = 'round'; c.stroke(); c.restore();
  // mouth: talking = open/close driven by a noisy 12-16 Hz flap
  const talk = o.talk ? E.clamp(0.5 + 0.5 * Math.sin(t * 15 + seed) + E.noise(t * 9 + seed) * 0.4) : 0;
  if (talk > 0.25) {
    ink(c, P.ell(0, hy + 60, 22, 8 + talk * 16), '#8c1d24', null, { lw: 5 });
    ink(c, P.ell(0, hy + 66 + talk * 6, 12, 5), '#e9727c', null, { lw: 0 });
  } else {
    c.save(); c.beginPath();
    if (ex_ === 'worried') c.arc(0, hy + 72, 20, Math.PI * 1.15, Math.PI * 1.85);
    else c.arc(0, hy + 46, 24, Math.PI * 0.2, Math.PI * 0.8);
    c.strokeStyle = INK; c.lineWidth = 6; c.lineCap = 'round'; c.stroke(); c.restore();
  }
  // front headgear
  if (kind === 'crew') {
    ink(c, P.smooth([[-84, hy - 34], [-80, hy - 92], [0, hy - 122], [80, hy - 92], [84, hy - 34], [0, hy - 44]]), p.cap, p.capS, { lw: 7 });
    ink(c, P.ell(0, hy - 36, 96, 16), p.cap, p.capS, { lw: 7, dx: 0, dy: -6 });
  } else if (kind === 'airman') {
    ink(c, P.smooth([[-94, hy + 20], [-96, hy - 70], [0, hy - 132], [96, hy - 70], [94, hy + 20], [80, hy + 24], [74, hy - 30], [0, hy - 64], [-74, hy - 30], [-80, hy + 24]]), p.helmet, p.helmetS, { lw: 7 });
    ink(c, P.rr(-60, hy - 96, 120, 26, 10), '#3a4250', null, { lw: 5 });                    // visor (up)
  }
}

/* ---------------- aircraft (side view, nose = +x) ---------------- */
const AC = {
  star(c, x, y, s) {      // US national insignia (star-and-bar)
    c.save(); c.translate(x, y); c.scale(s, s);
    ink(c, P.rect(-58, -12, 116, 24), '#ffffff', null, { lw: 3 });
    ink(c, P.rect(-58, -5, 116, 10), '#b22234', null, { lw: 0 });
    ink(c, P.ell(0, 0, 26, 26), '#1f3a7a', null, { lw: 3 });
    const st = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 9 : 22, a = -Math.PI / 2 + i * Math.PI / 5; st.push([Math.cos(a) * r, Math.sin(a) * r]); }
    ink(c, P.poly(st), '#ffffff', null, { lw: 0 });
    c.restore();
  },
  prop(c, x, y, r, t, rpm = 1) {   // propeller blur disc + flicker blades
    c.save(); c.globalAlpha = 0.3 * rpm; ink(c, P.ell(x, y, r * 0.12, r), '#d9e2ea', null, { lw: 3 }); c.restore();
    const a = t * 60 * rpm;
    for (let k = 0; k < 3; k++) { const yy = Math.sin(a + k * 2.1) * r; line(c, [[x, y], [x + 4, y + yy]], 'rgba(30,25,20,' + (0.25 + 0.5 * (1 - rpm)) + ')', 9); }
    ink(c, P.ell(x, y, 10, 14), '#5a5f63', null, { lw: 4 });
  },
  rotor(c, x, y, R, t, blades = 2, speed = 1) {
    c.save(); c.globalAlpha = 0.22; ink(c, P.ell(x, y, R, R * 0.07), '#cfd8de', null, { lw: 0 }); c.restore();
    for (let b = 0; b < blades; b++) {
      const a = t * 22 * speed + b * Math.PI * 2 / blades;
      for (let k = 0; k < 3; k++) {
        const aa = a - k * 0.12, bx = Math.cos(aa) * R, by = Math.sin(aa) * R * 0.07;
        c.save(); c.globalAlpha = k ? 0.25 : 1;
        line(c, [[x, y], [x + bx, y + by]], k ? '#3a3a3a' : INK, 10); c.restore();
      }
    }
    ink(c, P.rr(x - 16, y - 10, 32, 22, 6), '#4a4f54', null, { lw: 4 });
  },
};

function aircraft(c, type, o) {
  c.save(); c.translate(o.x, o.y); c.rotate(o.rot || 0); c.scale((o.flip ? -1 : 1) * (o.s || 1), o.s || 1);
  c.rotate(E.boil(o.t || 0, o.seed || 3, 0.006));
  ({ f4: drawF4, porter: drawPorter, c123: drawC123, huey: drawHuey, h34: drawH34 })[type](c, o, o.t || 0);
  c.restore();
}

function drawF4(c, o, t) {
  const rf = !!o.rf, nx = rf ? 345 : 310;
  const body = c2 => { c2.moveTo(nx, 6); c2.quadraticCurveTo(255, -24, 170, -28); c2.lineTo(40, -34); c2.lineTo(-230, -30);
    c2.lineTo(-300, -24); c2.lineTo(-318, -6); c2.lineTo(-318, 16); c2.lineTo(-210, 28); c2.lineTo(0, 34); c2.quadraticCurveTo(210, 30, nx, 6); c2.closePath(); };
  const fin = P.poly([[-175, -30], [-258, -142], [-302, -144], [-302, -26]]);
  if (o.burner) {     // afterburner
    const fl = 1 + E.noise(t * 30) * 0.15;
    ink(c, P.poly([[-318, -14], [-318 - 170 * fl, 4], [-318, 22]]), '#ffb02e', null, { lw: 0 });
    ink(c, P.poly([[-318, -6], [-318 - 90 * fl, 4], [-318, 14]]), '#fff3b0', null, { lw: 0 });
  }
  if (o.gear) {
    limb(c, [[180, 26], [182, 76]], '#9aa0a4', 8, 4); ink(c, P.ell(182, 82, 16, 16), '#2a2a2a', null, { lw: 4 });
    limb(c, [[-60, 30], [-62, 76]], '#9aa0a4', 10, 4); ink(c, P.ell(-62, 84, 22, 22), '#2a2a2a', null, { lw: 4 });
  }
  ink(c, P.poly([[-240, 4], [-320, 32], [-348, 34], [-272, -2]]), '#7e8460', '#5b6045', { lw: 6 });   // stabilator (anhedral)
  // SEA camouflage: tan / two greens, light grey underside
  const camo = () => {
    c.save(); c.beginPath(); body(c); fin(c); c.clip();
    c.fillStyle = '#b0915e'; c.fillRect(-400, -200, 800, 300);
    ink(c, P.smooth([[200, -40], [80, -50], [-20, -10], [60, 10], [180, 0]]), '#69754a', null, { lw: 0 });
    ink(c, P.smooth([[-30, -40], [-160, -40], [-260, -20], [-200, 0], [-80, 0]]), '#3f4a30', null, { lw: 0 });
    ink(c, P.smooth([[-200, -150], [-310, -150], [-300, -60], [-230, -70]]), '#69754a', null, { lw: 0 });
    c.fillStyle = '#d6d8cf'; c.fillRect(-400, 16, 800, 40);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(-400, 20, 800, 40);
    c.restore();
  };
  camo();
  ink(c, body, 'rgba(0,0,0,0)', null, { lw: 8 }); ink(c, fin, 'rgba(0,0,0,0)', null, { lw: 8 });
  ink(c, P.poly([[118, -14], [58, -18], [58, 22], [108, 20]]), '#3d413b', null, { lw: 5 });     // intake
  ink(c, P.poly([[70, 12], [-120, 16], [-176, 30], [-118, 31], [62, 24]]), '#8e8a62', '#6d6a4a', { lw: 6 });  // wing
  ink(c, (c2 => { c2.moveTo(170, -27); c2.quadraticCurveTo(120, -72, 36, -64); c2.lineTo(6, -34); c2.closePath(); }), '#8fd0e8', '#4f8fa8', { lw: 6, dx: -6, dy: -6 });
  line(c, [[96, -60], [92, -32]], INK, 5);
  ink(c, P.ell(-322, 4, 9, 17), '#2f2f2f', null, { lw: 4 });
  if (rf) { ink(c, P.rr(232, -2, 22, 14, 3), '#26333a', null, { lw: 3 }); ink(c, P.rr(196, 4, 22, 14, 3), '#26333a', null, { lw: 3 }); }
  AC.star(c, -110, -4, 0.42);
  txt(c, 'U.S. AIR FORCE', 0, -14, 13, { col: INK, stroke: false });
}

function drawPorter(c, o, t) {
  const body = P.poly([[228, -6], [216, -26], [130, -30], [98, -54], [-24, -58], [-205, -26], [-236, -6], [-120, 14], [60, 24], [200, 14]]);
  ink(c, P.poly([[-170, -28], [-214, -122], [-246, -120], [-240, -8]]), '#f2f4f2', '#c9ced2', { lw: 7 });
  ink(c, P.poly([[-186, -12], [-262, -18], [-262, -4], [-190, -2]]), '#f2f4f2', '#c9ced2', { lw: 6 });
  if (o.gear !== false) {
    limb(c, [[40, 18], [64, 68]], '#9aa0a4', 8, 4); ink(c, P.ell(66, 74, 24, 24), '#2a2a2a', '#111', { lw: 5 });
    limb(c, [[-210, -2], [-220, 20]], '#9aa0a4', 6, 3); ink(c, P.ell(-222, 24, 11, 11), '#2a2a2a', null, { lw: 4 });
  }
  ink(c, body, '#f2f4f2', '#c9ced2', { dx: -10, dy: -12 });
  c.save(); c.beginPath(); body(c); c.clip(); c.fillStyle = '#1f4e8c'; c.fillRect(-300, -6, 600, 12); c.restore();
  ink(c, body, 'rgba(0,0,0,0)', null, { lw: 8 });
  ink(c, P.rr(22, -48, 62, 26, 5), '#8fd0e8', '#4f8fa8', { lw: 5, dx: -4, dy: -4 });
  ink(c, P.rr(-50, -47, 60, 24, 5), '#8fd0e8', '#4f8fa8', { lw: 5, dx: -4, dy: -4 });
  ink(c, P.rr(-64, -76, 196, 20, 6), '#e6e9ea', '#b9bfc4', { lw: 7 });        // high wing
  limb(c, [[60, -60], [24, 16]], '#cfd4d8', 6, 4);
  txt(c, 'AIR AMERICA', -80, 2, 14, { col: '#ffffff', stroke: false });
  AC.prop(c, 236, -6, 74, t, o.rpm ?? 1);
}

function drawC123(c, o, t) {
  const body = c2 => { c2.moveTo(330, 10); c2.quadraticCurveTo(322, -42, 262, -56); c2.lineTo(-120, -66); c2.lineTo(-312, -46);
    c2.lineTo(-322, -28); c2.lineTo(-300, -18); c2.lineTo(-110, 56); c2.lineTo(240, 58); c2.quadraticCurveTo(320, 52, 330, 10); c2.closePath(); };
  ink(c, P.poly([[-196, -60], [-258, -232], [-322, -234], [-320, -42]]), '#c7ccd0', '#9aa1a8', { lw: 7 });
  ink(c, P.poly([[-236, -52], [-352, -60], [-352, -44], [-236, -40]]), '#c7ccd0', '#9aa1a8', { lw: 6 });
  ink(c, body, '#c7ccd0', '#9aa1a8', { dx: -14, dy: -14 });
  if (o.ramp) ink(c, P.poly([[-300, -18], [-200, 20], [-215, 36], [-318, -6]]), '#2a2724', null, { lw: 5 });
  ink(c, P.poly([[300, -30], [272, -50], [232, -52], [236, -30]]), '#8fd0e8', '#4f8fa8', { lw: 5 });
  for (let k = 0; k < 6; k++) ink(c, P.ell(150 - k * 50, -20, 9, 10), '#8fd0e8', null, { lw: 3 });
  ink(c, P.rr(-60, 34, 150, 34, 16), '#b4babf', '#8f969c', { lw: 6 });           // gear pod
  ink(c, P.ell(-10, 72, 20, 20), '#2a2a2a', null, { lw: 4 }); ink(c, P.ell(50, 72, 20, 20), '#2a2a2a', null, { lw: 4 });
  ink(c, P.rr(-90, -88, 320, 22, 8), '#d4d8db', '#a9b0b5', { lw: 7 });           // high wing
  ink(c, P.rr(104, -96, 130, 60, 26), '#b4babf', '#8f969c', { lw: 7 });          // radial engine nacelle
  ink(c, P.ell(232, -66, 12, 28), '#3a3a3a', null, { lw: 4 });
  txt(c, 'AIR AMERICA', 40, -38, 18, { col: '#1f3a7a', stroke: false });
  AC.prop(c, 244, -66, 96, t, o.rpm ?? 1);
}

function drawHuey(c, o, t) {
  const body = c2 => { c2.moveTo(206, 10); c2.quadraticCurveTo(206, -62, 140, -72); c2.lineTo(-40, -76); c2.lineTo(-70, -40);
    c2.lineTo(-330, -30); c2.lineTo(-342, -12); c2.lineTo(-70, 2); c2.lineTo(-40, 42); c2.lineTo(150, 46); c2.quadraticCurveTo(204, 42, 206, 10); c2.closePath(); };
  limb(c, [[-50, 44], [-60, 82]], '#8f969c', 7, 4); limb(c, [[120, 46], [126, 82]], '#8f969c', 7, 4);
  limb(c, [[-110, 84], [180, 84], [206, 66]], '#8f969c', 9, 4);                 // skid
  ink(c, P.poly([[-300, -30], [-346, -112], [-368, -110], [-342, -12]]), '#e9ecee', '#b8bfc4', { lw: 7 });
  ink(c, body, '#e9ecee', '#b8bfc4', { dx: -12, dy: -14 });
  c.save(); c.beginPath(); body(c); c.clip(); c.fillStyle = '#1f4e8c'; c.fillRect(-360, 8, 600, 14); c.restore();
  ink(c, body, 'rgba(0,0,0,0)', null, { lw: 8 });
  ink(c, P.rr(-62, -104, 124, 32, 12), '#d6dadd', '#aab1b6', { lw: 6 });
  ink(c, (c2 => { c2.moveTo(204, 6); c2.quadraticCurveTo(200, -58, 140, -66); c2.lineTo(120, -10); c2.closePath(); }), '#8fd0e8', '#4f8fa8', { lw: 5 });
  ink(c, P.rr(20, -58, 70, 50, 6), '#8fd0e8', '#4f8fa8', { lw: 5 });
  if (o.hoist != null) {
    ink(c, P.rr(-10, -60, 26, 20, 4), '#555', null, { lw: 4 });
    line(c, [[2, -40], [2, -40 + o.hoist]], '#222', 4);
  }
  txt(c, 'AIR AMERICA', -160, -10, 16, { col: '#1f4e8c', stroke: false });
  AC.rotor(c, -360, -108, 42, t * 2.6, 2, 1);
  limb(c, [[0, -104], [0, -122]], '#555', 8, 3);
  AC.rotor(c, 0, -124, 340, t, 2, o.rotor ?? 1);
}

function drawH34(c, o, t) {
  const body = c2 => { c2.moveTo(212, 40); c2.quadraticCurveTo(254, 0, 216, -40); c2.lineTo(172, -72); c2.lineTo(150, -112); c2.lineTo(70, -120);
    c2.lineTo(40, -82); c2.lineTo(-80, -72); c2.lineTo(-330, -44); c2.lineTo(-362, -124); c2.lineTo(-388, -122); c2.lineTo(-372, -22);
    c2.lineTo(-100, 30); c2.lineTo(-40, 58); c2.lineTo(180, 62); c2.closePath(); };
  limb(c, [[130, 58], [132, 92]], '#8f969c', 8, 4); ink(c, P.ell(132, 96, 22, 22), '#2a2a2a', null, { lw: 4 });
  limb(c, [[-260, 10], [-262, 34]], '#8f969c', 6, 3); ink(c, P.ell(-262, 38, 12, 12), '#2a2a2a', null, { lw: 4 });
  ink(c, body, '#dfe3dd', '#adb4ab', { dx: -14, dy: -14 });
  c.save(); c.beginPath(); body(c); c.clip(); c.fillStyle = '#284a7a'; c.fillRect(-400, 30, 700, 40); c.restore();
  ink(c, body, 'rgba(0,0,0,0)', null, { lw: 8 });
  ink(c, P.poly([[150, -108], [74, -114], [60, -88], [150, -82]]), '#8fd0e8', '#4f8fa8', { lw: 5 });
  line(c, [[214, -36], [214, 36]], INK, 4); ink(c, P.ell(232, 0, 8, 26), '#6d7276', null, { lw: 4 });   // engine clamshell doors
  ink(c, P.rr(-20, -56, 60, 50, 6), '#8fd0e8', '#4f8fa8', { lw: 5 });
  txt(c, 'AIR AMERICA', -150, -10, 16, { col: '#284a7a', stroke: false });
  AC.rotor(c, -374, -114, 44, t * 2.4, 4, 1);
  limb(c, [[40, -122], [40, -140]], '#555', 9, 3);
  AC.rotor(c, 40, -142, 300, t * 0.9, 4, 1);
}

/* ---------------- map (approximate outlines, lon/lat) ---------------- */
const GEO = (() => {
  const TL = [[100.1, 20.4], [100.5, 20.15], [100.6, 19.6], [101.2, 19.5], [101.1, 18.4], [101.05, 17.9], [101.7, 17.6], [102.1, 18.2], [102.7, 17.9], [103.0, 18.3], [103.4, 18.4], [104.0, 17.6], [104.75, 16.6], [104.8, 16.0], [105.6, 15.7], [105.5, 14.35]];
  const TC = [[105.5, 14.35], [104.5, 14.4], [103.0, 14.35], [102.4, 13.6], [102.6, 12.6], [102.75, 12.0], [102.9, 11.7]];
  const TCE = [[102.9, 11.7], [102.3, 12.2], [101.7, 12.65], [100.95, 12.65], [100.9, 13.45], [100.5, 13.5], [100.0, 13.35], [99.95, 12.6], [99.8, 11.8], [99.3, 10.8], [99.2, 9.9], [99.9, 9.2], [100.3, 8.4], [100.6, 7.2], [101.3, 6.9], [102.0, 6.2]];
  const TM = [[102.0, 6.2], [101.1, 5.7], [100.4, 6.0], [100.1, 6.5]];
  const TWC = [[100.1, 6.5], [99.7, 7.0], [99.3, 7.6], [98.6, 8.0], [98.3, 8.1], [98.3, 9.0], [98.6, 9.9]];
  const TWL = [[98.75, 10.4], [99.2, 11.0], [99.6, 11.7], [99.2, 12.3], [99.15, 13.0], [98.9, 14.0], [98.5, 14.9], [98.2, 15.1], [98.6, 16.1], [97.8, 17.7], [97.7, 18.5], [98.0, 19.7], [98.9, 19.8], [99.5, 20.15], [100.1, 20.4]];
  const LN = [[100.1, 20.4], [100.5, 21.0], [101.15, 21.55], [101.8, 22.45], [102.15, 22.4]];
  const LV = [[102.15, 22.4], [102.9, 21.7], [103.0, 21.2], [104.0, 20.95], [104.6, 20.55], [104.4, 20.0], [104.9, 19.8], [104.2, 19.5], [105.1, 18.8], [105.6, 18.4], [106.5, 17.5], [106.6, 16.5], [107.3, 16.1], [107.6, 15.4], [107.55, 14.7]];
  const LC = [[107.55, 14.7], [106.8, 14.3], [106.0, 13.95], [105.5, 14.35]];
  const VN = [[102.15, 22.4], [103.0, 22.6], [104.0, 22.8], [105.3, 23.2], [106.6, 22.9], [107.4, 22.0], [108.0, 21.55]];
  const VC = [[108.0, 21.55], [107.0, 20.9], [106.6, 20.2], [106.0, 19.95], [105.7, 19.0], [106.3, 18.2], [107.1, 17.0], [108.2, 16.1], [108.9, 15.2], [109.3, 13.4], [109.2, 12.0], [108.9, 11.3], [108.0, 10.7], [107.0, 10.4], [106.6, 9.6], [105.6, 8.75], [104.8, 8.6], [104.85, 9.6], [104.45, 10.4]];
  const VKC = [[104.45, 10.4], [105.1, 10.95], [106.1, 11.0], [106.4, 11.7], [107.5, 12.3], [107.55, 14.7]];
  const KC = [[102.9, 11.7], [103.1, 11.2], [103.6, 10.5], [104.45, 10.4]];
  const R = a => a.slice().reverse();
  const cat = (...a) => a.flat();
  return {
    shapes: {
      thailand: cat(TL, TC.slice(1), TCE.slice(1), TM.slice(1), TWC.slice(1), TWL),
      laos: cat(LN, LV.slice(1), LC.slice(1), R(TL).slice(1)),
      vietnam: cat(VN, VC.slice(1), VKC.slice(1), R(LV).slice(1)),
      cambodia: cat(KC, VKC.slice(1), LC.slice(1), R(TC).slice(1)),
    },
    seas: [
      cat([[102.0, 6.2]], R(TCE).slice(1), KC.slice(1), R(VC).slice(1), [[109.7, 21.5], [111, 21.6], [114, 22.3], [114, 2], [103.5, 2], [103.4, 4.5], [102.4, 6.0]]),
      cat([[100.1, 6.5], [100.3, 5.4], [100.6, 2.0], [93, 2], [93, 16.2], [97.6, 16.5], [97.9, 15.2], [98.2, 14.0], [98.5, 12.5], [98.6, 10.4]], R(TWC)),
      [[108.6, 19.2], [109.6, 18.2], [110.5, 18.8], [111.0, 19.7], [110.4, 20.1], [109.2, 19.9]].map(p => p),   // Hainan (land) – drawn separately
    ],
    colors: { thailand: ['#f4b942', '#d6962a'], laos: ['#e8644b', '#c24a33'], vietnam: ['#3fa98f', '#2c8571'], cambodia: ['#9cc46b', '#7aa24d'] },
    names: { thailand: ['ไทย', 101.2, 15.6], laos: ['ลาว', 102.6, 20.3], vietnam: ['เวียดนาม', 105.6, 21.6], cambodia: ['กัมพูชา', 104.8, 12.6] },
    places: {
      udorn: [102.79, 17.39], vientiane: [102.6, 17.97], longtieng: [102.9, 19.08], pdj: [103.15, 19.45],
      hanoi: [105.85, 21.03], saigon: [106.7, 10.78], bangkok: [100.5, 13.75],
      korat: [102.08, 14.93], takhli: [100.3, 15.28], ubon: [104.87, 15.25], nkp: [104.64, 17.38], utapao: [101.0, 12.68],
    },
  };
})();

function mapView(lon0, lon1, lat0, lat1, x, y, w, h) { return { lon0, lon1, lat0, lat1, x, y, w, h }; }
function lerpView(a, b, k) { const r = {}; for (const key in a) r[key] = E.lerp(a[key], b[key], k); return r; }
function proj(v, p) { return [v.x + (p[0] - v.lon0) / (v.lon1 - v.lon0) * v.w, v.y + (v.lat1 - p[1]) / (v.lat1 - v.lat0) * v.h]; }

/* o.reveal(name) → 0..1 pop-in, o.dim(name) → 0..1 fade to grey, o.labels → 0..1 */
function drawMap(c, v, t, o = {}) {
  const pts = a => a.map(p => proj(v, p));
  c.save();
  c.fillStyle = '#d8ccae'; c.fillRect(-2000, -2000, 6000, 6000);                         // other land
  c.save(); c.globalAlpha = 0.25;
  for (let i = 0; i < 40; i++) line(c, [[-200 + i * 60, -100], [-600 + i * 60, 2100]], '#b9ab8a', 3);   // hatching
  c.restore();
  for (const sea of GEO.seas.slice(0, 2)) ink(c, P.poly(pts(sea)), '#6cc3ea', null, { lw: 0 });
  ink(c, P.poly(pts(GEO.seas[2])), '#d8ccae', null, { lw: 6 });                             // Hainan
  c.save(); c.globalAlpha = 0.5;                                                                // animated sea waves
  for (let i = 0; i < 14; i++) {
    const p = proj(v, [104 + (i % 5) * 1.6 + Math.sin(t + i) * 0.1, 3.5 + Math.floor(i / 5) * 1.6]);
    const q = proj(v, [94.5 + (i % 3) * 1.2, 6 + Math.floor(i / 3) * 2]);
    for (const [x, y] of [p, q]) { c.beginPath(); c.arc(x, y, 16, Math.PI * 1.1, Math.PI * 1.9); c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.stroke(); }
  }
  c.restore();
  for (const name of ['cambodia', 'vietnam', 'laos', 'thailand']) {
    const k = o.reveal ? o.reveal(name) : 1; if (k <= 0) continue;
    const poly = pts(GEO.shapes[name]);
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const dim = o.dim ? o.dim(name) : 0;
    const [f, s] = GEO.colors[name];
    c.save(); c.translate(cx, cy); c.scale(k, k); c.translate(-cx, -cy);
    ink(c, P.poly(poly), dim ? mix(f, '#cdc3a8', dim) : f, dim ? mix(s, '#b4aa8f', dim) : s, { lw: 7, dx: -10, dy: -10 });
    c.restore();
  }
  if (o.dmz) {   // 17th parallel / DMZ
    const a = proj(v, [106.55, 17.0]), b = proj(v, [107.15, 17.0]);
    line(c, [a, b], '#d62828', 7, [14, 10]);
  }
  const lk = o.labels ?? 1;
  if (lk > 0) for (const name in GEO.names) {
    if (o.reveal && o.reveal(name) < 1) continue;
    const [s, lon, lat] = GEO.names[name], [x, y] = proj(v, [lon, lat]);
    txt(c, s, x, y, o.labelSize || 52, { alpha: lk * (o.dim && o.dim(name) > 0.5 ? 0.45 : 1) });
  }
  c.restore();
}
function mix(a, b, k) {
  const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  return '#' + A.map((v, i) => Math.round(E.lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
}

function pin(c, x, y, k, col = '#d62828', label = '', size = 1, t = 0) {
  if (k <= 0) return;
  const drop = E.outBack(E.clamp(k)); c.save(); c.translate(x, y - (1 - drop) * 140); c.scale(size, size);
  const pulse = (t * 0.8) % 1;
  c.save(); c.globalAlpha = (1 - pulse) * 0.6; ink(c, P.ell(0, 0, 20 + pulse * 70, (20 + pulse * 70) * 0.45), 'rgba(0,0,0,0)', null, { lw: 6, stroke: col }); c.restore();
  ink(c, P.smooth([[0, 4], [-30, -50], [-26, -86], [0, -100], [26, -86], [30, -50]]), col, mix(col, '#000000', 0.3), { lw: 7, dx: -6, dy: -6 });
  ink(c, P.ell(0, -66, 12, 12), '#ffffff', null, { lw: 5 });
  c.restore();
  if (label) txt(c, label, x, y + 44, 40 * size, { alpha: E.clamp(k * 2 - 1) });
}

function dot(c, x, y, k, label, col = '#1f3a7a', dir = 1) {
  if (k <= 0) return;
  const s = E.outBack(E.clamp(k));
  ink(c, P.ell(x, y, 15 * s, 15 * s), col, null, { lw: 6, stroke: '#ffffff' });
  if (label) txt(c, label, x + dir * 26, y, 34, { align: dir > 0 ? 'left' : 'right', alpha: E.clamp(k * 2 - 0.6) });
}
