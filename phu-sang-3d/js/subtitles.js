/* ============================================================
   subtitles.js — Thai word-by-word subtitles
   white text, thick black outline, [keywords] in yellow,
   each word pops in at its own start time.
   ============================================================ */
'use strict';

const Subs = (() => {
  const SIZE = 66, MAXW = 960, ROW = 92, BASE_Y = 1610;
  const seg = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
  const MARKS = /[ัิ-ฺ็-๎]/g;           // Thai combining marks (don't take speaking time)
  let built = null, enabled = true;

  function parse(text) {
    let plain = '', last = 0, m; const kw = [], re = /\[([^\]]+)\]/g;
    while ((m = re.exec(text))) { plain += text.slice(last, m.index); const s = plain.length; plain += m[1]; kw.push([s, plain.length, m[1]]); last = re.lastIndex; }
    plain += text.slice(last);
    return { plain, kw };
  }

  function tokenize(plain, kw) {
    const out = [];
    const parts = seg ? [...seg.segment(plain)].map(s => ({ w: s.segment, i: s.index })) :
      plain.split(/(\s+)/).reduce((a, w) => { a.push({ w, i: a.length ? a[a.length - 1].i + a[a.length - 1].w.length : 0 }); return a; }, []);
    for (const p of parts) {
      if (/^\s+$/.test(p.w)) { if (out.length) out[out.length - 1].space = true; continue; }
      const isKw = kw.some(([a, b]) => p.i >= a && p.i < b);
      const prev = out[out.length - 1];
      // glue repeat mark / punctuation / keyword pieces without spaces onto the previous token
      if (prev && !prev.space && (/^[ๆฯ.,!?)”"'’:;\-]+$/.test(p.w) || /^[\u0E30-\u0E3A\u0E45\u0E47-\u0E4E]/.test(p.w) || (isKw && prev.kw && kw.some(([a, b]) => p.i > a && p.i < b && prev.i >= a)))) {
        prev.w += p.w; continue;
      }
      out.push({ w: p.w, i: p.i, kw: isKw, space: false });
    }
    return out;
  }

  function timeTokens(line, toks) {
    const wgt = toks.map(t => Math.max(1, t.w.replace(MARKS, '').length) + (t.space ? 2 : 0));
    const tot = wgt.reduce((a, b) => a + b, 0), span = line.end - line.start;
    let acc = 0;
    toks.forEach((t, i) => { t.start = line.start + span * acc / tot; acc += wgt[i]; t.end = line.start + span * acc / tot; });
  }

  function build(ctx) {
    ctx.save(); setFont(ctx, SIZE, 700);
    const spaceW = ctx.measureText(' ').width;
    built = NARRATION.lines.map((line, li) => {
      const { plain, kw } = parse(line.text);
      let toks;
      if (Array.isArray(line.words) && line.words.length) {      // exact word timings supplied
        toks = line.words.map(([w, s, e], i) => ({ w, start: s, end: e, space: i < line.words.length - 1, kw: kw.some(k => k[2].includes(w) || w.includes(k[2])) }));
      } else { toks = tokenize(plain, kw); timeTokens(line, toks); }
      toks.forEach(t => (t.width = ctx.measureText(t.w).width));
      // pages of max 2 rows
      const pages = []; let rows = [[]], rw = 0;
      for (const t of toks) {
        const prev = rows[rows.length - 1].slice(-1)[0];
        const add = t.width + (prev && prev.space ? spaceW : 0);
        if (rw + add > MAXW && rows[rows.length - 1].length) {
          if (rows.length === 2) { pages.push(rows); rows = [[]]; } else rows.push([]);
          rw = 0;
        }
        rows[rows.length - 1].push(t); rw += rows[rows.length - 1].length === 1 ? t.width : add;
      }
      if (rows[0].length) pages.push(rows);
      pages.forEach((p, pi) => {
        const all = p.flat();
        p.start = all[0].start;
        p.end = pi < pages.length - 1 ? pages[pi + 1].flat()[0].start : line.end + 0.4;
        // x layout
        p.forEach(row => {
          const w = row.reduce((s, t, i) => s + t.width + (i && row[i - 1].space ? spaceW : 0), 0);
          let x = (W - w) / 2;
          row.forEach((t, i) => { if (i && row[i - 1].space) x += spaceW; t.x = x; x += t.width; });
        });
      });
      return { line, li, pages };
    });
    ctx.restore();
  }

  function draw(ctx, t) {
    if (!enabled) return;
    if (!built) build(ctx);
    let cur = null;                                   // only the most recent line that has started
    for (const b of built) if (t >= b.line.start - 0.05 && t <= b.line.end + 0.4 && (!cur || b.line.start >= cur.line.start)) cur = b;
    for (const b of cur ? [cur] : []) {
      const page = b.pages.find(p => t >= p.start - 0.05 && t < p.end);
      if (!page) continue;
      ctx.save(); setFont(ctx, SIZE, 700); ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      const y0 = page.length === 1 ? BASE_Y + ROW / 2 : BASE_Y;
      page.forEach((row, ri) => row.forEach(tk => {
        if (t < tk.start) return;
        const k = E.seg(t, tk.start, tk.start + 0.14), sc = 1 + 0.22 * (1 - E.out(k));
        const cx = tk.x + tk.width / 2, cy = y0 + ri * ROW;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
        ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.strokeText(tk.w, -tk.width / 2, 0);
        ctx.fillStyle = tk.kw ? '#ffd400' : '#ffffff'; ctx.fillText(tk.w, -tk.width / 2, 0);
        ctx.restore();
      }));
      ctx.restore();
    }
  }

  /* narration "is speaking" → used for audio ducking */
  function active(t) { return NARRATION.lines.some(l => t >= l.start - 0.2 && t <= l.end + 0.3); }

  /* import word timestamps: [{word|text, start, end}] or {segments:[{words:[...]}]} or {words:[...]} */
  function importWords(json) {
    let words = Array.isArray(json) ? json : json.words || (json.segments || []).flatMap(s => s.words || []);
    words = words.map(w => [String(w.word ?? w.text ?? '').trim(), +w.start, +w.end]).filter(w => w[0] && isFinite(w[1]));
    if (!words.length) throw new Error('ไม่พบข้อมูลเวลาของคำในไฟล์');
    const L = NARRATION.lines;
    L.forEach((l, i) => {
      const from = i ? (L[i - 1].end + l.start) / 2 : -1, to = i < L.length - 1 ? (l.end + L[i + 1].start) / 2 : 1e9;
      const ws = words.filter(w => w[1] >= from && w[1] < to);
      if (ws.length) { l.words = ws; l.start = ws[0][1]; l.end = ws[ws.length - 1][2]; }
    });
    built = null;
    return words.length;
  }

  return { draw, active, importWords, rebuild: () => (built = null), set enabled(v) { enabled = v; }, get enabled() { return enabled; } };
})();
