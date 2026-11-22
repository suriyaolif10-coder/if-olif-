/* ============================================================
   scenes3d.js — 9 scenes in 3D cartoon (+ outro), timed to the voice
   · every scene builds its own THREE.Scene once (lazy)
   · the camera NEVER stops: all camera moves use mv(), which keeps
     a non-zero speed from the first frame to the last
   · cameras travel into each set to show details (faces, radio,
     truck wheel, station door, forest hut, stupa)
   · text overlays are 2D (engine.js) on top of the 3D frame
   ============================================================ */
'use strict';

/* cut points (seconds on the timeline) — set from the pauses in voiceover.mp3 (0.5 s lead-in).
   Adjust here if the voice-over is replaced. */
const CUTS = [0, 9.28, 17.05, 25.63, 36.35, 50.58, 60.51, 75.10, 85.68, 98.5];
const OUTRO_LEN = 5.5;

const mv = p => 0.55 * p + 0.45 * E.sine(E.clamp(p));          // always moving (never zero velocity)
const V = (a, b, k) => a.map((v, i) => E.lerp(v, b[i], k));
function curve(points) { const c = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))); return k => c.getPoint(E.clamp(k)).toArray(); }

function filmLook(c, t, sepia = 0.3) {
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(150,105,55,${sepia})`; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-over'; c.fillStyle = `rgba(255,240,210,${0.04 + 0.04 * E.hash(Math.floor(t * 12))})`; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) { const x = E.hash(Math.floor(t * 10) * 7 + i) * W; if (E.hash(Math.floor(t * 10) + i * 3) > 0.5) line(c, [[x, 0], [x + 10, H]], 'rgba(40,25,10,0.22)', 2); }
  c.restore();
}

/* ---------- 3D set builders ---------- */
const SETS = {};
function getSet(id) { if (!SETS[id]) SETS[id] = BUILD[id](); return SETS[id]; }

const BUILD = {
  forest() {
    const s = new THREE.Scene(); s.background = skyTex(['#22394a', '#4d6f73', '#d99a5c']); s.fog = new THREE.Fog('#5d7f7c', 18, 90);
    lightRig(s, { sky: 0xb8d4e0, ground: 0x2f4a36, hemi: 0.8, sun: 0xffc48a, sunI: 2.4, sunPos: [-12, 9, -8], shadowSize: 12 });
    ground(s, '#3f6a45');
    [[-30, -50, 18, 26, '#3e5f5a'], [10, -60, 22, 30, '#36564f'], [40, -45, 16, 22, '#3e5f5a'], [-50, -30, 14, 18, '#34544c']].forEach(([x, z, r, h, c], i) => s.add(mountain(x, z, r, h, c, i)));
    const trees = forest(s, 130, { x0: -24, x1: 24, z0: -30, z1: 44 }, '#3c6e47', 3, (x, z) => Math.abs(x) < 3.6 && z > -4);
    const clouds = [cloud3d(-14, 22, -40, 2.2), cloud3d(10, 25, -55, 2.6), cloud3d(26, 20, -35, 1.8)]; clouds.forEach(c => s.add(c));
    const mist = mistLayer(s, 26, { x0: -30, x1: 30, z0: -30, z1: 30 }, 3, 10, 0.5);
    const rock = toon(G.ico(1.4, 0), '#7d7a70', { outline: 0.03 }); rock.scale.set(1.4, 0.4, 1.1); at(rock, 0, 0.15, 0); s.add(rock);
    const hero = makeChar('narrator', { seed: 1 }); hero.position.set(0, 0.5, 0); s.add(hero);
    return { scene: s, update(t) { trees.forEach(tr => tr.userData.sway(t)); clouds.forEach((c, i) => (c.position.x += 0.0)); clouds.forEach((c, i) => (c.position.x = [-14, 10, 26][i] + t * 0.8)); mist(t); hero.userData.update(t, { pose: 'wonder', expr: 'curious', look: -0.2 }); } };
  },
  map(growFrom = 0.55, growTo = 0.55) {
    const s = new THREE.Scene(); s.background = skyTex(['#1b1712', '#2e261c']); s.fog = new THREE.Fog('#1b1712', 30, 70);
    lightRig(s, { sky: 0xffe2b8, ground: 0x2a2018, hemi: 0.55, sun: 0xffe0b0, sunI: 2.6, sunPos: [6, 16, 8], shadowSize: 12 });
    ground(s, '#2b231b');
    s.add(at(toon(G.box(18, 0.8, 18), '#6b4a2d', { outline: 0.01 }), 0, -0.4, 0));                       // table
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshToonMaterial({ map: mapTexture(), gradientMap: TOON_RAMP }));
    paper.rotation.x = -Math.PI / 2; paper.position.y = 0.02; paper.receiveShadow = true; s.add(paper);
    const [zx, zz] = mapToWorld(GEO.phusang), [nx, nz] = mapToWorld(GEO.places.nongbua);
    const zone = new THREE.Mesh(G.cyl(1, 1, 0.06, 40), new THREE.MeshBasicMaterial({ color: 0xc43a28, transparent: true, opacity: 0.42 })); zone.position.set(zx, 0.06, zz); s.add(zone);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 48), new THREE.MeshBasicMaterial({ color: 0xa3241a })); ring.rotation.x = -Math.PI / 2; ring.position.set(zx, 0.1, zz); s.add(ring);
    const pin = new THREE.Group(); pin.add(at(toon(G.cone(0.22, 0.7, 16), '#c2362d', { outline: 0.06 }), 0, 0.35, 0, Math.PI)); pin.add(at(toon(G.sph(0.3, 16), '#c2362d', { outline: 0.06 }), 0, 0.85, 0)); pin.position.set(nx, 0, nz); s.add(pin);
    const peaks = GEO.phuphan.flatMap((p, i, a) => i < a.length - 1 ? [0, 0.5].map(u => [E.lerp(p[0], a[i + 1][0], u), E.lerp(p[1], a[i + 1][1], u)]) : [p]).map((ll, i) => {
      const [x, z] = mapToWorld(ll); const m = toon(G.cone(0.45, 0.9, 7), '#6f8f4e', { outline: 0.05 }); m.position.set(x, 0.45, z); s.add(m); return m;
    });
    return { scene: s, zone: [zx, zz], update(t, d = {}) {
      const r = E.lerp(d.from ?? 0.2, d.to ?? 1.1, E.out(E.seg(t, d.z0 ?? 1.0, d.z1 ?? 2.4)));
      zone.scale.set(r, 1, r * 0.85); ring.scale.set(r, r * 0.85, 1); zone.material.opacity = 0.34 + 0.12 * Math.sin(t * 4);
      const pk = E.outBack(E.seg(t, d.p0 ?? 0.3, (d.p0 ?? 0.3) + 0.5)); pin.scale.setScalar(Math.max(0.001, pk)); pin.position.y = Math.sin(t * 3) * 0.08;
      peaks.forEach((m, i) => m.scale.setScalar(Math.max(0.001, E.outBack(E.seg(t, (d.m0 ?? 1.4) + i * 0.12, (d.m0 ?? 1.4) + i * 0.12 + 0.4)))));
    } };
  },
  village() {
    const s = new THREE.Scene(); s.background = skyTex(['#9cc9d6', '#e9dfb9']); s.fog = new THREE.Fog('#d8d2b0', 25, 80);
    lightRig(s, { sky: 0xe8f0ff, ground: 0x7a7a4a, hemi: 0.9, sun: 0xfff0d0, sunI: 2.3, sunPos: [10, 14, 8], shadowSize: 14 });
    ground(s, '#a8b468');
    s.add(stiltHouse3d(-1.5, -2.5, 0.15)); s.add(stiltHouse3d(7, -7, -0.3, '#8d6038', '#64432a'));
    forest(s, 30, { x0: -30, x1: 30, z0: -30, z1: -12 }, '#5b8a4e', 7);
    for (let i = 0; i < 12; i++) s.add(at(toon(G.box(3.4, 0.12, 2.2), '#c8d47a', { outline: 0.02 }), -16 + (i % 6) * 3.8, 0.06, 6 + Math.floor(i / 6) * 2.6));   // paddies
    const v1 = makeChar('villager', { seed: 1 }), v2 = makeChar('villager', { seed: 2, hat: false }), v3 = makeChar('villager', { seed: 3 });
    at(v1, -2.2, 0, 1.8, 0, 0.5); at(v2, -0.9, 0, 2.6, 0, -0.1); at(v3, 0.4, 0, 1.6, 0, -0.6); s.add(v1, v2, v3);
    const table = new THREE.Group(); table.add(at(toon(G.box(1.2, 0.08, 0.8), '#7a5232', { outline: 0.05 }), 0, 0.8, 0));
    for (const [x, z] of [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]]) table.add(at(toon(G.box(0.07, 0.8, 0.07), '#6b4a2d', { outline: 0.08 }), x, 0.4, z));
    const radio = new THREE.Group(); radio.add(at(toon(G.box(0.5, 0.32, 0.18), '#9a3b2c', { outline: 0.05 }), 0, 0, 0));
    radio.add(at(toon(G.cyl(0.1, 0.1, 0.02, 20), '#d8cba8', { outline: 0.08 }), -0.1, 0, 0.1, Math.PI / 2));
    radio.add(at(toon(G.cyl(0.008, 0.008, 0.5, 6), '#c9ccd0', { outline: 0.2 }), 0.18, 0.35, 0, 0, 0, -0.4));
    at(radio, -0.2, 1.0, 0); table.add(radio);
    const paperTex = canvasTex(256, 320, (c) => { c.fillStyle = '#efe6cf'; c.fillRect(0, 0, 256, 320); c.fillStyle = '#3a332a'; c.fillRect(16, 16, 224, 30); c.fillStyle = '#9b917c'; for (let i = 0; i < 12; i++) c.fillRect(16, 60 + i * 20, 224 - (i % 3) * 30, 8); });
    const news = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), new THREE.MeshToonMaterial({ map: paperTex, gradientMap: TOON_RAMP })); news.rotation.set(-Math.PI / 2, 0, 0.3); news.position.set(0.3, 0.85, 0.05); news.receiveShadow = true; table.add(news);
    at(table, 2.2, 0, 1.4, 0, -0.3); s.add(table);
    return { scene: s, radio, update(t) {
      v1.userData.update(t, { pose: 'talk', talk: true, expr: 'worried', look: 0.6 }); v2.userData.update(t, { pose: 'arms', expr: 'serious', look: -0.3 }); v3.userData.update(t, { expr: 'worried', look: -0.8 });
      radio.rotation.y = Math.sin(t * 2) * 0.03;
    } };
  },
  road() {
    const s = new THREE.Scene(); s.background = skyTex(['#86c6e8', '#f3e2a8']); s.fog = new THREE.Fog('#e8dcae', 25, 90);
    lightRig(s, { sky: 0xeaf4ff, ground: 0x8a7a4a, hemi: 0.9, sun: 0xfff0c8, sunI: 2.5, sunPos: [6, 16, 10], shadowSize: 16 });
    ground(s, '#b7c46b');
    const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 3.4), toonMat('#c49762')); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.02, 0); road.receiveShadow = true; s.add(road);
    const gravel = new THREE.Mesh(new THREE.PlaneGeometry(60, 3.4), toonMat('#9a948a')); gravel.rotation.x = -Math.PI / 2; gravel.position.set(-35, 0.03, 0); gravel.receiveShadow = true; s.add(gravel);
    forest(s, 40, { x0: -40, x1: 40, z0: -40, z1: -10 }, '#6f9a58', 4);
    [[-30, -70, 20, 18], [20, -80, 26, 22]].forEach(([x, z, r, h], i) => s.add(mountain(x, z, r, h, '#8fae73', i + 4)));
    const tr = truck3d(); s.add(tr);
    const w1 = makeChar('villager', { seed: 2 }), w2 = makeChar('villager', { seed: 5 }), pl = makeChar('villager', { seed: 6, hat: false }), g1 = makeChar('villager', { seed: 7 }), g2 = makeChar('villager', { seed: 8, hat: false });
    at(w1, 3.5, 0, -2.5, 0, 0.2); at(w2, 4.9, 0, -2.8, 0, -0.2); at(pl, 7.0, 0, -2.4, 0, 0.3); at(g1, 9.3, 0, -3.0, 0, 0.7); at(g2, 10.4, 0, -2.6, 0, -0.7); s.add(w1, w2, pl, g1, g2);
    const plan = toon(G.box(0.7, 0.45, 0.02), '#e9e2c6', { outline: 0.05 }); at(plan, 0, 1.15, 0.45, -0.5); pl.add(plan);
    const sign = new THREE.Group(); sign.add(at(toon(G.cyl(0.06, 0.06, 2, 8), '#7a5232', { outline: 0.1 }), 0, 1, 0));
    sign.add(at(toon(G.box(1.8, 0.6, 0.06), null, { mat: new THREE.MeshToonMaterial({ gradientMap: TOON_RAMP, map: canvasTex(512, 170, (c) => { c.fillStyle = '#fbf4dc'; c.fillRect(0, 0, 512, 170); c.fillStyle = '#3a2a1a'; c.font = `700 52px ${FONT}`; c.textAlign = 'center'; c.fillText('← อุดรธานี', 256, 70); c.fillText('หนองบัวลำภู →', 256, 140); }) }), outline: 0.04 }), 0, 1.9, 0));
    at(sign, -11, 0, 2.6); s.add(sign);
    const dust = mistLayer(s, 10, { x0: -2, x1: 2, z0: -1, z1: 1 }, 0.4, 2, 0.6);
    return { scene: s, truck: tr, update(t) {
      tr.position.set(-8 + (s.userData.p || 0) * 14, Math.sin(t * 40) * 0.01, -0.2); tr.userData.wheels.forEach(w => (w.rotation.y = -t * 7));
      w1.userData.update(t, { pose: 'hoe' }); w2.userData.update(t + 0.4, { pose: 'hoe' }); pl.userData.update(t, { pose: 'plan', look: 0.4 });
      g1.userData.update(t, { pose: 'talk', talk: true, look: 0.8 }); g2.userData.update(t, { pose: 'arms', expr: 'serious', look: -0.8 });
      dust(t * 3); s.children.filter(c => c.isSprite).forEach((sp, i) => { sp.position.x = tr.position.x - 2.2 - (i % 4) * 0.7 - ((t * 2 + i * 0.3) % 1.4); sp.material.opacity = 0.45 * (1 - ((t * 2 + i * 0.3) % 1.4) / 1.4); });
    } };
  },
  night() {
    const s = new THREE.Scene(); s.background = skyTex(['#070b1e', '#1a2347', '#3a2c4a']); s.fog = new THREE.Fog('#141a30', 20, 70);
    const rig = lightRig(s, { sky: 0x4a5a9a, ground: 0x101420, hemi: 0.35, sun: 0x9fb4ff, sunI: 0.9, sunPos: [-10, 14, 6], shadowSize: 14 });
    ground(s, '#1c2230');
    const st = station3d(true); at(st, 0, 0, -2); s.add(st);
    for (const wx of [-3, -1.6, 1.6, 3]) { const pl = new THREE.PointLight(0xffb050, 6, 7, 1.6); pl.position.set(wx, 1.8, 0.6); s.add(pl); }
    forest(s, 30, { x0: -30, x1: 30, z0: -30, z1: -8 }, '#1f3328', 9);
    [[-25, -50, 18, 16], [22, -55, 22, 20]].forEach(([x, z, r, h], i) => s.add(mountain(x, z, r, h, '#1a2233', i + 7)));
    const moon = new THREE.Mesh(G.sph(2, 20), new THREE.MeshBasicMaterial({ color: 0xf3ecd0 })); moon.position.set(18, 26, -60); s.add(moon);
    const shadows = [0, 1, 2].map(i => { const m = makeChar('member', { seed: i + 2, shade: 0.06 }); s.add(m); return m; });   // distant silhouettes only
    return { scene: s, update(t) {
      shadows.forEach((m, i) => { at(m, -14 + t * 0.55 - i * 1.0, 0, -6.5 - i * 0.4, 0, Math.PI / 2); m.userData.update(t + i * 0.3, { walk: true }); });
      rig.hemi.intensity = 0.35 + 0.03 * Math.sin(t * 5);
    } };
  },
  stronghold() {
    const s = new THREE.Scene(); s.background = skyTex(['#3d5c4f', '#7e9a82', '#c7cfae']); s.fog = new THREE.Fog('#6f8a78', 10, 45);
    lightRig(s, { sky: 0xd6ecd8, ground: 0x2e4430, hemi: 0.75, sun: 0xfff0c8, sunI: 1.9, sunPos: [8, 16, 4], shadowSize: 14 });
    ground(s, '#4f6b3c');
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(80, 2), toonMat('#8a6e48')); trail.rotation.x = -Math.PI / 2; trail.position.y = 0.02; trail.receiveShadow = true; s.add(trail);
    const trees = forest(s, 110, { x0: -30, x1: 30, z0: -25, z1: 22 }, '#3f6b4b', 11, (x, z) => (z > -1.6 && z < 12) || (x > -3 && x < 3 && z < -1 && z > -5));
    for (let i = 0; i < 6; i++) s.add(at(toon(G.cyl(0.28, 0.34, 9, 10), '#4a3a2a', { outline: 0.04 }), -12 + i * 5.2, 4.5, 3.4));   // foreground trunks the camera slides past
    const hut = hut3d(); at(hut, 0, 0, -3.2); s.add(hut);
    const m1 = makeChar('member', { seed: 1 }), m2 = makeChar('member', { seed: 3 }); s.add(m1, m2);
    const mist = mistLayer(s, 20, { x0: -25, x1: 25, z0: -20, z1: 10 }, 1.5, 7, 0.45);
    return { scene: s, update(t) {
      const q = s.userData.p || 0; at(m1, 6 - q * 9, 0, 0.2, 0, -Math.PI / 2); at(m2, 7.4 - q * 9, 0, -0.3, 0, -Math.PI / 2);
      m1.userData.update(t, { walk: true }); m2.userData.update(t + 0.4, { walk: true });
      trees.forEach(tr => tr.userData.sway(t)); mist(t);
    } };
  },
  memory() {
    const s = new THREE.Scene(); s.background = skyTex(['#8cc8ec', '#cfe8f2', '#fdf2d2']); s.fog = new THREE.Fog('#e8eed8', 30, 90);
    lightRig(s, { sky: 0xf4f8ff, ground: 0x6a8a4a, hemi: 0.95, sun: 0xfff2d8, sunI: 2.6, sunPos: [-8, 18, 10], shadowSize: 14 });
    ground(s, '#8fb06a');
    const sp = stupa3d(); at(sp, 0, 0, -3); s.add(sp);
    forest(s, 40, { x0: -30, x1: 30, z0: -30, z1: -10 }, '#5f9a52', 21);
    flowers(s, 70, { x0: -7, x1: 7, z0: 1, z1: 6 }, 3);
    const clouds = [cloud3d(-12, 18, -30, 2.0), cloud3d(14, 20, -40, 2.4)]; clouds.forEach(c => s.add(c));
    const n = makeChar('narrator', { seed: 1 }); s.add(n);
    return { scene: s, update(t) { at(n, 3.2 - t * 0.6, 0, 1.2, 0, -Math.PI / 2 + 0.3); n.userData.update(t, { walk: true, look: 0.8 }); clouds.forEach((c, i) => (c.position.x = [-12, 14][i] + t * 0.6)); } };
  },
  lesson() {
    const s = new THREE.Scene(); s.background = skyTex(['#1d2b55', '#7a4a78', '#f08a4b', '#ffd08a']); s.fog = new THREE.Fog('#c46a5a', 30, 110);
    lightRig(s, { sky: 0xffb08a, ground: 0x2a1f30, hemi: 0.7, sun: 0xffa060, sunI: 2.4, sunPos: [0, 6, -30], target: [0, 0, 0], shadowSize: 14 });
    ground(s, '#3a2f3a');
    [[-30, -60, 20, 24], [0, -70, 26, 30], [30, -60, 22, 22], [-12, -40, 12, 12], [16, -42, 12, 14]].forEach(([x, z, r, h], i) => s.add(mountain(x, z, r, h, i < 3 ? '#4b3a5c' : '#2e2a40', i + 12)));
    const sun = new THREE.Mesh(G.sph(5, 24), new THREE.MeshBasicMaterial({ color: 0xffd08a, fog: false })); sun.position.set(0, 6, -95); s.add(sun);
    const hill = toon(G.sph(4, 20), '#2f2836', { outline: 0.02 }); hill.scale.set(1.4, 0.35, 1.2); at(hill, 0, -0.6, 0); s.add(hill);
    const n = makeChar('narrator', { seed: 5 }); at(n, 0, 0.75, 0, 0, Math.PI); s.add(n);
    return { scene: s, update(t) { n.userData.update(t, { pose: 'idle', look: 0 }); } };
  },
};

/* ---------- cameras (pos, look) — all moving continuously ---------- */
function drawSet(c, id, t, dur, cam, upd) {
  const set = getSet(id); (upd || set.update)(t);
  R3.render(set.scene, cam);
  c.drawImage(R3.canvas, 0, 0);
  return set;
}

const SC = {};
SC.forest = (c, t, d) => {
  const p = mv(t / d);
  drawSet(c, 'forest', t, d, { pos: V([0, 15, 42], [0.5, 2.0, 3.6], p), look: V([0, 4, 0], [0, 2.05, 0], E.clamp(p * 1.2)), roll: Math.sin(t * 0.6) * 0.02 });
  const tk = E.outBack(E.seg(t, 0.2, 0.8));
  if (tk > 0) {
    c.save(); c.translate(540, 300); c.rotate(-0.03); c.scale(tk, tk);
    ink(c, P.rect(-420 + 14, -110 + 16, 840, 220), INK, null, { lw: 0 });
    ink(c, P.rect(-420, -110, 840, 220), '#c2362d', '#9a2a22', { lw: 10, dx: -18, dy: -14 });
    txt(c, 'WHAT IF HISTORY?', 0, -26, 92, { col: '#ffd84a', sw: 16 }); txt(c, 'ภูซาง · หนองบัวลำภู', 0, 62, 50, { col: '#ffffff', sw: 10 });
    c.restore();
  }
};
SC.map = (c, t, d) => {
  const set = getSet('map'), [zx, zz] = set.zone, p = mv(t / d);
  const a = E.lerp(-0.7, 0.5, p), R = E.lerp(15, 3.2, p), h = E.lerp(15, 2.4, p);
  drawSet(c, 'map', t, d, { pos: [zx + Math.sin(a) * R, h, zz + Math.cos(a) * R], look: [zx, 0, zz] }, tt => set.update(tt, { z0: 1.0, z1: 2.4, p0: 0.4, m0: 2.0 }));
  caption(c, 'เขตงานภูซาง · แนวเทือกเขาภูพาน\nบริเวณรอยต่อของหลายจังหวัด', 540, 230, { size: 40, k: E.outBack(E.seg(t, 0.8, 1.4)) });
  txt(c, 'ตำแหน่งและขอบเขตเป็นภาพประกอบโดยประมาณ', 540, 1440, 28, { alpha: E.seg(t, 1.5, 2.0) });
};
SC.village = (c, t, d) => {
  const p = mv(t / d);
  const pos = curve([[-7, 1.7, 8.5], [-1, 1.6, 6.5], [3.6, 1.9, 4.6], [2.9, 1.45, 2.55]])(p);
  const look = curve([[-1, 1.5, 1.6], [-0.6, 1.6, 2], [1.6, 1.2, 1.5], [2.05, 1.02, 1.35]])(p);
  drawSet(c, 'village', t, d, { pos, look });
  filmLook(c, t, 0.28);
  stamp(c, 'พ.ศ. 2500–2510', 540, 260, E.seg(t, 0.3, 0.7), -0.06, '#9a2a22', 80);
};
SC.road = (c, t, d) => {
  const set = getSet('road'), p = mv(t / d), tx = -8 + (t / d) * 14; set.scene.userData.p = t / d;
  const pos = V([tx - 4, 4.2, 11], [tx + 2.0, 1.1, 4.6], p), look = V([tx + 2, 1, 0], [tx + 4.5, 1.1, -2.4], p);
  drawSet(c, 'road', t, d, { pos, look });
  stamp(c, 'พ.ศ. 2504', 800, 380, E.seg(t, 0.2, 0.55), 0.1, '#9a2a22', 78);
  caption(c, 'ถนนสายอุดรธานี – หนองบัวลำภู', 420, 230, { size: 42, k: E.outBack(E.seg(t, 0.5, 1.0)), rot: -0.02 });
};
SC.night = (c, t, d) => {
  const p = mv(t / d);
  drawSet(c, 'night', t, d, { pos: V([-6, 3.4, 16], [0.8, 2.0, 6.8], p), look: V([0, 1.8, -2], [0, 1.6, -1.6], p), roll: Math.sin(t * 0.8) * 0.015 });
  const yk = E.outBack(E.seg(t, 0.1, 0.6));
  if (yk > 0) { txt(c, '2509', 540, 330, 190 * yk, { col: '#ffd84a', sw: 22 }); txt(c, 'พ.ศ.', 540, 190, 54 * yk, { col: '#ffffff' }); }
  caption(c, 'สถานีตำรวจหนองบัวลำภู · ภาพจำลอง', 540, 1380, { size: 32, bg: '#ffffff', k: E.outBack(E.seg(t, 1.0, 1.5)) * (1 - E.seg(t, d * 0.78, d * 0.8)) });
  caption(c, 'มีผู้เสียชีวิต 2 คนในเหตุการณ์นั้น', 540, 1380, { size: 38, bg: '#e9e4da', k: E.outBack(E.seg(t, d * 0.8, d * 0.8 + 0.4)) });
};
SC.stronghold = (c, t, d) => {
  const p = mv(t / d), mx = 6 - (t / d) * 9; getSet('stronghold').scene.userData.p = t / d;
  drawSet(c, 'stronghold', t, d, { pos: V([mx + 3.5, 2.8, 8.5], [mx - 1.0, 2.2, 5.2], p), look: V([mx - 0.5, 1.2, 0], [mx - 2.5, 1.2, -1.5], p) });
  caption(c, 'ป่าลึกของเทือกเขาภูซาง', 380, 230, { size: 42, k: E.outBack(E.seg(t, 0.4, 0.9)), rot: -0.02 });
};
SC.expansion = (c, t, d) => {
  const set = getSet('map'), [zx, zz] = set.zone, p = mv(t / d);
  drawSet(c, 'map', t, d, { pos: [zx - 4 + p * 5, E.lerp(4, 9, p), zz + E.lerp(5, 7, p)], look: [zx, 0, zz] }, tt => set.update(tt + 10, { from: 1.0, to: 2.1, z0: 10.1, z1: 10 + d * 0.8, p0: 0, m0: 0 }));
  const yr = 2515 + Math.floor(E.seg(t, 0.2, d * 0.85) * 3.999);
  txt(c, 'พ.ศ. ' + yr, 540, 300, 110, { col: '#ffd84a', sw: 18 });
  txt(c, 'ภาพประกอบ: ขอบเขตโดยประมาณ ไม่ใช่ข้อมูลแผนที่จริง', 540, 1440, 28);
};
SC.memory = (c, t, d) => {
  const p = mv(t / d), a = E.lerp(-0.5, 0.35, p);
  drawSet(c, 'memory', t, d, { pos: [Math.sin(a) * E.lerp(14, 9, p), E.lerp(2.2, 1.4, p), -3 + Math.cos(a) * E.lerp(14, 9, p)], look: [0, E.lerp(5.5, 6.5, p), -3] });
  caption(c, 'สถูปและพิพิธภัณฑ์เขตงานภูซาง', 540, 230, { size: 42, k: E.outBack(E.seg(t, 0.2, 0.6)) });
  photoSlot(c, 's8_stupa', 540, 860, 560, -0.03, E.seg(t, d * 0.4, d * 0.4 + 0.4) * (1 - E.seg(t, d * 0.9, d * 0.95)));
};
SC.lesson = (c, t, d) => {
  const p = mv(t / d);
  drawSet(c, 'lesson', t, d, { pos: V([0.4, 1.6, 3.2], [0.2, 5.5, 8.5], p), look: V([0, 1.9, 0], [0, 4, -40], p) });
  const ck = E.outBack(E.seg(t, d * 0.72, d * 0.72 + 0.5));
  if (ck > 0) { c.save(); c.translate(540, 420); c.scale(ck, ck); txt(c, 'ประวัติศาสตร์', 0, -60, 100, { col: '#ffd84a', sw: 16 }); txt(c, 'มีไว้ให้เรียนรู้', 0, 60, 84, { col: '#ffffff', sw: 14 }); c.restore(); }
};

/* ---------- outro (2D): channel logo + กดไลก์ กดแชร์ ---------- */
function thumbIcon(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); ink(c, P.rr(-46, -4, 22, 50, 6), '#ffffff', null, { lw: 6 }); ink(c, P.poly([[-18, -4], [-2, -8], [10, -46], [26, -44], [24, -12], [44, -12], [48, 0], [40, 46], [-18, 46]]), '#ffffff', null, { lw: 6 }); c.restore(); }
function shareIcon(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); limb(c, [[-40, 36], [-36, -14], [14, -14]], '#ffffff', 14, 6); ink(c, P.poly([[10, -42], [46, -14], [10, 14]]), '#ffffff', null, { lw: 6 }); c.restore(); }
function bigButton(c, x, y, label, col, icon, k, press) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); const s = E.outBack(E.clamp(k)) * (1 - 0.08 * press); c.scale(s, s);
  ink(c, P.rr(-200 + 12, -78 + 16, 400, 156, 78), INK, null, { lw: 0 });
  ink(c, P.rr(-200, -78, 400, 156, 78), press > 0.01 ? mix(col, '#ffffff', 0.25) : col, mix(col, '#000000', 0.25), { lw: 9, dx: -10, dy: -12 });
  (icon === 'like' ? thumbIcon : shareIcon)(c, -110, 4, 1.05); txt(c, label, 50, 4, 64, { col: '#ffffff', sw: 12 }); c.restore();
}
function burst(c, x, y, k, col) {
  if (k <= 0 || k >= 1) return;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, d = 60 + 220 * E.out(k);
    c.save(); c.globalAlpha = 1 - k; c.translate(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8); c.rotate(a + k * 3);
    const r = i % 2 ? 16 : 24, pts = []; for (let j = 0; j < 10; j++) { const rr = j % 2 ? r * 0.45 : r, aa = j * Math.PI / 5; pts.push([Math.cos(aa) * rr, Math.sin(aa) * rr]); }
    ink(c, P.poly(pts), i % 3 ? col : '#ffd84a', null, { lw: 4 }); c.restore();
  }
  txt(c, '+1', x + 150, y - 120 - 80 * E.out(k), 70, { col: '#ffd84a', alpha: 1 - k });
}
function pointer(c, x, y, press) { c.save(); c.translate(x, y); c.rotate(-0.4); const s = 1 - 0.12 * press; c.scale(s, s); ink(c, P.rr(-16, -4, 32, 96, 16), '#ffe0c2', '#e8bb95', { lw: 7 }); ink(c, P.rr(-40, 60, 104, 104, 36), '#ffe0c2', '#e8bb95', { lw: 7 }); ink(c, P.rect(-46, 150, 116, 40), '#f07b1a', '#c55f0e', { lw: 7 }); c.restore(); }
SC.outro = (c, t) => {
  const g = c.createRadialGradient(540, 760, 80, 540, 900, 1250); g.addColorStop(0, '#1d2c58'); g.addColorStop(1, '#060a16'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.translate(540, 740); c.rotate(t * 0.18);
  for (let i = 0; i < 18; i++) { c.fillStyle = i % 2 ? 'rgba(240,123,26,0.07)' : 'rgba(255,255,255,0.035)'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 1500, i / 18 * Math.PI * 2, (i + 1) / 18 * Math.PI * 2); c.closePath(); c.fill(); }
  c.restore();
  txt(c, 'ขอบคุณที่รับชม', 540, 470, 66, { col: '#ffffff', sw: 12, alpha: E.seg(t, 0.6, 1.0) });
  const lk = E.outBack(E.seg(t, 0.2, 0.8));
  if (lk > 0 && LOGO.complete && LOGO.naturalWidth) {
    c.save(); c.translate(540, 720 + Math.sin(t * 2) * 6); c.rotate(E.boil(t, 3, 0.012) - 0.02); c.scale(lk, lk);
    const w = 960, h = w * LOGO.naturalHeight / LOGO.naturalWidth; c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.roundRect(-w / 2 + 14, -h / 2 + 18, w, h, 38); c.fill();
    c.drawImage(LOGO, -w / 2, -h / 2, w, h); c.restore();
  }
  const L = [300, 1080], S2 = [780, 1080], likePress = t >= 1.9 && t < 2.15 ? 1 : 0, sharePress = t >= 3.0 && t < 3.25 ? 1 : 0;
  bigButton(c, L[0], L[1], 'กดไลก์', '#1f6fd6', 'like', E.seg(t, 0.9, 1.3), likePress);
  bigButton(c, S2[0], S2[1], 'กดแชร์', '#f07b1a', 'share', E.seg(t, 1.1, 1.5), sharePress);
  burst(c, L[0], L[1], E.seg(t, 1.9, 2.8), '#5aa2ff'); burst(c, S2[0], S2[1], E.seg(t, 3.0, 3.9), '#ff9a4a');
  let hx, hy;
  if (t < 1.9) { const k = E.inOut(E.seg(t, 1.2, 1.85)); hx = E.lerp(1000, L[0] + 20, k); hy = E.lerp(1700, L[1] + 10, k); }
  else if (t < 3.0) { const k = E.inOut(E.seg(t, 2.2, 2.95)); hx = E.lerp(L[0] + 20, S2[0] + 20, k); hy = L[1] + 10 - Math.sin(k * Math.PI) * 120; }
  else { const k = E.inOut(E.seg(t, 3.4, 4.2)); hx = E.lerp(S2[0] + 20, 1250, k); hy = E.lerp(S2[1] + 10, 1750, k); }
  if (t > 1.2) pointer(c, hx, hy, likePress || sharePress);
  txt(c, 'แล้วพบกันใหม่ในเรื่องถัดไป', 540, 1300, 48, { col: '#ffd84a', sw: 10, alpha: E.seg(t, 3.6, 4.1) });
  const notes = ['ภาพในคลิปเป็นภาพจำลอง 3 มิติ ไม่ใช่ภาพถ่ายจริง (ยกเว้นภาพที่ติดป้าย "ภาพถ่ายจริง")', 'ตัวละครเป็นตัวละครประกอบ ไม่ได้แทนบุคคลจริง · นำเสนอเพื่อการศึกษา', 'อ้างอิงเนื้อหา: เดอะอีสานเรคคอร์ด (theisaanrecord.co)'];
  notes.forEach((s, i) => txt(c, s, 540, 1640 + i * 46, 27, { col: '#c9c2b4', stroke: false, alpha: E.seg(t, 0.8, 1.4) }));
};

/* ---------- timeline ---------- */
const SCENES = [
  { id: 'forest',     title: 'ป่าที่มีความลับ',            transition: 'fade',  draw: SC.forest,     sfx: [{ at: 0, type: 'wind', dur: 9.3, vol: 0.8 }, { at: 0, type: 'birds', dur: 9.3, vol: 0.8 }, { at: 0.2, type: 'stamp' }] },
  { id: 'map',        title: 'เขตงานภูซาง',                transition: 'iris',  draw: SC.map,        sfx: [{ at: 0.1, type: 'paper' }, { at: 0.4, type: 'pop' }, { at: 1.0, type: 'whoosh', dur: 0.8 }] },
  { id: 'village',    title: 'ยุคความขัดแย้ง',             transition: 'slash', draw: SC.village,    sfx: [{ at: 0, type: 'wind', dur: 8.6, vol: 0.5 }, { at: 0.3, type: 'stamp' }, { at: 5.0, type: 'radio', dur: 3.6, vol: 0.7 }] },
  { id: 'road',       title: 'ถนนปี 2504',                 transition: 'panel', draw: SC.road,       sfx: [{ at: 0, type: 'truck', dur: 10.7, vol: 0.7 }, { at: 0.2, type: 'dig', dur: 10.4, vol: 0.6 }, { at: 0.2, type: 'stamp' }] },
  { id: 'night',      title: 'จุดเปลี่ยนปี 2509',          transition: 'fade',  draw: SC.night,      sfx: [{ at: 0, type: 'clock', dur: 14.2, vol: 0.6 }, { at: 0, type: 'wind', dur: 14.2, vol: 0.6 }, { at: 0.1, type: 'thud' }] },
  { id: 'stronghold', title: 'ป่ากลายเป็นฐานที่มั่น',       transition: 'ink',   draw: SC.stronghold, sfx: [{ at: 0, type: 'insects', dur: 9.9, vol: 0.7 }, { at: 0, type: 'footsteps', dur: 9.9, vol: 0.6 }] },
  { id: 'expansion',  title: 'พ.ศ. 2515–2518',            transition: 'slash', draw: SC.expansion,  sfx: [{ at: 0.1, type: 'paper' }, { at: 4.0, type: 'radio', dur: 6.0, vol: 0.4 }] },
  { id: 'memory',     title: 'ความทรงจำที่ยังอยู่',         transition: 'iris',  draw: SC.memory,     sfx: [{ at: 0, type: 'birds', dur: 10, vol: 0.7 }, { at: 4.3, type: 'pop' }] },
  { id: 'lesson',     title: 'บทเรียนจากอดีต',             transition: 'fade',  draw: SC.lesson,     sfx: [{ at: 0, type: 'wind', dur: 12.8, vol: 0.5 }, { at: 9.2, type: 'stamp', vol: 0.6 }] },
  { id: 'outro',      title: 'ลีฟไง จะใครเล่า',            transition: 'iris',  draw: SC.outro,
    sfx: [{ at: 0.0, type: 'whoosh', dur: 0.7 }, { at: 0.25, type: 'pop' }, { at: 1.9, type: 'pop' }, { at: 1.95, type: 'stamp' }, { at: 3.0, type: 'pop' }, { at: 3.05, type: 'stamp' }] },
];
/* real-time scenes: design length = actual length, draw(c, t) receives (t, dur) */
var DURATION = 0;
function syncScenesToNarration() {
  SCENES.forEach((sc, i) => {
    sc.start = i < CUTS.length ? CUTS[i] : CUTS[CUTS.length - 1];
    sc.dur = i < CUTS.length - 1 ? CUTS[i + 1] - CUTS[i] : OUTRO_LEN;
    sc.design = sc.dur;
    const f = sc.draw; if (!f.__wrapped) { sc.draw = (c, t) => f(c, t, sc.dur); sc.draw.__wrapped = true; }
  });
  DURATION = CUTS[CUTS.length - 1] + OUTRO_LEN; window.DURATION = DURATION;
}
syncScenesToNarration();
