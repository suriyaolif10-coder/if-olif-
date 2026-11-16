#!/usr/bin/env python3
"""Cut the user's 9-scene video (1280x1152, 9 x 10 s) to 9:16 with narration,
dialogue and Thai subtitles.

    python3 cut.py VIDEO NARRATOR.mp3 YOUNGMAN.mp3 ELDER.mp3 OUT.mp4 [--keep-original-sound]
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "..", "fonts")
import json
if "--narration" in sys.argv:
    # python3 cut.py VIDEO --narration VOICE.mp3 --subs subs.json OUT.mp4
    a = sys.argv
    video, voice, subs_file, out = a[1], a[a.index("--narration") + 1], a[a.index("--subs") + 1], a[-1]
    nar = man = eld = voice
    SINGLE = True
else:
    video, nar, man, eld, out = sys.argv[1:6]
    SINGLE = False
KEEP_BED = "--keep-original-sound" in sys.argv  # default: original clip sound removed
SRC = {"nar": nar, "man": man, "eld": eld}

# (source, clip start, clip end, place at) - clip times measured from pauses in each file
PIECES = [
    ("nar", 0.00, 4.00, 1.00),   # S1  คืนนั้น หมู่บ้านเงียบ...
    ("nar", 4.40, 8.95, 5.30),   # S1  บ้านไม้เก่าหลังนั้น...
    ("nar", 9.30, 14.10, 11.40), # S2  ถนนดินกลางหมู่บ้าน...
    ("nar", 14.45, 19.45, 21.40),# S3  แล้วเธอก็ยืนอยู่ตรงนั้น / ริมถนน...
    ("nar", 19.85, 25.55, 31.40),# S4  ชายผ้าซิ่น...
    ("man", 0.00, 3.10, 44.00),  # S5  ใคร...ใครอยู่ตรงนั้นครับ อย่าเข้ามานะ
    ("nar", 26.25, 29.30, 52.90),# S6  แต่เงา มันกำลังเดินเข้ามา
    ("man", 3.68, 4.60, 64.90),  # S7  อย่าเข้ามา!
    ("man", 4.98, 8.60, 70.40),  # S8  ผมเห็นจริงๆ ครับ...
    ("eld", 0.00, 5.83, 74.40),  # S8  หา...อย่าไปใกล้ต้นนั้นเด้อ / ต้นนั้นมันเหี้ยนน่ะ
    ("nar", 29.65, 32.97, 82.90),# S9  อย่าคิดว่า...เธอกำลังรอใคร
]

# subtitles: start, end, text ("\N" new line, {r}...{w} = muted red)
SUBS = [
    (1.00, 5.05, r"คืนนั้น หมู่บ้านเงียบ\Nจนได้ยินเสียงจิ้งหรีด"),
    (5.30, 9.90, r"บ้านไม้เก่าหลังนั้น\Nไม่มีใครกล้าเข้าใกล้หลังตะวันตกดิน"),
    (11.40, 16.30, r"ถนนดินกลางหมู่บ้าน ว่างเปล่า\Nมีแต่หมอกบาง ๆ"),
    (21.40, 23.20, r"แล้ว{r}เธอ{w}ก็ยืนอยู่ตรงนั้น"),
    (23.60, 26.60, r"ริมถนน...\Nนิ่ง ไม่ขยับเลย"),
    (31.40, 35.90, r"{r}ชายผ้าซิ่น{w} มันขาดรุ่ย\Nเหมือนถูกอะไรฉีก"),
    (36.20, 37.60, r"เธอยืนนิ่ง"),
    (44.00, 45.85, r"“ใคร... ใครอยู่ตรงนั้นครับ”"),
    (46.10, 47.40, r"“อย่าเข้ามานะ!”"),
    (52.90, 56.20, r"แต่เงา...\N{r}มันกำลังเดินเข้ามา{w}"),
    (64.90, 66.40, r"{r}“อย่าเข้ามา!”{w}"),
    (70.40, 71.50, r"“ผมเห็นจริง ๆ ครับ”"),
    (72.30, 74.20, r"“เธอยืนอยู่ใต้ต้นไม้นั่น”"),
    (74.40, 78.50, r"“หา... จะเห็นอีซิ่น\Nอย่าไปใกล้ต้นนั้นเด้อ”"),
    (78.80, 80.50, r"“ต้นนั้นมัน{r}เหี้ยน{w}น่ะ”"),
    (82.90, 86.70, r"อย่าคิดว่า...\N{r}เธอกำลังรอใคร{w}"),
]

if SINGLE:
    PIECES = [("nar", 0.0, 90.0, 0.0)]
    SUBS = [tuple(x) for x in json.load(open(subs_file, encoding="utf-8"))]

def ts(s):
    return f"{int(s // 3600)}:{int(s % 3600 // 60):02d}:{s % 60:05.2f}"

RED, WHITE = r"{\c&H3D4FC4&}", r"{\c&HF7F5F4&}"
ass = os.path.join(os.path.dirname(os.path.abspath(out)), "subs.ass")
with open(ass, "w", encoding="utf-8") as f:
    f.write("""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Loma,64,&H00F4F5F7,&H00FFFFFF,&H00080605,&H96000000,-1,0,0,0,100,100,0,0,1,6,2,2,60,60,300,1
Style: Title,Loma,96,&H00E4DDD9,&H00FFFFFF,&H00050507,&H00000000,-1,0,0,0,100,100,2,0,1,7,0,8,40,40,170,1
Style: Tag,Loma,40,&H003D4FC4,&H00FFFFFF,&H00050507,&H00000000,-1,0,0,0,100,100,1,0,1,4,0,8,40,40,290,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""")
    f.write(f"Dialogue: 0,{ts(0.3)},{ts(88.6)},Title,,0,0,0,,{{\\fad(600,400)}}อีซิ่นเหี้ยน\n")
    f.write(f"Dialogue: 0,{ts(0.3)},{ts(88.6)},Tag,,0,0,0,,{{\\fad(600,400)}}ผีหญิงชุดซิ่น\n")
    for s, e, t in SUBS:
        t = t.replace("{r}", RED).replace("{w}", WHITE)
        f.write(f"Dialogue: 0,{ts(s)},{ts(e)},Sub,,0,0,0,,{{\\fad(120,120)}}{t}\n")

inputs = ["-i", video, "-i", nar] if SINGLE else ["-i", video, "-i", nar, "-i", man, "-i", eld]
idx = {"nar": 1, "man": 2, "eld": 3}
fc = []
# picture: each 10 s clip has its own black padding baked in -> crop it per scene,
# then sharp picture full-width in the middle over a blurred copy of itself
CROPS = ["1152:768:64:192", "1152:768:64:192", "768:1152:256:0", "1280:720:0:216", "1280:720:0:216",
         "1280:720:0:216", "1280:720:0:216", "1280:720:0:216", "1248:704:16:224"]
fc.append("[0:v]fps=30,split=9" + "".join(f"[s{i}]" for i in range(9)))
for i, c in enumerate(CROPS):
    a, b = i * 10, (i + 1) * 10
    fc.append(f"[s{i}]trim={a}:{b},setpts=PTS-STARTPTS,crop={c},split=2[a{i}][b{i}]")
    fc.append(f"[a{i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=45,eq=brightness=-0.22:saturation=0.75[bg{i}]")
    fc.append(f"[b{i}]scale=1080:-2[fg{i}]")
    fc.append(f"[bg{i}][fg{i}]overlay=0:(H-h)/2-30[c{i}]")
fc.append("".join(f"[c{i}]" for i in range(9)) + f"concat=n=9:v=1:a=0,subtitles='{ass}':fontsdir='{FONTS}'[v]")
# voice pieces
labels = []
for i, (src, a, b, at) in enumerate(PIECES):
    d = int(at * 1000)
    fc.append(f"[{idx[src]}:a]atrim={a}:{b},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,"
              f"afade=t=in:d=0.03,afade=t=out:st={max(0, b - a - 0.06):.2f}:d=0.06,adelay={d}|{d}[p{i}]")
    labels.append(f"[p{i}]")
fc.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0,apad,atrim=0:90,volume=1.15[vo]")
if KEEP_BED:
    fc.append("[vo]asplit=2[vo1][vo2]")
    # original clip sound kept underneath, ducked while someone speaks
    fc.append("[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.7[bed]")
    fc.append("[bed][vo2]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[duck]")
    fc.append("[duck][vo1]amix=inputs=2:normalize=0,alimiter=limit=0.93[aout]")
else:
    fc.append("[vo]alimiter=limit=0.93[aout]")

cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[aout]",
       "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30",
       "-c:a", "aac", "-b:a", "192k", "-t", "90", "-movflags", "+faststart", out]
subprocess.run(cmd, check=True)
print(out)
