// THE SCORE — ประวัติหลวงปู่ขาว อนาลโย in 30 s (9:16). One shot every 2 s (one bar at 120 BPM).
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
  const clock = makeClock({ bpm: 120, offset: 0 });
  const { T, BEAT } = clock;
  const VO_AT = 0.5, VO_LEN = 104.64; // the user's voiceover (assets/voice.wav)
  const DURATION = Math.ceil((VO_AT + VO_LEN + 1.6) * 10) / 10;
  // cuts sit in the pauses of the voiceover (measured with silencedetect), so no shot changes mid-sentence
  const CUTS = [0, 6.76, 13.93, 20.59, 24.49, 30.61, 38.3, 43.98, 50.27, 57.72, 61.4, 70.13, 80.6, 89.11, 97.05].map((c, i) => (i ? c + VO_AT : 0));

  // ---------- shots: [id, caption lines] — each lasts one bar (2 s), cut on the downbeat ----------
  const SHOTS = [
    ['title', ['ประวัติ', 'หลวงปู่ขาว อนาลโย']],
    ['portrait', ['พระอาจารย์สายกรรมฐาน', 'ผู้เป็นที่เคารพทั่วประเทศ']],
    ['village', ['เกิดปี พ.ศ. 2431', 'จังหวัดอุบลราชธานี']],
    ['farmer', ['เติบโตเป็นชาวนา', 'ขยัน ซื่อตรง']],
    ['family', ['ใช้ชีวิตฆราวาส', 'มีครอบครัว']],
    ['think', ['แต่ท่านเห็นว่า', 'ชีวิตนี้ไม่เที่ยง']],
    ['ordain', ['ออกบวชเมื่ออายุ 31 ปี']],
    ['hall', ['ตั้งใจปฏิบัติธรรม', 'อย่างเคร่งครัด']],
    ['mun', ['เป็นศิษย์ของ', 'หลวงปู่มั่น ภูริทัตโต']],
    ['tudong', ['ออกธุดงค์', 'ในป่าลึก']],
    ['meditate', ['นั่งสมาธิ', 'ภาวนาไม่ย่อท้อ']],
    ['cave', ['สร้างวัดถ้ำกลองเพล', 'จังหวัดหนองบัวลำภู']],
    ['teach', ['สั่งสอนศิษย์', 'และญาติโยมมากมาย']],
    ['candle', ['ละสังขาร พ.ศ. 2526', 'สิริอายุ 95 ปี']],
    ['end', ['คำสอนของท่าน', 'ยังอยู่ในใจเราเสมอ']],
  ].map(([id, lines], i, all) => ({ id, lines, i, t: CUTS[i], end: i < all.length - 1 ? CUTS[i + 1] : DURATION }));

  const S = { childhood: [CUTS[2], CUTS[6]], monk: [CUTS[6], CUTS[9]], forest: [CUTS[9], CUTS[13]], legacy: [CUTS[13], DURATION] };

  // ---------- harmony: gentle D major / B minor, tender-memory shape (no drums) ----------
  const PROG = [[0, 0, 4, 'D'], [1, 0, 4, 'Bm'], [2, 0, 4, 'G'], [3, 0, 4, 'A'], [4, 0, 4, 'D'], [5, 0, 4, 'Bm'], [6, 0, 4, 'G'], [7, 0, 4, 'A'], [8, 0, 4, 'Bm'], [9, 0, 4, 'G'], [10, 0, 4, 'D'], [11, 0, 4, 'A'], [12, 0, 4, 'G'], [13, 0, 4, 'A'], [14, 0, 4, 'Dadd9']];
  const { chords, chordAt } = makeChords(clock, {
    D: { notes: ['F#3', 'A3', 'D4'], bass: 'D2' },
    Bm: { notes: ['F#3', 'B3', 'D4'], bass: 'B1' },
    G: { notes: ['G3', 'B3', 'D4'], bass: 'G1' },
    A: { notes: ['E3', 'A3', 'C#4'], bass: 'A1' },
    Dadd9: { notes: ['F#3', 'A3', 'D4', 'E4'], bass: 'D2' },
  }, [
    [0, 0, 4, 'D'], [1, 0, 4, 'Bm'], [2, 0, 4, 'G'], [3, 0, 4, 'A'],
    [4, 0, 4, 'D'], [5, 0, 4, 'Bm'], [6, 0, 4, 'G'], [7, 0, 4, 'A'],
    [8, 0, 4, 'Bm'], [9, 0, 4, 'G'], [10, 0, 4, 'D'], [11, 0, 4, 'A'],
    [12, 0, 4, 'G'], [13, 0, 4, 'A'], [14, 0, 4, 'Dadd9'],
  ].concat(...[1, 2, 3].map((k) => PROG.map(([bar, b2, d, c]) => [bar + k * 15, b2, d, c]))).filter((r) => r[0] < Math.ceil(DURATION / 2)));

  // pentatonic melody (khim-like), one phrase per bar ([note, start8th, dur8ths])
  const PH = {
    a: [['A4', 0, 2], ['B4', 2, 1], ['D5', 3, 1], ['E5', 4, 2], ['D5', 6, 2]],
    b: [['F#5', 0, 2], ['E5', 2, 1], ['D5', 3, 1], ['B4', 4, 4]],
    c: [['D5', 0, 1], ['E5', 1, 1], ['F#5', 2, 2], ['A5', 4, 2], ['F#5', 6, 2]],
    d: [['E5', 0, 2], ['D5', 2, 2], ['B4', 4, 2], ['A4', 6, 2]],
    end: [['A4', 0, 2], ['D5', 2, 2], ['F#5', 4, 4]],
  };
  const order = ['a', 'b', 'a', 'd', 'a', 'b', 'c', 'd', 'b', 'a', 'c', 'd', 'a', 'd', 'end'];
  const NB = Math.floor((DURATION - 2) / 2);
  const melody = Array.from({ length: NB }, (_, bar) => bar).filter((bar) => bar % 2 === 0).flatMap((bar) => placeBar(clock, PH[order[(bar / 2) % (order.length - 1)]], bar));

  // temple bell on the moments that matter
  const bells = [0, 6, 8, 11, 13, 14].map((i) => CUTS[i]);

  const markers = {};
  for (const s of SHOTS) markers[s.id] = { t: s.t, sync: s.i === 0 ? 'a' : 'v' };
  for (const t of bells) { const s = SHOTS.find((x) => x.t === t); if (s && s.i > 0) markers[s.id].sync = 'av'; }

  const subtitles = SHOTS.map((s) => ({ t: s.t + 0.15, end: s.end - 0.1, text: s.lines.join(' ') }));

  const SCORE = { VO_AT, VO_LEN, CUTS, FPS, FORMAT, W, H, SAFE, WIDE, STYLE, DURATION, clock, T, BEAT, S, m, chords, chordAt, SHOTS, melody, bells, markers, subtitles };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
