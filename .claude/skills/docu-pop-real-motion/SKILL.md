---
name: docu-pop-real-motion
description: สกิลเล่าเรื่องสไตล์ Petzh Docu-Pop - เอาภาพจริงมาขยับ ใช้เมื่อทำคลิปแนวเล่าเรื่อง, เอาภาพจริงมาขยับ, หารูปมาใส่ภาพหลัง, สไตล์ Petzh
---

# Docu-Pop Real Motion

## เมื่อไหร่ใช้
ทำคลิปแนวเล่าเรื่อง, เอาภาพจริงมาขยับ, หารูปมาใส่ภาพหลัง, สไตล์ Petzh

## STEP 1 แยก Shot
แยก transcript ทุก 2-4 วิ

```json
{
  "shot": 1,
  "dialogue": "ประโยคพูด",
  "search_query_en": "pile of US dollars cinematic",
  "text_overlay": "ถมเงินมหาศาล",
  "motion": "zoom-in + parallax"
}
```

## STEP 2 หารูปจริง
เมื่อสั่ง "หารูปมาใส่ภาพหลัง" ให้ WebSearch หาภาพจริง Wikimedia/Pexels/Unsplash ส่ง 3-5 ตัวเลือกพร้อม URL

## STEP 3 เอาภาพจริงมาขยับ
Library:
- Ken Burns: Slow zoom-in cinematic
- Parallax 3D: depth parallax foreground separated
- Map Motion: pin drop USA to Thailand
- Money Falling: alpha background
- Talking Head: circle top-right 25% white border 8px

Prompt for Runway/Luma:
Image: [รูปจริง] + Motion + Text white bold black stroke bottom-center yellow highlight

## STEP 4 Timeline
## STEP 5 ส่ง edit_instructions.md

## กฎ
- ภาพจริง
- มี Motion ทุกช็อต
- Text สั้น
- เปลี่ยนภาพ 2-4 วิ
