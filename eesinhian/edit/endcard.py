#!/usr/bin/env python3
"""Append a 'ลีฟไง จะใครเล่า' end card (logo + กดไลก์ / กดแชร์ / กดติดตาม) to a 9:16 video.

    python3 endcard.py IN.mp4 OUT.mp4 [--seconds 4.5]
"""
import math, os, subprocess, sys, tempfile, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS = 1080, 1920, 30
BG = (7, 18, 36)
ORANGE = (240, 122, 32)
NAVY = (24, 39, 78)
FONT = os.path.join(HERE, "..", "fonts", "Loma-Bold.otf")

src, out = sys.argv[1], sys.argv[2]
DUR = float(sys.argv[sys.argv.index("--seconds") + 1]) if "--seconds" in sys.argv else 4.5

logo = Image.open(os.path.join(HERE, "channel_logo.jpg")).convert("RGB").crop((95, 280, 1125, 615))
logo = logo.resize((960, int(960 * logo.height / logo.width)), Image.LANCZOS)

def ease_back(x):
    x = max(0.0, min(1.0, x)); c = 1.70158
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2

def font(sz):
    return ImageFont.truetype(FONT, sz)

def icon(d, kind, cx, cy, s, col):
    if kind == "like":   # thumbs-up
        d.rounded_rectangle([cx - 30 * s, cy - 4 * s, cx - 14 * s, cy + 30 * s], 4 * s, fill=col)
        d.rounded_rectangle([cx - 10 * s, cy - 4 * s, cx + 30 * s, cy + 30 * s], 8 * s, fill=col)
        d.polygon([(cx - 10 * s, cy), (cx + 2 * s, cy - 30 * s), (cx + 14 * s, cy - 28 * s), (cx + 10 * s, cy)], fill=col)
    elif kind == "share":  # curved arrow
        d.polygon([(cx + 8 * s, cy - 30 * s), (cx + 34 * s, cy - 6 * s), (cx + 8 * s, cy + 18 * s)], fill=col)
        d.arc([cx - 34 * s, cy - 18 * s, cx + 22 * s, cy + 50 * s], 190, 280, fill=col, width=int(11 * s))
    else:                # bell
        d.pieslice([cx - 26 * s, cy - 30 * s, cx + 26 * s, cy + 26 * s], 180, 360, fill=col)
        d.rectangle([cx - 26 * s, cy - 3 * s, cx + 26 * s, cy + 16 * s], fill=col)
        d.rounded_rectangle([cx - 34 * s, cy + 12 * s, cx + 34 * s, cy + 22 * s], 4 * s, fill=col)
        d.ellipse([cx - 8 * s, cy + 22 * s, cx + 8 * s, cy + 36 * s], fill=col)

BTNS = [("like", "กดไลก์", 0.9), ("share", "กดแชร์", 1.2), ("bell", "กดติดตาม", 1.5)]
PRESS = {"like": 2.2, "share": 2.8, "bell": 3.4}

def frame(t):
    im = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), BG)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([140, 420, 940, 1100], fill=(18, 38, 80))
    im = Image.blend(im, glow.filter(ImageFilter.GaussianBlur(120)), 0.9)
    # logo pop
    k = ease_back(t / 0.55) if t > 0 else 0
    if k > 0.01:
        lw = max(2, int(logo.width * k)); lh = max(2, int(logo.height * k))
        im.paste(logo.resize((lw, lh)), ((W - lw) // 2, 640 - lh // 2))
    d = ImageDraw.Draw(im)
    a = max(0.0, min(1.0, (t - 0.5) / 0.4))
    if a > 0:
        d.text((W / 2, 900), "ขอบคุณที่ฟังเรื่องเล่า", font=font(52), fill=tuple(int(BG[i] + (230 - BG[i]) * a) for i in range(3)), anchor="mm")
    # buttons
    for i, (kind, label, t0) in enumerate(BTNS):
        k = ease_back((t - t0) / 0.4)
        if k <= 0.01:
            continue
        cx, cy = W // 2, 1080 + i * 150
        bw, bh = 560 * k, 116 * k
        pressed = t >= PRESS[kind]
        p = max(0.0, 1 - abs(t - PRESS[kind]) / 0.12) if t >= PRESS[kind] - 0.12 else 0
        sc = 1 - 0.08 * p
        bw, bh = bw * sc, bh * sc
        fill = ORANGE if pressed else NAVY
        d.rounded_rectangle([cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2], int(bh / 2), fill=fill, outline=(235, 238, 245), width=max(1, int(5 * k)))
        icon(d, kind, cx - bw / 2 + 95 * k, cy, 1.25 * k * sc, (255, 255, 255))
        d.text((cx + 40 * k, cy), label, font=font(max(10, int(58 * k * sc))), fill=(255, 255, 255), anchor="mm")
        if pressed and kind == "like":
            pass
    # tapping hand (circle cursor) moving to each button
    for kind, label, t0 in BTNS:
        tp = PRESS[kind]
        if tp - 0.35 <= t < tp + 0.25:
            i = [b[0] for b in BTNS].index(kind)
            cy = 1080 + i * 150
            x = 820 - 60 * max(0.0, min(1.0, (t - tp + 0.35) / 0.35))
            r = 34 - 8 * max(0.0, 1 - abs(t - tp) / 0.12)
            d.ellipse([x - r, cy + 10 - r, x + r, cy + 10 + r], fill=(255, 255, 255), outline=(20, 20, 20), width=4)
    # fade in from black
    if t < 0.25:
        im = Image.blend(Image.new("RGB", (W, H), (0, 0, 0)), im, t / 0.25)
    if t > DUR - 0.3:
        im = Image.blend(im, Image.new("RGB", (W, H), (0, 0, 0)), (t - (DUR - 0.3)) / 0.3)
    return im

tmp = tempfile.mkdtemp(prefix="endcard_")
card = os.path.join(tmp, "card.mp4")
# pop / click sounds
SR = 48000
n = int(DUR * SR); aud = np.zeros(n)
def add(t0, sig):
    s = int(t0 * SR); aud[s:s + len(sig)] += sig[:max(0, n - s)]
x = np.arange(int(0.12 * SR)) / SR
pop = np.sin(2 * np.pi * (500 + 900 * x / 0.12) * x) * np.exp(-x * 35) * 0.35
click = np.sin(2 * np.pi * 1500 * x) * np.exp(-x * 80) * 0.4
add(0.05, pop)
for _, _, t0 in BTNS: add(t0, pop * 0.7)
for tp in PRESS.values(): add(tp, click)
wav = os.path.join(tmp, "card.wav")
with wave.open(wav, "wb") as w:
    pcm = (np.stack([aud, aud], 1) * 32767).astype(np.int16)
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
pr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                       "-i", wav, "-c:v", "libx264", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", card],
                      stdin=subprocess.PIPE)
for f in range(int(DUR * FPS)):
    pr.stdin.write(frame(f / FPS).tobytes())
pr.stdin.close(); pr.wait()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-i", card, "-filter_complex",
                "[0:v]fps=30,format=yuv420p[v0];[0:a]aresample=48000,aformat=channel_layouts=stereo[a0];"
                "[1:v]fps=30,format=yuv420p[v1];[1:a]aresample=48000,aformat=channel_layouts=stereo[a1];"
                "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]",
                "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "19", "-preset", "medium", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], check=True)
print(out)
