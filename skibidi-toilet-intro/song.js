// THE SONG — every sound comes from an event in score.js. -> out/music.wav
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock, HOOK, placeBar } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), lead = bus(), fx = bus();
const verb = bus(), dly = bus();

// ---------- drums ----------
const K = I.kick({ punch: 1.1 }), CL = I.clap(), SN = I.snare(), HC = [I.hat(false, 11), I.hat(false, 12)], HO = I.hat(true, 14);
const CR = I.crash(18);
const kicks = [];
clock.eachStep(2, 10, 16, (t, b, s) => {
  if (t >= ev.breath && t < ev.drop) return; // the held breath
  if (t >= ev.end + BEAT * 2) return; // let the end ring
  const full = b >= 4;
  if (full ? s % 4 === 0 : s % 8 === 0 || s === 10) { drums.addMono(K, t, 0.95); kicks.push(t); }
  if (s % 8 === 4) { drums.addMono(CL, t, 0.6); verb.addMono(CL, t, 0.25); if (b >= 8) drums.addMono(SN, t, 0.3); }
  if (s % 2 === 0) drums.addMono(HC[(s / 2) % 2], t, s % 4 === 2 ? 0.2 : 0.1, 0.3);
  if (full && s % 4 === 2) drums.addMono(HO, t, 0.1, -0.3);
});
for (const t of [ev.series, ev.army, ev.agents, ev.drop]) drums.addMono(CR, t, 0.32, 0.2);
// snare roll into the breath, ending a beat early
for (let i = 0; i < 6; i++) drums.addMono(SN, T(7, 0) + 0.5 + i * BEAT / 4, 0.12 + i * 0.03);

// ---------- bass ----------
clock.eachStep(2, 9, 8, (t, b, s) => {
  if (t >= ev.breath && t < ev.drop) return;
  if (t >= ev.end) return;
  const c = sc.chordAt(t); if (!c) return;
  const R = c.bass + 12;
  if (b >= 8) bass.addMono(I.bass(s % 2 ? R + 12 : R, BEAT / 2 * 0.8, { sub: 0.9, bright: 0.7 }), t, 0.6);
  else if (b >= 4) bass.addMono(I.bass(s % 2 ? R + 12 : R, BEAT / 2 * 0.7, { sub: 0.7 }), t, 0.5);
  else if (s % 4 === 0 || s === 3) bass.addMono(I.bass(R, BEAT / 2 * 0.9), t, 0.5);
});
bass.addMono(I.bass808(m('A1'), 2.4, { drive: 0.5 }), ev.end, 0.55);

// ---------- pads ----------
for (const c of sc.chords) {
  if (c.t0 >= ev.end) continue;
  const t1 = Math.min(c.t1, c.t0 < ev.breath && c.t1 > ev.breath ? ev.breath : c.t1);
  const opts = c.t0 >= ev.drop ? { cutoff: 2800, attack: 0.03 } : { cutoff: 1100, attack: 0.3, release: 0.8 };
  for (const n of c.notes) { const { L, R } = I.padNote(n, t1 - c.t0, opts); pad.addStereo(L, R, c.t0, 0.08); }
}
// final chord under the title card
for (const n of ['A3', 'C4', 'E4', 'A4']) { const { L, R } = I.padNote(m(n), DURATION - ev.end, { cutoff: 2200, attack: 0.02, release: 1.5 }); pad.addStereo(L, R, ev.end, 0.09); }

// ---------- the hook: plucks in the intro and series shots ----------
const hookNotes = [...placeBar(clock, HOOK.a, 0), ...placeBar(clock, HOOK.b, 1), ...placeBar(clock, HOOK.a, 2), ...placeBar(clock, HOOK.b, 3)];
for (const n of hookNotes) {
  const p = I.pluck(n.midi, { decay: 0.25, cutoff: 3200 });
  keys.addMono(p, n.t, 0.32, 0.15); dly.addMono(p, n.t, 0.1);
}

// ---------- the toilet army: each toilet sings its note as it pops up ----------
for (const a of sc.army) {
  const x = I.pulse(a.midi, BEAT * 0.9, { duty: 0.25, decay: 0.35, vib: 0.2 });
  const pan = (a.x / sc.W - 0.5) * 1.2;
  keys.addMono(x, a.t, 0.45, pan); verb.addMono(x, a.t, 0.12);
  fx.addMono(I.pop(1400 + (a.midi - 67) * 60, 28 + a.i), a.t, 0.3, pan);
}

// ---------- the heroes land ----------
for (const a of sc.agents) {
  if (a.kind !== 'tv') fx.addMono(I.thud(70, 0.1), a.t, 0.55);
  if (a.kind === 'camera') { fx.addMono(I.woodTick(1.8), a.t, 0.5, -0.4); fx.addMono(I.hat(false, 31), a.t + 0.06, 0.5, -0.4); }
  if (a.kind === 'speaker') { fx.addMono(I.bass808(m('A1'), 0.6, { glide: 0.4, drive: 0.6 }), a.t, 0.5); }
  if (a.kind === 'tv') { fx.addMono(I.pop(1800, 40), a.t, 0.6, 0.4); fx.addMono(I.tvClick(), a.t + 0.05, 0.35, 0.4); }
}
fx.addMono(I.noiseSweep(ev.breath - T(6, 2), 300, 7000, { q: 0.9, shape: (x) => x * x, pink: true }), T(6, 2), 0.35); // riser

// ---------- the drop: a big supersaw hook, then the title card ----------
for (const n of placeBar(clock, HOOK.a, 8).filter((n) => n.t < ev.end - 1e-6)) {
  const s = I.supersaw(n.midi, n.dur * 0.85, { cutoff: 4200, seed: n.t * 10 | 0 });
  lead.addStereo(s.L, s.R, n.t, 0.22); verb.addStereo(s.L, s.R, n.t, 0.06);
}
{ const s = I.supersaw(m('A4'), 1.8, { cutoff: 3000, release: 0.8 }); lead.addStereo(s.L, s.R, ev.end, 0.2); verb.addStereo(s.L, s.R, ev.end, 0.12); }

// ---------- fx tied to score events ----------
fx.addMono(I.woodTick(1.2), ev.lid, 0.45);
fx.addMono(I.pop(1200), ev.headPop, 0.55); fx.addMono(I.boing(), ev.headPop, 0.4);
fx.addMono(I.thwack(), ev.title1, 0.6); fx.addMono(I.thud(90, 0.08), ev.title1, 0.5);
fx.addMono(I.thwack(), ev.title2, 0.6); fx.addMono(I.thud(90, 0.08), ev.title2, 0.5);
fx.addMono(I.pop(2400), ev.play, 0.5);
fx.addMono(I.thwack(), ev.views, 0.55); drums.addMono(CR, ev.views, 0.25, -0.2);
fx.addMono(I.subBoom(1.6), ev.drop, 0.7);
fx.addMono(I.thwack(), ev.drop, 0.5);
fx.addMono(I.thwack(), ev.end, 0.45); drums.addMono(CR, ev.end, 0.3, -0.2);
for (const c of sc.captions) fx.addMono(I.paperFwip(1.1, Math.round(c.t * 10)), c.t, 0.12);

// ---------- mix ----------
MIX.sidechain([pad, bass, lead], kicks.filter((t) => t >= ev.army));
const stems = {
  drums, bass, pad, keys, lead, fx,
  verb: reverb(verb, { room: 0.8, damp: 0.35 }),
  dly: pingpong(dly, BEAT * 0.75, 0.3, 3500),
};
const GAIN = { drums: 0.45, bass: 0.7, pad: 2.2, keys: 1.0, lead: 5, fx: 0.85, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 22);
MIX.gate(mix, ev.breath, ev.drop);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : -14 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS at drive ${M.drive.toFixed(2)}` : ''})`);
