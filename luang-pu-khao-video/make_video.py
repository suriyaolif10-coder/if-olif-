"""Luang Pu Khao biography — 30 s vertical flat-cartoon video (style imitating the sample).
Draws every frame at 2x with PIL, downsamples for anti-aliasing, pipes to ffmpeg."""
import math, subprocess, sys, os
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, K, FPS, DUR = 1080, 1920, 2, 30, 30.0
HERE = os.path.dirname(os.path.abspath(__file__))
FB = os.path.join(HERE, "fonts", "Kanit-Bold.ttf")
FS = os.path.join(HERE, "fonts", "Kanit-SemiBold.ttf")
_fc = {}
def font(sz, bold=True):
    key = (sz, bold)
    if key not in _fc:
        _fc[key] = ImageFont.truetype(FB if bold else FS, int(sz * K), layout_engine=ImageFont.Layout.RAQM)
    return _fc[key]

OL = (40, 34, 30)          # outline colour
SKIN = (246, 214, 186); SKIN_SH = (232, 190, 160)
ROBE = (176, 104, 40); ROBE_D = (140, 78, 26)
LW = 5                     # outline width (1x units)

def P(v): return v * K
def PI(v): return max(1, int(round(v * K)))
def box(cx, cy, w, h): return [P(cx - w / 2), P(cy - h / 2), P(cx + w / 2), P(cy + h / 2)]
def ease(x): x = max(0, min(1, x)); return 1 - (1 - x) ** 3
def lerp(a, b, t): return a + (b - a) * t

class C:
    """Canvas wrapper: all coords in 1080x1920 space."""
    def __init__(s, bg):
        s.im = Image.new("RGB", (W * K, H * K), bg); s.d = ImageDraw.Draw(s.im)
    def rect(s, x0, y0, x1, y1, fill, ol=None, w=LW, r=0):
        b = [P(x0), P(y0), P(x1), P(y1)]
        if r: s.d.rounded_rectangle(b, PI(r), fill=fill, outline=ol, width=PI(w) if ol else 0)
        else: s.d.rectangle(b, fill=fill, outline=ol, width=PI(w) if ol else 0)
    def ell(s, cx, cy, w, h, fill, ol=None, lw=LW):
        s.d.ellipse(box(cx, cy, w, h), fill=fill, outline=ol, width=PI(lw) if ol else 0)
    def poly(s, pts, fill, ol=None, lw=LW):
        q = [(P(x), P(y)) for x, y in pts]
        s.d.polygon(q, fill=fill)
        if ol: s.d.line(q + [q[0]], fill=ol, width=PI(lw), joint="curve")
    def line(s, pts, col, w=LW):
        s.d.line([(P(x), P(y)) for x, y in pts], fill=col, width=PI(w), joint="curve")
    def arc(s, cx, cy, w, h, a0, a1, col, lw=LW):
        s.d.arc(box(cx, cy, w, h), a0, a1, fill=col, width=PI(lw))
    def text(s, x, y, txt, sz, col=(255, 255, 255), anchor="mm", bold=True, stroke=0, scol=OL):
        s.d.text((P(x), P(y)), txt, font=font(sz, bold), fill=col, anchor=anchor,
                 stroke_width=P(stroke), stroke_fill=scol)

# ---------------------------------------------------------------- characters
def face(c, cx, cy, s, t, expr="calm", seed=0):
    """eyes / brows / mouth for a head centred at cx,cy (head width 300*s)."""
    blink = ((t + seed * 0.7) % 3.1) < 0.12
    ex, ey, ew, eh = 62 * s, cy + 10 * s, 62 * s, 74 * s
    for sx in (-1, 1):
        x = cx + sx * ex
        if expr == "closed" or blink:
            c.arc(x, ey + 6 * s, ew * 0.9, 40 * s, 200, 340, OL, 5 * s) if expr == "closed" else \
                c.line([(x - ew / 2.4, ey), (x + ew / 2.4, ey)], OL, 5 * s)
        else:
            c.ell(x, ey, ew, eh, (255, 255, 255), OL, 4 * s)
            big = 1.15 if expr == "shock" else 1.0
            c.ell(x, ey + 6 * s, 38 * s * big, 44 * s * big, (70, 45, 30))
            c.ell(x, ey + 6 * s, 20 * s, 24 * s, (20, 14, 10))
            c.ell(x + 8 * s, ey - 6 * s, 12 * s, 12 * s, (255, 255, 255))
        # brows
        if expr == "worry":
            c.line([(x - 26 * s * sx, ey - 58 * s), (x + 22 * s * sx, ey - 46 * s)], OL, 5 * s)
        elif expr in ("calm", "closed", "smile"):
            c.arc(x, ey - 48 * s, 50 * s, 18 * s, 200, 340, (90, 70, 60), 4 * s)
        # blush
        c.ell(x + sx * 18 * s, ey + 58 * s, 40 * s, 22 * s, (244, 168, 160))
    # nose
    c.arc(cx, cy + 58 * s, 22 * s, 16 * s, 20, 160, (190, 130, 110), 3 * s)
    my = cy + 98 * s
    if expr == "shock":
        c.ell(cx, my + 6 * s, 40 * s, 48 * s, (150, 40, 50), OL, 4 * s)
    elif expr == "worry":
        c.arc(cx, my + 14 * s, 50 * s, 24 * s, 200, 340, OL, 4 * s)
    else:
        c.arc(cx, my - 6 * s, 60 * s, 30 * s, 20, 160, OL, 4 * s)

def head(c, cx, cy, s, t, kind, expr, seed=0):
    hw, hh = 300 * s, 316 * s
    # ears
    for sx in (-1, 1):
        c.ell(cx + sx * hw * 0.49, cy + 20 * s, 54 * s, 70 * s, SKIN, OL, 4 * s)
    if kind in ("man", "boy"):
        c.ell(cx, cy - 8 * s, hw * 1.04, hh * 1.04, (30, 26, 24))      # hair mass
        c.ell(cx, cy + 14 * s, hw, hh * 0.94, SKIN, OL, LW * s)
        # fringe
        c.poly([(cx - hw * 0.5, cy - 30 * s), (cx - hw * 0.42, cy - hh * 0.46), (cx + hw * 0.45, cy - hh * 0.48),
                (cx + hw * 0.52, cy - 10 * s), (cx + hw * 0.3, cy - 70 * s), (cx + 10 * s, cy - 60 * s),
                (cx - hw * 0.25, cy - 76 * s)], (30, 26, 24))
    else:
        c.ell(cx, cy, hw, hh, SKIN, OL, LW * s)
        # shaved-head tint + shine
        c.arc(cx, cy, hw - 14 * s, hh - 14 * s, 205, 335, (214, 196, 180), 10 * s)
        c.ell(cx - 70 * s, cy - 104 * s, 46 * s, 22 * s, (255, 236, 218))
        if kind == "oldmonk":
            for k in range(2):
                c.arc(cx, cy - 92 * s + k * 16 * s, 120 * s, 22 * s, 200, 340, SKIN_SH, 3 * s)
            # thin white brows / stubble handled by face
    face(c, cx, cy, s, t, expr, seed)

def body(c, cx, top, s, kind, pose="stand"):
    """body hanging below the head; top = y of neck."""
    if kind in ("monk", "oldmonk"):
        col, dk = (ROBE, ROBE_D) if kind == "monk" else ((150, 92, 44), (118, 66, 28))
        if pose == "sit":
            c.poly([(cx - 150 * s, top), (cx + 150 * s, top), (cx + 250 * s, top + 330 * s), (cx - 250 * s, top + 330 * s)], col, OL, LW * s)
            c.ell(cx, top + 330 * s, 520 * s, 120 * s, dk, OL, LW * s)          # crossed legs
            c.ell(cx, top + 280 * s, 120 * s, 60 * s, SKIN, OL, 4 * s)            # hands in lap
        else:
            c.rect(cx - 150 * s, top, cx + 150 * s, top + 360 * s, col, OL, LW * s, r=60 * s)
            for sx in (-1, 1):
                c.ell(cx + sx * 120 * s, top + 330 * s, 70 * s, 60 * s, SKIN, OL, 4 * s)  # hands
        # bare right shoulder + diagonal sash
        c.poly([(cx + 40 * s, top + 4 * s), (cx + 150 * s, top + 4 * s), (cx + 150 * s, top + 110 * s)], SKIN, OL, 4 * s)
        c.line([(cx - 140 * s, top + 20 * s), (cx + 150 * s, top + 120 * s)], dk, 14 * s)
    else:
        shirt = (250, 250, 250) if kind == "lay" else (96, 120, 150)
        if pose == "sit":
            c.poly([(cx - 140 * s, top), (cx + 140 * s, top), (cx + 210 * s, top + 300 * s), (cx - 210 * s, top + 300 * s)], shirt, OL, LW * s)
        else:
            c.rect(cx - 140 * s, top, cx + 140 * s, top + 330 * s, shirt, OL, LW * s, r=50 * s)
            c.rect(cx - 110 * s, top + 300 * s, cx + 110 * s, top + 420 * s, (60, 50, 70), OL, LW * s, r=20 * s)
        if kind == "boy" or kind == "man":
            c.poly([(cx - 40 * s, top), (cx, top + 50 * s), (cx + 40 * s, top)], SKIN, OL, 3 * s)

def person(c, cx, cy, s, t, kind="monk", expr="calm", pose="stand", seed=0, bob=True):
    b = math.sin(t * 2.2 + seed) * 4 * s if bob else 0
    body(c, cx, cy + 140 * s + b * 0.5, s, kind, pose)
    head(c, cx, cy + b, s, t, "monk" if kind in ("monk",) else kind, expr, seed)

def sweat(c, x, y, s=1):
    c.poly([(x, y - 30 * s), (x + 16 * s, y + 4 * s), (x - 16 * s, y + 4 * s)], (140, 200, 240))
    c.ell(x, y + 6 * s, 32 * s, 30 * s, (140, 200, 240), OL, 3 * s)

def halo(c, cx, cy, r, t, col=(255, 236, 160)):
    for i in range(5, 0, -1):
        a = 0.22 + 0.05 * math.sin(t * 2)
        rr = r * (1 + i * 0.12)
        cc = tuple(int(lerp(v, 255, 0.0)) for v in col)
        c.ell(cx, cy, rr * 2, rr * 2, tuple(int(lerp(bgv, cv, a / i * 2)) for bgv, cv in zip((0, 0, 0), cc)))

# ---------------------------------------------------------------- props / sets
WALL, WALL_D, FLOOR = (128, 122, 104), (104, 98, 84), (92, 86, 74)
def room(c):
    c.rect(0, 0, W, 1220, WALL); c.rect(0, 0, W, 60, WALL_D)
    c.rect(0, 1220, W, H, FLOOR); c.rect(0, 1210, W, 1230, (70, 64, 54))
    for x in (130, 860):                                   # faint windows like sample
        c.rect(x - 90, 420, x + 90, 760, (110, 130, 112))

def board(c, x0, y0, x1, y1):
    c.rect(x0 - 18, y0 - 18, x1 + 18, y1 + 18, (120, 78, 40), OL, 4, r=6)
    c.rect(x0, y0, x1, y1, (44, 74, 58), OL, 3)
    c.line([(x0 + 40, y1 - 40), (x0 + 220, y1 - 44)], (70, 104, 86), 6)

def chalk(c, x, y, txt, sz, prog, col=(240, 240, 228)):
    """chalk text revealed left->right by prog (0..1)."""
    if prog <= 0: return
    layer = Image.new("L", c.im.size, 0); ld = ImageDraw.Draw(layer)
    ld.text((P(x), P(y)), txt, font=font(sz), fill=255, anchor="mm")
    bb = layer.getbbox()
    if not bb: return
    cut = int(bb[0] + (bb[2] - bb[0]) * min(1, prog))
    m = Image.new("L", c.im.size, 0); ImageDraw.Draw(m).rectangle([0, 0, cut, c.im.size[1]], fill=255)
    from PIL import ImageChops
    layer = ImageChops.multiply(layer, m)
    c.im.paste(Image.new("RGB", c.im.size, col), (0, 0), layer)

def tag(c, x, y, txt, sz, t0, t, fill=(255, 244, 214), fg=(70, 40, 20)):
    """pop-in label (sample's on-screen captions)."""
    k = ease((t - t0) / 0.35)
    if k <= 0: return
    f = font(sz * (0.6 + 0.4 * k))
    bb = c.d.textbbox((0, 0), txt, font=f, anchor="mm")
    w, h = (bb[2] - bb[0]) / K + 60, (bb[3] - bb[1]) / K + 40
    c.rect(x - w / 2 + 8, y - h / 2 + 10, x + w / 2 + 8, y + h / 2 + 10, (30, 26, 22), r=22)
    c.rect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, fill, OL, 5, r=22)
    c.d.text((P(x), P(y)), txt, font=f, fill=fg, anchor="mm")

def desk(c, y, h=150):
    c.rect(-10, y, W + 10, y + h, (122, 74, 40), OL, 4); c.rect(-10, y, W + 10, y + 24, (150, 96, 56), OL, 4)

def tree(c, x, base, s, col=(46, 92, 60), dk=(30, 66, 44)):
    c.rect(x - 22 * s, base - 260 * s, x + 22 * s, base, (92, 62, 40), OL, 4)
    for dy, w in ((-420, 260), (-330, 330), (-240, 380)):
        c.ell(x, base + dy * s, w * s, 220 * s, col, OL, 4)
    c.ell(x - 40 * s, base - 440 * s, 80 * s, 50 * s, tuple(min(255, v + 30) for v in col))

def klot(c, cx, top, s):
    """forest-monk umbrella tent (กลด)."""
    c.poly([(cx, top), (cx + 230 * s, top + 140 * s), (cx - 230 * s, top + 140 * s)], (196, 160, 110), OL, 4)
    c.rect(cx - 210 * s, top + 140 * s, cx + 210 * s, top + 560 * s, (236, 230, 214), OL, 3)
    c.line([(cx, top), (cx, top + 560 * s)], (110, 80, 50), 6)

def elephant(c, cx, cy, s, t):
    g, gd = (126, 126, 136), (100, 100, 110)
    sw = math.sin(t * 3) * 10
    c.ell(cx, cy, 520 * s, 380 * s, g, OL, LW)                        # body
    for dx in (-160, -60, 60, 160):
        c.rect(cx + dx * s - 40 * s, cy + 100 * s, cx + dx * s + 40 * s, cy + 300 * s, g, OL, 4, r=14)
    c.ell(cx - 260 * s, cy - 90 * s, 300 * s, 280 * s, g, OL, LW)     # head
    c.ell(cx - 200 * s, cy - 90 * s, 200 * s, 250 * s, gd, OL, 4)     # ear
    c.line([(cx - 360 * s, cy - 40 * s), (cx - 400 * s, cy + 80 * s), (cx - 380 * s + sw, cy + 200 * s)], OL, 64 * s + 10)
    c.line([(cx - 360 * s, cy - 40 * s), (cx - 400 * s, cy + 80 * s), (cx - 380 * s + sw, cy + 200 * s)], g, 64 * s)
    c.poly([(cx - 330 * s, cy + 10 * s), (cx - 300 * s, cy + 10 * s), (cx - 360 * s, cy + 90 * s)], (250, 248, 236), OL, 3)
    c.ell(cx - 300 * s, cy - 120 * s, 30 * s, 34 * s, (30, 26, 24))
    c.ell(cx - 296 * s, cy - 126 * s, 10 * s, 10 * s, (255, 255, 255))

def lotus(c, cx, cy, s):
    for a in (-60, -30, 0, 30, 60):
        r = math.radians(a)
        px, py = cx + math.sin(r) * 70 * s, cy - math.cos(r) * 40 * s
        c.poly([(cx, cy), (px - 50 * s, py), (cx + math.sin(r) * 150 * s, cy - math.cos(r) * 170 * s), (px + 50 * s, py)],
               (246, 176, 196) if a else (250, 200, 214), OL, 4)

# ---------------------------------------------------------------- shots
def sh_title(c, t):       # chalkboard title + monk walking in
    room(c); board(c, 90, 300, 990, 900)
    chalk(c, 540, 470, "ประวัติ", 110, (t - 0.2) / 0.5)
    chalk(c, 540, 640, "หลวงปู่ขาว", 150, (t - 0.6) / 0.7, (255, 236, 160))
    chalk(c, 540, 790, "อนาลโย", 100, (t - 1.2) / 0.5)
    x = lerp(1250, 800, ease(t / 1.2))
    person(c, x, 1180, 0.85, t, "monk", "smile")

def sh_born(c, t):        # village & birth
    c.rect(0, 0, W, 1100, (186, 214, 220)); c.ell(860, 260, 180, 180, (255, 228, 150))
    c.rect(0, 1100, W, H, (126, 168, 88))
    for i in range(9): c.line([(i * 140 - 60, 1160 + i % 2 * 30), (i * 140 + 40, 1120)], (96, 140, 64), 8)
    # stilt house
    c.poly([(150, 560), (540, 360), (930, 560)], (150, 92, 50), OL, 5)
    c.rect(210, 560, 870, 860, (186, 130, 80), OL, 5)
    c.rect(470, 660, 610, 860, (110, 70, 40), OL, 4)
    for x in (230, 450, 630, 850): c.rect(x - 14, 860, x + 14, 1110, (120, 80, 50), OL, 4)
    person(c, 540, 1300, 0.75, t, "boy", "smile", bob=True)
    tag(c, 540, 170, "เกิด พ.ศ. 2431", 78, 0.2, t)
    tag(c, 540, 1780, "จังหวัดอุบลราชธานี", 64, 0.7, t, fill=(255, 255, 255))

def sh_farmer(c, t):      # lay life close-up
    room(c); c.rect(0, 0, W, 1220, (170, 196, 150))
    for i in range(8): tree(c, i * 160 + 40, 1000, 0.6, (110, 150, 80), (80, 120, 60))
    person(c, 540, 820, 1.55, t, "man", "smile")
    desk(c, 1500, 420)
    tag(c, 540, 1690, "ชีวิตฆราวาส ทำไร่ทำนา", 66, 0.25, t)

def sh_worry(c, t):       # sees suffering
    room(c)
    person(c, 540, 820, 1.55, t, "man", "worry", seed=2)
    sweat(c, 790, 640, 1.4)
    desk(c, 1500, 420)
    chalk_y = 220
    tag(c, 540, chalk_y, "เห็นทุกข์ของชีวิต...", 70, 0.4, t, fill=(44, 74, 58), fg=(240, 240, 228))

def sh_ordain(c, t):      # ordination
    room(c); c.rect(0, 0, W, 1220, (150, 116, 80))
    for x in (120, 960): c.rect(x - 40, 0, x + 40, 1220, (120, 60, 40), OL, 4)
    k = ease((t - 0.6) / 0.5)
    person(c, 540, 820, 1.5, t, "monk", "closed" if k > 0.5 else "calm")
    if k < 1:  # hair falling away
        for i in range(6):
            yy = 560 + k * 900 + i * 30
            c.line([(380 + i * 60, yy), (400 + i * 60, yy + 40)], (30, 26, 24), 10)
    desk(c, 1500, 420)
    tag(c, 540, 220, "ตัดสินใจออกบวช", 82, 0.3, t)

def sh_mun(c, t):         # disciple of Luang Pu Mun
    room(c); board(c, 120, 140, 960, 420)
    chalk(c, 540, 280, "ศิษย์หลวงปู่มั่น ภูริทัตโต", 66, (t - 0.2) / 0.8)
    person(c, 330, 1000, 0.95, t, "oldmonk", "calm", pose="sit", seed=1)
    person(c, 780, 1080, 0.85, t, "monk", "smile", pose="sit", seed=3)
    c.rect(0, 1560, W, H, FLOOR)

def forest_bg(c, dark=0):
    top = (50 - dark, 86 - dark, 72 - dark)
    c.rect(0, 0, W, H, top)
    for i, x in enumerate(range(-80, W + 200, 200)): tree(c, x, 1000 + (i % 2) * 60, 0.95, (40, 80, 56), (30, 60, 40))
    c.rect(0, 1150, W, H, (70, 84, 54))
    for i, x in enumerate(range(-40, W + 200, 260)): tree(c, x, 1250 + (i % 2) * 40, 1.15, (56, 104, 66))

def sh_tudong(c, t):
    forest_bg(c)
    x = lerp(-150, 560, ease(t / 2.0))
    person(c, x, 1180, 0.85, t, "monk", "calm", seed=4)
    c.line([(x + 140, 1300), (x + 260, 900)], (196, 160, 110), 10)   # klot handle carried
    c.poly([(x + 260, 880), (x + 400, 960), (x + 120, 960)], (196, 160, 110), OL, 4)
    tag(c, 540, 220, "ออกธุดงค์ตามป่าเขา", 78, 0.3, t)

def sh_elephant(c, t):
    forest_bg(c, 15)
    shake = math.sin(t * 40) * 6 if t < 0.9 else 0
    ex = lerp(1300, 760, ease(t / 1.0)) + shake
    elephant(c, ex, 1260, 0.9, t)
    klot(c, 270, 900, 0.9)
    person(c, 270, 1080, 0.62, t, "monk", "closed", pose="sit", seed=5)
    if t > 1.2:
        for i in range(3):   # metta hearts
            yy = 980 - ((t - 1.2) * 160 + i * 120) % 360
            hx = 420 + i * 50
            c.ell(hx - 12, yy, 28, 28, (240, 120, 140)); c.ell(hx + 12, yy, 28, 28, (240, 120, 140))
            c.poly([(hx - 26, yy + 4), (hx + 26, yy + 4), (hx, yy + 34)], (240, 120, 140))
    tag(c, 540, 220, "เมตตาชนะช้างป่า", 82, 0.5, t)

def sh_medit(c, t):      # serene meditation close-up
    c.rect(0, 0, W, H, (26, 44, 40))
    for i in range(6, 0, -1):
        a = 0.10 + 0.03 * math.sin(t * 2)
        col = tuple(int(lerp(b, g, a * (7 - i) / 3)) for b, g in zip((26, 44, 40), (255, 230, 150)))
        c.ell(540, 820, 360 + i * 110, 360 + i * 110, col)
    person(c, 540, 820, 1.45, t, "monk", "closed", pose="sit", seed=6)
    tag(c, 540, 1760, "ภาวนาอย่างเคร่งครัด", 70, 0.3, t, fill=(44, 74, 58), fg=(255, 236, 160))

def sh_cave(c, t):
    c.rect(0, 0, W, H, (96, 84, 76))
    c.ell(540, 1000, 1500, 1500, (70, 60, 56))
    c.ell(540, 1080, 860, 980, (40, 34, 32), OL, 6)
    for x, y, w in ((150, 300, 300), (900, 360, 260), (520, 180, 340)):
        c.ell(x, y, w, w * 0.6, (120, 106, 96), OL, 4)
    # ordination hall / drum hint
    c.rect(330, 1200, 750, 1480, (196, 160, 110), OL, 5)
    c.poly([(290, 1200), (540, 1060), (790, 1200)], (176, 60, 40), OL, 5)
    c.ell(540, 1330, 140, 140, (150, 70, 40), OL, 5); c.ell(540, 1330, 90, 90, (230, 214, 180), OL, 4)
    c.rect(0, 1480, W, H, (110, 98, 86))
    person(c, 820, 1460, 0.5, t, "monk", "smile", seed=7)
    tag(c, 540, 230, "วัดถ้ำกลองเพล", 90, 0.2, t)
    tag(c, 540, 1800, "จ.อุดรธานี (ปัจจุบัน จ.หนองบัวลำภู)", 50, 0.7, t, fill=(255, 255, 255))

def sh_crowd(c, t):     # many disciples, wide like sample classroom
    room(c); c.rect(0, 0, W, 1220, (150, 116, 80))
    c.rect(340, 760, 740, 900, (120, 60, 40), OL, 5)
    person(c, 540, 560, 0.55, t, "oldmonk", "smile", pose="sit", seed=8)
    for row, (y, sc) in enumerate(((1080, 0.33), (1300, 0.38), (1540, 0.43))):
        n = 4 if row < 2 else 3
        for i in range(n):
            x = 140 + i * (800 / (n - 1)) + (row % 2) * 30
            kind = "lay" if (i + row) % 3 else "monk"
            hk = "monk" if kind == "monk" else "man"
            body(c, x, y + 140 * sc, sc, kind, "sit")
            head(c, x, y + math.sin(t * 3 + i + row) * 4, sc, t, hk, "smile", i + row)
            c.ell(x, y + 210 * sc, 120 * sc, 70 * sc, SKIN, OL, 3)        # praying hands
    tag(c, 540, 200, "ลูกศิษย์ทั่วทุกสารทิศ", 76, 0.3, t)

def sh_end(c, t):
    room(c); board(c, 90, 220, 990, 980)
    chalk(c, 540, 380, "ละสังขาร", 110, (t - 0.2) / 0.5, (255, 236, 160))
    chalk(c, 540, 560, "16 พฤษภาคม 2526", 84, (t - 0.6) / 0.6)
    chalk(c, 540, 720, "สิริอายุ 95 ปี", 84, (t - 1.1) / 0.5)
    lotus(c, 540, 1460, 1.4 * ease((t - 0.3) / 0.6))
    a = ease((t - 1.6) / 0.6)
    if a > 0:
        c.text(540, 1700, "เมตตา · ขันติ · ภาวนา", 64, (255, 244, 214), stroke=3)

SHOTS = [sh_title, sh_born, sh_farmer, sh_worry, sh_ordain, sh_mun, sh_tudong,
         sh_elephant, sh_medit, sh_cave, sh_crowd, sh_end]
SLEN = DUR / len(SHOTS)

def frame(i):
    tg = i / FPS
    si = min(len(SHOTS) - 1, int(tg / SLEN)); t = tg - si * SLEN
    c = C((0, 0, 0)); SHOTS[si](c, t)
    im = c.im
    z = 1 + 0.05 * (t / SLEN)                       # slow push-in like the sample's camera
    if si in (3, 7): z += 0.04 * ease(t / 0.4)
    w2, h2 = W * K / z, H * K / z
    x0, y0 = (W * K - w2) / 2, (H * K - h2) / 2
    im = im.resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + w2, y0 + h2))
    # soft vignette
    if not hasattr(frame, "vig"):
        v = Image.new("L", (W, H), 0); ImageDraw.Draw(v).ellipse([-200, -100, W + 200, H + 100], fill=255)
        frame.vig = v.filter(ImageFilter.GaussianBlur(160))
    im = Image.composite(im, Image.new("RGB", (W, H), (10, 8, 6)), frame.vig)
    # fade in / out
    f = min(1, tg / 0.4, (DUR - tg) / 0.6)
    if f < 1: im = Image.blend(Image.new("RGB", (W, H)), im, max(0, f))
    return im.tobytes()

if __name__ == "__main__":
    out = sys.argv[1]
    if len(sys.argv) > 2:   # preview stills
        for ts in sys.argv[2:]:
            Image.frombytes("RGB", (W, H), frame(int(float(ts) * FPS))).resize((540, 960)).save(f"{out}_{ts}.png")
        sys.exit()
    n = int(DUR * FPS)
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                          "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    with Pool(os.cpu_count()) as pool:
        for k, b in enumerate(pool.imap(frame, range(n), chunksize=4)):
            p.stdin.write(b)
            if k % 150 == 0: print("frame", k, flush=True)
    p.stdin.close(); p.wait()
