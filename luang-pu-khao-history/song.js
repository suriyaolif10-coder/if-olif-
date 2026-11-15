// THE SONG — a gentle, drumless soundtrack: pads, a khim-like plucked melody, temple bells.
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, m, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const pad = bus(), bass = bus(), keys = bus(), bell = bus(), fx = bus(), verb = bus(), dly = bus();

for (const c of sc.chords) {
  for (const n of c.notes) { const { L, R } = I.padNote(n, c.t1 - c.t0 + 0.4, { cutoff: 1400, attack: 0.4, release: 1.2 }); pad.addStereo(L, R, c.t0, 0.08); }
  bass.addMono(I.bass(c.bass + 12, BEAT * 3.6, { bright: 0.2, sub: 0.9 }), c.t0, 0.4);
}
// soft guitar arpeggio on 8ths from the childhood section on
clock.eachStep(2, 14, 8, (t, b, s) => {
  const c = sc.chordAt(t); if (!c) return;
  const n = c.notes[[0, 1, 2, 1][s % 4]] + 12;
  const g = I.guitar(n, BEAT * 1.2, { bright: 0.4, seed: b * 8 + s });
  keys.addMono(g, t, 0.16, s % 2 ? 0.25 : -0.25);
});
for (const n of sc.melody) {
  const x = I.marimba(n.midi, { decay: 0.6, thock: 0.1 });
  keys.addMono(x, n.t, 0.32, 0.1); verb.addMono(x, n.t, 0.2); dly.addMono(x, n.t, 0.06);
}
for (const t of sc.bells) {
  const b = I.bell(587.3, 3.5, 2.4, 1.41);
  bell.addMono(b, t, 0.22); verb.addMono(b, t, 0.25);
}
for (const s of sc.SHOTS) if (s.i > 0) fx.addMono(I.paperFwip(0.7, s.i), s.t - 0.02, 0.06);

const stems = { pad, bass, keys, bell, fx, verb: reverb(verb, { room: 0.88, damp: 0.4 }), dly: pingpong(dly, BEAT * 0.75, 0.3, 3000) };
const GAIN = { pad: 2.2, bass: 0.6, keys: 1.0, bell: 1.0, fx: 0.6, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 25);
MIX.fadeOut(mix, DURATION - 2.5, DURATION);
const M = MIX.master(mix, 0.7, undefined, { lufs: -16 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION}s, ${M.lufs.toFixed(1)} LUFS)`);
