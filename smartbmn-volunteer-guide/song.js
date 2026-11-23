// THE SONG — a calm lo-fi bed (so the text is easy to read) + a pop for every item and a click for every tap.
const path = require('path');
const { SR, Bus, reverb } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const Genre = require('./engine/audio/genres');
const sc = require('./score');
const { T, BEAT, DURATION, m, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), fx = bus(), verb = bus();

const { kicks } = Genre.play('lofi', { clock, from: 0, to: Math.ceil(DURATION / 2), chordAt: sc.chordAt, buses: { drums, bass, pad, keys }, gain: 0.8 });

sc.pops.forEach((t, i) => { fx.addMono(I.pop(1500 + (i % 4) * 220, 30 + i), t, 0.5); });
for (const t of sc.taps) { fx.addMono(I.woodTick(2.2), t, 0.55); fx.addMono(I.ting(m('E6')), t + 0.05, 0.12); }
// a little warning sound on the "must fix" and "delete" items, a soft chime on the OK ones
fx.addMono(I.bwomp(), sc.kinds[2].t + 0.08, 0.2);
for (const r of sc.results) if (r.del) fx.addMono(I.thud(120, 0.06), r.t, 0.4);
for (const t of [sc.kinds[0].t, sc.results[0].t]) { const b = I.bell(1318.5, 1.2, 1.5, 2.0); fx.addMono(b, t, 0.12); verb.addMono(b, t, 0.15); }
fx.addMono(I.thwack(), sc.EV.status, 0.3);
fx.addMono(I.thwack(), sc.EV.end, 0.3);

// the MiniMax voiceover; the music ducks under it
const voice = MIX.loadAudio(path.join(__dirname, 'assets/voice.mp3'), { at: sc.VO_AT, gain: 1, length: DURATION });
MIX.duck([drums, bass, pad, keys, verb], voice, { depth: 0.6, attack: 0.05, release: 0.5 });
const stems = { voice, drums, bass, pad, keys, fx, verb: reverb(verb, { room: 0.8 }) };
const GAIN = { voice: 1.0, drums: 0.5, bass: 0.35, pad: 1.6, keys: 0.9, fx: 0.6, verb: 1 };
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? path.join(__dirname, 'out') : null });
Genre.fx && Genre.fx('lofi', mix, { kicks });
MIX.highpass(mix, 25);
MIX.fadeOut(mix, DURATION - 1.5, DURATION);
const M = MIX.master(mix, 0.7, 0.7, { lufs: -14 });
MIX.writeWav(path.join(__dirname, 'out', 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION}s, ${M.lufs.toFixed(1)} LUFS)`);
