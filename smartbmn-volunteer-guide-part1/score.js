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
  // ---------- the voiceover: ElevenLabs "Roger" (assets/voice.mp3), PART 1 of the guide ----------
  // The recording covers the first 5 lines of the script (it stops before "แต่ถ้าขึ้นว่า ตรวจสอบเรียบร้อย...").
  // Line starts are the pauses in the recording (silencedetect), matched to the script's phrases.
  const VO_AT = 0.5, VO_LEN = 31.79;
  const VO = [
    [0.30, 'อาสาสมัครต้องรู้! ถ้าเจอสถานะ มีประชากรใหม่ส่งกรมการปกครองตรวจสอบเรียบร้อย สามารถดำเนินการแก้ไขได้ ต้องทำยังไง?', 9.99],
    [10.47, 'ให้ดูที่ฝั่ง อัปโหลดแล้ว ในช่อง สมาชิกรอการตรวจสอบ', 14.92],
    [15.36, 'ในช่องนี้ อาจเจอข้อความสามแบบ', 18.09],
    [18.42, 'ถ้าเป็นช่องว่าง แปลว่าปกติ ไม่ต้องทำอะไร', 24.74],
    [25.04, 'ถ้าขึ้นว่า ส่งกรมการปกครองตรวจสอบอีกครั้ง ให้รอก่อน ยังไม่ต้องทำอะไร', 31.64],
  ].map(([t, text, end]) => ({ t: t + VO_AT, end: end + VO_AT, text }));
  const L = VO.map((v) => v.t);
  const DURATION = 39; // + the 3rd message card (on screen) and a 'next part' card
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
  const NEVER = [1e9, 1e9];
  const S = { hook: [0, L[1]], where: [L[1], L[2]], kinds: [L[2], 35.0], steps: NEVER, results: NEVER, when: NEVER, end: [35.0, DURATION] };
  // named moments inside scenes (words in the line, measured from the pauses inside it)
  const EV = { title: 0.4, status: 2.87 + VO_AT, question: 9.17 + VO_AT, where: L[1], tab: 11.62 + VO_AT, col: 13.06 + VO_AT, kinds: L[2], steps: 1e9, results: 1e9, when: 1e9, end: 35.0, press: 1e9, tag: 1e9 };

  const kinds = [
    { t: L[3], icon: 'ok', color: '#2E9E5B', label: 'ช่องว่าง ไม่มีข้อความ', act: 'ปกติ ไม่ต้องทำอะไร' },
    { t: L[4], icon: 'wait', color: '#E0A21B', label: '“มีประชากรรายใหม่ส่งกรมการปกครอง\nตรวจสอบอีกครั้ง”', act: 'รอก่อน ยังไม่ต้องทำอะไร' },
    { t: 32.4, icon: 'edit', color: '#E0453A', label: '“...ตรวจสอบเรียบร้อย\n(สามารถดำเนินการแก้ไขได้)” + เลขบัตร', act: 'ต้องแก้ไข!' },
  ];
  const steps = [
    { t: 1e9, tap: 1e9 + 2.6, text: 'ฝั่ง “อัปโหลดแล้ว” กดปุ่ม “แก้ไข”' },
    { t: 1e9, tap: 1e9 + 2.4, text: 'ไปที่ “ข้อมูลสมาชิก” หาคนตามเลขบัตรที่แจ้งเตือน' },
    { t: 1e9, tap: 1e9 + 1.7, text: 'กดปุ่ม “ตรวจสอบ” หลังช่องเลขบัตร' },
    { t: 1e9, tap: 1e9 + 3.4, text: 'บันทึกคำตอบใหม่ แล้วกด “อัปโหลด”' },
  ];
  const results = [
    { t: 1e9, n: 1, msg: '“กรุณาเช็คซ้ำเลขบัตรประจำตัวประชาชน”', act: 'ทำตามขั้นตอนปกติ', del: false },
    { t: 1e9, n: 2, msg: '“เสียชีวิต”', act: 'บันทึกไม่ได้ → “ลบ” สมาชิกคนนี้ออก', del: true },
    { t: 1e9, n: 3, msg: '“ข้อมูลประชากรไม่ถูกต้อง”', act: '“ลบ” สมาชิกคนนี้ออก', del: true },
  ];
  const when = [
    { t: 1e9, day: 'ทุกวันศุกร์', time: 'ก่อน 18.00 น.', text: 'กรมฯ ตรวจข้อมูลที่บันทึกมา' },
    { t: 1e9, day: 'ทุกวันเสาร์', time: 'ตั้งแต่ 14.00 น.', text: 'อาสาฯ กดแก้ไขรายชื่อได้' },
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
  const pops0 = [EV.title, EV.status, EV.question, EV.where, EV.tab, EV.col, EV.kinds, EV.steps, EV.results, EV.when, ...kinds.map((k) => k.t), ...steps.map((s) => s.t), ...results.map((r) => r.t), ...when.map((w) => w.t), EV.end, EV.tag];
  const pops = pops0.filter((t) => t < DURATION);
  const taps = steps.map((s) => s.tap).filter((t) => t < DURATION);

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
  for (const k of Object.keys(markers)) if (!(markers[k].t < DURATION)) delete markers[k];
  const subtitles = VO.map((v) => ({ t: v.t, end: v.end, text: v.text }));

  const SCORE = { VO_AT, VO_LEN, VO, L, EV, NARR, FPS, FORMAT, W, H, SAFE, WIDE, STYLE, DURATION, clock, T, BEAT, S, SC, m, chords, chordAt, STATUS, kinds, steps, results, when, pops, taps, markers, subtitles };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
