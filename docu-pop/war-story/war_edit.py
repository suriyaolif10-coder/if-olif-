"""War-story docu-pop edit: explicit shot list synced to voice_fixed.wav, vertical 9:16, Thai text overlays.
usage: python3 -I war_edit.py <source_video.mp4> <workdir> <out_main.mp4>
"""
import sys, os, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

V, WD, OUT = sys.argv[1:4]
os.makedirs(WD, exist_ok=True)
W, H, FPS, FG_H = 1080, 1920, 30, 900
FG_Y = (H - FG_H) // 2 - 60
FB = os.path.expanduser("~/.fonts/Kanit-Bold.ttf")
FM = os.path.expanduser("~/.fonts/Kanit-Medium.ttf")
TOTAL = 53.7

# out_start, src_start, pan dir, headline (**yellow**), subtitle
SHOTS = [
 (0.00,   0.5,  1, "เข้า**สิบ** เหลือหนึ่ง", "ผืนป่าที่คนโบราณเล่าขาน"),
 (3.90,  11.0, -1, "**เหลือหนึ่ง**กลับมา", "เข้าสิบ เหลือหนึ่งกลับมา"),
 (7.95,  20.5,  1, "ทหาร **10** นาย", "ถูกส่งเข้าไปในดงพญาไฟ"),
 (11.60, 25.5, -1, "รอดมา**คนเดียว**", "กลับมาเพียงคนเดียว"),
 (15.40, 30.2,  1, "อีก **9** คนอยู่ไหน!", "“พูดมา!”"),
 (18.60, 45.2, -1, "**หนีทัพ**ใช่ไหม!", "“โกหก! แกหนีทัพใช่ไหม”"),
 (21.95, 35.5,  0, "ตัว**ร้อนเหมือนไฟ**", "“พวกเขาตัวร้อนเหมือนไฟเผาครับ”"),
 (24.00, 40.0,  1, "ล้ม**ทีละคน**", "“…ล้มไปทีละคน”"),
 (26.80, 57.0,  0, "**ผีตีนเดียว**", "“ผมเห็นผีตีนเดียว”"),
 (28.90, 65.2,  1, "ตามมา**ทุกคืน**", "“มันตามเรามาทุกคืน”"),
 (32.10, 70.2,  0, "**ไม่ใช่ผี**", "ความจริงเบื้องหลังคำสาป"),
 (36.15, 75.2, -1, "**ไข้ป่า**", "ไข้ป่า และมาลาเรีย"),
 (38.60, 80.2,  1, "ยุง**มาลาเรีย**", "จากยุงในป่าดิบชื้น"),
 (42.10, 85.0, -1, "**ตำนาน**เตือนใจ", "ตำนานจึงถูกเล่าสืบต่อ"),
 (46.00, 100.2, 1, "ไม่ใช่สิ่งที่ต้อง**เอาชนะ**", "ธรรมชาติไม่ใช่สิ่งที่ต้องเอาชนะ"),
 (50.15, 105.0, -1, "**เรียนรู้** และเคารพ", "แต่คือสิ่งที่ต้องเรียนรู้ และเคารพ"),
]

def font(p, s):
    return ImageFont.truetype(p, s, layout_engine=ImageFont.Layout.RAQM)

def line_img(markup, p, size, stroke, maxw):
    while True:
        f = font(p, size)
        sg = [(x, i % 2 == 1) for i, x in enumerate(markup.split("**")) if x]
        tw = sum(f.getlength(x) for x, _ in sg)
        if tw <= maxw or size < 36: break
        size -= 4
    asc, desc = f.getmetrics()
    im = Image.new("RGBA", (int(tw) + 2 * stroke + 20, asc + desc + 2 * stroke + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(im); x = stroke + 10
    for s, hl in sg:
        d.text((x, stroke + 10), s, font=f, fill=(255, 214, 0) if hl else (255, 255, 255), stroke_width=stroke, stroke_fill=(0, 0, 0))
        x += f.getlength(s)
    return im

def text_card(hl, sub, path):
    a = line_img(hl, FB, 100, 9, 1000); b = line_img(sub, FM, 50, 5, 980)
    im = Image.new("RGBA", (W, a.height + b.height - 10), (0, 0, 0, 0))
    im.alpha_composite(a, ((W - a.width) // 2, 0)); im.alpha_composite(b, ((W - b.width) // 2, a.height - 10))
    im.save(path)

parts = []
for i, (o, s, pdir, hl, sub) in enumerate(SHOTS):
    d = (SHOTS[i + 1][0] if i + 1 < len(SHOTS) else TOTAL) - o
    png = os.path.join(WD, f"t{i:02d}.png"); text_card(hl, sub, png)
    p = os.path.join(WD, f"w{i:02d}.mp4"); parts.append(p)
    fc = (f"[0:v]fps={FPS},split[bg0][fg0];"
          f"[bg0]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:2,eq=brightness=-0.22:saturation=0.75[bg];"
          f"[fg0]scale=-2:'trunc({FG_H}*(1+0.08*t/{d:.3f})/2)*2':eval=frame,"
          f"crop={W}:{FG_H}:x='(iw-{W})/2+{pdir}*(iw-{W})*0.4*(t/{d:.3f}-0.5)':y='(ih-{FG_H})/2'[fg];"
          f"[bg][fg]overlay=0:{FG_Y}[v1];"
          f"[1:v]format=rgba,fade=in:st=0.12:d=0.25:alpha=1[tx];"
          f"[v1][tx]overlay=0:'{FG_Y + FG_H + 40}+30*max(0\\,1-(t-0.12)/0.25)':format=auto,format=yuv420p[v]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{s:.2f}", "-t", f"{d:.3f}", "-i", V, "-loop", "1", "-t", f"{d:.3f}", "-i", png,
                    "-filter_complex", fc, "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", str(FPS), p], check=True)
    print(f"shot {i+1}/{len(SHOTS)} {o:5.2f}+{d:.2f}s src {s}", flush=True)

# tension music (D minor drone + heartbeat + hit on every cut), lighter under the dialogue
sr = 44100; N = int(sr * TOTAL); t = np.arange(N) / sr; out = np.zeros((N, 2))
for k, fq in enumerate([73.42, 110.0, 146.83, 174.61, 220.0]):
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * (0.07 + 0.02 * k) * t + k); amp = (0.08 if fq < 120 else 0.035) * lfo
    out[:, 0] += amp * np.sin(2 * np.pi * fq * t); out[:, 1] += amp * np.sin(2 * np.pi * fq * 1.004 * t + 0.6)
out += (0.06 * np.sin(2 * np.pi * 55 * t) * np.exp(-((t * 1.2) % 1.0) * 6))[:, None]
for o, *_ in SHOTS:
    i0 = int(o * sr); L = int(0.8 * sr); tt = np.arange(L) / sr
    f = 45 + 45 * np.exp(-tt * 20); hit = 0.38 * np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt * 6)
    e = min(N, i0 + L); out[i0:e] += hit[: e - i0, None]
out *= np.clip(np.minimum(t / 1.0, (TOTAL - t) / 1.5), 0, 1)[:, None]
out = np.tanh(out * 1.2); out *= 0.7 / np.max(np.abs(out))
wav = os.path.join(WD, "music.wav")
with wave.open(wav, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out * 32767).astype(np.int16).tobytes())

lst = os.path.join(WD, "list.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav, "-map", "0:v", "-map", "1:a",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", "-movflags", "+faststart", OUT], check=True)
print("done")
