/* ============================================================
   engine.js — drawing toolkit for the hand-drawn comic look
   (thick ink outlines, cel shading, parallax, camera, text)
   Everything is a pure function of time → frame-exact & seekable.
   ============================================================ */
'use strict';

const W = 1080, H = 1920, FPS = 30;
const INK = '#17120e';
const FONT = 'Kanit, "Noto Sans Thai", Tahoma, sans-serif';

/* ---------- math / easing ---------- */
const E = {
  clamp: (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  seg: (t, a, b) => E.clamp((t - a) / (b - a)),
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  hash: n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); },
  noise: x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return E.lerp(E.hash(i), E.hash(i + 1), u) * 2 - 1; },
  /* hand-drawn "line boil": changes 8 times a second like cel animation */
  boil: (t, seed, amt = 1) => (E.hash(Math.floor(t * 8) * 13.1 + seed) - 0.5) * amt,
};

/* ---------- path builders: each returns (ctx) => void ---------- */
const P = {
  ell: (x, y, rx, ry, r = 0) => c => c.ellipse(x, y, Math.abs(rx), Math.abs(ry), r, 0, Math.PI * 2),
  rect: (x, y, w, h) => c => c.rect(x, y, w, h),
  rr: (x, y, w, h, r) => c => c.roundRect(x, y, w, h, r),
  poly: pts => c => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); },
  /* closed smooth shape through midpoints (rounded, organic) */
  smooth: pts => c => {
    const n = pts.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = m(pts[n - 1], pts[0]); c.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], q = m(p, pts[(i + 1) % n]); c.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
    c.closePath();
  },
};

/* ---------- ink: fill + cel shade + thick outline ----------
   shade colour shows as a crescent on the lower-right (light from top-left) */
function ink(c, path, fill, shade, o = {}) {
  const lw = o.lw ?? 8;
  c.save();
  c.beginPath(); path(c);
  if (shade) {
    c.save(); c.clip();
    c.fillStyle = shade; c.fill();
    c.translate(o.dx ?? -12, o.dy ?? -10);
    c.beginPath(); path(c); c.fillStyle = fill; c.fill();
    if (o.hi) { c.translate(-10, -10); c.globalAlpha = 0.35; c.beginPath(); path(c); c.fillStyle = o.hi; c.fill(); }
    c.restore();
    c.beginPath(); path(c);
  } else if (fill) { c.fillStyle = fill; c.fill(); }
  if (lw > 0) { c.lineWidth = lw; c.strokeStyle = o.stroke || INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  c.restore();
}

/* thick inked stroke (limbs, cables, struts) */
function limb(c, pts, col, w, lw = 7) {
  const path = () => {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 3) c.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    else for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  };
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  path(); c.strokeStyle = INK; c.lineWidth = w + lw * 2; c.stroke();
  path(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  c.restore();
}

function line(c, pts, col = INK, w = 6, dash = null) {
  c.save(); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
  if (dash) c.setLineDash(dash);
  c.stroke(); c.restore();
}

/* union of circles with ONE outer outline (clouds, foliage, smoke, dust) */
function blobs(c, circles, fill, shade, o = {}) {
  const lw = o.lw ?? 8, a = o.alpha ?? 1;
  if (!circles.length) return;
  c.save(); c.globalAlpha = a;
  if (lw > 0) {
    c.fillStyle = o.stroke || INK; c.beginPath();
    for (const [x, y, r] of circles) { c.moveTo(x + r + lw, y); c.arc(x, y, r + lw, 0, Math.PI * 2); }
    c.fill();
  }
  c.beginPath();
  for (const [x, y, r] of circles) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); }
  if (shade) {
    c.save(); c.clip(); c.fillStyle = shade; c.fillRect(-4000, -4000, 9000, 9000);
    c.translate(o.dx ?? -10, o.dy ?? -12); c.beginPath();
    for (const [x, y, r] of circles) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); }
    c.fillStyle = fill; c.fill(); c.restore();
  } else { c.fillStyle = fill; c.fill(); }
  c.restore();
}

/* ---------- text ---------- */
function setFont(c, size, weight = 700) { c.font = `${weight} ${size}px ${FONT}`; }
function txt(c, s, x, y, size, o = {}) {
  c.save(); setFont(c, size, o.weight || 700);
  c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'middle';
  if (o.alpha != null) c.globalAlpha = o.alpha;
  if (o.stroke !== false) {
    c.lineJoin = 'round'; c.lineWidth = o.sw || size * 0.2; c.strokeStyle = o.strokeCol || INK; c.strokeText(s, x, y);
  }
  c.fillStyle = o.col || '#fff'; c.fillText(s, x, y); c.restore();
}

/* comic caption box (yellow narration box with drop shadow) */
function caption(c, s, x, y, o = {}) {
  const size = o.size || 44, pad = o.pad || 26;
  c.save(); setFont(c, size, 700);
  const lines = String(s).split('\n');
  const w = Math.max(...lines.map(l => c.measureText(l).width)) + pad * 2;
  const h = lines.length * size * 1.3 + pad * 1.2;
  const k = o.k ?? 1;
  c.translate(x, y); c.rotate(o.rot || 0); c.scale(k, k);
  ink(c, P.rect(-w / 2 + 12, -h / 2 + 14, w, h), INK, null, { lw: 0 });
  ink(c, P.rect(-w / 2, -h / 2, w, h), o.bg || '#ffd84a', null, { lw: 7 });
  c.fillStyle = o.col || INK; c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((l, i) => c.fillText(l, 0, (i - (lines.length - 1) / 2) * size * 1.3 + 2));
  c.restore();
}

/* rubber stamp ("ลับ" / "CONFIDENTIAL" look) */
function stamp(c, s, x, y, k, rot, col = '#d62828', size = 110) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.rotate(rot); const sc = E.lerp(2.2, 1, E.out(Math.min(1, k))); c.scale(sc, sc);
  c.globalAlpha = Math.min(1, k * 2) * 0.92;
  setFont(c, size, 700); const w = c.measureText(s).width + 70, h = size * 1.45;
  c.strokeStyle = col; c.lineWidth = 12; c.strokeRect(-w / 2, -h / 2, w, h);
  c.lineWidth = 4; c.strokeRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28);
  c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, 6);
  c.restore();
}

/* ---------- camera ---------- */
function camera(c, cam, fn) {
  c.save(); c.translate(W / 2, H / 2); c.rotate(cam.r || 0); c.scale(cam.z || 1, cam.z || 1);
  c.translate(-(cam.x ?? W / 2), -(cam.y ?? H / 2)); fn(); c.restore();
}
const camPt = (cam, x, y) => [(x - (cam.x ?? W / 2)) * (cam.z || 1) + W / 2, (y - (cam.y ?? H / 2)) * (cam.z || 1) + H / 2];

/* ---------- environment pieces ---------- */
function skyGrad(c, stops, y0 = 0, y1 = H) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  c.fillStyle = g; c.fillRect(-50, y0 - 50, W + 100, y1 - y0 + 100);
}

function cloud(c, x, y, s, fill = '#ffffff', shade = '#cfe0ee') {
  blobs(c, [[x, y, 60 * s], [x + 70 * s, y - 25 * s, 75 * s], [x + 150 * s, y, 58 * s], [x + 75 * s, y + 18 * s, 60 * s]], fill, shade, { lw: 7 });
}

/* mountain ridge across the frame; karst = tall limestone towers (Laos) */
function ridge(c, o) {
  const { seed = 1, base = 1200, amp = 200, off = 0, col, shade, karst = false, step = 30, lw = 8 } = o;
  const pts = [];
  for (let x = -120; x <= W + 120; x += step) {
    const u = (x + off) / 260;
    let y;
    if (karst) {
      const tw = Math.pow(Math.max(0, Math.sin(u * 2.1 + seed) * 0.5 + 0.5 + E.noise(u * 1.7 + seed * 3) * 0.35), 0.55);
      y = base - amp * tw - amp * 0.15 * E.noise(u * 5 + seed);
    } else y = base - amp * (0.55 + 0.45 * E.noise(u + seed)) - amp * 0.25 * E.noise(u * 3.1 + seed * 2);
    pts.push([x, y]);
  }
  pts.push([W + 120, H + 200], [-120, H + 200]);
  ink(c, P.poly(pts), col, shade, { lw, dx: -18, dy: -14 });
}

function jungle(c, y, off, seed, col, shade, size = 70, gap = 85) {
  const circ = [];
  for (let i = -2; i < W / gap + 3; i++) {
    const k = i + Math.floor(off / gap);
    const x = k * gap - off;
    const r = size * (0.75 + 0.5 * E.hash(k * 3.3 + seed));
    circ.push([x, y - r * 0.4 * E.hash(k + seed), r]);
  }
  blobs(c, circ, col, shade, { lw: 7 });
  c.fillStyle = col; c.fillRect(-60, y + 12, W + 120, H);          // solid canopy below the crowns
}

function dust(c, x, y, k, seed = 1, col = '#d9b98a', shade = '#b89466') {
  if (k <= 0 || k >= 1) return;
  const circ = [];
  for (let i = 0; i < 7; i++) {
    const a = E.hash(i + seed) * Math.PI - Math.PI;
    const d = 30 + 150 * E.out(k) * (0.5 + E.hash(i * 7 + seed));
    circ.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.45, (18 + 40 * E.out(k)) * (0.6 + E.hash(i * 3 + seed))]);
  }
  blobs(c, circ, col, shade, { lw: 6, alpha: 1 - k });
}

function smokeColumn(c, x, y, t, col, shade, h = 420, seed = 2) {
  const circ = [];
  for (let i = 0; i < 9; i++) {
    const f = ((i / 9) + t * 0.22) % 1;
    circ.push([x + Math.sin(f * 6 + t + seed) * 40 * f + f * 80, y - f * h, 22 + 55 * f]);
  }
  blobs(c, circ, col, shade, { lw: 6, alpha: 0.9 });
}

/* ---------- post: paper grain + halftone + vignette ---------- */
const FX = (() => {
  const mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
  const grain = mk(256, 256); { const g = grain.getContext('2d'), d = g.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 120; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); }
  const dots = mk(14, 14); { const g = dots.getContext('2d'); g.fillStyle = '#000'; g.beginPath(); g.arc(7, 7, 2.2, 0, Math.PI * 2); g.fill(); }
  let gp = null, dp = null;
  return {
    apply(c, t) {
      gp = gp || c.createPattern(grain, 'repeat'); dp = dp || c.createPattern(dots, 'repeat');
      c.save();
      c.globalAlpha = 0.06; c.globalCompositeOperation = 'overlay';
      const k = Math.floor(t * 12); c.translate((k * 37) % 256, (k * 91) % 256);
      c.fillStyle = gp; c.fillRect(-256, -256, W + 512, H + 512);
      c.restore();
      c.save(); c.globalAlpha = 0.045; c.globalCompositeOperation = 'multiply'; c.fillStyle = dp; c.fillRect(0, 0, W, H); c.restore();
      const v = c.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,10,0,0.38)');
      c.fillStyle = v; c.fillRect(0, 0, W, H);
    },
  };
})();
