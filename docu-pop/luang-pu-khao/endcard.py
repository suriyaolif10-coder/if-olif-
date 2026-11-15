"""End card: channel logo + like/share/follow CTA, then append to a clip.
usage: python3 -I endcard.py <logo.jpg> <in.mp4> <out.mp4>
"""
import sys, math, os, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

LOGO, IN, OUT = sys.argv[1:4]
W, H, FPS = 1080, 1920, 30
DUR = float(os.environ.get("ENDDUR", "5.0"))
FB = os.path.expanduser("~/.fonts/Kanit-Bold.ttf")
FM = os.path.expanduser("~/.fonts/Kanit-Medium.ttf")
BG = (8, 18, 34)
ORANGE = (240, 120, 30)

def font(p, s):
    return ImageFont.truetype(p, s, layout_engine=ImageFont.Layout.RAQM)

# logo badge with rounded-rect alpha (box found from the source image)
src = Image.open(LOGO).convert("RGB")
box = (100, 286, 1119, 609)
logo = src.crop(box)
S = 4
mask = Image.new("L", (logo.width * S, logo.height * S), 0)
ImageDraw.Draw(mask).rounded_rectangle((4 * S, 4 * S, (logo.width - 4) * S, (logo.height - 4) * S), radius=44 * S, fill=255)
logo.putalpha(mask.resize(logo.size, Image.LANCZOS))
lw = 960
logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
glow = Image.new("RGBA", (logo.width + 200, logo.height + 200), (0, 0, 0, 0))
ImageDraw.Draw(glow).rounded_rectangle((100, 100, 100 + logo.width, 100 + logo.height), radius=50, fill=ORANGE + (110,))
glow = glow.filter(ImageFilter.GaussianBlur(40))

def bg_frame():
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - 760) / H) ** 2)
    k = np.clip(1 - r * 1.6, 0, 1)[..., None]
    a = np.array(BG) * (1 - k) + np.array([24, 44, 84]) * k
    return Image.fromarray(a.astype(np.uint8)).convert("RGBA")
BGI = bg_frame()

def text(s, p, size, fill=(255, 255, 255)):
    f = font(p, size)
    w = int(f.getlength(s)) + 20
    asc, desc = f.getmetrics()
    im = Image.new("RGBA", (w, asc + desc + 20), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10, 6), s, font=f, fill=fill)
    return im

def heart(d, cx, cy, s, col):
    d.ellipse((cx - s, cy - s * .75, cx, cy + s * .25), fill=col)
    d.ellipse((cx, cy - s * .75, cx + s, cy + s * .25), fill=col)
    d.polygon([(cx - s * .97, cy - s * .1), (cx + s * .97, cy - s * .1), (cx, cy + s * 1.0)], fill=col)

def share(d, cx, cy, s, col):
    d.polygon([(cx + s, cy - s * .15), (cx + s * .1, cy - s), (cx + s * .1, cy - s * .5), (cx - s, cy - s * .5),
               (cx - s, cy + s * .7), (cx - s * .55, cy + s * .7), (cx - s * .55, cy - s * .05), (cx + s * .1, cy - s * .05),
               (cx + s * .1, cy + s * .7)], fill=col)

def bell(d, cx, cy, s, col):
    d.pieslice((cx - s * .75, cy - s, cx + s * .75, cy + s * .5), 180, 360, fill=col)
    d.rectangle((cx - s * .75, cy - s * .25, cx + s * .75, cy + s * .45), fill=col)
    d.polygon([(cx - s * .75, cy + s * .3), (cx - s, cy + s * .6), (cx + s, cy + s * .6), (cx + s * .75, cy + s * .3)], fill=col)
    d.ellipse((cx - s * .25, cy + s * .55, cx + s * .25, cy + s * .95), fill=col)

def pill(label, icon):
    S2 = 2; w, h = 300, 128
    im = Image.new("RGBA", (w * S2, h * S2), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w * S2 - 1, h * S2 - 1), radius=h * S2 // 2, fill=ORANGE + (255,), outline=(255, 255, 255, 255), width=6 * S2)
    icon(d, 70 * S2, 64 * S2, 26 * S2, (255, 255, 255, 255))
    im = im.resize((w, h), Image.LANCZOS)
    t = text(label, FB, 50)
    im.alpha_composite(t, (118, (h - t.height) // 2 - 2))
    return im

PILLS = [pill("ไลก์", heart), pill("แชร์", share), pill("ติดตาม", bell)]
T1 = text("ขอบคุณที่ดูจนจบ", FM, 60)
T2 = text("ถ้าชอบเรื่องนี้ ฝากกดไลก์ กดแชร์ ให้ด้วยนะ", FM, 46, (220, 228, 240))
T3 = text("แล้วพบกันเรื่องต่อไป", FM, 42, (170, 180, 200))

def pop(t, t0, dur=0.32):
    u = (t - t0) / dur
    if u <= 0: return 0
    if u >= 1: return 1.0
    return 0.6 + 0.55 * math.sin(u * math.pi * 0.75) if u < .8 else 1.0

def put(fr, im, cx, cy, k, alpha=1.0):
    if k <= 0: return
    im2 = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.BICUBIC)
    if alpha < 1:
        a = np.asarray(im2).copy(); a[..., 3] = (a[..., 3] * alpha).astype(np.uint8); im2 = Image.fromarray(a, "RGBA")
    fr.alpha_composite(im2, (int(cx - im2.width / 2), int(cy - im2.height / 2)))

def fade_in(t, t0, d=0.35):
    return max(0, min(1, (t - t0) / d))

def frames():
    n = int(DUR * FPS)
    for f in range(n):
        t = f / FPS
        fr = BGI.copy()
        put(fr, T1, 540, 470, 1, fade_in(t, 0.1))
        k = pop(t, 0.25)
        put(fr, glow, 540, 760, max(k, 0.01), fade_in(t, 0.4, 0.6) * (0.75 + 0.25 * math.sin(t * 3)))
        put(fr, logo, 540, 760, k)
        put(fr, T2, 540, 1000, 1, fade_in(t, 0.9))
        for i, p in enumerate(PILLS):
            k = pop(t, 1.2 + 0.25 * i)
            if k >= 1 and t > 2.3:  # gentle pulse, staggered
                k = 1 + 0.05 * max(0, math.sin((t - 2.3 - 0.35 * i) * 4.5))
            put(fr, p, 210 + 330 * i, 1190, k)
        put(fr, T3, 540, 1390, 1, fade_in(t, 2.0))
        g = min(1, t / 0.4, (DUR - t) / 0.6)
        rgb = fr.convert("RGB")
        if g < 1:
            rgb = Image.eval(rgb, lambda v, g=g: int(v * g))
        yield rgb.tobytes()

def audio(path):
    sr = 44100; N = int(sr * DUR); t = np.arange(N) / sr; out = np.zeros((N, 2))
    for j, fq in enumerate([110, 164.81, 220, 329.63]):
        out[:, 0] += 0.05 * np.sin(2 * np.pi * fq * t); out[:, 1] += 0.05 * np.sin(2 * np.pi * fq * 1.003 * t + .5)
    def ding(t0, f0, a):
        i0 = int(t0 * sr); L = N - i0; tt = np.arange(L) / sr
        b = sum(x * np.sin(2 * np.pi * f0 * r * tt) * np.exp(-tt * dc) for r, x, dc in [(1, a, 3), (2, a * .4, 5), (3.01, a * .2, 8)])
        out[i0:, :] += b[:, None]
    ding(0.25, 523.25, 0.18)
    for i, f0 in enumerate([659.25, 783.99, 1046.5]):
        ding(1.2 + 0.25 * i, f0, 0.12)
    out *= np.clip(np.minimum(t / 0.3, (DUR - t) / 0.8), 0, 1)[:, None]
    out = np.tanh(out * 1.3) * 0.6
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((out * 32767).astype(np.int16).tobytes())

if __name__ == "__main__":
    tmp_wav, tmp_mp4 = OUT + ".end.wav", OUT + ".end.mp4"
    audio(tmp_wav)
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-i", tmp_wav, "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                          "-ar", "44100", "-shortest", tmp_mp4], stdin=subprocess.PIPE)
    for b in frames():
        p.stdin.write(b)
    p.stdin.close(); p.wait()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", IN, "-i", tmp_mp4, "-filter_complex",
                    "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]", "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart", OUT], check=True)
    os.remove(tmp_wav); os.remove(tmp_mp4)
