/* ============================================================
   layers.js — "flat Thai cartoon" look (from the reference clip)
   · background is drawn without characters/text, then blurred
     (depth of field); characters + text are drawn sharp on top
   · optional blurred foreground (a head close to the lens)
   · slight camera tilt per scene
   · flat colours: cel-shading is switched off
   Per-scene settings: SCENE_LOOK[id] = { blur, tilt, front(c, t) }
   ============================================================ */
'use strict';

var LAYER = 'all', FG = 0;
window.FLAT_INK = true;

/* things that stay sharp (drawn in the foreground pass) */
for (const name of ['txt', 'caption', 'stamp', 'person', 'photoSlot', 'newspaper', 'radio', 'zoneBlob', 'townDot', 'sharp']) {
  const f = window[name]; if (typeof f !== 'function') continue;
  window[name] = function (...a) { if (LAYER === 'bg') return; FG++; try { return f.apply(this, a); } finally { FG--; } };
}
/* bigger, closer characters like the reference (feet stay where the scene put them) */
const CHAR_SCALE = 1.45;
{ const f = window.person; window.person = function (c, kind, o) { return f.call(this, c, kind, { ...o, s: (o.s || 1) * CHAR_SCALE }); }; }

function sharp(fn) { if (LAYER === 'bg') return; FG++; try { fn(); } finally { FG--; } }

const DRAW_FNS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'drawImage', 'putImageData']);
const _px = new WeakMap();
function fgProxy(ctx) {
  if (_px.has(ctx)) return _px.get(ctx);
  const px = new Proxy(ctx, {
    get(t, p) { const v = t[p]; if (typeof v !== 'function') return v; return DRAW_FNS.has(p) ? (...a) => (FG > 0 ? v.apply(t, a) : undefined) : v.bind(t); },
    set(t, p, v) { t[p] = v; return true; },
  });
  _px.set(ctx, px); return px;
}

const SCENE_LOOK = {
  forest:     { blur: 7, tilt: -0.03 },
  map:        { blur: 0, tilt: 0.02 },
  village:    { blur: 9, tilt: 0.035, front: (c, t) => backHead(c, 960, 1880, 1.0, 'villager') },
  road:       { blur: 8, tilt: -0.03, front: (c, t) => backHead(c, 120, 1900, 0.9, 'villager') },
  turning:    { blur: 4, tilt: 0.025 },
  stronghold: { blur: 8, tilt: -0.035, front: (c, t) => backHead(c, 980, 1900, 0.95, 'member') },
  expansion:  { blur: 0, tilt: 0.02 },
  memory:     { blur: 7, tilt: -0.025 },
  lesson:     { blur: 4, tilt: 0.02 },
  outro:      { blur: 0, tilt: 0 },
};

const LB1 = (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d'); })();
const LB2 = (() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d'); })();

/* replaces player.js drawScene */
function drawSceneLayered(c, i, t) {
  const sc = SCENES[i], look = SCENE_LOOK[sc.id] || {}, blur = look.blur ?? 6;
  const lt = (t - sc.start) * (sc.design || sc.dur) / sc.dur;
  const reset = g => { g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none'; g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; };
  reset(LB1); LB1.fillStyle = '#000'; LB1.fillRect(0, 0, W, H);
  LAYER = blur > 0 ? 'bg' : 'all'; sc.draw(LB1, lt); LAYER = 'all';
  if (blur > 0) { reset(LB2); LB2.clearRect(0, 0, W, H); LAYER = 'fg'; sc.draw(fgProxy(LB2), lt); LAYER = 'all'; }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const z = 1.07; c.translate(W / 2, H / 2); c.rotate((look.tilt || 0) + Math.sin(t * 0.45) * 0.006); c.scale(z, z); c.translate(-W / 2, -H / 2);
  if (blur > 0) { c.filter = `blur(${blur}px)`; c.drawImage(LB1.canvas, 0, 0); c.filter = 'none'; c.drawImage(LB2.canvas, 0, 0); }
  else c.drawImage(LB1.canvas, 0, 0);
  if (look.front) { reset(LB2); LB2.clearRect(0, 0, W, H); look.front(LB2, lt); c.filter = 'blur(12px)'; c.drawImage(LB2.canvas, 0, 0); c.filter = 'none'; }
  c.restore();
}
