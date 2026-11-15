"""'Living picture' motion for still illustrations: local warps (breathing, nodding, swaying,
ripples) + light overlays (smoke, flicker, glow, mist, birds). Coordinates are in the
original 768x1376 image space."""
import math, os
import numpy as np, cv2

OW, OH = 768, 1376
K = 1080 / OW
BW, BH = 1080, round(OH * K)          # 1080 x 1935 working size
YY, XX = np.mgrid[0:BH, 0:BW].astype(np.float32)
TAU = 2 * math.pi

def gauss(cx, cy, rx, ry):
    return np.exp(-(((XX - cx * K) / (rx * K)) ** 2 + ((YY - cy * K) / (ry * K)) ** 2)).astype(np.float32)

def boxw(x0, y0, x1, y1, soft=40):
    s = soft * K
    wx = np.clip(np.minimum(XX - x0 * K, x1 * K - XX) / s, 0, 1)
    wy = np.clip(np.minimum(YY - y0 * K, y1 * K - YY) / s, 0, 1)
    w = wx * wy
    return (w * w * (3 - 2 * w)).astype(np.float32)

# ------------------------------------------------------------------ warps
class Breathe:                       # gentle scale about an anchor (chest rise / glow)
    def __init__(s, cx, cy, rx, ry, amp=0.012, period=4.0, ax=None, ay=None, phase=0):
        s.w = gauss(cx, cy, rx, ry); s.amp, s.per, s.ph = amp, period, phase
        s.ax, s.ay = (ax if ax is not None else cx) * K, (ay if ay is not None else cy + ry) * K
    def disp(s, t):
        a = s.amp * math.sin(TAU * t / s.per + s.ph) * s.w
        return -a * (XX - s.ax) * 0.4, -a * (YY - s.ay)

class Rotate:                        # head nod / tilt / rocking about a pivot
    def __init__(s, cx, cy, r, px, py, deg=1.5, period=5.0, phase=0, ry=None):
        s.w = gauss(cx, cy, r, ry or r); s.px, s.py = px * K, py * K
        s.deg, s.per, s.ph = deg, period, phase
    def disp(s, t):
        a = math.radians(s.deg * math.sin(TAU * t / s.per + s.ph)) * s.w
        dx, dy = XX - s.px, YY - s.py
        ca, sa = np.cos(a), np.sin(a)
        return (ca * dx - sa * dy) - dx, (sa * dx + ca * dy) - dy

class Shift:                         # move a region (walking bob, hands working, rising from a bow)
    def __init__(s, cx, cy, rx, ry, ax=0, ay=4, period=1.2, phase=0, mode="sin"):
        s.w = gauss(cx, cy, rx, ry); s.ax, s.ay, s.per, s.ph, s.mode = ax * K, ay * K, period, phase, mode
    def disp(s, t):
        v = math.sin(TAU * t / s.per + s.ph)
        if s.mode == "abs": v = abs(v) * 2 - 1
        return -s.ax * v * s.w, -s.ay * v * s.w

class Sway:                          # foliage / rice / lotus / robe swaying
    def __init__(s, x0, y0, x1, y1, amp=4, period=3.0, wave=300, soft=60, anchor="bottom"):
        w = boxw(x0, y0, x1, y1, soft)
        if anchor == "bottom":   # tops move more
            w = w * np.clip((y1 * K - YY) / ((y1 - y0) * K), 0, 1)
        s.w, s.amp, s.per, s.wave = w.astype(np.float32), amp * K, period, wave * K
    def disp(s, t):
        ph = TAU * t / s.per + YY / s.wave + XX / (s.wave * 1.7)
        return -s.amp * np.sin(ph) * s.w, 0

class Ripple:                        # water rings
    def __init__(s, cx, cy, rx, ry, amp=2.5, wl=26, speed=18, box=None):
        s.cx, s.cy = cx * K, cy * K
        s.r = np.sqrt((XX - s.cx) ** 2 + ((YY - s.cy) * (rx / ry)) ** 2) + 1e-3
        s.w = gauss(cx, cy, rx, ry) if box is None else boxw(*box)
        s.amp, s.wl, s.sp = amp * K, wl * K, speed * K
    def disp(s, t):
        v = s.amp * np.sin(TAU * (s.r - s.sp * t) / s.wl) * s.w
        return v * (XX - s.cx) / s.r, v * (YY - s.cy) / s.r

class Drift:                         # clouds moving slowly sideways
    def __init__(s, x0, y0, x1, y1, speed=4):
        s.w = boxw(x0, y0, x1, y1, 80); s.sp = speed * K
    def disp(s, t):
        return -s.sp * t * s.w * 0 + -s.sp * math.sin(TAU * t / 12) * 3 * s.w, 0

# ------------------------------------------------------------------ overlays (RGBA drawn onto float image)
def _blob(r):
    g = np.zeros((int(r * 4), int(r * 4)), np.float32)
    cv2.circle(g, (int(r * 2), int(r * 2)), int(r), 1.0, -1)
    return cv2.GaussianBlur(g, (0, 0), r * 0.6)

_BL = {}
def blob(r):
    r = max(2, int(r))
    if r not in _BL: _BL[r] = _blob(r)
    return _BL[r]

def add(img, x, y, sprite, col, alpha):
    h, w = sprite.shape; x0, y0 = int(x - w / 2), int(y - h / 2)
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(BW, x0 + w), min(BH, y0 + h)
    if xa >= xb or ya >= yb: return
    sp = sprite[ya - y0:yb - y0, xa - x0:xb - x0, None] * alpha
    reg = img[ya:yb, xa:xb]
    reg[:] = reg * (1 - sp) + np.array(col, np.float32) * sp

class Smoke:
    def __init__(s, x, y, h=160, n=14, alpha=0.32, seed=0): s.x, s.y, s.h, s.n, s.a, s.sd = x * K, y * K, h * K, n, alpha, seed
    def draw(s, img, t):
        for k in range(s.n):
            f = ((k / s.n) + t * 0.18 + s.sd * 0.37) % 1.0
            yy = s.y - f * s.h
            xx = s.x + math.sin(f * 7 + t * 1.3 + s.sd) * 14 * K * f
            add(img, xx, yy, blob(5 * K + f * 10 * K), (235, 235, 230), s.a * math.sin(math.pi * f))

class Glow:                          # candle flicker / halo pulse
    def __init__(s, x, y, r, col=(255, 210, 120), amp=0.22, speed=7, base=0.1, seed=0):
        s.x, s.y, s.r, s.col, s.amp, s.sp, s.base, s.sd = x * K, y * K, r * K, col, amp, speed, base, seed
    def draw(s, img, t):
        fl = s.base + s.amp * (0.6 + 0.25 * math.sin(t * s.sp + s.sd) + 0.15 * math.sin(t * s.sp * 2.3 + s.sd * 3))
        add(img, s.x, s.y, blob(s.r), s.col, fl)

class Birds:
    def __init__(s, y, n=4, speed=60, x0=-40, seed=0): s.y, s.n, s.sp, s.x0, s.sd = y * K, n, speed * K, x0, seed
    def draw(s, img, t):
        for k in range(s.n):
            x = (s.x0 * K + t * s.sp + k * 70 * K + s.sd * 200) % (BW + 200) - 100
            y = s.y + math.sin(k * 2.1 + t) * 18 * K + k * 14 * K
            fl = math.sin(t * 9 + k) * 6 * K
            pts = np.array([[x - 12 * K, y - fl], [x, y], [x + 12 * K, y - fl]], np.int32)
            cv2.polylines(img, [pts], False, (40, 36, 34), max(2, int(2.2 * K)), cv2.LINE_AA)

class Mist:
    def __init__(s, y0, y1, alpha=0.35, speed=14, seed=1):
        rng = np.random.default_rng(seed)
        tex = np.zeros((BH, BW * 2), np.float32)
        for _ in range(60):
            cv2.circle(tex, (int(rng.uniform(0, BW * 2)), int(rng.uniform(y0, y1) * K)), int(rng.uniform(40, 110) * K), 1.0, -1)
        s.tex = np.clip(cv2.GaussianBlur(tex, (0, 0), 40 * K), 0, 1) * boxw(-999, y0, 9999, y1, 120)[:, :1].repeat(BW * 2, 1)
        s.a, s.sp = alpha, speed * K
    def draw(s, img, t):
        off = int(t * s.sp) % BW
        m = s.tex[:, off:off + BW, None] * s.a
        img[:] = img * (1 - m) + np.float32(245) * m

class Splash:
    def __init__(s, x, y, n=10, col=(120, 96, 70)): s.x, s.y, s.n, s.col = x * K, y * K, n, col
    def draw(s, img, t):
        for k in range(s.n):
            f = (t * 1.4 + k / s.n) % 1.0
            ang = -math.pi / 2 + (k / s.n - 0.5) * 2.0
            xx = s.x + math.cos(ang) * 90 * K * f; yy = s.y + math.sin(ang) * 90 * K * f + 160 * K * f * f
            add(img, xx, yy, blob(4 * K), s.col, 0.8 * (1 - f))

# ------------------------------------------------------------------ per-illustration motion recipes
def recipe(iid):
    if iid == "81b3d6ba":   # portrait
        return [Rotate(390, 470, 260, 390, 830, deg=1.6, period=6), Breathe(380, 1150, 420, 260, 0.010, 4.2),
                Sway(0, 0, 210, 700, 5, 3.5, 260, soft=80), Sway(600, 0, 768, 760, 5, 3.8, 260, soft=80)]
    if iid == "b316590a":   # village, mother & baby
        return [Rotate(500, 945, 60, 505, 1000, deg=4, period=2.4), Sway(60, 60, 330, 420, 4, 4, 220, soft=70),
                Sway(0, 640, 420, 1376, 4, 3, 160, soft=60), Shift(130, 395, 90, 40, 0, 2, 2.8),
                Birds(70, 5, 45)]
    if iid == "6f5299dc":   # ploughing
        return [Shift(125, 870, 80, 200, 3, 5, 1.1, mode="abs"), Shift(420, 1120, 220, 160, 4, 4, 1.1, 1.6, "abs"),
                Rotate(495, 690, 50, 500, 735, deg=4, period=2.4),
                Ripple(400, 1290, 420, 130, 2.0, 24, 16, box=(0, 1080, 768, 1376)),
                Sway(0, 300, 330, 560, 3, 4, 200, soft=60), Splash(520, 1260), Birds(55, 5, 40)]
    if iid == "eb003ed7":   # dusk, thinking
        return [Breathe(280, 800, 170, 230, 0.012, 4.5, ay=1000), Rotate(300, 560, 110, 300, 680, deg=2.2, period=6),
                Ripple(330, 1300, 250, 90, 2.4, 22, 14), Ripple(600, 760, 170, 50, 1.5, 20, 10),
                Sway(0, 850, 260, 1376, 4, 3, 150, soft=50), Drift(0, 0, 768, 230, 3)]
    if iid == "9eb0baf2":   # ordination (two panels)
        return [Shift(240, 265, 70, 50, 6, 3, 1.6), Shift(445, 270, 70, 50, -6, 3, 1.6, 1.2),
                Breathe(385, 600, 120, 90, 0.008, 4),
                Shift(430, 1085, 140, 70, 5, 2, 3.0), Rotate(330, 900, 90, 330, 990, deg=1.5, period=5),
                Glow(50, 345, 50, seed=1), Glow(718, 495, 40, seed=2), Glow(105, 225, 26, seed=3),
                Glow(715, 1240, 46, seed=4), Glow(330, 1150, 26, seed=5),
                Smoke(150, 230, 170, seed=1), Smoke(720, 280, 170, seed=2), Smoke(420, 900, 200, seed=3),
                Smoke(560, 770, 150, seed=4)]
    if iid == "f12f4046":   # bowing to Luang Pu Mun (two panels)
        return [Shift(200, 470, 160, 80, 0, 5, 4.0), Breathe(505, 400, 110, 100, 0.010, 4.5),
                Rotate(505, 300, 60, 505, 350, deg=2, period=6),
                Shift(300, 1100, 170, 90, 0, 5, 4.0, 1.0), Rotate(560, 770, 70, 560, 830, deg=2.5, period=5),
                Breathe(560, 1050, 130, 120, 0.010, 4.5),
                Smoke(357, 420, 180, seed=1), Smoke(440, 1060, 200, seed=2),
                Sway(20, 30, 200, 200, 2.5, 4, 200, soft=40), Sway(20, 710, 200, 880, 2.5, 4, 200, soft=40)]
    if iid == "347da4a6":   # tudong + elephant (two panels)
        return [Shift(380, 360, 120, 300, 2, 5, 1.0, mode="abs"), Rotate(375, 110, 150, 395, 330, deg=2, period=2.0, ry=90),
                Sway(0, 30, 230, 330, 2.5, 3.4, 220, soft=60), Sway(560, 30, 768, 300, 2.5, 3.6, 220, soft=60),
                Rotate(330, 1050, 60, 345, 975, deg=5, period=3.0, ry=90), Rotate(225, 1000, 50, 250, 1000, deg=4, period=2.2),
                Breathe(180, 1080, 160, 120, 0.008, 3.5), Breathe(545, 1080, 70, 70, 0.010, 4.5),
                Smoke(462, 1105, 160, seed=3), Sway(20, 710, 260, 900, 2.5, 4, 200, soft=40)]
    if iid == "c620d166":   # Wat Tham Klong Phen with people
        fx = [Shift(x, y, 40, 70, 0, 4, 0.9, i * 0.9, "abs") for i, (x, y) in enumerate(
            [(120, 1160), (215, 1160), (330, 1100), (390, 1090), (430, 1060), (480, 1040), (535, 1010),
             (580, 1000), (615, 990), (300, 1060), (350, 1030)])]
        return fx + [Smoke(205, 955, 170, seed=1), Smoke(455, 960, 150, seed=2), Smoke(375, 820, 180, seed=3),
                     Glow(205, 955, 24, seed=1), Glow(455, 960, 22, seed=2),
                     Sway(560, 0, 768, 500, 2.5, 4.2, 240, soft=60)]
    if iid == "87d40ec2":   # meditation in misty cave
        return [Breathe(450, 820, 180, 170, 0.010, 4.8, ay=1000), Glow(380, 350, 200, (255, 240, 190), 0.10, 1.2, 0.05),
                Mist(780, 1120, 0.30, 16), Birds(260, 4, 30, 300), Sway(560, 1150, 768, 1376, 4, 3, 140, soft=50),
                Sway(0, 1200, 220, 1376, 4, 3.3, 140, soft=50)]
    if iid == "386b3a2b":   # lotus ending
        return [Breathe(380, 900, 150, 160, 0.010, 4.8, ay=1040), Glow(380, 880, 260, (255, 236, 160), 0.12, 1.4, 0.05),
                Sway(0, 1150, 768, 1376, 5, 3, 120, soft=40), Smoke(620, 960, 120, seed=2, alpha=0.2)]
    return []

class Live:
    def __init__(s, img_rgb, iid):
        s.base = cv2.resize(np.asarray(img_rgb), (BW, BH), interpolation=cv2.INTER_LANCZOS4)
        fx = recipe(iid)
        s.warps = [f for f in fx if hasattr(f, "disp")]; s.overs = [f for f in fx if hasattr(f, "draw")]
    def frame(s, t):
        dx = np.zeros((BH, BW), np.float32); dy = np.zeros((BH, BW), np.float32)
        for w in s.warps:
            a, b = w.disp(t); dx += a; dy += b
        img = cv2.remap(s.base, XX + dx, YY + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
        for o in s.overs: o.draw(img, t)
        return np.clip(img, 0, 255).astype(np.uint8)
