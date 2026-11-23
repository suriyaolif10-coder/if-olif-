// THE FILM — คู่มือสั้นสำหรับอาสาฯ. Flat infographic; every item pops on its beat (score.js), every tap is shown.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { T, clock, EV, NARR, VO } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H, SF = G.SAFE;
  const X0 = SF.x, X1 = SF.x + SF.w, CW = SF.w, CX = SF.x + SF.w / 2;
  const THAI = '"Loma", "Noto Sans Thai", sans-serif';
  const NAVY = '#1F2F6B', INK = '#1E2433', GREEN = '#2E9E5B', RED = '#E0453A', YEL = '#E0A21B', PURP = '#6C4AD8', MUTED = '#5B6478';

  // ---------- helpers ----------
  const rr = (ctx, x, y, w, h, r, fill, stroke, lw = 4) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } };
  const shadowCard = (ctx, x, y, w, h, r = 28, fill = '#FFFFFF') => { ctx.save(); ctx.shadowColor = 'rgba(30,40,90,0.18)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; rr(ctx, x, y, w, h, r, fill); ctx.restore(); };
  const fitSize = (ctx, str, size, maxW, weight = 700) => { let s = size; while (s > 22 && G.measure(ctx, str, s, THAI, weight) > maxW) s -= 2; return s; };
  const txt = (ctx, str, x, y, size, color = INK, { align = 'left', weight = 700, maxW, alpha = 1 } = {}) => {
    const s = maxW ? fitSize(ctx, str, size, maxW, weight) : size;
    G.text(ctx, str, x, y, { size: s, fam: THAI, weight, color, align, alpha });
    return s;
  };
  const popK = (t, t0, d = 0.3) => (t < t0 ? 0 : 0.82 + 0.18 * ease.outBack(clamp((t - t0) / d), 2.2)); // full size almost at once: the hit lands on its frame
  const fadeK = (t, t0, d = 0.25) => clamp((t - t0) / d);
  // draw fn() scaled by a pop around (cx, cy)
  const pop = (ctx, t, t0, cx, cy, fn, d) => { const k = popK(t, t0, d); if (k <= 0) return; ctx.save();  ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); fn(); ctx.restore(); };
  const finger = (ctx, x, y, t, tap) => { // a hand cursor that presses at `tap`
    const a = clamp((t - tap + 0.6) / 0.4); if (a <= 0) return;
    const press = t >= tap ? Math.max(0, 1 - (t - tap) / 0.25) : 0;
    const k = 1 - 0.15 * press;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + 40 * (1 - a), y + 70 * (1 - a)); ctx.scale(k, k);
    rr(ctx, -16, 0, 32, 80, 16, '#FFFFFF', INK, 4);
    rr(ctx, -16, 50, 74, 80, 22, '#FFFFFF', INK, 4);
    ctx.restore();
    if (t >= tap) UI.tap(ctx, x, y, t, tap, { color: 'rgba(108,74,216,0.6)', size: 110 });
  };
  const header = (ctx, t, t0, str, sub) => {
    pop(ctx, t, t0, CX, SF.y + 60, () => {
      rr(ctx, X0, SF.y, CW, 120, 60, NAVY);
      txt(ctx, str, CX, SF.y + 78, 54, '#FFFFFF', { align: 'center', maxW: CW - 60 });
    });
    if (sub) pop(ctx, t, t0 + 0.15, CX, SF.y + 170, () => txt(ctx, sub, CX, SF.y + 185, 38, MUTED, { align: 'center', weight: 400, maxW: CW }));
  };
  const icon = (ctx, kind, x, y, r, color) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (kind === 'ok') { ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.35); ctx.lineTo(x + r * 0.5, y - r * 0.35); }
    else if (kind === 'wait') { ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.moveTo(x, y - r * 0.35); ctx.lineTo(x, y); ctx.lineTo(x + r * 0.28, y + r * 0.15); }
    else if (kind === 'edit') { ctx.moveTo(x - r * 0.4, y + r * 0.4); ctx.lineTo(x + r * 0.35, y - r * 0.35); ctx.moveTo(x - r * 0.4, y + r * 0.4); ctx.lineTo(x - r * 0.15, y + r * 0.38); }
    else if (kind === 'del') { ctx.rect(x - r * 0.32, y - r * 0.25, r * 0.64, r * 0.7); ctx.moveTo(x - r * 0.48, y - r * 0.35); ctx.lineTo(x + r * 0.48, y - r * 0.35); ctx.moveTo(x - r * 0.12, y - r * 0.5); ctx.lineTo(x + r * 0.12, y - r * 0.5); }
    else if (kind === 'go') { ctx.moveTo(x - r * 0.4, y); ctx.lineTo(x + r * 0.4, y); ctx.moveTo(x + r * 0.1, y - r * 0.3); ctx.lineTo(x + r * 0.4, y); ctx.lineTo(x + r * 0.1, y + r * 0.3); }
    ctx.stroke();
  };
  const STAR = '✱✱✱✱✱';

  // a mock of the web system's table, scaled to the safe width
  function tableMock(ctx, x, y, w, t, { hlTab = 0, hlCol = 0, rows = 5, flag = -1, buttons = false, tap = null } = {}) {
    shadowCard(ctx, x, y, w, 120 + rows * 74, 22);
    rr(ctx, x, y, w, 64, [22, 22, 0, 0], '#5B4BC4');
    txt(ctx, 'ระบบบันทึกข้อมูล (ตัวอย่าง)', x + 28, y + 44, 30, '#FFFFFF', { weight: 400 });
    // tabs
    const tw = (w - 40) / 2;
    rr(ctx, x + 20, y + 76, tw, 40, 10, '#E9E6F7'); txt(ctx, 'ยังไม่ได้อัปโหลด', x + 20 + tw / 2, y + 106, 26, MUTED, { align: 'center', weight: 400 });
    rr(ctx, x + 20 + tw, y + 76, tw, 40, 10, '#3E2F9C'); txt(ctx, 'อัปโหลดแล้ว', x + 20 + tw * 1.5, y + 106, 26, '#FFFFFF', { align: 'center' });
    if (hlTab > 0) { ctx.save(); ctx.globalAlpha = hlTab; rr(ctx, x + 14 + tw, y + 70, tw + 12, 52, 14, null, YEL, 8); ctx.restore(); }
    // rows
    const colX = [x + 24, x + w * 0.42, x + w * 0.62];
    for (let i = 0; i < rows; i++) {
      const ry = y + 130 + i * 74;
      rr(ctx, x + 14, ry, w - 28, 64, 10, i === flag ? '#FDECEA' : i % 2 ? '#F6F5FC' : '#FFFFFF');
      txt(ctx, `${i + 1}. ${STAR}`, colX[0], ry + 42, 28, INK, { weight: 400 });
      if (i === flag) txt(ctx, 'ตรวจสอบเรียบร้อย (แก้ไขได้)', colX[1], ry + 42, 22, RED, { maxW: w * 0.36 });
      if (buttons) {
        rr(ctx, x + w - 190, ry + 12, 82, 40, 8, '#3E2F9C'); txt(ctx, 'แก้ไข', x + w - 149, ry + 41, 24, '#FFFFFF', { align: 'center' });
        rr(ctx, x + w - 100, ry + 12, 70, 40, 8, '#8E96AC'); txt(ctx, 'ลบ', x + w - 65, ry + 41, 24, '#FFFFFF', { align: 'center' });
      }
    }
    if (hlCol > 0) { ctx.save(); ctx.globalAlpha = hlCol; rr(ctx, colX[1] - 12, y + 124, w * 0.36, rows * 74 + 6, 12, 'rgba(224,162,27,0.15)', YEL, 8); ctx.restore(); }
    if (tap) finger(ctx, tap[0], tap[1], t, tap[2]);
  }

  // ---------- scenes ----------
  function hook(ctx, t) {
    pop(ctx, t, EV.title, CX, SF.y + 120, () => {
      rr(ctx, CX - 260, SF.y + 40, 520, 130, 65, RED);
      txt(ctx, 'อาสาฯ ต้องรู้!', CX, SF.y + 128, 70, '#FFFFFF', { align: 'center' });
    });
    pop(ctx, t, EV.status, CX, SF.y + 460, () => {
      ctx.save(); ctx.translate(CX, SF.y + 460); ctx.rotate(-0.02 + 0.01 * Math.sin(t * 3)); ctx.translate(-CX, -(SF.y + 460));
      shadowCard(ctx, X0, SF.y + 250, CW, 420, 36, NAVY);
      txt(ctx, 'เจอสถานะนี้ในช่อง “สมาชิกรอการตรวจสอบ”', CX, SF.y + 320, 32, '#B9C4F0', { align: 'center', weight: 400, maxW: CW - 60 });
      ['มีประชากรใหม่ส่งกรมการปกครอง', 'ตรวจสอบเรียบร้อย', '(สามารถดำเนินการแก้ไขได้)'].forEach((l, i) => txt(ctx, l, CX, SF.y + 420 + i * 82, 60, '#7CF29B', { align: 'center', maxW: CW - 60 }));
      ctx.restore();
    }, 0.25);
    pop(ctx, t, EV.question, CX, SF.y + 800, () => {
      txt(ctx, 'ต้องทำอย่างไร?', CX, SF.y + 820, 84, NAVY, { align: 'center' });
      txt(ctx, 'ฟังสรุปสั้น ๆ ได้เลย', CX, SF.y + 910, 44, MUTED, { align: 'center', weight: 400 });
    });
  }

  function where(ctx, t) {
    header(ctx, t, EV.where, 'ดูได้ที่ไหน?');
    const hlTab = clamp((t - EV.tab) / 0.3), hlCol = clamp((t - EV.col) / 0.3);
    pop(ctx, t, EV.where + 0.5, CX, SF.y + 500, () => tableMock(ctx, X0, SF.y + 170, CW, t, { hlTab, hlCol, rows: 5, flag: 3 }));
    pop(ctx, t, EV.col, CX, SF.y + 1030, () => {
      txt(ctx, 'ฝั่ง “อัปโหลดแล้ว”', CX, SF.y + 1000, 50, PURP, { align: 'center' });
      txt(ctx, '→ ช่อง “สมาชิกรอการตรวจสอบ”', CX, SF.y + 1075, 50, INK, { align: 'center', maxW: CW });
    });
  }

  function kinds(ctx, t) {
    header(ctx, t, EV.kinds, 'ข้อความที่อาจเจอ มี 3 แบบ');
    S.kinds.forEach((k, i) => {
      const y = SF.y + 170 + i * 340, h = 310;
      const focus = t >= k.t && (i === 2 || t < S.kinds[i + 1].t);
      pop(ctx, t, k.t, CX, y + h / 2, () => {
        shadowCard(ctx, X0, y, CW, h, 30, focus ? '#FFFFFF' : '#F3F4FA');
        rr(ctx, X0, y, 18, h, [30, 0, 0, 30], k.color);
        icon(ctx, k.icon, X0 + 95, y + 95, 52, k.color);
        k.label.split('\n').forEach((l, j) => txt(ctx, l, X0 + 175, y + 75 + j * 50, 34, MUTED, { weight: 400, maxW: CW - 200 }));
        txt(ctx, k.act, X0 + 40, y + h - 50, 60, k.color, { maxW: CW - 80 });
      });
    });
  }

  function stepScreen(ctx, i, t) {
    const s = S.steps[i], y = SF.y + 160, w = CW, x = X0;
    if (i === 0) tableMock(ctx, x, y, w, t, { rows: 4, flag: 1, buttons: true, tap: [x + w - 149, y + 130 + 74 + 32, s.tap] });
    else if (i === 1) {
      shadowCard(ctx, x, y, w, 420, 22);
      rr(ctx, x, y, w, 64, [22, 22, 0, 0], '#5B4BC4'); txt(ctx, 'ข้อมูลสมาชิก', x + 28, y + 44, 32, '#FFFFFF');
      for (let r = 0; r < 4; r++) {
        const ry = y + 84 + r * 80, warn = r === 2;
        rr(ctx, x + 14, ry, w - 28, 68, 10, warn ? '#FDECEA' : '#F6F5FC', warn && t > s.tap ? RED : null, 5);
        txt(ctx, `สมาชิก ${r + 1}`, x + 34, ry + 45, 28, INK, { weight: 400 });
        txt(ctx, 'x-xxxx-xxxxx-xx-x', x + w * 0.38, ry + 45, 28, MUTED, { weight: 400 });
        if (warn) { icon(ctx, 'edit', x + w - 60, ry + 34, 22, RED); }
      }
      finger(ctx, x + w * 0.55, y + 84 + 2 * 80 + 34, t, s.tap);
    } else if (i === 2) {
      shadowCard(ctx, x, y, w, 420, 22);
      txt(ctx, 'เลขบัตรประจำตัวประชาชน', x + 40, y + 80, 34, MUTED, { weight: 400 });
      rr(ctx, x + 40, y + 110, w * 0.58, 90, 14, '#F6F5FC', '#C9CCE0', 4);
      txt(ctx, 'x-xxxx-xxxxx-xx-x', x + 64, y + 170, 36, INK, { weight: 400 });
      const pressed = t >= s.tap;
      rr(ctx, x + w * 0.62 + 30, y + 110, w * 0.38 - 70, 90, 14, pressed ? GREEN : PURP);
      txt(ctx, 'ตรวจสอบ', x + w * 0.62 + 30 + (w * 0.38 - 70) / 2, y + 168, 38, '#FFFFFF', { align: 'center' });
      if (pressed) pop(ctx, t, s.tap + 0.25, CX, y + 300, () => { rr(ctx, x + 40, y + 250, w - 80, 110, 16, '#EEF7F1', GREEN, 4); txt(ctx, 'ระบบแสดงผลการตรวจสอบ', CX, y + 320, 36, GREEN, { align: 'center' }); });
      finger(ctx, x + w * 0.81, y + 155, t, s.tap);
    } else {
      shadowCard(ctx, x, y, w, 420, 22);
      const saved = t >= s.t + 0.6;
      rr(ctx, x + 60, y + 90, w - 120, 110, 20, saved ? GREEN : PURP);
      txt(ctx, saved ? 'บันทึกแล้ว ✓'.replace(' ✓', '') + '  ✔' : 'บันทึก', CX, y + 165, 46, '#FFFFFF', { align: 'center' });
      const up = t >= s.tap;
      rr(ctx, x + 60, y + 240, w - 120, 110, 20, up ? GREEN : '#3E2F9C');
      txt(ctx, up ? 'อัปโหลดสำเร็จ' : 'อัปโหลด', CX, y + 315, 46, '#FFFFFF', { align: 'center' });
      finger(ctx, CX + 120, y + 295, t, s.tap);
    }
  }
  function steps(ctx, t) {
    header(ctx, t, EV.steps, 'วิธีแก้ไข 4 ขั้นตอน');
    const cur = S.steps.reduce((a, s, i) => (t >= s.t ? i : a), -1);
    if (cur >= 0) {
      const s = S.steps[cur];
      const k = popK(t, s.t, 0.3);
      ctx.save(); ctx.translate(CX, SF.y + 370); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); ctx.translate(-CX, -(SF.y + 370));
      stepScreen(ctx, cur, t);
      ctx.restore();
    }
    S.steps.forEach((s, i) => {
      const y = SF.y + 640 + i * 150;
      pop(ctx, t, s.t, CX, y + 65, () => {
        const on = i === cur;
        rr(ctx, X0, y, CW, 130, 24, on ? '#FFFFFF' : 'rgba(255,255,255,0.55)', on ? PURP : null, 5);
        ctx.beginPath(); ctx.arc(X0 + 65, y + 65, 40, 0, Math.PI * 2); ctx.fillStyle = on ? PURP : '#A9AFC4'; ctx.fill();
        txt(ctx, String(i + 1), X0 + 65, y + 83, 48, '#FFFFFF', { align: 'center' });
        txt(ctx, s.text, X0 + 125, y + 80, 38, on ? INK : MUTED, { maxW: CW - 145, weight: on ? 700 : 400 });
      });
    });
  }

  function results(ctx, t) {
    header(ctx, t, EV.results, 'กด “ตรวจสอบ” แล้วจะเจอ 3 แบบ');
    S.results.forEach((r, i) => {
      const y = SF.y + 170 + i * 340, h = 310, color = r.del ? RED : GREEN;
      pop(ctx, t, r.t, CX, y + h / 2, () => {
        shadowCard(ctx, X0, y, CW, h, 30);
        ctx.beginPath(); ctx.arc(X0 + 60, y + 70, 36, 0, Math.PI * 2); ctx.fillStyle = NAVY; ctx.fill();
        txt(ctx, String(r.n), X0 + 60, y + 86, 44, '#FFFFFF', { align: 'center' });
        txt(ctx, r.msg, X0 + 115, y + 86, 42, '#B0791A', { maxW: CW - 140 });
        icon(ctx, r.del ? 'del' : 'go', X0 + 80, y + 205, 48, color);
        txt(ctx, r.act, X0 + 150, y + 222, 48, color, { maxW: CW - 175 });
      });
    });
  }

  function when(ctx, t) {
    header(ctx, t, EV.when, 'รอบเวลาที่ต้องรู้');
    S.when.forEach((w, i) => {
      const y = SF.y + 180 + i * 500, h = 450, color = i ? GREEN : PURP;
      pop(ctx, t, w.t, CX, y + h / 2, () => {
        shadowCard(ctx, X0, y, CW, h, 34);
        rr(ctx, X0, y, CW, 120, [34, 34, 0, 0], color);
        txt(ctx, w.day, CX, y + 85, 62, '#FFFFFF', { align: 'center' });
        txt(ctx, w.time, CX, y + 250, 96, color, { align: 'center' });
        txt(ctx, w.text, CX, y + 370, 50, INK, { align: 'center', maxW: CW - 60 });
      });
    });
  }

  function end(ctx, t) {
    pop(ctx, t, EV.end, CX, SF.y + 200, () => {
      rr(ctx, CX - 240, SF.y + 140, 480, 110, 55, PURP);
      txt(ctx, 'ตอนต่อไป', CX, SF.y + 215, 60, '#FFFFFF', { align: 'center' });
    });
    pop(ctx, t, EV.end + 0.4, CX, SF.y + 450, () => {
      shadowCard(ctx, X0, SF.y + 320, CW, 330, 36, NAVY);
      txt(ctx, 'เจอ “ต้องแก้ไข!” แล้ว', CX, SF.y + 420, 52, '#FFD98A', { align: 'center', maxW: CW - 60 });
      txt(ctx, 'ทำยังไง?', CX, SF.y + 510, 64, '#FFFFFF', { align: 'center' });
      txt(ctx, 'วิธีแก้ไข 4 ขั้นตอน', CX, SF.y + 600, 52, '#7CF29B', { align: 'center', maxW: CW - 60 });
    });
    pop(ctx, t, EV.end + 0.9, CX, SF.y + 760, () => txt(ctx, 'ติดตามชมได้เลย!', CX, SF.y + 780, 56, NAVY, { align: 'center' }));
  }

  function background(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#D9F3EC'); g.addColorStop(0.5, '#DDE7FA'); g.addColorStop(1, '#C9D6FB');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.25;
    for (let i = 0; i < 6; i++) { const x = U.hash(i, 1) * W, y = U.hash(i, 2) * H + Math.sin(t * 0.5 + i) * 30, r = 80 + U.hash(i, 3) * 140; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = i % 2 ? '#FFFFFF' : '#B8C8F5'; ctx.fill(); }
    ctx.restore();
    // progress bar along the bottom of the safe area: which part of the guide we are in
    const parts = ['hook', 'where', 'kinds', 'end'];
    const y = SF.y - 46;
    parts.forEach((p, i) => {
      const x = X0 + i * (CW / parts.length);
      const k = clamp((t - S.S[p][0]) / (S.S[p][1] - S.S[p][0]));
      rr(ctx, x + 6, y, CW / parts.length - 12, 12, 6, 'rgba(31,47,107,0.15)');
      if (k > 0) rr(ctx, x + 6, y, (CW / parts.length - 12) * k, 12, 6, NAVY);
    });
  }

  // wrap Thai text by words (Intl.Segmenter knows Thai word breaks)
  const seg = new Intl.Segmenter('th', { granularity: 'word' });
  function wrap(ctx, str, size, maxW) {
    const lines = []; let cur = '';
    for (const { segment } of seg.segment(str)) {
      const next = cur + segment;
      if (cur && G.measure(ctx, next.trim(), size, THAI, 700) > maxW) { lines.push(cur.trim()); cur = segment.trimStart(); } else cur = next;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  }
  // the little presenter at the bottom edge: a framed window (the Flow clip is laid into it after rendering)
  // and a speech bubble with the line he is saying right now
  function narrator(ctx, t) {
    const { feetX, feetY } = NARR;
    // soft floor shadow under his feet (the cut-out figure is laid over it after rendering)
    const g = ctx.createRadialGradient(feetX, feetY, 0, feetX, feetY, 170);
    g.addColorStop(0, 'rgba(20,30,80,0.38)'); g.addColorStop(1, 'rgba(20,30,80,0)');
    ctx.save(); ctx.translate(feetX, feetY); ctx.scale(1, 0.22); ctx.translate(-feetX, -feetY); ctx.fillStyle = g; ctx.fillRect(feetX - 170, feetY - 170, 340, 340); ctx.restore();
    const line = VO.find((v) => t >= v.t && t < v.end + 0.4);
    if (!line) return;
    const a = clamp((t - line.t) / 0.2) * (1 - clamp((t - line.end - 0.2) / 0.2));
    const bx = 440, bw = X1 + 100 - bx, by = 1470;
    const size = 34, lines = wrap(ctx, line.text, size, bw - 48).slice(0, 6);
    const bh = Math.max(140, lines.length * size * 1.42 + 44);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(0, 12 * (1 - ease.outCubic(clamp((t - line.t) / 0.25))));
    ctx.save(); ctx.shadowColor = 'rgba(20,30,80,0.25)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 26); ctx.moveTo(bx + 2, by + 40); ctx.lineTo(bx - 50, by + 30); ctx.lineTo(bx + 2, by + 80); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore();
    lines.forEach((l, i) => txt(ctx, l, bx + 24, by + 22 + size + i * size * 1.42, size, INK, { weight: 700 }));
    ctx.restore();
  }

  const SCENES = { hook, where, kinds, steps, results, when, end };
  S.S = S.S || S.S;
  Studio.film({
    draw(ctx, t) {
      background(ctx, t);
      const name = Object.keys(SCENES).find((k) => t >= S.S[k][0] && t < S.S[k][1]) || 'end';
      SCENES[name](ctx, t);
      const cut = S.S[name][0];
      const f = cut > 0 ? 0.5 * Math.exp(-(t - cut) * 14) : 0;
      if (f > 0.01) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H); }
      narrator(ctx, t);
    },
    post: { paper: 0, vignette: 0.12, grain: 0.015 },
    fadeOut: 1,
  });
})();
