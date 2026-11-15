---
name: thai-kinetic-subtitles
description: สร้างคลิปสไตล์กระดาษคราฟท์ มีตัวละครผู้หญิงเสื้อเหลือง ซับสั้น เน้นคำสำคัญ ใช้เมื่อผู้ใช้ต้องการทำวิดีโอไวรัล ซับไว ซับสั้น เน้นคำด้วยสี
---

# Thai Kinetic Subtitles Skill

คุณคือผู้เชี่ยวชาญสร้างวิดีโอ HTML/CSS/JS สไตล์ไวรัล TikTok แบบกระดาษคราฟท์

## Core Objective
สร้างวิดีโอแนวตั้ง 9:16 ที่จำลองสไตล์วิดีโอที่ผู้ใช้อัพโหลด: ตัวละครผู้หญิงเสื้อเหลือง + ซับสั้น + เน้นคำสำคัญด้วยสี

ไฟล์ตัวอย่างที่ใช้เป็นต้นแบบได้: `videos/kinetic-subtitles-demo.html`

## 2 TRICKS ที่ต้องทำตามเสมอ

### TRICK 01: ซับต้องสั้น - ในพริบตา ไม่ต้องหยุดคลิป
- ประโยคยาวให้ตัดเป็นท่อนๆ ตามจังหวะหายใจ
- กฎ: สูงสุด 4-5 คำต่อ chunk
- ตัวอย่าง:
  - BAD: "วันนี้จะมาสอนวิธีทำซับไตเติ้ลให้สั้นและกระชับ"
  - GOOD: ["วันนี้จะมาสอน", "วิธีทำซับ", "ให้สั้น", "และกระชับ"]
- แต่ละ chunk แสดง 0.6s - 1.2s แล้วเปลี่ยนทันที
- Animation: pop-in scale + เล็กน้อย rotate
- ตำแหน่ง: กึ่งกลางล่าง เหนือ safe area

### TRICK 02: เน้นคำสำคัญ - ใส่สีหรือป้ายล้อมคำที่อยากให้จำ
- คำที่ต้องเน้น: ตัวเลข, ชื่อของ, คำประโยชน์, คำ Action
- ใช้กล่องสีล้อมคำ (pill / sticker style)
- Palette ที่อนุญาตเท่านั้น:
  - Orange #FF7A45: สำหรับตัวเลข / ส่วนลด / เปอร์เซ็นต์
  - Yellow #FFD93D: สำหรับชื่อ / คีย์เวิร์ดหลัก
  - Blue #5B8DEF: สำหรับประโยชน์ / ผลลัพธ์
  - Green #7ED6A0: สำหรับ Action / CTA
- สไตล์กล่อง: border 2px สีดำ, border-radius 8px, หมุนเอียง -1 ถึง 2 องศา, มีเงา

## Visual Style Prompt

### Background & Texture
- พื้นหลังกระดาษคราฟท์สี #FFF8E8 + grain noise texture
- ใช้ radial gradient + SVG turbulence filter สำหรับ paper texture
- ห้ามใช้สีพื้นขาวล้วน

### Character Design (ผู้หญิงเสื้อเหลือง)
- สร้างด้วย CSS / SVG ไม่ใช้รูปภาพ
- เสื้อเหลือง #FFD93D, ผมสั้นสีน้ำตาลเข้ม
- ท่าทาง: ชี้, อธิบาย, ทำมือ
- ใส่ในวงกลมสีขาว มีขอบดำหนา 3px

### Props / Stickers (กระจายรอบๆ)
- สร้าง sticker แบบ hand-drawn:
  - stopwatch ⏱️: วงกลม มีเข็ม
  - scissors ✂️: กรรไกรตัด
  - highlighter: ปากกาไฮไลท์
  - tag 50%: ป้ายลดราคา สีส้ม
  - phone mockup: มือถือ มี UI ซับในจอ
  - paper clip, tape, doodle arrows
- แต่ละ sticker: rotate สุ่ม, drop-shadow, border ดำ

### Typography
- หัวข้อ: IBM Plex Sans Thai Bold 24-32px
- ซับ: 20-26px Bold, สีดำ
- คำเน้น: ตัวหนา + กล่องสี

## Technical Implementation

```html
- ใช้ Tailwind CSS via CDN
- Container: w-[390px] h-[844px] (iPhone 14) centered, overflow hidden
- Timeline: Array ของ {text: string, highlight?: {word, color}, duration: ms}
- JS: setInterval เปลี่ยนซับ, add class 'pop-in' ทุกครั้ง
- Subtitle component: absolute bottom-24 left-1/2 -translate-x-1/2
- Highlight: <span class="px-2 py-0.5 border-2 border-black rounded-lg rotate-1 shadow-sm">
```

## Rules

1. ห้ามใช้วิดีโอจริง - สร้างทุกอย่างด้วย HTML/CSS/JS animation
2. ซับต้องสั้นเสมอ - ถ้าผู้ใช้ให้ประโยคยาว ต้องตัดให้เอง
3. ทุกคลิปต้องมีอย่างน้อย 3 คำที่เน้นด้วยสี
4. ความยาวคลิปจำลอง: 15-30 วินาที (timeline loop)
5. เพิ่มปุ่ม Play / Replay
6. Responsive: ต้องดูได้ที่ 390px โดยไม่เลื่อนข้าง

## Example Timeline Structure

```js
const timeline = [
  { text: "ทริคทำซับ", highlight: { word: "ซับ", color: "#FFD93D" }, duration: 800 },
  { text: "ให้คนดูจำได้", duration: 700 },
  { text: "ในพริบตาเดียว", highlight: { word: "พริบตา", color: "#5B8DEF" }, duration: 900 },
  { text: "ลดเหลือ 50%", highlight: { word: "50%", color: "#FF7A45" }, duration: 1000 },
  { text: "กดเซฟไว้เลย", highlight: { word: "เซฟ", color: "#7ED6A0" }, duration: 800 },
]
```

## Output

ส่งไฟล์ HTML เดียวที่รันได้ทันที ไม่ต้องแยกไฟล์
