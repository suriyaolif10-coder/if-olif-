/* ============================================================
   player.js — timeline clock, scene compositing & transitions,
   responsive full-screen vertical player UI, file loading,
   subtitle timing mode and WebM export.
   ============================================================ */
'use strict';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const mkBuf = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d'); };
const bufA = mkBuf(), bufB = mkBuf();
let TR = 0.6;                                       // transition length (s) — adjustable in ⚙
let TRANS_OVERRIDE = 'auto';                         // 'auto' = per-scene choice in scenes.js
const params = new URLSearchParams(location.search);

/* ---------------- rendering ---------------- */
function sceneIndex(t) { const i = SCENES.findIndex(s => t < s.start + s.dur); return i < 0 ? SCENES.length - 1 : i; }
function drawScene(c, i, t) {
  if (typeof drawSceneLayered === 'function') return drawSceneLayered(c, i, t);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const sc = SCENES[i];   // scenes are authored in 'design' seconds and stretched to their real duration
  sc.draw(c, (t - sc.start) * (sc.design || sc.dur) / sc.dur); c.restore();
}

function composite(c, k, type, t) {
  c.drawImage(bufA.canvas, 0, 0);
  c.save();
  if (type === 'fade') { c.globalAlpha = k; c.drawImage(bufB.canvas, 0, 0); c.restore(); return; }
  if (type === 'panel') {
    const y = (1 - k) * H;
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, y - 30, W, 30);
    c.drawImage(bufB.canvas, 0, y);
    line(c, [[0, y], [W, y]], INK, 18); c.restore(); return;
  }
  if (type === 'ink') {   // ink splat: one outer outline (black + yellow), new scene inside
    const circ = [...Array(9)].map((_, i) => [E.hash(i * 3.1) * W, E.hash(i * 7.7) * H, k * (520 + 420 * E.hash(i * 1.9))]);
    const fillC = (pad, col) => { c.beginPath(); for (const [x, y, r] of circ) { c.moveTo(x + r + pad, y); c.arc(x, y, r + pad, 0, Math.PI * 2); } if (col) { c.fillStyle = col; c.fill(); } };
    if (k < 0.999) { fillC(16, INK); fillC(7, '#ffd84a'); }
    fillC(0); c.clip(); c.drawImage(bufB.canvas, 0, 0); c.restore(); return;
  }
  c.beginPath();
  if (type === 'slash') {
    const p = E.lerp(-700, W + 700, k);
    c.moveTo(-700, -100); c.lineTo(p + 350, -100); c.lineTo(p - 350, H + 100); c.lineTo(-700, H + 100); c.closePath();
  } else if (type === 'iris') {
    c.arc(W / 2, H / 2, k * 1150, 0, Math.PI * 2);
  }
  c.save(); c.clip(); c.drawImage(bufB.canvas, 0, 0); c.restore();
  c.lineWidth = 18; c.strokeStyle = INK; c.stroke();
  c.lineWidth = 6; c.strokeStyle = '#ffd84a'; c.stroke();
  c.restore();
}

function badge(c) {
  c.save(); setFont(c, 26, 600);
  const s = 'ภาพวาดจำลอง · ไม่ใช่ภาพถ่ายจริง', w = c.measureText(s).width + 36;
  c.globalAlpha = 0.85; c.fillStyle = 'rgba(15,10,5,0.6)'; c.beginPath(); c.roundRect(24, 24, w, 46, 23); c.fill();
  c.globalAlpha = 1; c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(s, 42, 48);
  c.restore();
}

function renderAt(t) {
  t = E.clamp(t, 0, DURATION - 1e-3);
  const i = sceneIndex(t), lt = t - SCENES[i].start;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const tr = TRANS_OVERRIDE === 'auto' ? SCENES[i].transition : TRANS_OVERRIDE;
  if (i > 0 && lt < TR && tr !== 'none') {
    drawScene(bufA, i - 1, t); drawScene(bufB, i, t);
    composite(ctx, E.inOut(lt / TR), tr, t);
  } else drawScene(ctx, i, t);
  FX.apply(ctx, t);
  badge(ctx);
  Subs.draw(ctx, t);
  const fade = Math.max(1 - t / 0.5, 1 - (DURATION - t) / 0.8, 0);
  if (fade > 0) { ctx.save(); ctx.globalAlpha = E.clamp(fade); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
window.renderAt = renderAt;                 // for automated frame export / tests
window.DURATION = DURATION;

/* ---------------- clock ---------------- */
let playing = false, T = +params.get('t') || 0, last = performance.now(), drawnAt = -1, dirty = true, ready = false;
let recorder = null;

function play() {
  if (T >= DURATION - 0.05) T = 0;
  playing = true; AudioEng.play(T); UI.sync(true); UI.poke();
}
function pause() { playing = false; AudioEng.pause(); UI.sync(true); UI.poke(); }
function toggle() { playing ? pause() : play(); }
function seek(t) { T = E.clamp(t, 0, DURATION - 1 / FPS); AudioEng.seek(T); dirty = true; if (playing) AudioEng.play(T); UI.sync(true); }

function tick(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing) {
    if (AudioEng.voiceOK && AudioEng.voicePlaying && T < AudioEng.voiceDuration) T = AudioEng.voiceTime;   // voice-over is the master clock
    else T += dt;
    if (T >= DURATION) { T = DURATION - 1 / FPS; pause(); if (recorder) recorder.stop(); }
  }
  const tq = Math.floor(T * FPS) / FPS;     // quantise to 30 fps frames
  if (ready && (tq !== drawnAt || dirty)) { renderAt(tq); drawnAt = tq; dirty = false; }
  AudioEng.update(T);
  UI.sync();
  requestAnimationFrame(tick);
}

/* ---------------- UI ---------------- */
const $ = id => document.getElementById(id);
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const UI = (() => {
  const hud = $('hud'), seekEl = $('seek'), panel = $('panel');
  let hideTimer = 0, lastSec = -1;
  function markers() {   // scene markers on the scrubber (rebuilt when timings change)
    seekEl.max = DURATION; $('marks').innerHTML = '';
    SCENES.forEach(s => { const m = document.createElement('i'); m.style.left = (s.start / DURATION * 100) + '%'; m.title = s.title; $('marks').appendChild(m); });
  }
  markers();

  function poke() {
    hud.classList.remove('idle'); clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (playing && panel.hidden) hud.classList.add('idle'); }, 2600);
  }
  function sync(force) {
    if (!force && Math.floor(T * 4) === lastSec) return; lastSec = Math.floor(T * 4);
    if (document.activeElement !== seekEl) seekEl.value = T;
    seekEl.style.setProperty('--p', (T / DURATION * 100) + '%');
    $('time').textContent = `${fmt(T)} / ${fmt(DURATION)}`;
    $('sceneName').textContent = `${sceneIndex(T) + 1}/${SCENES.length} · ${SCENES[sceneIndex(T)].title}`;
    $('btnPlay').textContent = playing ? '❚❚' : '▶';
    $('bigplay').hidden = playing;
  }
  function status() {
    $('voiceStatus').textContent = AudioEng.voiceOK
      ? `🎙 เสียงบรรยาย: พร้อม (${fmt(AudioEng.voiceDuration)})`
      : '🎙 ยังไม่มีเสียงบรรยาย — โหลดไฟล์ หรือวางไว้ที่ assets/audio/voiceover.mp3 (ซับไตเติลยังเล่นตามเวลาในสคริปต์)';
  }
  function toast(msg, ms = 3200) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), ms); }

  // controls
  $('bigplay').onclick = () => { AudioEng.ensure(); play(); };
  $('btnPlay').onclick = () => { AudioEng.ensure(); toggle(); };
  $('btnPrev').onclick = () => { const i = sceneIndex(T); seek(T - SCENES[i].start > 1 || i === 0 ? SCENES[i].start : SCENES[i - 1].start); };
  $('btnNext').onclick = () => { const i = sceneIndex(T); if (i < SCENES.length - 1) seek(SCENES[i + 1].start); };
  seekEl.oninput = () => seek(+seekEl.value);
  $('btnCC').onclick = () => { Subs.enabled = !Subs.enabled; $('btnCC').classList.toggle('on', Subs.enabled); dirty = true; };
  $('btnMute').onclick = () => { AudioEng.muted = !AudioEng.muted; $('btnMute').textContent = AudioEng.muted ? '🔇' : '🔊'; };
  $('btnSet').onclick = () => { panel.hidden = !panel.hidden; poke(); };
  $('btnFS').onclick = () => { const el = $('stage'); document.fullscreenElement ? document.exitFullscreen() : (el.requestFullscreen || el.webkitRequestFullscreen).call(el); };
  for (const k of ['voice', 'music', 'sfx']) { const r = $('vol_' + k); r.value = AudioEng.getVol(k); r.oninput = () => AudioEng.setVol(k, +r.value); }
  $('fileVoice').onchange = e => { const f = e.target.files[0]; if (f) { AudioEng.ensure(); AudioEng.loadFile(f, 'voice'); toast('โหลดเสียงบรรยายแล้ว: ' + f.name); } };
  $('fileMusic').onchange = e => { const f = e.target.files[0]; if (f) { AudioEng.ensure(); AudioEng.loadFile(f, 'music'); toast('โหลดเพลงประกอบแล้ว: ' + f.name); } };
  $('fileWords').onchange = e => { const f = e.target.files[0]; if (f) importJSON(f); };
  $('btnTiming').onclick = () => Timing.toggle();
  $('btnMark').onclick = () => Timing.mark();
  $('btnCopy').onclick = () => { navigator.clipboard && navigator.clipboard.writeText($('timingOut').value); toast('คัดลอกแล้ว'); };
  $('btnRec').onclick = () => record();
  $('transSel').onchange = e => { TRANS_OVERRIDE = e.target.value; dirty = true; };
  $('transLen').oninput = e => { TR = +e.target.value; $('transLenV').textContent = TR.toFixed(1) + ' วิ'; dirty = true; };

  ['pointermove', 'pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, poke));
  cv.addEventListener('click', () => { AudioEng.ensure(); toggle(); });

  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const k = e.key;
    if (k === ' ') { e.preventDefault(); AudioEng.ensure(); toggle(); }
    else if (k === 'ArrowRight') seek(T + 5); else if (k === 'ArrowLeft') seek(T - 5);
    else if (k === '.') { pause(); seek(T + 1 / FPS); } else if (k === ',') { pause(); seek(T - 1 / FPS); }
    else if (k === 'PageDown') $('btnNext').onclick(); else if (k === 'PageUp') $('btnPrev').onclick();
    else if (k === 'Home') seek(0);
    else if (k === 'c' || k === 'C') $('btnCC').onclick();
    else if (k === 'm' || k === 'M') $('btnMute').onclick();
    else if (k === 'f' || k === 'F') $('btnFS').onclick();
    else if (k === 't' || k === 'T') Timing.toggle();
    else if (k === 'Enter' && Timing.on) { e.preventDefault(); Timing.mark(); }
  });

  // drag & drop: audio → voice (or music if the name says so), .json → word timings
  const stage = $('stage');
  stage.addEventListener('dragover', e => { e.preventDefault(); stage.classList.add('drop'); });
  stage.addEventListener('dragleave', () => stage.classList.remove('drop'));
  stage.addEventListener('drop', e => {
    e.preventDefault(); stage.classList.remove('drop');
    for (const f of e.dataTransfer.files) {
      if (/\.json$/i.test(f.name)) importJSON(f);
      else if (f.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac)$/i.test(f.name)) {
        const kind = /music|bgm|เพลง/i.test(f.name) ? 'music' : 'voice';
        AudioEng.ensure(); AudioEng.loadFile(f, kind); toast((kind === 'music' ? 'เพลงประกอบ: ' : 'เสียงบรรยาย: ') + f.name);
      }
    }
  });

  return { sync, poke, status, toast, markers };
})();
window.UI = UI;

function importJSON(f) {
  f.text().then(s => { const n = Subs.importWords(JSON.parse(s)); resync(); UI.toast(`นำเข้าเวลาของคำ ${n} คำแล้ว`); })
    .catch(err => UI.toast('นำเข้าไม่สำเร็จ: ' + err.message, 5000));
}

function resync() { syncScenesToNarration(); UI.markers(); dirty = true; UI.sync(true); }

/* ---------------- subtitle timing mode ----------------
   Play the voice-over and press Enter (or the big button) at the
   moment each narration line BEGINS. Times apply live and are
   printed as JS you can paste into narration.js.               */
const Timing = (() => {
  let on = false, idx = 0;
  const box = $('timing');
  function show() {
    const l = NARRATION.lines[idx];
    $('timingNext').textContent = l ? `บรรทัดถัดไป (${idx + 1}/${NARRATION.lines.length}): ${l.text.replace(/[[\]]/g, '')}` : 'ครบทุกบรรทัดแล้ว — กด T เพื่อจบ';
    $('timingOut').value = 'lines: [\n' + NARRATION.lines.map(l => `  { start: ${l.start.toFixed(2)}, end: ${l.end.toFixed(2)}, text: '${l.text}' },`).join('\n') + '\n],';
  }
  return {
    get on() { return on; },
    toggle() {
      on = !on; box.hidden = !on;
      if (on) { idx = 0; seek(0); pause(); show(); UI.toast('โหมดจับเวลา: กดเล่น แล้วกด Enter ตอนเริ่มพูดแต่ละบรรทัด'); }
      else { const L = NARRATION.lines; if (idx > 0 && idx <= L.length) L[idx - 1].end = Math.max(L[idx - 1].end, L[idx - 1].start + 1); show(); Subs.rebuild(); resync(); box.hidden = false; setTimeout(() => (box.hidden = true), 15000); }
    },
    mark() {
      if (!on) return;
      const L = NARRATION.lines; if (idx >= L.length) return;
      if (!playing) { AudioEng.ensure(); play(); }
      if (idx > 0) L[idx - 1].end = Math.max(L[idx - 1].start + 0.5, T - 0.15);
      const len = L[idx].end - L[idx].start;
      L[idx].start = T; L[idx].end = T + len; delete L[idx].words;
      idx++; Subs.rebuild(); resync(); show();
    },
  };
})();

/* ---------------- WebM export (real-time) ---------------- */
function record() {
  if (recorder) { recorder.stop(); return; }
  if (!window.MediaRecorder || !cv.captureStream) { UI.toast('เบราว์เซอร์นี้ไม่รองรับการบันทึกวิดีโอ'); return; }
  AudioEng.ensure();
  if (!AudioEng.recordable) UI.toast('เปิดผ่าน file:// เสียงบรรยายจะไม่ถูกบันทึก — เปิดผ่านเว็บเซิร์ฟเวอร์ หรือโหลดไฟล์เสียงด้วยปุ่ม 🎙', 6000);
  const stream = new MediaStream([...cv.captureStream(FPS).getVideoTracks(), ...AudioEng.stream.getAudioTracks()]);
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
  const chunks = [];
  recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
  recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
  recorder.onstop = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
    a.download = 'udorn-air-america.webm'; a.click(); recorder = null; $('btnRec').textContent = '⏺ บันทึกวิดีโอ (WebM)'; UI.toast('บันทึกเสร็จแล้ว');
  };
  seek(0); recorder.start(250); play();
  $('btnRec').textContent = '⏹ หยุดบันทึก'; $('panel').hidden = true;
}

/* ---------------- boot ---------------- */
(async () => {
  if (params.get('still') === '1') document.body.classList.add('still');
  $('voice').src = NARRATION.voiceSrc; $('music').src = NARRATION.musicSrc;
  try { await Promise.all([document.fonts.load(`700 64px Kanit`), document.fonts.load(`600 30px Kanit`)]); } catch (e) { /* fall back to system Thai font */ }
  try { await LOGO.decode(); } catch (e) { /* logo optional */ }
  ready = true; dirty = true; Subs.rebuild(); UI.status(); UI.sync(true);
  if (params.get('autoplay') === '1') { AudioEng.ensure(); play(); }
  requestAnimationFrame(tick);
  window.__ready = true;
})();
