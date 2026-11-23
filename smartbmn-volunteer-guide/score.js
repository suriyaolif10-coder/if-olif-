// THE SCORE — คู่มือสั้นสำหรับอาสาสมัครจัดเก็บ: สถานะ "มีประชากรใหม่ส่งกรมการปกครองตรวจสอบเรียบร้อย (สามารถดำเนินการแก้ไขได้)"
// 9:16, ~60 s, on-screen Thai text, an original lo-fi groove. Every list item pops on a beat with a sound.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, makeChords } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const WIDE = W / H > 1.2;
  const STYLE = 'flat';
  const clock = makeClock({ bpm: 120, offset: 0 }); // 1 bar = 2 s
  const { T, BEAT } = clock;
  // ---------- the voiceover: ElevenLabs "Roger" (assets/voice.mp3) drives the timeline ----------
  // [start, line, end] in the recording. Line starts were found by matching the script's lines to the
  // pauses in the recording: every phrase of the script (split at its spaces) was fitted to the 60 short
  // pauses (silencedetect -30 dB, 0.12 s); the fit reads at a steady 10-11 characters a second on every line. The earlier MiniMax take
  // is kept as assets/voice-minimax.mp3.
  const VO_AT = 0.5, VO_LEN = 81.40;
  const VO = [
    [0.00, 'อาสาสมัครต้องรู้! ถ้าเจอสถานะ มีประชากรใหม่ส่งกรมการปกครองตรวจสอบเรียบร้อย สามารถดำเนินการแก้ไขได้ ต้องทำยังไง?', 8.96],
    [9.47, 'ให้ดูที่ฝั่ง อัปโหลดแล้ว ในช่อง สมาชิกรอการตรวจสอบ', 13.96],
    [14.31, 'ในช่องนี้ อาจเจอข้อความสามแบบ', 16.68],
    [17.11, 'ถ้าเป็นช่องว่าง แปลว่าปกติ ไม่ต้องทำอะไร', 20.00],
    [20.41, 'ถ้าขึ้นว่า ส่งกรมการปกครองตรวจสอบอีกครั้ง ให้รอก่อน ยังไม่ต้องทำอะไร', 25.53],
    [25.93, 'แต่ถ้าขึ้นว่า ตรวจสอบเรียบร้อย สามารถดำเนินการแก้ไขได้ พร้อมเลขบัตร แบบนี้ต้องแก้ไขครับ', 32.40],
    [32.83, 'วิธีแก้มีสี่ขั้นตอน', 34.41],
    [34.77, 'ขั้นที่หนึ่ง ฝั่งอัปโหลดแล้ว กดปุ่ม แก้ไข', 38.24],
    [38.63, 'ขั้นที่สอง ไปที่ข้อมูลสมาชิก หาคนตามเลขบัตรที่แจ้งเตือน', 42.93],
    [43.27, 'ขั้นที่สาม กดปุ่ม ตรวจสอบ หลังช่องเลขบัตร', 46.39],
    [46.80, 'ขั้นที่สี่ บันทึกคำตอบใหม่ แล้วกด อัปโหลด', 49.97],
    [50.38, 'เมื่อกดตรวจสอบ จะเจอผลสามแบบ', 52.57],
    [52.96, 'ถ้าขึ้นว่า กรุณาเช็คซ้ำเลขบัตรประจำตัวประชาชน ให้ทำตามขั้นตอนปกติ', 58.01],
    [58.43, 'ถ้าขึ้นว่า เสียชีวิต จะบันทึกไม่ได้ ต้องลบสมาชิกคนนี้ออก', 62.68],
    [63.12, 'ถ้าขึ้นว่า ข้อมูลประชากรไม่ถูกต้อง ก็ต้องลบสมาชิกคนนี้ออกเช่นกัน', 67.86],
    [68.28, 'กรมฯ จะตรวจข้อมูลที่บันทึกมา ทุกวันศุกร์ ก่อนหกโมงเย็น', 71.96],
    [72.17, 'และอาสาสมัครกดแก้ไขได้ ทุกวันเสาร์ ตั้งแต่บ่ายสองโมงเป็นต้นไป', 76.55],
    [76.94, 'อย่าลืม! กดปุ่มเช็คซ้ำข้อมูล แล้วบันทึก อัปโหลด ทุกครั้งนะครับ', 81.13],
  ].map(([t, text, end]) => ({ t: t + VO_AT, end: end + VO_AT, text }));
  const L = VO.map((v) => v.t);
  const DURATION = Math.ceil((VO_AT + VO_LEN + 1.6) * 10) / 10;
  // the narrator (the user's Flow clip) sits in a frame at the bottom edge; film.js draws the frame, the clip is overlaid after rendering
  // the cut-out presenter (background removed) stands on the bottom edge; tile 426x360 scaled 1.5x
  const NARR = { x: -70, y: 1362, w: 640, h: 540, feetX: 250, feetY: 1872, headY: 1380 };

  const STATUS = 'มีประชากรใหม่ส่งกรมการปกครองตรวจสอบเรียบร้อย (สามารถดำเนินการแก้ไขได้)';

  // ---------- scenes (bars) ----------
  const SC = {
    hook: [0, 3], // what is this status?
    where: [3, 6], // where to look: uploaded tab, "members awaiting check" column
    kinds: [6, 12], // the 3 messages you can see in that column
    steps: [12, 20], // 4 steps to fix it
    results: [20, 26], // 3 results after pressing "ตรวจสอบ"
    when: [26, 28], // Friday / Saturday schedule
    end: [28, 30],
  };
  const S = { hook: [0, L[1]], where: [L[1], L[2]], kinds: [L[2], L[6]], steps: [L[6], L[11]], results: [L[11], L[15]], when: [L[15], L[17]], end: [L[17], DURATION] };
  // named moments inside scenes (words in the line, measured from the pauses inside it)
  const EV = { title: 0.4, status: 3.05 + VO_AT, question: 8.36 + VO_AT, where: L[1], tab: 10.55 + VO_AT, col: 11.61 + VO_AT, kinds: L[2], steps: L[6], results: L[11], when: L[15], end: L[17], press: 77.97 + VO_AT, tag: 79.96 + VO_AT };

  const kinds = [
    { t: L[3], icon: 'ok', color: '#2E9E5B', label: 'ช่องว่าง ไม่มีข้อความ', act: 'ปกติ ไม่ต้องทำอะไร' },
    { t: L[4], icon: 'wait', color: '#E0A21B', label: '“มีประชากรรายใหม่ส่งกรมการปกครอง\nตรวจสอบอีกครั้ง”', act: 'รอก่อน ยังไม่ต้องทำอะไร' },
    { t: L[5], icon: 'edit', color: '#E0453A', label: '“...ตรวจสอบเรียบร้อย\n(สามารถดำเนินการแก้ไขได้)” + เลขบัตร', act: 'ต้องแก้ไข!' },
  ];
  const steps = [
    { t: L[7], tap: 37.67 + VO_AT, text: 'ฝั่ง “อัปโหลดแล้ว” กดปุ่ม “แก้ไข”' },
    { t: L[8], tap: 41.09 + VO_AT, text: 'ไปที่ “ข้อมูลสมาชิก” หาคนตามเลขบัตรที่แจ้งเตือน' },
    { t: L[9], tap: 44.51 + VO_AT, text: 'กดปุ่ม “ตรวจสอบ” หลังช่องเลขบัตร' },
    { t: L[10], tap: 49.58 + VO_AT, text: 'บันทึกคำตอบใหม่ แล้วกด “อัปโหลด”' },
  ];
  const results = [
    { t: L[12], n: 1, msg: '“กรุณาเช็คซ้ำเลขบัตรประจำตัวประชาชน”', act: 'ทำตามขั้นตอนปกติ', del: false },
    { t: L[13], n: 2, msg: '“เสียชีวิต”', act: 'บันทึกไม่ได้ → “ลบ” สมาชิกคนนี้ออก', del: true },
    { t: L[14], n: 3, msg: '“ข้อมูลประชากรไม่ถูกต้อง”', act: '“ลบ” สมาชิกคนนี้ออก', del: true },
  ];
  const when = [
    { t: L[15], day: 'ทุกวันศุกร์', time: 'ก่อน 18.00 น.', text: 'กรมฯ ตรวจข้อมูลที่บันทึกมา' },
    { t: L[16], day: 'ทุกวันเสาร์', time: 'ตั้งแต่ 14.00 น.', text: 'อาสาฯ กดแก้ไขรายชื่อได้' },
  ];

  // ---------- harmony: warm lo-fi, Fmaj7 Em7 Dm7 Cmaj7 ----------
  const PROG = ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'];
  const { chords, chordAt } = makeChords(clock, {
    Fmaj7: { notes: ['A3', 'C4', 'E4', 'F4'], bass: 'F1' },
    Em7: { notes: ['G3', 'B3', 'D4', 'E4'], bass: 'E1' },
    Dm7: { notes: ['F3', 'A3', 'C4', 'D4'], bass: 'D1' },
    Cmaj7: { notes: ['G3', 'B3', 'C4', 'E4'], bass: 'C2' },
  }, Array.from({ length: Math.ceil(DURATION / 2) }, (_, b) => [b, 0, 4, PROG[b % 4]]));

  // the hits: every item popping on screen is a 'pop', every tap a 'click'
  const pops = [EV.title, EV.status, EV.question, EV.where, EV.tab, EV.col, EV.kinds, EV.steps, EV.results, EV.when, ...kinds.map((k) => k.t), ...steps.map((s) => s.t), ...results.map((r) => r.t), ...when.map((w) => w.t), EV.end, EV.tag];
  const taps = steps.map((s) => s.tap);

  const markers = {
    title: { t: EV.title, sync: 'v' },
    status: { t: EV.status, sync: 'v' },
    where: { t: EV.where, sync: 'v' },
    kinds: { t: kinds[0].t, sync: 'av' }, wait: { t: kinds[1].t, sync: 'av' }, edit: { t: kinds[2].t, sync: 'av' },
    step1: { t: steps[0].t, sync: 'av' }, tap1: { t: steps[0].tap, sync: 'av' },
    step4: { t: steps[3].t, sync: 'av' },
    res1: { t: results[0].t, sync: 'av' }, res2: { t: results[1].t, sync: 'av' }, res3: { t: results[2].t, sync: 'av' },
    friday: { t: when[0].t, sync: 'av' }, saturday: { t: when[1].t, sync: 'av' },
    end: { t: EV.end, sync: 'v' },
  };

  // the lo-fi hats sit a 16th before many beats, so for list items only the picture is measured; the pops still land on the beat
  for (const k of Object.keys(markers)) markers[k].sync = 'v';
  for (const k of ['kinds', 'wait', 'edit', 'step1', 'step4', 'res1', 'res2', 'res3', 'friday']) markers[k].sync = 'v';
  const subtitles = VO.map((v) => ({ t: v.t, end: v.end, text: v.text }));

  const SCORE = { VO_AT, VO_LEN, VO, L, EV, NARR, FPS, FORMAT, W, H, SAFE, WIDE, STYLE, DURATION, clock, T, BEAT, S, SC, m, chords, chordAt, STATUS, kinds, steps, results, when, pops, taps, markers, subtitles };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
