/* ============================================================
   audio.js — voice-over, music and sound effects
   · Voice-over is ALWAYS dominant: music ducks to ~30 % and sfx
     to ~45 % while a narration line is active; a compressor sits
     on the master bus.
   · Music: assets/audio/music.mp3 if present, otherwise a soft
     built-in synth score (seek-safe, follows the timeline).
   · SFX are synthesised (no files needed) and driven by the
     scene cue lists in scenes.js.
   ============================================================ */
'use strict';

const AudioEng = (() => {
  const voice = document.getElementById('voice');
  const music = document.getElementById('music');
  const st = {
    ac: null, comp: null, master: null, dest: null, buses: {}, noise: null,
    voiceOK: false, musicOK: false, routed: new Set(),
    vol: { voice: 1, music: 0.7, sfx: 0.8, master: 1 }, muted: false,
    fired: new Set(), active: [], synth: { next: 0, voices: [] }, playing: false,
  };

  voice.addEventListener('loadedmetadata', () => { st.voiceOK = isFinite(voice.duration) && voice.duration > 0; route(voice, 'voice'); window.UI && window.UI.status(); });
  voice.addEventListener('error', () => { st.voiceOK = false; window.UI && window.UI.status(); });
  music.addEventListener('loadedmetadata', () => { st.musicOK = true; route(music, 'music'); });
  music.addEventListener('error', () => { st.musicOK = false; });

  function ensure() {
    if (st.ac) { if (st.ac.state === 'suspended') st.ac.resume(); return; }
    const ac = st.ac = new (window.AudioContext || window.webkitAudioContext)();
    st.comp = ac.createDynamicsCompressor();
    st.comp.threshold.value = -16; st.comp.ratio.value = 4; st.comp.attack.value = 0.005; st.comp.release.value = 0.2;
    st.master = ac.createGain(); st.comp.connect(st.master); st.master.connect(ac.destination);
    st.dest = ac.createMediaStreamDestination(); st.master.connect(st.dest);
    for (const b of ['voice', 'music', 'sfx']) { st.buses[b] = ac.createGain(); st.buses[b].connect(st.comp); }
    st.buses.voice.gain.value = 1.0;
    const n = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    st.noise = n;
    route(voice, 'voice'); route(music, 'music');
  }

  /* media elements go through WebAudio when allowed (http/https or blob:) — needed for
     ducking precision and for recording. On file:// we fall back to element.volume. */
  function canRoute(el) { return el.currentSrc && (location.protocol !== 'file:' || el.currentSrc.startsWith('blob:')); }
  function route(el, bus) {
    if (!st.ac || st.routed.has(el) || !canRoute(el)) return;
    try { st.ac.createMediaElementSource(el).connect(st.buses[bus]); st.routed.add(el); } catch (e) { console.warn(e); }
  }

  /* ---------- synthesised sfx ---------- */
  const env = (g, t0, dur, peak, a = 0.05, r = 0.25) => {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(a, dur / 2));
    g.gain.setValueAtTime(peak, Math.max(t0 + a, t0 + dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  };
  function noiseSrc() { const s = st.ac.createBufferSource(); s.buffer = st.noise; s.loop = true; return s; }
  function filt(type, f, q = 0.7) { const b = st.ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  function osc(type, f) { const o = st.ac.createOscillator(); o.type = type; o.frequency.value = f; return o; }

  const SFX = {
    jet(t0, d, v, off) {
      const ac = st.ac, n = noiseSrc(), bp = filt('bandpass', 380, 0.6), lp = filt('lowpass', 2600), g = ac.createGain();
      const p = off / d; bp.frequency.setValueAtTime(380 + 1100 * p, t0); bp.frequency.linearRampToValueAtTime(1500, t0 + d * 0.7);
      n.connect(bp); bp.connect(lp); lp.connect(g);
      const r = osc('sawtooth', 48), rl = filt('lowpass', 160), rg = ac.createGain(); rg.gain.value = 0.5; r.connect(rl); rl.connect(rg); rg.connect(g);
      env(g, t0, d, v, 0.8, 1.6); g.connect(st.buses.sfx); [n, r].forEach(s => { s.start(t0); s.stop(t0 + d + 0.1); });
      return [n, r];
    },
    prop(t0, d, v) {
      const ac = st.ac, g = ac.createGain(), lp = filt('lowpass', 650);
      const o1 = osc('sawtooth', 84), o2 = osc('sawtooth', 168), am = osc('sine', 21), amg = ac.createGain(), vca = ac.createGain();
      amg.gain.value = 0.35; vca.gain.value = 0.65; am.connect(amg); amg.connect(vca.gain);
      o1.connect(lp); o2.connect(lp); lp.connect(vca); vca.connect(g);
      env(g, t0, d, v * 0.5, 0.6, 1.2); g.connect(st.buses.sfx); [o1, o2, am].forEach(s => { s.start(t0); s.stop(t0 + d + 0.1); });
      return [o1, o2, am];
    },
    heli(t0, d, v) {
      const ac = st.ac, g = ac.createGain(), n = noiseSrc(), lp = filt('lowpass', 420), vca = ac.createGain();
      const lfo = osc('square', 5.4), lg = ac.createGain(); lg.gain.value = 0.45; vca.gain.value = 0.55; lfo.connect(lg); lg.connect(vca.gain);
      n.connect(lp); lp.connect(vca);
      const r = osc('sawtooth', 36), rl = filt('lowpass', 140); r.connect(rl); rl.connect(vca);
      vca.connect(g); env(g, t0, d, v * 0.7, 0.8, 1.4); g.connect(st.buses.sfx);
      [n, lfo, r].forEach(s => { s.start(t0); s.stop(t0 + d + 0.1); });
      return [n, lfo, r];
    },
    wind(t0, d, v) {
      const ac = st.ac, g = ac.createGain(), n = noiseSrc(), lp = filt('lowpass', 500);
      const m = osc('sine', 0.15), mg = ac.createGain(); mg.gain.value = 250; m.connect(mg); mg.connect(lp.frequency);
      n.connect(lp); lp.connect(g); env(g, t0, d, v * 0.35, 1.2, 1.5); g.connect(st.buses.sfx);
      [n, m].forEach(s => { s.start(t0); s.stop(t0 + d + 0.1); }); return [n, m];
    },
    whoosh(t0, d = 0.7, v) {
      const ac = st.ac, g = ac.createGain(), n = noiseSrc(), bp = filt('bandpass', 300, 1.2);
      bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(2600, t0 + d * 0.6);
      n.connect(bp); bp.connect(g); env(g, t0, d, v * 0.6, d * 0.4, d * 0.5); g.connect(st.buses.sfx);
      n.start(t0); n.stop(t0 + d + 0.05); return [n];
    },
    stamp(t0, d, v) {
      const ac = st.ac, g = ac.createGain(), o = osc('sine', 110);
      o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.25);
      o.connect(g); env(g, t0, 0.3, v * 0.9, 0.005, 0.2);
      const n = noiseSrc(), hp = filt('highpass', 1800), ng = ac.createGain(); n.connect(hp); hp.connect(ng); env(ng, t0, 0.07, v * 0.5, 0.002, 0.05);
      g.connect(st.buses.sfx); ng.connect(st.buses.sfx); o.start(t0); o.stop(t0 + 0.35); n.start(t0); n.stop(t0 + 0.1); return [o, n];
    },
    pop(t0, d, v) {
      const ac = st.ac, g = ac.createGain(), o = osc('sine', 520);
      o.frequency.setValueAtTime(520, t0); o.frequency.exponentialRampToValueAtTime(980, t0 + 0.08);
      o.connect(g); env(g, t0, 0.12, v * 0.35, 0.005, 0.08); g.connect(st.buses.sfx); o.start(t0); o.stop(t0 + 0.15); return [o];
    },
    thud(t0, d, v) {
      const ac = st.ac, g = ac.createGain(), o = osc('sine', 120);
      o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.3);
      o.connect(g); env(g, t0, 0.35, v * 0.8, 0.005, 0.25); g.connect(st.buses.sfx); o.start(t0); o.stop(t0 + 0.4); return [o];
    },
  };
  const ONE_SHOT = { stamp: 0.3, pop: 0.12, thud: 0.35 };

  /* ---------- built-in music: slow cinematic progression Am–F–C–G at 80 BPM ---------- */
  const BEAT = 0.75, PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function synthSchedule(t) {
    const ac = st.ac, s = st.synth, ahead = 0.5;
    if (s.next < t - 0.05) s.next = Math.ceil(t / BEAT) * BEAT;
    while (s.next < t + ahead && s.next < DURATION) {
      const beat = Math.round(s.next / BEAT), chord = PROG[Math.floor(beat / 4) % 4], at = ac.currentTime + (s.next - t);
      if (beat % 4 === 0) chord.forEach(m => {             // pad
        const o = osc('triangle', hz(m)), o2 = osc('sine', hz(m) * 1.003), g = ac.createGain(), lp = filt('lowpass', 1400);
        o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(st.buses.music);
        env(g, at, BEAT * 4 + 0.6, 0.06, 0.9, 1.2); o.start(at); o2.start(at); o.stop(at + BEAT * 4 + 0.7); o2.stop(at + BEAT * 4 + 0.7);
        s.voices.push(o, o2);
      });
      const b = osc('sine', hz(chord[0] - 24)), bg = ac.createGain();      // bass pulse
      b.connect(bg); bg.connect(st.buses.music); env(bg, at, 0.6, beat % 2 ? 0.08 : 0.14, 0.01, 0.4); b.start(at); b.stop(at + 0.65); s.voices.push(b);
      if (beat % 2) { const n = noiseSrc(), hp = filt('highpass', 6000), ng = ac.createGain(); n.connect(hp); hp.connect(ng); ng.connect(st.buses.music);
        env(ng, at, 0.06, 0.03, 0.002, 0.04); n.start(at); n.stop(at + 0.08); s.voices.push(n); }
      s.next += BEAT;
    }
    if (s.voices.length > 200) s.voices.splice(0, 100);
  }
  function synthStop() { st.synth.voices.forEach(v => { try { v.stop(); } catch (e) { /* already stopped */ } }); st.synth.voices = []; st.synth.next = 0; }

  function stopSfx() { st.active.forEach(a => a.nodes.forEach(n => { try { n.stop(); } catch (e) { /* */ } })); st.active = []; }

  /* ---------- public ---------- */
  function play(t) {
    ensure(); st.playing = true; st.fired.clear(); synthStop();
    if (st.voiceOK && t < voice.duration) { voice.currentTime = t; voice.play().catch(() => {}); }
    if (st.musicOK) { music.currentTime = t % (music.duration || 1e9); music.play().catch(() => {}); }
  }
  function pause() { st.playing = false; voice.pause(); music.pause(); stopSfx(); synthStop(); }
  function seek(t) { stopSfx(); synthStop(); st.fired.clear(); if (st.voiceOK) voice.currentTime = Math.min(t, voice.duration || t); if (st.musicOK) music.currentTime = t % (music.duration || 1e9); }

  function update(t) {
    if (!st.ac || !st.playing) return;
    const ac = st.ac, now = ac.currentTime, talking = Subs.active(t);
    const v = st.muted ? 0 : st.vol.master;
    st.buses.voice.gain.setTargetAtTime(v * st.vol.voice, now, 0.05);
    st.buses.music.gain.setTargetAtTime(v * st.vol.music * (talking ? 0.3 : 1) * 0.9, now, 0.25);
    st.buses.sfx.gain.setTargetAtTime(v * st.vol.sfx * (talking ? 0.45 : 1), now, 0.15);
    if (!st.routed.has(voice)) voice.volume = E.clamp(v * st.vol.voice);
    if (!st.routed.has(music)) music.volume = E.clamp(v * st.vol.music * (talking ? 0.3 : 1) * 0.6);
    if (!st.musicOK) synthSchedule(t);
    // scene sfx cues
    SCENES.forEach((sc, si) => sc.sfx.forEach((q, qi) => {
      const key = si + ':' + qi, at = sc.start + q.at, dur = ONE_SHOT[q.type] || q.dur || 1;
      if (st.fired.has(key) || t < at || t >= at + dur) return;
      const late = t - at;
      if (ONE_SHOT[q.type] && late > 0.12) { st.fired.add(key); return; }
      if (!ONE_SHOT[q.type] && dur - late < 0.4) { st.fired.add(key); return; }
      st.fired.add(key);
      const nodes = SFX[q.type](now + 0.01, dur - late, q.vol ?? 1, late);
      st.active.push({ nodes, end: now + dur - late });
    }));
    st.active = st.active.filter(a => a.end > now);
  }

  function loadFile(file, kind) {
    const url = URL.createObjectURL(file);
    const el = kind === 'music' ? music : voice;
    if (st.routed.has(el)) { el.src = url; return; }          // already routed through WebAudio
    // an element that was not routed (file://) can still be routed now, because blob: is allowed
    el.src = url; el.load();
  }

  return {
    ensure, play, pause, seek, update, loadFile,
    get voiceOK() { return st.voiceOK; }, get voiceDuration() { return voice.duration; }, get voiceTime() { return voice.currentTime; },
    get voicePlaying() { return !voice.paused && !voice.ended; },
    get recordable() { return st.ac && (!st.voiceOK || st.routed.has(voice)); },
    get stream() { ensure(); return st.dest.stream; },
    setVol(k, v) { st.vol[k] = v; }, getVol: k => st.vol[k],
    set muted(m) { st.muted = m; }, get muted() { return st.muted; },
  };
})();
