/* ============================================================
   three-kit.js — 3D cartoon toolkit (Three.js, toon shading)
   · R3        : one WebGL renderer + camera (1080×1920), soft shadows
   · toon()    : cel-shaded material (3-step ramp) + black ink outline
   · makeChar(): the recurring cast as 3D cartoon models, with
                 idle / walk / gesture / blink / talk animation
   · props     : trees, mountains, clouds, mist, stilt house, truck,
                 police station, hut, stupa, map table, flowers …
   Every model is a reconstructed illustration, not a real person or place.
   ============================================================ */
'use strict';

const R3 = (() => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 600);
  return {
    renderer, camera, canvas: renderer.domElement,
    /* camera = { pos:[x,y,z], look:[x,y,z], fov } — always called with a moving pose */
    render(scene, cam) {
      camera.position.set(...cam.pos); camera.fov = cam.fov || 38; camera.updateProjectionMatrix();
      camera.lookAt(new THREE.Vector3(...cam.look)); if (cam.roll) camera.rotateZ(cam.roll);
      renderer.render(scene, camera);
    },
  };
})();

/* ---------- materials ---------- */
const TOON_RAMP = (() => {
  const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const _mats = new Map();
function toonMat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!_mats.has(key)) _mats.set(key, new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: TOON_RAMP, ...o }));
  return _mats.get(key);
}
const INK_MAT = new THREE.MeshBasicMaterial({ color: 0x17120e, side: THREE.BackSide });

/* mesh + inverted-hull ink outline; casts & receives shadows */
function toon(geo, color, o = {}) {
  const m = new THREE.Mesh(geo, o.mat || toonMat(color, o.matOpts || {}));
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  if (o.outline !== 0) {
    const ol = new THREE.Mesh(geo, INK_MAT); ol.scale.setScalar(1 + (o.outline ?? 0.05)); ol.castShadow = false; m.add(ol);
  }
  return m;
}
const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  sph: (r, s = 24) => new THREE.SphereGeometry(r, s, Math.round(s * 0.75)),
  cyl: (r1, r2, h, s = 20) => new THREE.CylinderGeometry(r1, r2, h, s),
  cone: (r, h, s = 20) => new THREE.ConeGeometry(r, h, s),
  cap: (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14),
  ico: (r, d = 1) => new THREE.IcosahedronGeometry(r, d),
};
function at(obj, x, y, z, rx = 0, ry = 0, rz = 0) { obj.position.set(x, y, z); obj.rotation.set(rx, ry, rz); return obj; }

/* canvas textures (plaid cloth, paper, gradients) */
function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
const PLAID = canvasTex(64, 64, (g) => { g.fillStyle = '#f3ece0'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#c2362d'; for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 7, 64); g.globalAlpha = 0.65; g.fillRect(0, i, 64, 7); g.globalAlpha = 1; } });
PLAID.wrapS = PLAID.wrapT = THREE.RepeatWrapping;
function skyTex(stops) { return canvasTex(4, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); stops.forEach((s, i) => gr.addColorStop(i / (stops.length - 1), s)); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); }
const MIST_TEX = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(240,244,242,0.9)'); r.addColorStop(1, 'rgba(240,244,242,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });

/* ---------- lighting rig: hemisphere fill + sun with soft shadows ---------- */
function lightRig(scene, o = {}) {
  const hemi = new THREE.HemisphereLight(o.sky || 0xcfe6ff, o.ground || 0x4a5a3a, o.hemi ?? 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(o.sun || 0xfff1d6, o.sunI ?? 2.2);
  sun.position.set(...(o.sunPos || [8, 14, 6])); sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  const s = o.shadowSize || 14; Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 80 });
  sun.target.position.set(...(o.target || [0, 0, 0])); scene.add(sun, sun.target);
  return { hemi, sun };
}

/* ---------- the cast (same models & colours in every scene) ---------- */
const CAST = {
  narrator: { skin: '#e2a77c', top: '#e9a23b', pants: '#3d5a80', shoe: '#f4f4f0', hair: '#1c1410' },
  villager: { skin: '#c98b5c', top: '#2f3f6b', pants: '#2f3f6b', shoe: '#c98b5c', hair: '#15100c', hat: '#e0c27a' },
  member:   { skin: '#d19a6c', top: '#5e6b4a', pants: '#4d5a3c', shoe: '#3a2d22', hair: '#15100c', cap: '#4d5a3c', pack: '#7a5a35' },
  officer:  { skin: '#dca47a', top: '#b8975c', pants: '#a88a52', shoe: '#1d1a18', hair: '#15100c', cap: '#8f7442' },
};

function makeChar(kind, o = {}) {
  const p = { ...CAST[kind], ...(o.colors || {}) }, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const limbPivot = (x, y, r, len, col) => { const pv = new THREE.Group(); pv.position.set(x, y, 0); const m = toon(G.cap(r, len), col, { outline: 0.08 }); m.position.y = -len / 2 - r * 0.6; pv.add(m); body.add(pv); return pv; };
  const legL = limbPivot(-0.1, 0.78, 0.085, 0.55, p.pants), legR = limbPivot(0.1, 0.78, 0.085, 0.55, p.pants);
  for (const lg of [legL, legR]) { const sh = toon(G.box(0.14, 0.08, 0.24), p.shoe, { outline: 0.08 }); sh.position.set(0, -0.72, 0.04); lg.add(sh); }
  const torso = toon(G.cap(0.21, 0.32), p.top, { outline: 0.05 }); torso.position.y = 1.08; torso.scale.set(1, 1, 0.78); body.add(torso);
  const armL = limbPivot(-0.27, 1.3, 0.065, 0.42, kind === 'narrator' ? p.skin : p.top), armR = limbPivot(0.27, 1.3, 0.065, 0.42, kind === 'narrator' ? p.skin : p.top);
  if (kind === 'narrator') {          // short sleeves + pha khao ma over the shoulders
    for (const a of [armL, armR]) { const sl = toon(G.cap(0.08, 0.12), p.top, { outline: 0.06 }); sl.position.y = -0.1; a.add(sl); }
    const sc = toon(G.box(0.5, 0.07, 0.3), null, { mat: new THREE.MeshToonMaterial({ map: PLAID, gradientMap: TOON_RAMP }), outline: 0.06 }); sc.position.set(0, 1.33, 0); body.add(sc);
    const tail = toon(G.box(0.09, 0.4, 0.03), null, { mat: new THREE.MeshToonMaterial({ map: PLAID, gradientMap: TOON_RAMP }), outline: 0.08 }); tail.position.set(0.12, 1.15, 0.17); body.add(tail);
  }
  if (kind === 'villager') { const belt = toon(G.cyl(0.215, 0.215, 0.08), null, { mat: new THREE.MeshToonMaterial({ map: PLAID, gradientMap: TOON_RAMP }), outline: 0.04 }); belt.position.y = 0.86; belt.scale.z = 0.8; body.add(belt); }
  if (kind === 'officer') { const belt = toon(G.cyl(0.22, 0.22, 0.06), '#4a3424', { outline: 0.04 }); belt.position.y = 0.88; belt.scale.z = 0.8; body.add(belt); }
  if (kind === 'member') { const pk = toon(G.box(0.36, 0.42, 0.18), p.pack, { outline: 0.05 }); pk.position.set(0, 1.12, -0.24); body.add(pk); }
  for (const a of [armL, armR]) { const hand = toon(G.sph(0.075, 14), p.skin, { outline: 0.08 }); hand.position.y = -0.58; a.add(hand); }
  // head
  const head = new THREE.Group(); head.position.y = 1.58; body.add(head);
  head.add(toon(G.cap(0.05, 0.08), p.skin, { outline: 0.06 }));                                 // neck
  const skull = toon(G.sph(0.28, 28), p.skin, { outline: 0.035 }); skull.position.y = 0.2; skull.scale.set(1, 1.05, 0.95); head.add(skull);
  for (const sx of [-1, 1]) { const ear = toon(G.sph(0.07, 12), p.skin, { outline: 0.08 }); ear.position.set(sx * 0.27, 0.2, 0); ear.scale.set(0.6, 1, 1); head.add(ear); }
  const nose = toon(G.sph(0.045, 12), p.skin, { outline: 0.08 }); nose.position.set(0, 0.16, 0.27); head.add(nose);
  const eyes = [], pupils = [], brows = [];
  for (const sx of [-1, 1]) {
    const e = toon(G.sph(0.062, 16), '#ffffff', { outline: 0.1, cast: false }); e.position.set(sx * 0.1, 0.25, 0.235); e.scale.set(1, 1.2, 0.6); head.add(e); eyes.push(e);
    const pu = new THREE.Mesh(G.sph(0.032, 12), new THREE.MeshBasicMaterial({ color: 0x17120e })); pu.position.set(0, 0, 0.055); e.add(pu); pupils.push(pu);
    const br = new THREE.Mesh(G.box(0.11, 0.022, 0.02), new THREE.MeshBasicMaterial({ color: 0x17120e })); br.position.set(sx * 0.1, 0.36, 0.25); head.add(br); brows.push(br);
  }
  const mouthOpen = new THREE.Mesh(G.sph(0.05, 12), new THREE.MeshBasicMaterial({ color: 0x7a1a22 })); mouthOpen.position.set(0, 0.07, 0.25); mouthOpen.scale.set(1, 0.2, 0.4); head.add(mouthOpen);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.011, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0x17120e })); smile.position.set(0, 0.09, 0.255); smile.rotation.z = Math.PI; head.add(smile);
  // hair / headgear
  const hairCap = (col, s = 1.04) => { const h = toon(new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), col, { outline: 0.04 }); h.position.y = 0.21; h.scale.set(s, s * 1.05, s * 0.97); h.rotation.x = -0.15; head.add(h); return h; };
  if (kind === 'narrator') { hairCap(p.hair, 1.06); const q = toon(G.box(0.22, 0.08, 0.18), p.hair, { outline: 0.08 }); q.position.set(0.04, 0.5, 0.08); q.rotation.z = -0.3; head.add(q); }
  if (kind === 'villager') { hairCap(p.hair); if (o.hat !== false) { const hat = toon(G.cone(0.5, 0.26, 24), p.hat, { outline: 0.04 }); hat.position.y = 0.52; head.add(hat); } }
  if (kind === 'member') { hairCap(p.cap, 1.07); const brim = toon(G.cyl(0.18, 0.18, 0.025), p.cap, { outline: 0.06 }); brim.position.set(0, 0.36, 0.2); brim.scale.z = 0.7; head.add(brim); }
  if (kind === 'officer') {
    hairCap(p.hair);
    const crown = toon(G.cyl(0.3, 0.27, 0.16), p.cap, { outline: 0.04 }); crown.position.y = 0.5; head.add(crown);
    const brim = toon(G.cyl(0.2, 0.2, 0.025), '#2a231c', { outline: 0.06 }); brim.position.set(0, 0.42, 0.2); brim.scale.z = 0.6; head.add(brim);
    const badge = toon(G.sph(0.04, 10), '#d8c070', { outline: 0.1 }); badge.position.set(0, 0.52, 0.29); head.add(badge);
  }
  if (o.shade) root.traverse(m => { if (m.material && m.material !== INK_MAT && m.material.color) { m.material = m.material.clone(); m.material.color.multiplyScalar(o.shade); } });

  const seed = o.seed || 1;
  /* opts: { walk, pose: idle|point|arms|talk|hoe|plan|wonder, look (-1..1), expr: neutral|worried|serious|curious|smile, talk } */
  root.userData.update = (t, a = {}) => {
    const w = a.walk ? Math.sin(t * 7 + seed) : 0;
    body.position.y = a.walk ? Math.abs(Math.cos(t * 7 + seed)) * 0.04 : 0;
    torso.scale.y = 1 + Math.sin(t * 2.2 + seed) * 0.015;
    legL.rotation.x = w * 0.55; legR.rotation.x = -w * 0.55;
    let la = [w * -0.5, 0.06], ra = [w * 0.5, -0.06];                     // [rot.x, rot.z]
    const pose = a.pose || 'idle';
    if (pose === 'idle') { la = [Math.sin(t * 1.5 + seed) * 0.05, 0.1]; ra = [-Math.sin(t * 1.5 + seed) * 0.05, -0.1]; }
    if (pose === 'point') ra = [-1.45, -0.1 + Math.sin(t * 3) * 0.04];
    if (pose === 'arms') { la = [-1.25, -0.75]; ra = [-1.25, 0.75]; }
    if (pose === 'talk') ra = [-0.9 + Math.sin(t * 3.3) * 0.25, -0.3 + Math.sin(t * 2.1) * 0.15];
    if (pose === 'hoe') { const k = Math.sin(t * 5 + seed); la = [-1.0 - k * 0.6, 0.2]; ra = [-1.0 - k * 0.6, -0.2]; body.rotation.x = 0.12 + k * 0.08; }
    if (pose === 'plan') { la = [-1.2, -0.25]; ra = [-1.2, 0.25]; }
    if (pose === 'wonder') { ra = [-2.2, 0.55]; la = [-0.1, 0.1]; }
    armL.rotation.set(la[0], 0, la[1]); armR.rotation.set(ra[0], 0, ra[1]);
    head.rotation.y = (a.look || 0) * 0.45 + Math.sin(t * 0.7 + seed) * 0.05;
    head.rotation.x = (a.expr === 'worried' || a.expr === 'serious') ? 0.12 : -0.03;
    head.rotation.z = a.expr === 'curious' ? 0.14 : 0;
    const blink = ((t + seed * 1.7) % 3.6) < 0.12;
    eyes.forEach(e => (e.scale.y = blink ? 0.1 : 1.2));
    pupils.forEach(pu => (pu.position.x = (a.look || 0) * 0.02));
    const bAng = { worried: 0.35, serious: -0.3, curious: 0.15 }[a.expr] || 0;
    brows.forEach((b, i) => { b.rotation.z = (i ? -1 : 1) * bAng; b.position.y = a.expr === 'curious' && i ? 0.39 : 0.36; });
    const tk = a.talk ? E.clamp(0.5 + 0.5 * Math.sin(t * 15 + seed) + E.noise(t * 9 + seed) * 0.4) : 0;
    mouthOpen.scale.y = 0.15 + tk * 0.9; mouthOpen.visible = tk > 0.25;
    smile.visible = !mouthOpen.visible; smile.rotation.z = (a.expr === 'worried' || a.expr === 'serious') ? 0 : Math.PI;
    smile.position.y = smile.rotation.z ? 0.09 : 0.04;
  };
  root.userData.update(0);
  return root;
}

/* ---------- environment ---------- */
function ground(scene, col, size = 400) { const g = toon(new THREE.PlaneGeometry(size, size), col, { outline: 0, cast: false }); g.rotation.x = -Math.PI / 2; scene.add(g); return g; }
function tree(x, z, s = 1, col = '#3f7a4c', seed = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  g.add(at(toon(G.cyl(0.18, 0.26, 2.4, 8), '#6b4a2d', { outline: 0.06 }), 0, 1.2, 0));
  const c2 = new THREE.Color(col);
  for (let i = 0; i < 3; i++) {
    const cc = c2.clone().offsetHSL(0, 0, (E.hash(seed * 3 + i) - 0.5) * 0.08);
    g.add(at(toon(G.ico(1.05 - i * 0.18, 1), '#' + cc.getHexString(), { outline: 0.05 }), (E.hash(seed + i) - 0.5) * 0.8, 2.6 + i * 0.75, (E.hash(seed * 2 + i) - 0.5) * 0.6));
  }
  g.userData.sway = (t) => { g.rotation.z = Math.sin(t * 1.3 + seed) * 0.02; };
  return g;
}
function forest(scene, n, area, col, seed = 1, avoid = null) {
  const trees = [];
  for (let i = 0; i < n; i++) {
    const x = area.x0 + E.hash(i * 7.1 + seed) * (area.x1 - area.x0), z = area.z0 + E.hash(i * 3.7 + seed * 2) * (area.z1 - area.z0);
    if (avoid && avoid(x, z)) continue;
    const tr = tree(x, z, 0.8 + E.hash(i * 1.3 + seed) * 0.7, col, i + seed); scene.add(tr); trees.push(tr);
  }
  return trees;
}
function mountain(x, z, r, h, col, seed = 1) {
  const geo = new THREE.ConeGeometry(r, h, 9, 4); const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < h / 2 - 0.01) { pos.setX(i, pos.getX(i) * (1 + (E.hash(i + seed) - 0.5) * 0.25)); pos.setZ(i, pos.getZ(i) * (1 + (E.hash(i * 2 + seed) - 0.5) * 0.25)); } }
  geo.computeVertexNormals();
  return at(toon(geo, col, { outline: 0.012 }), x, h / 2 - 0.2, z);
}
function cloud3d(x, y, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s);
  [[0, 0, 0, 1.2], [1.3, -0.2, 0, 0.9], [-1.2, -0.25, 0, 0.85], [0.5, 0.5, 0, 0.8]].forEach(([a, b, c, r]) => g.add(at(toon(G.sph(r, 14), '#fbfbf7', { outline: 0.03, cast: false }), a, b, c)));
  return g;
}
function mistLayer(scene, n, area, y, scale = 8, opacity = 0.55) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: MIST_TEX, transparent: true, opacity, depthWrite: false }));
    sp.scale.set(scale * 1.8, scale * 0.6, 1); sp.position.set(area.x0 + E.hash(i * 5.3) * (area.x1 - area.x0), y + E.hash(i) * 1.2, area.z0 + E.hash(i * 2.9) * (area.z1 - area.z0));
    sp.userData.x0 = sp.position.x; scene.add(sp); list.push(sp);
  }
  return t => list.forEach((sp, i) => { sp.position.x = sp.userData.x0 + Math.sin(t * 0.2 + i) * 2 + t * 0.4; });
}
function stiltHouse3d(x, z, ry = 0, wall = '#9a6a3e', roof = '#6f4a2a', lit = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  for (const px of [-1.6, 1.6]) for (const pz of [-1.1, 1.1]) g.add(at(toon(G.cyl(0.1, 0.1, 1.8, 8), '#7a5232', { outline: 0.06 }), px, 0.9, pz));
  g.add(at(toon(G.box(3.6, 0.15, 2.6), '#7a5232', { outline: 0.03 }), 0, 1.85, 0));
  g.add(at(toon(G.box(3.4, 1.6, 2.4), wall, { outline: 0.025 }), 0, 2.7, 0));
  const roofGeo = new THREE.CylinderGeometry(0.01, 2.6, 1.5, 4, 1); const rf = toon(roofGeo, roof, { outline: 0.03 }); rf.rotation.y = Math.PI / 4; rf.scale.set(1.25, 1, 0.9); at(rf, 0, 4.2, 0, 0, Math.PI / 4); g.add(rf);
  g.add(at(toon(G.box(0.7, 1.1, 0.05), lit ? '#ffcf6b' : '#3b2a1c', { outline: 0.05, matOpts: lit ? { emissive: new THREE.Color('#ffb040'), emissiveIntensity: 0.8 } : {} }), 0, 2.55, 1.22));
  const stair = toon(G.box(0.7, 0.08, 2.0), '#7a5232', { outline: 0.05 }); at(stair, 1.0, 0.9, 1.9, -0.9); g.add(stair);
  return g;
}
function truck3d() {
  const g = new THREE.Group();
  g.add(at(toon(G.box(2.6, 0.9, 1.7), '#c2862f', { outline: 0.03 }), -0.7, 1.25, 0));                    // dump bed
  g.add(at(toon(G.box(1.3, 1.3, 1.7), '#3f7d6b', { outline: 0.03 }), 1.3, 1.45, 0));                     // cab
  g.add(at(toon(G.box(0.05, 0.6, 1.4), '#a9d6e4', { outline: 0.05 }), 1.96, 1.7, 0));                    // windscreen
  g.add(at(toon(G.box(3.9, 0.25, 1.5), '#3a3530', { outline: 0.03 }), 0, 0.7, 0));
  const wheels = [];
  for (const wx of [-1.2, 1.3]) for (const wz of [-0.85, 0.85]) { const wh = toon(G.cyl(0.45, 0.45, 0.3, 18), '#2a2622', { outline: 0.05 }); at(wh, wx, 0.45, wz, Math.PI / 2); g.add(wh); wheels.push(wh); }
  g.userData.wheels = wheels;
  return g;
}
function station3d(lit = true) {
  const g = new THREE.Group();
  g.add(at(toon(G.box(8, 3.2, 4), '#5a5f74', { outline: 0.02 }), 0, 1.6, 0));
  const rf = toon(new THREE.CylinderGeometry(0.01, 5.6, 2, 4, 1), '#3a3346', { outline: 0.02 }); rf.scale.set(1.0, 1, 0.55); at(rf, 0, 4.2, 0, 0, Math.PI / 4); g.add(rf);
  const winMat = { emissive: new THREE.Color('#ffb040'), emissiveIntensity: lit ? 1.4 : 0 };
  for (const wx of [-3, -1.6, 1.6, 3]) g.add(at(toon(G.box(0.9, 1.1, 0.06), lit ? '#ffd36b' : '#2a2c38', { outline: 0.04, matOpts: winMat }), wx, 1.8, 2.02));
  g.add(at(toon(G.box(1.2, 2.2, 0.06), '#2a2430', { outline: 0.04 }), 0, 1.1, 2.02));
  const sign = toon(G.box(4, 0.6, 0.08), null, { mat: new THREE.MeshToonMaterial({ gradientMap: TOON_RAMP, map: canvasTex(512, 80, (c) => { c.fillStyle = '#e8e2d0'; c.fillRect(0, 0, 512, 80); c.fillStyle = '#2a2430'; c.font = `700 52px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('สถานีตำรวจ', 256, 42); }) }), outline: 0.03 });
  g.add(at(sign, 0, 2.85, 2.06));
  return g;
}
function hut3d() {
  const g = new THREE.Group();
  for (const px of [-1.3, 1.3]) for (const pz of [-1, 1]) g.add(at(toon(G.cyl(0.08, 0.08, 1.9, 6), '#6b4a2d', { outline: 0.08 }), px, 0.95, pz));
  g.add(at(toon(G.box(2.8, 0.12, 2.2), '#7a5232', { outline: 0.04 }), 0, 0.7, 0));
  const rf = toon(new THREE.CylinderGeometry(0.01, 2.3, 1.2, 4, 1), '#b99a5a', { outline: 0.03 }); rf.scale.set(1.15, 1, 0.95); at(rf, 0, 2.45, 0, 0, Math.PI / 4); g.add(rf);
  return g;
}
function stupa3d() {   // shaped after the real Phu Sang stupa photo: square base, stacked white pyramid, slender spire, finial
  const g = new THREE.Group(), white = '#f4f2ec', gold = '#d9a93a';
  g.add(at(toon(G.box(5.2, 0.45, 5.2), white, { outline: 0.02 }), 0, 0.22, 0));
  g.add(at(toon(G.box(4.4, 2.0, 4.4), white, { outline: 0.02 }), 0, 1.45, 0));
  for (const sx of [-1.3, 0, 1.3]) g.add(at(toon(G.box(0.95, 0.42, 0.05), '#2f2a24', { outline: 0.05 }), sx, 2.0, 2.23));
  g.add(at(toon(G.box(0.8, 1.2, 0.06), '#f7efd8', { outline: 0.05 }), 0, 1.0, 2.23));
  g.add(at(toon(G.box(5.0, 0.22, 5.0), gold, { outline: 0.02 }), 0, 2.55, 0));
  const pyr = (r1, r2, h, y) => { const m = toon(new THREE.CylinderGeometry(r1, r2, h, 4, 1), white, { outline: 0.02 }); at(m, 0, y, 0, 0, Math.PI / 4); g.add(m); };
  pyr(1.7, 3.3, 2.6, 3.96); g.add(at(toon(new THREE.CylinderGeometry(1.85, 1.85, 0.16, 4, 1), gold, { outline: 0.03 }), 0, 5.33, 0, 0, Math.PI / 4));
  pyr(0.85, 1.65, 1.9, 6.36); g.add(at(toon(new THREE.CylinderGeometry(0.95, 0.95, 0.14, 4, 1), gold, { outline: 0.04 }), 0, 7.38, 0, 0, Math.PI / 4));
  pyr(0.08, 0.8, 3.2, 9.05);
  g.add(at(toon(G.cyl(0.05, 0.05, 0.6, 8), '#8d8a84', { outline: 0.1 }), 0, 10.9, 0));
  const fin = toon(new THREE.TorusGeometry(0.55, 0.06, 6, 20, Math.PI * 0.8), '#8d8a84', { outline: 0.1 }); at(fin, 0, 11.7, 0, 0, 0, Math.PI * 1.1); g.add(fin);
  return g;
}
function flowers(scene, n, area, seed = 1) {
  const cols = ['#f4d35e', '#ee964b', '#f95738', '#ffffff', '#e86fa0'];
  for (let i = 0; i < n; i++) {
    const x = area.x0 + E.hash(i * 3.3 + seed) * (area.x1 - area.x0), z = area.z0 + E.hash(i * 5.1 + seed) * (area.z1 - area.z0);
    scene.add(at(toon(G.cyl(0.02, 0.02, 0.4, 5), '#3f7a3a', { outline: 0 }), x, 0.2, z));
    scene.add(at(toon(G.sph(0.12, 10), cols[i % cols.length], { outline: 0.1 }), x, 0.42, z));
  }
}

/* map table: Isan map painted (with the 2D map kit) onto a paper plane */
function mapTexture(t) {
  return canvasTex(1600, 1600, (c) => {
    const v = mapView(100.6, 105.9, 14.3, 19.6, 0, 0, 1600, 1600);
    drawIsanMap(c, v, 0, { labels: 1 });
    townDot(c, v, 'udon', 'อุดรธานี', 1, 1); townDot(c, v, 'loei', 'เลย', 1, -1); townDot(c, v, 'khonkaen', 'ขอนแก่น', 1, 1); townDot(c, v, 'sakon', 'สกลนคร', 1, 1);
    townDot(c, v, 'nongbua', 'หนองบัวลำภู', 1, 1, '#c2362d');
    const [px, py] = proj(v, [103.6, 16.5]); txt(c, 'เทือกเขาภูพาน (แนวโดยประมาณ)', px, py + 80, 34);
    txt(c, 'แผนที่โดยประมาณ เพื่อประกอบการอธิบาย', 800, 1540, 34);
  });
}
const MAPV = mapView(100.6, 105.9, 14.3, 19.6, -8, -8, 16, 16);   // map → world (x, z) on a 16×16 table
function mapToWorld(lonlat) { const [x, y] = proj(MAPV, lonlat); return [x, y]; }
