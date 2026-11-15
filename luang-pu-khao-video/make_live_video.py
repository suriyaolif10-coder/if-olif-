"""Luang Pu Khao biography from the user's illustrations, cut to the narration's pauses.
usage: python make_photo_video.py <imgdir> <out.mp4> <30|full> [preview times...]"""
import sys, os, math, subprocess
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from live import Live, K as LK
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

W, H, FPS, XF = 1080, 1920, 30, 0.3
HERE = os.path.dirname(os.path.abspath(__file__))
FB = os.path.join(HERE, "fonts", "Kanit-Bold.ttf")
IMG = sys.argv[1]; MODE = sys.argv[3]
PAUSES = [2.74, 7.15, 9.90, 12.32, 14.15, 17.52, 18.71, 20.91, 22.33, 24.95, 26.95, 29.43, 30.80, 34.08, 35.61,
          38.68, 44.42, 47.69, 50.81, 53.47, 55.47, 57.97, 61.79, 70.52, 77.05, 80.97, 82.39, 85.25, 89.51,
          94.21, 97.24, 98.40, 100.37, 103.07]
TOP, BOT = (14, 18, 755, 679), (14, 695, 755, 1356)          # comic panel boxes

# (image id, panel crop, label, sub-label, label position)
S = {
 "title":  ("81b3d6ba", None, "ประวัติ หลวงปู่ขาว อนาลโย", None, "bottom"),
 "born":   ("b316590a", None, "เกิด พ.ศ. 2431", "จังหวัดอุบลราชธานี", "top"),
 "farm":   ("6f5299dc", None, "ชีวิตฆราวาส ทำไร่ทำนา", None, "top"),
 "dusk":   ("eb003ed7", None, "เห็นทุกข์ของชีวิต", None, "top"),
 "ord1":   ("9eb0baf2", TOP, "ตัดสินใจออกบวช", None, "top"),
 "ord2":   ("9eb0baf2", BOT, "ตัดสินใจออกบวช", None, "top"),
 "mun1":   ("f12f4046", TOP, "ศิษย์หลวงปู่มั่น ภูริทัตโต", None, "top"),
 "mun2":   ("f12f4046", BOT, "ศิษย์หลวงปู่มั่น ภูริทัตโต", None, "top"),
 "tud":    ("347da4a6", TOP, "ออกธุดงค์ตามป่าเขา", None, "top"),
 "ele":    ("347da4a6", BOT, "เมตตาชนะช้างป่า", None, "top"),
 "mist":   ("87d40ec2", None, "ภาวนาอย่างเคร่งครัด", None, "top"),
 "temple": ("c620d166", None, "วัดถ้ำกลองเพล", "จ.หนองบัวลำภู", "top"),
 "end":    ("386b3a2b", None, "ละสังขาร 16 พ.ค. 2526", "สิริอายุ 95 ปี", "top"),
}
if MODE == "30":
    DUR = 30.0
    CUTS = [("title", 0), ("born", 2.74), ("farm", 7.15), ("dusk", 9.90), ("ord1", 12.32), ("ord2", 14.15),
            ("mun1", 17.52), ("mun2", 18.71), ("tud", 20.91), ("ele", 22.33), ("temple", 24.95), ("end", 26.95)]
else:
    DUR = 104.64
    order = ["title", "born", "farm", "dusk", "ord1", "ord2", "mun1", "mun2", "tud", "ele", "mist", "temple", "end"]
    CUTS = [(order[0], 0)]
    for i in range(1, len(order)):
        ideal = i * DUR / len(order)
        CUTS.append((order[i], min(PAUSES, key=lambda p: abs(p - ideal))))
STARTS = [c[1] for c in CUTS] + [DUR]

_cache = {}
_live = {}
def live(iid):
    if iid not in _live:
        if len(_live) >= 2: _live.pop(next(iter(_live)))
        f = next(x for x in os.listdir(IMG) if x.startswith(iid))
        _live[iid] = Live(Image.open(os.path.join(IMG, f)).convert("RGB"), iid)
    return _live[iid]

def src(key, tg):
    iid, box, *_ = S[key]
    a = Image.fromarray(live(iid).frame(tg))
    if box:
        pan = a.crop(tuple(round(v * LK) for v in box))
        pw = W - 60; ph = int(pan.height * pw / pan.width)
        pan = pan.resize((pw, ph), Image.LANCZOS)
        if key not in _cache:
            full = a.resize((W, H), Image.BILINEAR)
            _cache[key] = ImageEnhance.Brightness(full.filter(ImageFilter.GaussianBlur(28))).enhance(0.55)
        return _cache[key], pan
    return a.resize((W, H), Image.LANCZOS), None

def font(sz): return ImageFont.truetype(FB, sz, layout_engine=ImageFont.Layout.RAQM)
def ease(x): x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3

def label(im, txt, sub, pos, t):
    k = ease((t - 0.15) / 0.35)
    if k <= 0: return im
    im = im.convert("RGBA"); ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    f = font(int(74 * (0.7 + 0.3 * k))); a = int(255 * k)
    y = 210 if pos == "top" else 1650
    bb = d.textbbox((W / 2, y), txt, font=f, anchor="mm")
    pad = 34
    d.rounded_rectangle([bb[0] - pad + 8, bb[1] - pad + 12, bb[2] + pad + 8, bb[3] + pad + 12], 26, fill=(20, 16, 12, int(a * .6)))
    d.rounded_rectangle([bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad], 26, fill=(255, 244, 214, a),
                        outline=(40, 34, 30, a), width=6)
    d.text((W / 2, y), txt, font=f, fill=(70, 40, 20, a), anchor="mm")
    if sub:
        k2 = ease((t - 0.55) / 0.35)
        if k2 > 0:
            d.text((W / 2, bb[3] + pad + 70), sub, font=font(56), fill=(255, 255, 255, int(255 * k2)), anchor="mm",
                   stroke_width=5, stroke_fill=(30, 24, 20, int(255 * k2)))
    return Image.alpha_composite(im, ov).convert("RGB")

def shot(i, t, tg):
    key = CUTS[i][0]; dur = STARTS[i + 1] - STARTS[i]
    p = min(1.0, max(0.0, t / (dur + XF)))
    bg, pan = src(key, tg)
    if pan is None:     # Ken Burns on the full illustration
        z = 1.04 + 0.08 * p if i % 2 == 0 else 1.12 - 0.08 * p
        cw, ch = W / z, H / z
        dx = (W - cw) * (0.5 + 0.3 * (p - 0.5) * (1 if i % 3 else -1)); dy = (H - ch) * 0.5
        im = bg.resize((W, H), Image.BILINEAR, box=(dx, dy, dx + cw, dy + ch))
    else:               # comic panel floating on a blurred copy of the page
        im = bg.copy()
        z = 1.0 + 0.06 * p
        pw, ph = int(pan.width * z), int(pan.height * z)
        pz = pan.resize((pw, ph), Image.BILINEAR)
        x, y = (W - pw) // 2, (H - ph) // 2 + 60
        sh = Image.new("L", (pw + 40, ph + 40), 0); ImageDraw.Draw(sh).rectangle([20, 20, pw + 20, ph + 20], fill=170)
        im.paste((0, 0, 0), (x - 8, y + 4), sh.filter(ImageFilter.GaussianBlur(14)))
        ImageDraw.Draw(im).rectangle([x - 8, y - 8, x + pw + 7, y + ph + 7], fill=(250, 246, 236))
        im.paste(pz, (x, y))
    _, _, txt, sub, pos = S[key]
    # don't re-pop a label that continues from the previous panel
    lt = t + 5 if i > 0 and S[CUTS[i - 1][0]][2] == txt else t
    return label(im, txt, sub, pos, lt)

def frame(n):
    tg = n / FPS
    i = max(k for k in range(len(CUTS)) if STARTS[k] <= tg)
    t = tg - STARTS[i]
    im = shot(i, t, tg)
    if i > 0 and t < XF:
        prev = shot(i - 1, STARTS[i] - STARTS[i - 1] + t, tg)
        im = Image.blend(prev, im, ease(t / XF))
    f = min(1.0, tg / 0.4, (DUR - tg) / 0.8)
    if f < 1: im = Image.blend(Image.new("RGB", (W, H)), im, max(0.0, f))
    return im.tobytes()

if __name__ == "__main__":
    out = sys.argv[2]
    if len(sys.argv) > 4:
        for ts in sys.argv[4:]:
            Image.frombytes("RGB", (W, H), frame(int(float(ts) * FPS))).resize((540, 960)).save(f"{out}_{float(ts):06.2f}.png")
        sys.exit()
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r",
                          str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt",
                          "yuv420p", out], stdin=subprocess.PIPE)
    with Pool(os.cpu_count()) as pool:
        for b in pool.imap(frame, range(int(DUR * FPS)), chunksize=30): p.stdin.write(b)
    p.stdin.close(); p.wait()
    print("cuts:", [(k, round(s, 2)) for k, s in CUTS])
