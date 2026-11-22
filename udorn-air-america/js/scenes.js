/* ============================================================
   scenes.js — the 9-scene timeline (EDIT ME)
   Each scene: { id, title, dur, transition, sfx[], draw(ctx, t) }
     t = seconds since the scene started (may run past dur during
         the transition into the next scene).
     transition = how this scene ENTERS: fade | slash | iris | ink | panel
     sfx = [{ at, type, dur, vol }] — types: jet prop heli whoosh stamp pop thud wind
   All pictures are illustrations ("ภาพประกอบจำลอง"), not archival footage.
   ============================================================ */
'use strict';

const SC = {};   // scene draw functions

/* 1 ─ Title: map of mainland Southeast Asia, zoom to Udon Thani */
SC.title = (c, t) => {
  const view = mapView(95, 112, 4, 24, -120, 160, 1320, 1600);
  const ud = proj(view, GEO.places.udorn);
  const k = E.inOut(E.seg(t, 0.2, 9.5));
  const cam = { x: E.lerp(540, ud[0], k), y: E.lerp(960, ud[1] - 150, k), z: E.lerp(0.95, 1.75, k) };
  const order = ['thailand', 'laos', 'vietnam', 'cambodia'];
  camera(c, cam, () => drawMap(c, view, t, {
    reveal: n => E.outBack(E.seg(t, 0.4 + order.indexOf(n) * 0.25, 1.0 + order.indexOf(n) * 0.25)),
    labels: E.seg(t, 1.6, 2.2), labelSize: 48,
  }));
  const [px, py] = camPt(cam, ud[0], ud[1]);
  pin(c, px, py, E.seg(t, 2.2, 2.8), '#d62828', 'อุดรธานี', 1.1, t);
  // title panel
  const a = E.outBack(E.seg(t, 3.2, 4.0));
  if (a > 0) {
    c.save(); c.translate(540, 470); c.rotate(-0.04); c.scale(a, a);
    ink(c, P.rect(-470 + 16, -190 + 18, 940, 380), INK, null, { lw: 0 });
    ink(c, P.rect(-470, -190, 940, 380), '#1f3a7a', '#172c5c', { lw: 10, dx: -20, dy: -16 });
    txt(c, 'ฐานบินอุดร', 0, -70, 150, { col: '#ffd84a', sw: 22 });
    txt(c, 'กับ แอร์อเมริกา', 0, 70, 92, { col: '#ffffff', sw: 18 });
    c.restore();
    caption(c, 'ในยุคสงครามเวียดนาม (ทศวรรษ 1960–1970)', 540, 720, { size: 40, k: E.outBack(E.seg(t, 3.8, 4.4)), rot: 0.02 });
  }
  // a Porter crosses the frame
  const pk = E.seg(t, 5.5, 9.8);
  if (pk > 0 && pk < 1) aircraft(c, 'porter', { x: E.lerp(-320, 1420, pk), y: 960 + Math.sin(t * 2) * 14, s: 0.75, t, rot: -0.03 });
};

/* 2 ─ Context: Indochina in the 1960s, US use of Thai air bases */
SC.context = (c, t) => {
  const view = mapView(97, 110.5, 7.5, 23.5, 40, 330, 1000, 1235);
  const z = E.lerp(1, 1.06, E.sine(E.seg(t, 0, 10)));
  const cam = { x: 540, y: 960, z };
  const bases = [['takhli', 'ตาคลี', -1], ['korat', 'โคราช', 1], ['utapao', 'อู่ตะเภา', 1], ['ubon', 'อุบลฯ', 1], ['nkp', 'นครพนม', 1]];
  camera(c, cam, () => {
    drawMap(c, view, t, { labels: 0, dmz: t > 1.2 });
    const lab = (s, lon, lat, sz = 46, al = 1) => { const [x, y] = proj(view, [lon, lat]); txt(c, s, x, y, sz, { alpha: al }); };
    const la = E.seg(t, 0.8, 1.4);
    lab('ไทย', 99.4, 17.2, 50, la); lab('ลาว', 102.8, 20.6, 50, la); lab('กัมพูชา', 104.8, 12.8, 44, la);
    lab('เวียดนามเหนือ', 105.0, 21.5, 40, la); lab('เวียดนามใต้', 107.3, 12.9, 40, la);
    if (t > 1.2) { const [x, y] = proj(view, [108.3, 17.6]); txt(c, 'เส้นขนานที่ 17', x, y, 30, { col: '#ffe3e3', alpha: E.seg(t, 1.2, 1.8) }); }
    bases.forEach(([id, name, dir], i) => { const [x, y] = proj(view, GEO.places[id]); dot(c, x, y, E.seg(t, 2.6 + i * 0.55, 3.0 + i * 0.55), name, '#1f3a7a', dir); });
    // schematic air-operation arrows (not real routes)
    const ak = E.seg(t, 6.4, 8.4);
    if (ak > 0) bases.concat([['udorn']]).forEach(([id], i) => {
      const [x, y] = proj(view, GEO.places[id]);
      const len = 170 * E.out(E.clamp(ak * 1.4 - i * 0.08));
      if (len <= 2) return;
      c.save(); c.lineDashOffset = -t * 40;
      line(c, [[x, y], [x + len, y - len * 0.35]], '#ffffff', 6, [16, 12]); c.restore();
    });
    const [ux, uy] = proj(view, GEO.places.udorn);
    pin(c, ux, uy, E.seg(t, 5.4, 6.0), '#d62828', 'อุดร', 0.9, t);
  });
  stamp(c, 'ทศวรรษ 1960', 800, 380, E.seg(t, 0.6, 1.0), 0.12, '#d62828', 64);
  caption(c, 'รัฐบาลไทยอนุญาตให้สหรัฐฯ\nใช้ฐานทัพอากาศในไทย', 400, 210, { size: 42, k: E.outBack(E.seg(t, 2.0, 2.6)), rot: -0.02 });
  if (t > 7.2) txt(c, 'ลูกศรเป็นแผนภาพ ไม่ใช่เส้นทางบินจริง', 540, 1430, 28, { alpha: E.seg(t, 7.2, 7.8) });
};

/* 3 ─ Udorn flightline: RF-4C / F-4, crew chief, a take-off */
SC.flightline = (c, t) => {
  const camX = E.lerp(0, 470, E.inOut(E.seg(t, 0, 10)));
  skyGrad(c, ['#5bb8f0', '#a8dcf5', '#f6e7b8'], 0, 1100);
  ink(c, P.ell(880 - camX * 0.05, 300, 70, 70), '#fff3b0', '#ffd96b', { lw: 7 });
  for (let i = 0; i < 4; i++) cloud(c, ((i * 420 + 120 - camX * 0.12 + t * 8) % 1700) - 300, 200 + (i % 2) * 120, 0.8 + (i % 3) * 0.2);
  ridge(c, { seed: 2, base: 1010, amp: 150, off: camX * 0.25, col: '#86a96a', shade: '#6c8f53', step: 40 });
  // background runway with a take-off (parallax .4)
  ink(c, P.rect(-60, 1000, W + 120, 70), '#8d8f88', null, { lw: 6 });
  const tk = E.seg(t, 4.3, 9.8);
  if (tk > 0 && tk < 1) {
    const x = E.lerp(-260, 1750, tk * tk) - camX * 0.4, lift = Math.max(0, x - 650);
    aircraft(c, 'f4', { x, y: 1010 - lift * 0.22, s: 0.36, rot: lift > 0 ? -0.15 : 0, burner: true, gear: lift < 160, t, seed: 9 });
  }
  // hangars + tower (parallax .55)
  c.save(); c.translate(-camX * 0.55, 0);
  for (const hx of [-60, 600, 1260]) {
    ink(c, (c2 => { c2.moveTo(hx, 1060); c2.lineTo(hx, 900); c2.quadraticCurveTo(hx + 230, 720, hx + 460, 900); c2.lineTo(hx + 460, 1060); c2.closePath(); }), '#b9bcb3', '#959a90', { lw: 8, dx: -22, dy: -10 });
    for (let k = 1; k < 6; k++) line(c, [[hx + k * 76, 1060], [hx + k * 76, 880 - Math.sin(k / 6 * Math.PI) * 90]], '#8a8e84', 4);
    ink(c, P.rect(hx + 150, 960, 160, 100), '#4a4d48', null, { lw: 6 });
  }
  ink(c, P.rect(1040, 760, 70, 300), '#d8d2c0', '#b2ab96', { lw: 8 });
  ink(c, P.rr(1005, 700, 140, 80, 10), '#d8d2c0', '#b2ab96', { lw: 8 });
  ink(c, P.rect(1018, 715, 114, 36), '#7cc6e8', '#4d9cc0', { lw: 5 });
  c.restore();
  // apron
  ink(c, P.rect(-60, 1070, W + 120, H), '#a3a39b', '#8d8d85', { lw: 8, dx: 0, dy: -40 });
  c.save(); c.translate(-camX, 0);
  for (let k = 0; k < 6; k++) line(c, [[-200 + k * 380, H], [100 + k * 300, 1090]], '#e2c34a', 9, [40, 26]);
  // parked RF-4C + crew chief, a second Phantom
  aircraft(c, 'f4', { x: 420, y: 1330, s: 0.85, rf: true, gear: true, t, seed: 4 });
  caption(c, 'RF-4C · ลาดตระเวนถ่ายภาพ', 470, 1130, { size: 34, k: E.outBack(E.seg(t, 1.2, 1.7)), bg: '#ffffff' });
  person(c, 'crew', { x: 830, y: 1560, s: 0.5, pose: 'marshal', t, flip: true, look: -1, seed: 2 });
  ink(c, P.rr(1580, 1440, 160, 70, 10), '#d9b43a', '#b38f22', { lw: 7 });                    // tow tractor
  ink(c, P.ell(1610, 1515, 26, 26), '#2a2a2a', null, { lw: 5 }); ink(c, P.ell(1710, 1515, 26, 26), '#2a2a2a', null, { lw: 5 });
  aircraft(c, 'f4', { x: 1260, y: 1330, s: 0.85, gear: true, t, seed: 6 });
  caption(c, 'F-4 แฟนทอม II · เครื่องบินขับไล่', 1240, 1130, { size: 34, k: E.outBack(E.seg(t, 5.2, 5.7)), bg: '#ffffff' });
  c.restore();
  caption(c, 'กองบินลาดตระเวนทางยุทธวิธีที่ 432\nประจำที่อุดร ตั้งแต่ปี 2509 (1966)', 540, 230, { size: 40, k: E.outBack(E.seg(t, 0.6, 1.2)), rot: -0.015 });
};

/* 4 ─ Air America at Udorn: pilot, Thai mechanic, the "secret owner" file */
SC.airamerica = (c, t) => {
  const z = E.lerp(1, 1.07, E.sine(E.seg(t, 0, 10)));
  camera(c, { x: 540, y: 1000, z }, () => {
    skyGrad(c, ['#7cc7f2', '#cdebf7', '#f9e3a8'], 0, 1150);
    ridge(c, { seed: 7, base: 800, amp: 120, col: '#9fbf86', shade: '#86a86e', step: 40 });
    // hangar
    ink(c, P.rect(60, 560, 960, 590), '#d9d2bf', '#b7ae96', { lw: 9, dx: -26, dy: -12 });
    ink(c, P.poly([[30, 580], [540, 430], [1050, 580]]), '#a8a294', '#8a8476', { lw: 9 });
    ink(c, P.rect(140, 760, 800, 390), '#3e403d', null, { lw: 8 });
    for (let k = 1; k < 8; k++) line(c, [[140 + k * 100, 760], [140 + k * 100, 1150]], '#2c2e2b', 5);
    ink(c, P.rr(250, 610, 580, 110, 12), '#ffffff', '#dfe4ea', { lw: 8 });
    txt(c, 'AIR AMERICA', 540, 667, 76, { col: '#1f4e8c', stroke: false });
    ink(c, P.rect(-100, 1150, W + 200, 900), '#a8a89f', '#94948b', { lw: 8, dx: 0, dy: -40 });
    aircraft(c, 'porter', { x: 560, y: 1330, s: 1.1, t, rpm: 0, seed: 5 });
    person(c, 'mech', { x: 940, y: 1580, s: 0.6, pose: 'wrench', flip: true, t, look: -1, seed: 4 });
    const wk = E.seg(t, 0, 2.6);
    person(c, 'pilot', { x: E.lerp(-160, 260, E.out(wk)), y: 1660, s: 0.72, pose: wk < 1 ? 'idle' : 'clip', walk: wk < 1, talk: t > 2.8 && t < 5.2, t, look: 1, seed: 7 });
  });
  caption(c, 'ฐานปฏิบัติการของแอร์อเมริกาที่อุดร', 540, 230, { size: 42, k: E.outBack(E.seg(t, 0.5, 1.1)) });
  // the file
  const fy = E.lerp(2400, 1060, E.outBack(E.seg(t, 4.6, 5.3)));
  if (fy < 2300) {
    c.save(); c.translate(540, fy); c.rotate(-0.035);
    ink(c, P.rr(-380, -320, 260, 80, 16), '#e0b66a', '#c49a50', { lw: 8 });
    ink(c, P.rr(-400, -270, 800, 560, 18), '#e8c27a', '#c9a35e', { lw: 9, dx: -20, dy: -16 });
    ink(c, P.rect(-350, -230, 700, 470), '#fffaf0', null, { lw: 6 });
    txt(c, 'แฟ้มข้อมูลบริษัท', 0, -175, 54, { col: INK, stroke: false });
    line(c, [[-300, -135], [300, -135]], '#b8b0a0', 4);
    txt(c, 'ชื่อ: แอร์อเมริกา (Air America)', -300, -80, 40, { col: INK, stroke: false, align: 'left' });
    txt(c, 'ภายนอก: สายการบินพลเรือน', -300, -10, 40, { col: INK, stroke: false, align: 'left' });
    txt(c, 'เจ้าของจริง: ซีไอเอ (CIA)', -300, 60, 44, { col: '#b01818', stroke: false, align: 'left' });
    if (t > 5.6) { const k = E.seg(t, 5.6, 6.0); line(c, [[-300, 92], [-300 + 520 * k, 92]], '#b01818', 6); }
    stamp(c, 'ลับ', 210, 170, E.seg(t, 6.0, 6.25), -0.22, '#d62828', 110);
    c.restore();
  }
};

/* 5 ─ Lima Site: a Porter lands on a sloped mountain strip, a C-123 drops rice */
SC.limasite = (c, t) => {
  const camX = E.lerp(0, 220, E.inOut(E.seg(t, 0, 10)));
  skyGrad(c, ['#8fd3f4', '#d9f0f6', '#f4f1dc'], 0, 1200);
  for (let i = 0; i < 3; i++) cloud(c, ((i * 520 + 60 - camX * 0.1) % 1500) - 200, 260 + i * 70, 0.7);
  ridge(c, { seed: 1.3, base: 900, amp: 380, off: camX * 0.2, col: '#9bb8a2', shade: '#7f9e88', karst: true, step: 24 });
  // C-123 high above, rice sacks free-falling from the open ramp
  const ck = E.seg(t, 3.2, 10);
  const cx = E.lerp(1450, -520, ck) - camX * 0.3, cs = 0.42, cyy = 420;
  for (const rel of [5.2, 5.8, 6.4]) {
    if (t < rel) continue;
    const dt = t - rel, rx = E.lerp(1450, -520, E.seg(rel, 3.2, 10)) - camX * 0.3 + 130 - dt * 60;
    const ry = cyy - 8 + 260 * dt * dt * 0.5 + 40 * dt;
    if (ry < 1300) { c.save(); c.translate(rx, ry); c.rotate(dt * 3 + rel); ink(c, P.rr(-16, -20, 32, 40, 8), '#efe3c2', '#cbbd95', { lw: 5 }); c.restore(); }
  }
  if (ck > 0 && ck < 1) aircraft(c, 'c123', { x: cx, y: cyy, s: cs, flip: true, ramp: t > 4.8, t, seed: 8 });
  ridge(c, { seed: 4.1, base: 1180, amp: 430, off: camX * 0.45, col: '#5f9a68', shade: '#4a7f54', karst: true, step: 24 });
  // the strip
  c.save(); c.translate(-camX * 0.9, 0);
  const sy = x => 1290 - (x - 150) * (110 / 750);
  ink(c, P.poly([[-160, 1420], [60, 1310], [150, 1290], [900, 1180], [1020, 1170], [1400, 1260], [1400, H + 60], [-160, H + 60]]), '#7aa95b', '#5f8b45', { lw: 9, dx: -20, dy: -16 });
  ink(c, P.poly([[150, 1290], [900, 1180], [905, 1210], [150, 1322]]), '#c99a62', '#a77b48', { lw: 7 });
  limb(c, [[960, 1176], [960, 1050]], '#6b4a2d', 8, 4);                               // windsock
  ink(c, P.poly([[960, 1052], [1040 + Math.sin(t * 4) * 8, 1062], [1040 + Math.sin(t * 4) * 8, 1082], [960, 1090]]), '#ff7a1a', '#d85a0a', { lw: 5 });
  ink(c, P.rr(80, 1180, 110, 70, 8), '#fff6dd', null, { lw: 6 }); txt(c, 'LS', 135, 1216, 42, { col: '#b01818', stroke: false });
  // Porter: approach → touchdown (4.6 s) → roll uphill
  const ak = E.seg(t, 0.4, 4.6), rk = E.out(E.seg(t, 4.6, 7.4));
  let px, py, pr;
  if (t < 4.6) { px = E.lerp(-320, 230, ak); py = E.lerp(640, sy(230) - 46, E.out(ak)); pr = E.lerp(0.06, -0.145, ak); }
  else { px = E.lerp(230, 600, rk); py = sy(px) - 46; pr = -0.145; }
  dust(c, 230 + (t - 4.6) * 40, sy(230) + 6, E.seg(t, 4.6, 6.4), 3);
  dust(c, px - 60, sy(px) + 4, t > 4.8 && t < 7.2 ? ((t * 3) % 1) : 0, Math.floor(t * 3));
  aircraft(c, 'porter', { x: px, y: py, s: 0.62, rot: pr, t, rpm: t > 7.4 ? 0.5 : 1, seed: 2 });
  c.restore();
  jungle(c, 1720, camX * 1.2, 5, '#3f7d4a', '#2f6239', 80, 95);
  caption(c, 'ลานบินดินบนภูเขาในลาว\nเรียกว่า “ไลมาไซต์” (Lima Site)', 540, 230, { size: 40, k: E.outBack(E.seg(t, 0.6, 1.2)), rot: 0.015 });
  if (t > 5.2) caption(c, 'การทิ้งเสบียงทางอากาศ', 300, 560, { size: 32, k: E.outBack(E.seg(t, 5.3, 5.8)), bg: '#ffffff', rot: -0.03 });
};

/* 6 ─ Helicopters: H-34 transit, Huey hoist rescue */
SC.helicopters = (c, t) => {
  const shake = [E.noise(t * 3) * 6, E.noise(t * 3 + 9) * 6];
  c.save(); c.translate(shake[0], shake[1]);
  skyGrad(c, ['#9cd6f2', '#e2f2f2', '#f1ead0'], 0, 1200);
  ridge(c, { seed: 6, base: 960, amp: 300, col: '#8fb59a', shade: '#74997f', step: 30 });
  ridge(c, { seed: 9, base: 1160, amp: 260, col: '#5e9a6b', shade: '#4a8057', step: 30 });
  jungle(c, 1250, 120, 2, '#4f8c58', '#3c7045', 64, 80);
  ink(c, P.ell(600, 1440, 300, 70), '#b8c97a', '#9fb062', { lw: 8, dx: 0, dy: -12 });         // clearing
  smokeColumn(c, 790, 1440, t, '#ff8a2b', '#e0661a', 520, 3);                                   // signal smoke
  // H-34 passing
  const hk = E.seg(t, 0, 5.4);
  if (hk < 1) aircraft(c, 'h34', { x: E.lerp(-520, 1620, hk), y: 560 + Math.sin(t * 2.2) * 12, s: 0.62, rot: 0.06, t, seed: 3 });
  // Huey arrives, hovers, lowers the hoist, lifts the airman
  const ek = E.out(E.seg(t, 4.0, 6.2));
  const hx = E.lerp(1520, 600, ek), hy = E.lerp(480, 800, ek) + Math.sin(t * 2.4) * 8;
  const full = 590, hoist = t < 8.0 ? full * E.inOut(E.seg(t, 6.3, 7.6)) : E.lerp(full, 330, E.inOut(E.seg(t, 8.0, 10)));
  const lift = t < 8.0 ? 0 : (full - hoist) * 0.6;
  if (ek > 0.95) dust(c, 600, 1450, (t * 1.6) % 1, Math.floor(t * 1.6) + 7, '#cbd9a0', '#aabb7c');
  person(c, 'airman', { x: 600, y: 1452 - lift, s: 0.42, pose: 'wave', t, look: 0, seed: 5, expr: t < 7.8 ? 'worried' : 'neutral' });
  if (ek > 0) aircraft(c, 'huey', { x: hx, y: hy, s: 0.62, flip: true, rot: E.lerp(-0.1, 0, ek), t, hoist, seed: 4 });
  jungle(c, 1700, 40 + t * 6, 8, '#356b3f', '#285531', 86, 100);
  c.restore();
  caption(c, 'ภารกิจขนส่ง และค้นหาช่วยเหลือนักบิน', 540, 230, { size: 42, k: E.outBack(E.seg(t, 0.5, 1.1)) });
};

/* 7 ─ The Secret War: Udorn ↔ Long Tieng & Lima Sites */
SC.secretwar = (c, t) => {
  const view = mapView(99.3, 108.2, 13.2, 23.0, 60, 330, 960, 1100);
  const z = E.lerp(1.0, 1.12, E.sine(E.seg(t, 0, 10)));
  const ud = proj(view, GEO.places.udorn), lt = proj(view, GEO.places.longtieng);
  const sites = [[101.9, 19.9], [103.6, 20.3], [104.2, 19.2], [103.9, 18.6], [101.35, 19.6]].map(p => proj(view, p));
  camera(c, { x: 540, y: 900, z }, () => {
    drawMap(c, view, t, { labels: 0, dim: n => (n === 'vietnam' || n === 'cambodia') ? 0.6 : 0 });
    const lp = GEO.shapes.laos.map(p => proj(view, p));
    c.save(); c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3); ink(c, P.poly(lp), 'rgba(0,0,0,0)', null, { lw: 12, stroke: '#ffd84a' }); c.restore();
    const lab = (s, lon, lat, sz, al = 1) => { const [x, y] = proj(view, [lon, lat]); txt(c, s, x, y, sz, { alpha: al }); };
    lab('ลาว', 104.7, 17.9, 54); lab('ไทย', 101.2, 16.0, 54); lab('เวียดนาม', 106.1, 21.4, 40, 0.6); lab('กัมพูชา', 105.0, 13.8, 38, 0.6);
    // routes from Udorn (schematic)
    const rk = E.seg(t, 3.4, 6.2);
    [lt, ...sites].forEach((s, i) => {
      const k = E.clamp(rk * 1.6 - i * 0.15); if (k <= 0) return;
      const ex = E.lerp(ud[0], s[0], k), ey = E.lerp(ud[1], s[1], k);
      c.save(); c.lineDashOffset = -t * 50; line(c, [ud, [ex, ey]], '#ffffff', 6, [14, 10]); c.restore();
      if (k >= 1) {   // little plane shuttling along the route
        const f = (t * 0.35 + i * 0.21) % 1, fx = E.lerp(ud[0], s[0], f), fy = E.lerp(ud[1], s[1], f);
        const ang = Math.atan2(s[1] - ud[1], s[0] - ud[0]);
        c.save(); c.translate(fx, fy); c.rotate(ang);
        ink(c, P.poly([[22, 0], [-14, -14], [-8, 0], [-14, 14]]), '#ffffff', null, { lw: 4 }); c.restore();
      }
    });
    sites.forEach((s, i) => dot(c, s[0], s[1], E.seg(t, 3.0 + i * 0.2, 3.4 + i * 0.2), 'LS', '#7a3db8', 1));
    const vt = proj(view, GEO.places.vientiane); dot(c, vt[0], vt[1], E.seg(t, 1.2, 1.6), 'เวียงจันทน์', '#444', -1);
    const pj = proj(view, GEO.places.pdj); dot(c, pj[0], pj[1], E.seg(t, 2.8, 3.2), 'ทุ่งไหหิน', '#444', 1);
    pin(c, ud[0], ud[1], E.seg(t, 0.6, 1.2), '#d62828', 'อุดร', 0.85, t);
    pin(c, lt[0], lt[1], E.seg(t, 2.0, 2.6), '#1f3a7a', 'ล่องแจ้ง (LS 20A)', 0.85, t);
  });
  stamp(c, 'สงครามลับ', 300, 560, E.seg(t, 4.2, 4.5), -0.14, '#d62828', 70);
  caption(c, 'ซีไอเอสนับสนุนกองกำลังม้ง\nฐานหลักอยู่ที่ล่องแจ้ง', 400, 210, { size: 40, k: E.outBack(E.seg(t, 0.4, 1.0)), rot: -0.02 });
  txt(c, 'จุด LS และเส้นทางเป็นภาพประกอบ ไม่ใช่พิกัดจริง', 540, 1450, 28, { alpha: E.seg(t, 4.0, 4.6) });
};

/* 8 ─ The end of an era: 1973 → 1974 → 1976 */
SC.ending = (c, t) => {
  skyGrad(c, ['#2b2d6e', '#c4508a', '#f79a4e', '#ffd27a'], 0, 1300);
  ink(c, P.ell(560, 1180, 230, 230), '#ffd27a', '#ffb45a', { lw: 0 });
  const fk = E.seg(t, 0, 7.5);
  aircraft(c, 'c123', { x: E.lerp(380, 1250, fk), y: E.lerp(980, 640, fk), s: E.lerp(0.75, 0.2, fk), rot: -0.06, t, seed: 2 });
  ridge(c, { seed: 3, base: 1260, amp: 190, col: '#5a2f55', shade: '#45233f', step: 36 });
  ridge(c, { seed: 8, base: 1420, amp: 140, col: '#3a1d38', shade: '#2a1428', step: 36 });
  ink(c, P.rect(-60, 1470, W + 120, 600), '#24152a', null, { lw: 8 });
  // vertical timeline
  line(c, [[150, 380], [150, 380 + 1000 * E.out(E.seg(t, 0.1, 1.2))]], '#ffffff', 12);
  const cards = [['2516', '(1973)', 'ข้อตกลงหยุดยิงในลาว', 0.6], ['2517', '(1974)', 'แอร์อเมริกายุติการบินในลาว', 3.6], ['2519', '(1976)', 'ทหารสหรัฐฯ ถอนออกจากไทย', 6.2]];
  cards.forEach(([y1, y2, d, at], i) => {
    const k = E.outBack(E.seg(t, at, at + 0.5)); if (k <= 0) return;
    const y = 520 + i * 340;
    ink(c, P.ell(150, y, 30 * k, 30 * k), '#ffd84a', null, { lw: 7 });
    c.save(); c.translate(E.lerp(1300, 610, k), y); c.rotate(i % 2 ? 0.02 : -0.02);
    ink(c, P.rect(-390 + 14, -115 + 16, 780, 230), INK, null, { lw: 0 });
    ink(c, P.rect(-390, -115, 780, 230), '#fff6dd', '#eadcb6', { lw: 8, dx: -14, dy: -12 });
    txt(c, y1, -250, -28, 96, { col: '#d62828', sw: 14 });
    txt(c, y2, -250, 52, 36, { col: INK, stroke: false });
    txt(c, d, 110, 0, 40, { col: INK, stroke: false });
    c.restore();
  });
};

/* 9 ─ Today: Wing 23 / Udon Thani International Airport + end card */
SC.today = (c, t) => {
  skyGrad(c, ['#f6b26b', '#fcd89a', '#fdf0d0'], 0, 1100);
  ink(c, P.ell(300, 760, 120, 120), '#fff3c4', '#ffe08a', { lw: 0 });
  ridge(c, { seed: 11, base: 1085, amp: 110, col: '#b98a6a', shade: '#9c7052', step: 40 });
  ink(c, P.rect(-60, 1080, W + 120, 900), '#7d8b4e', '#667340', { lw: 8, dx: 0, dy: -30 });
  // runway in perspective, centre-line rushing towards camera
  ink(c, P.poly([[500, 1080], [580, 1080], [1040, H + 20], [40, H + 20]]), '#5b5f66', '#4a4e55', { lw: 8, dx: 0, dy: 0 });
  for (let i = 0; i < 14; i++) {
    const d = ((i / 14) + t * 0.12) % 1, d2 = Math.min(1, d + 0.035);
    const y1 = 1080 + (H - 1080) * d * d, y2 = 1080 + (H - 1080) * d2 * d2;
    ink(c, P.poly([[540 - 3 - 14 * d, y1], [540 + 3 + 14 * d, y1], [540 + 3 + 14 * d2, y2], [540 - 3 - 14 * d2, y2]]), '#f3f3ee', null, { lw: 0 });
    for (const sd of [-1, 1]) {
      const x = 540 + sd * (40 + 460 * d * d);
      c.save(); c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6 + i); ink(c, P.ell(x, y1, 4 + 10 * d, 4 + 10 * d), '#fff2a8', null, { lw: 0 }); c.restore();
    }
  }
  person(c, 'crew', { x: 790, y: 1380, s: 0.36, t, look: -1, seed: 1 });
  person(c, 'pilot', { x: 890, y: 1390, s: 0.37, t, look: -1, seed: 2 });
  person(c, 'mech', { x: 990, y: 1400, s: 0.36, t, look: -1, seed: 3 });
  caption(c, 'กองบิน 23 กองทัพอากาศไทย\nใช้ทางวิ่งร่วมกับท่าอากาศยานนานาชาติอุดรธานี', 540, 250, { size: 38, k: E.outBack(E.seg(t, 0.6, 1.2)) });
  const ek = E.seg(t, 7.0, 7.8);
  if (ek > 0) {
    c.save(); c.globalAlpha = ek * 0.82; c.fillStyle = '#120c08'; c.fillRect(0, 0, W, H); c.restore();
    c.save(); c.globalAlpha = ek;
    txt(c, 'ฐานบินอุดร', 540, 640, 110, { col: '#ffd84a', sw: 16 });
    txt(c, 'กับ แอร์อเมริกา', 540, 770, 72, { col: '#ffffff', sw: 12 });
    txt(c, 'ภาพทั้งหมดเป็นภาพวาดประกอบเพื่อการอธิบาย', 540, 960, 38, { col: '#ffffff', stroke: false });
    txt(c, 'ไม่ใช่ภาพถ่ายหรือฟุตเทจจากเหตุการณ์จริง', 540, 1015, 38, { col: '#ffffff', stroke: false });
    txt(c, 'เนื้อหาสรุปจากข้อเท็จจริงทางประวัติศาสตร์ที่เผยแพร่ทั่วไป', 540, 1110, 32, { col: '#d9cfbf', stroke: false });
    txt(c, 'โปรดตรวจสอบกับแหล่งอ้างอิงก่อนนำไปใช้', 540, 1158, 32, { col: '#d9cfbf', stroke: false });
    c.restore();
  }
};

const SCENES = [
  { id: 'title',       title: 'ฐานบินอุดร กับ แอร์อเมริกา', dur: 10, transition: 'fade',  draw: SC.title,
    sfx: [{ at: 0.2, type: 'whoosh', dur: 0.7 }, { at: 2.3, type: 'pop' }, { at: 3.2, type: 'stamp' }, { at: 5.5, type: 'prop', dur: 4.3, vol: 0.7 }] },
  { id: 'context',     title: 'บริบท: ทศวรรษ 1960',           dur: 10, transition: 'iris',  draw: SC.context,
    sfx: [{ at: 0.0, type: 'whoosh', dur: 0.7 }, { at: 0.6, type: 'stamp' }, ...[0, 1, 2, 3, 4].map(i => ({ at: 2.6 + i * 0.55, type: 'pop' })), { at: 5.4, type: 'pop' }] },
  { id: 'flightline',  title: 'ลานบินอุดร',                   dur: 10, transition: 'slash', draw: SC.flightline,
    sfx: [{ at: 0.0, type: 'whoosh', dur: 0.6 }, { at: 0.3, type: 'wind', dur: 9.5, vol: 0.35 }, { at: 4.3, type: 'jet', dur: 5.7 }] },
  { id: 'airamerica',  title: 'แอร์อเมริกา',                   dur: 10, transition: 'panel', draw: SC.airamerica,
    sfx: [{ at: 0.0, type: 'whoosh', dur: 0.6 }, { at: 4.6, type: 'whoosh', dur: 0.6 }, { at: 6.0, type: 'stamp' }] },
  { id: 'limasite',    title: 'ไลมาไซต์',                       dur: 10, transition: 'ink',   draw: SC.limasite,
    sfx: [{ at: 0.3, type: 'prop', dur: 8.0, vol: 0.8 }, { at: 3.4, type: 'prop', dur: 6.5, vol: 0.35 }, { at: 4.6, type: 'thud' }] },
  { id: 'helicopters', title: 'เฮลิคอปเตอร์',                   dur: 10, transition: 'slash', draw: SC.helicopters,
    sfx: [{ at: 0.0, type: 'heli', dur: 10, vol: 0.8 }] },
  { id: 'secretwar',   title: 'สงครามลับในลาว',                 dur: 10, transition: 'iris',  draw: SC.secretwar,
    sfx: [{ at: 0.6, type: 'pop' }, { at: 2.0, type: 'pop' }, { at: 2.8, type: 'pop' }, { at: 4.2, type: 'stamp' }] },
  { id: 'ending',      title: 'ปิดฉาก 2516–2519',               dur: 10, transition: 'ink',   draw: SC.ending,
    sfx: [{ at: 0.0, type: 'prop', dur: 7, vol: 0.3 }, { at: 0.6, type: 'pop' }, { at: 3.6, type: 'pop' }, { at: 6.2, type: 'pop' }] },
  { id: 'today',       title: 'ปัจจุบัน',                         dur: 10, transition: 'fade',  draw: SC.today,
    sfx: [{ at: 0.0, type: 'wind', dur: 9.5, vol: 0.3 }, { at: 7.0, type: 'whoosh', dur: 0.8 }] },
];
(() => { let s = 0; for (const sc of SCENES) { sc.start = s; s += sc.dur; } })();
const DURATION = SCENES[SCENES.length - 1].start + SCENES[SCENES.length - 1].dur;
