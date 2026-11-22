/* ============================================================
   images.js — EDITABLE IMAGE SOURCES (real photographs)

   The video itself is drawn as reconstructed illustrations.
   If you have real photographs (archival or present-day), put the
   file in assets/images/ and fill in `src` + `credit` below.
   A filled slot appears inside a photo frame that is clearly
   labelled as a REAL photograph, with its credit line, so it can
   never be confused with the illustrations.

   kind: 'archival' → label "ภาพถ่ายจดหมายเหตุ (ภาพจริง)"
         'photo'    → label "ภาพถ่ายจริง (ปัจจุบัน)"
   Leave src empty ('') to show only the illustration.
   Only use photos you have the right to publish.
   ============================================================ */
'use strict';

const IMAGE_SOURCES = {
  s3_archive:   { scene: 3, kind: 'archival', src: '', caption: 'ภาพหมู่บ้านชนบทอีสานในอดีต', credit: '' },
  s5_archive:   { scene: 5, kind: 'archival', src: '', caption: 'ภาพเอกสาร/หนังสือพิมพ์ในยุคนั้น', credit: '' },
  s8_stupa:     { scene: 8, kind: 'photo',    src: 'assets/images/phusang_stupa.jpg', caption: 'สถูปเขตงานภูซาง', credit: 'ภาพจากผู้จัดทำ (โปรดระบุชื่อผู้ถ่าย)' },
  s8_museum:    { scene: 8, kind: 'photo',    src: '', caption: 'พิพิธภัณฑ์เขตงานภูซาง', credit: '' },
};

/* loader + frame (used by the scenes) */
const PHOTOS = {};
for (const [k, v] of Object.entries(IMAGE_SOURCES)) {
  if (!v.src) continue;
  const im = new Image(); im.src = v.src; PHOTOS[k] = im;
}

function photoSlot(c, key, x, y, w, rot, k) {
  const im = PHOTOS[key], meta = IMAGE_SOURCES[key];
  if (!im || !im.complete || !im.naturalWidth || k <= 0) return false;
  const h = w * im.naturalHeight / im.naturalWidth, s = E.outBack(E.clamp(k));
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(-w / 2 - 18 + 14, -h / 2 - 18 + 16, w + 36, h + 120);
  c.fillStyle = '#fbf8f0'; c.fillRect(-w / 2 - 18, -h / 2 - 18, w + 36, h + 120);          // photo border
  c.drawImage(im, -w / 2, -h / 2, w, h);
  c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(-w / 2, -h / 2, w, h);
  const label = meta.kind === 'archival' ? 'ภาพถ่ายจดหมายเหตุ (ภาพจริง)' : 'ภาพถ่ายจริง (ปัจจุบัน)';
  c.fillStyle = '#c2362d'; c.fillRect(-w / 2 - 18, -h / 2 - 66, 470, 48);
  txt(c, label, -w / 2, -h / 2 - 42, 28, { align: 'left', stroke: false });
  txt(c, meta.caption, 0, h / 2 + 30, 30, { col: INK, stroke: false });
  txt(c, meta.credit ? 'ที่มา: ' + meta.credit : 'ที่มา: (ใส่แหล่งที่มาใน images.js)', 0, h / 2 + 72, 24, { col: '#6b6257', stroke: false });
  c.restore();
  return true;
}
