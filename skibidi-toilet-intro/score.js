// THE SCORE — Skibidi Toilet in 20 seconds (9:16, Thai on-screen narration).
// Single source of truth: song.js plays every event below, film.js draws every event below.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const WIDE = W / H > 1.2;
  const STYLE = 'flat';
  const clock = makeClock({ bpm: 120, offset: 0 }); // 1 beat = 0.5 s, 1 bar = 2 s
  const { T, BEAT } = clock;
  const DURATION = 20;

  // ---------- shots (cuts on bar lines) ----------
  const S = {
    intro: [0, T(2)], // a toilet, a head pops out, title stamps
    series: [T(2), T(4)], // what it is: a YouTube web series since 2023
    army: [T(4), T(6)], // the toilet army invades the city
    agents: [T(6), T(7, 3)], // the heroes: camera / speaker / TV heads
    breath: [T(7, 3), T(8)], // silence, face-off
    drop: [T(8), T(8, 3)], // VS clash
    end: [T(8, 3), DURATION], // title card
  };

  // ---------- harmony (A minor: Am F C G) ----------
  const { chords, chordAt } = makeChords(clock, {
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
  }, [
    [0, 0, 4, 'Am'], [1, 0, 4, 'F'],
    [2, 0, 4, 'Am'], [3, 0, 4, 'F'],
    [4, 0, 4, 'Am'], [5, 0, 4, 'G'],
    [6, 0, 4, 'F'], [7, 0, 3, 'G'],
    [8, 0, 4, 'Am'], [9, 0, 4, 'Am'],
  ]);

  // the hook: a bouncy, original 8th-note riff ([note, start8th, dur8ths])
  const HOOK = {
    a: [['A4', 0, 1], ['A4', 1, 1], ['C5', 2, 1], ['A4', 3, 1], ['E5', 4, 2], ['D5', 6, 1], ['C5', 7, 1]],
    b: [['A4', 0, 1], ['A4', 1, 1], ['C5', 2, 1], ['A4', 3, 1], ['G4', 4, 2], ['A4', 6, 2]],
  };

  const ev = {
    lid: T(0, 1), // the lid flips open
    headPop: T(0, 2), // a head pops out of the bowl
    title1: T(1, 0), // "SKIBIDI" stamps
    title2: T(1, 2), // "TOILET" stamps
    series: T(2), // cut: video player
    play: T(2, 2), // play button pressed
    views: T(3, 2), // "billions of views" stamp
    army: T(4), // cut: the city
    agents: T(6), // cut: the heroes
    breath: T(7, 3), // held breath
    drop: T(8), // VS clash
    end: T(8, 3), // title card
  };

  // the toilet army: one toilet pops up on every beat of bars 4-5 and plays a note (higher toilet = higher note)
  const armyNotes = ['A4', 'C5', 'E5', 'A5', 'G4', 'B4', 'D5', 'G5'];
  const army = armyNotes.map((n, i) => {
    const row = i % 2; // alternate back / front rows
    return {
      i, t: T(4 + Math.floor(i / 4), i % 4), midi: m(n),
      x: U.remap(i, 0, 7, W * 0.14, W * 0.86) + (row ? 0 : 0),
      y: H * (row ? 0.74 : 0.64) - (m(n) - m('G4')) * 6,
      s: row ? 1.0 : 0.82,
    };
  });

  // the heroes, each lands on a beat with its own sound
  const agents = [
    { kind: 'camera', t: T(6, 0), label: 'คนหัวกล้อง', x: W * 0.22 },
    { kind: 'speaker', t: T(6, 2), label: 'คนหัวลำโพง', x: W * 0.5 },
    { kind: 'tv', t: T(7, 0), label: 'คนหัวทีวี', x: W * 0.78 },
  ];

  // ---------- Thai on-screen narration ----------
  const captions = [
    { t: 0.35, end: T(2) - 0.05, lines: ['รู้จักไหม?'], size: 92 },
    { t: T(2) + 0.1, end: T(3, 2) - 0.05, lines: ['ซีรีส์แอนิเมชันสั้นบน YouTube', 'เริ่มปี 2023 โดยช่อง DaFuq!?Boom!'], size: 54 },
    { t: T(3, 2), end: T(4) - 0.05, lines: ['ยอดวิวรวมหลายพันล้าน!'], size: 70 },
    { t: T(4) + 0.1, end: T(6) - 0.05, lines: ['กองทัพหัวโผล่จากชักโครก', 'ร้องเพลงบุกเมือง!'], size: 66 },
    { t: T(6) + 0.1, end: T(7, 3) - 0.05, lines: ['ฝ่ายต่อต้าน:', 'เหล่าเอเจนต์หัวอุปกรณ์'], size: 66 },
    { t: T(8), end: T(8, 3) - 0.05, lines: ['สงครามสุดฮา', 'ครองอินเทอร์เน็ต!'], size: 74 },
  ];

  const markers = {
    headPop: { t: ev.headPop, sync: 'av' },
    title: { t: ev.title1, sync: 'av' },
    toilet: { t: ev.title2, sync: 'av' },
    series: { t: ev.series, sync: 'av' },
    views: { t: ev.views, sync: 'av' },
    army: { t: ev.army, sync: 'av' },
    camera: { t: agents[0].t, sync: 'a' },
    speaker: { t: agents[1].t, sync: 'av' },
    tv: { t: agents[2].t, sync: 'v' },
    breath: ev.breath,
    drop: { t: ev.drop, sync: 'av' },
    end: { t: ev.end, sync: 'av' },
  };

  const subtitles = captions.map((c) => ({ t: c.t, end: c.end, text: c.lines.join(' ') }));

  const SCORE = { FPS, FORMAT, W, H, SAFE, WIDE, STYLE, DURATION, clock, T, BEAT, S, m, chords, chordAt, HOOK, ev, army, agents, captions, markers, subtitles, placeBar };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
