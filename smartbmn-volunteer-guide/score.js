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
  const DURATION = T(30);

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
  const S = {}; for (const k in SC) S[k] = [T(SC[k][0]), T(SC[k][1])];

  const kinds = [
    { t: T(6, 1), icon: 'ok', color: '#2E9E5B', label: 'ช่องว่าง ไม่มีข้อความ', act: 'ปกติ ไม่ต้องทำอะไร' },
    { t: T(8, 1), icon: 'wait', color: '#E0A21B', label: '“มีประชากรรายใหม่ส่งกรมการปกครอง\nตรวจสอบอีกครั้ง”', act: 'รอก่อน ยังไม่ต้องทำอะไร' },
    { t: T(10, 1), icon: 'edit', color: '#E0453A', label: '“...ตรวจสอบเรียบร้อย\n(สามารถดำเนินการแก้ไขได้)” + เลขบัตร', act: 'ต้องแก้ไข!' },
  ];
  const steps = [
    { t: T(12, 1), tap: T(13, 0), text: 'ฝั่ง “อัปโหลดแล้ว” กดปุ่ม “แก้ไข”' },
    { t: T(14, 1), tap: T(15, 0), text: 'ไปที่ “ข้อมูลสมาชิก” หาคนตามเลขบัตรที่แจ้งเตือน' },
    { t: T(16, 1), tap: T(17, 0), text: 'กดปุ่ม “ตรวจสอบ” หลังช่องเลขบัตร' },
    { t: T(18, 1), tap: T(19, 0), text: 'บันทึกคำตอบใหม่ แล้วกด “อัปโหลด”' },
  ];
  const results = [
    { t: T(20, 1), n: 1, msg: '“กรุณาเช็คซ้ำเลขบัตรประจำตัวประชาชน”', act: 'ทำตามขั้นตอนปกติ', del: false },
    { t: T(22, 1), n: 2, msg: '“เสียชีวิต”', act: 'บันทึกไม่ได้ → “ลบ” สมาชิกคนนี้ออก', del: true },
    { t: T(24, 1), n: 3, msg: '“ข้อมูลประชากรไม่ถูกต้อง”', act: '“ลบ” สมาชิกคนนี้ออก', del: true },
  ];
  const when = [
    { t: T(26, 1), day: 'ทุกวันศุกร์', time: 'ก่อน 18.00 น.', text: 'กรมฯ ตรวจข้อมูลที่บันทึกมา' },
    { t: T(27, 0), day: 'ทุกวันเสาร์', time: 'ตั้งแต่ 14.00 น.', text: 'อาสาฯ กดแก้ไขรายชื่อได้' },
  ];

  // ---------- harmony: warm lo-fi, Fmaj7 Em7 Dm7 Cmaj7 ----------
  const PROG = ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'];
  const { chords, chordAt } = makeChords(clock, {
    Fmaj7: { notes: ['A3', 'C4', 'E4', 'F4'], bass: 'F1' },
    Em7: { notes: ['G3', 'B3', 'D4', 'E4'], bass: 'E1' },
    Dm7: { notes: ['F3', 'A3', 'C4', 'D4'], bass: 'D1' },
    Cmaj7: { notes: ['G3', 'B3', 'C4', 'E4'], bass: 'C2' },
  }, Array.from({ length: 30 }, (_, b) => [b, 0, 4, PROG[b % 4]]));

  // the hits: every item popping on screen is a 'pop', every tap a 'click'
  const pops = [T(0, 1), T(1, 0), T(3, 0), T(4, 2), ...kinds.map((k) => k.t), ...steps.map((s) => s.t), ...results.map((r) => r.t), ...when.map((w) => w.t), T(28, 0), T(28, 2)];
  const taps = steps.map((s) => s.tap);

  const markers = {
    title: { t: T(0, 1), sync: 'av' },
    status: { t: T(1, 0), sync: 'av' },
    where: { t: T(3, 0), sync: 'av' },
    kinds: { t: kinds[0].t, sync: 'av' }, wait: { t: kinds[1].t, sync: 'av' }, edit: { t: kinds[2].t, sync: 'av' },
    step1: { t: steps[0].t, sync: 'av' }, tap1: { t: steps[0].tap, sync: 'av' },
    step4: { t: steps[3].t, sync: 'av' },
    res1: { t: results[0].t, sync: 'av' }, res2: { t: results[1].t, sync: 'av' }, res3: { t: results[2].t, sync: 'av' },
    friday: { t: when[0].t, sync: 'av' }, saturday: { t: when[1].t, sync: 'av' },
    end: { t: T(28, 0), sync: 'av' },
  };

  // the lo-fi hats sit a 16th before many beats, so for list items only the picture is measured; the pops still land on the beat
  for (const k of ['kinds', 'wait', 'edit', 'step1', 'step4', 'res1', 'res2', 'res3', 'friday']) markers[k].sync = 'v';
  const subtitles = [];

  const SCORE = { FPS, FORMAT, W, H, SAFE, WIDE, STYLE, DURATION, clock, T, BEAT, S, SC, m, chords, chordAt, STATUS, kinds, steps, results, when, pops, taps, markers, subtitles };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
