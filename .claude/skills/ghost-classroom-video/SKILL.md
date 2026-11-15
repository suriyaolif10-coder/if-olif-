---
name: ghost-classroom-video
description: Render a ready-made 9:16 Thai horror-comedy cartoon short ("ghost teacher's quiz" classroom story, 2:44, 86 shots) where only the title changes. Use when the user asks for the ghost classroom / ห้องเรียนผี / ครูผี template video, or says "ทำคลิปผีห้องเรียน เปลี่ยนชื่อเรื่องเป็น ...".
---

# Ghost Classroom video template (เปลี่ยนแค่ชื่อเรื่อง)

A fixed, shot-for-shot template. Every frame is drawn in code (`render.py`) with
an original cast, and the soundtrack is synthesised, so no outside assets are needed.

**Story beats (fixed):** the ghost teacher writes the title on the board → the students take their seats →
she writes the rule "ตอบไม่ได้ = ตาย" → countdown 00:52 → 00:38 → 00:08 → 00:00 → Fah panics and points at
her friends → 3‑2‑1 → hair ties Fah up and drags her out the door → the clock strikes 12 and the bell rings →
a dancer ghost appears for the finale.

**Cast:** ครูผี (cracked round glasses, long hair, maroon dress, cane) · ฟ้า (red bob + yellow clip) ·
มิ้นท์ (navy pigtails) · เก่ง (spiky hair + blue headband) · บอส (green cap) · ตูน (orange beanie) · ผีนางรำ (dancer ghost).

## How to run

Requirements: `python3`, `ffmpeg`, `pip install pycairo pillow numpy`, and a Thai font
(Loma from `fonts-tlwg-loma` is found by default; to use another font, put `fonts/Kanit-Bold.ttf` next to the script or set `"font"` in the config).

```bash
cd .claude/skills/ghost-classroom-video
# 1) the only thing that usually changes: the title
python3 render.py --title "ชื่อเรื่องใหม่" --out ../../../output/ชื่อเรื่องใหม่.mp4

# optional
python3 render.py --title "..." --subtitle "ตอนที่ 2"      # second line on the chalkboard
python3 render.py --title "..." --rule "ตอบผิด = โดนหัก"    # change the board rule text too
python3 render.py --config config.example.json --out v.mp4
python3 render.py --title "..." --preview --out draft.mp4   # 540x960 fast draft
python3 render.py --title "..." --still 3 --out check.png   # one frame (seconds) to check the title
python3 render.py --title "..." --no-banner                 # no title banner over the first 4.5 s
```

Output: MP4 at 1080×1920, 24 fps, H.264 + AAC, 164 s. A full render takes about 2–3 min on 4 cores.

## Where the title appears
1. A banner at the top of the screen for the first 4.5 s.
2. The chalkboard in shot 1 (0–2.6 s): the teacher writes it letter by letter.
   Font size shrinks automatically for long titles (≤12 / ≤18 / longer characters).

## Workflow for the agent
1. Ask for or take the new title. Nothing else is needed.
2. Run `--still 1.5` and look at the PNG to check the title fits on the board.
3. Render the full video and give the user the file path.

## Editing the template
- Shot timing: `CUTS` (87 cut points) in `render.py`. The shot list (scene type + parameters) is in `shots()`.
- Scene types: `board_back`, `board`, `class`, `cu` (student close-up), `tcu`/`txcu` (teacher close-up / extreme close-up),
  `clock`, `backview`, `legs`, `hand`, `door`, `dancer`.
- Sound effects per shot: `"sfx": "sting" | "whoosh" | "scream" | "bell" | "creak"`, plus `"tick": True` for the clock.
