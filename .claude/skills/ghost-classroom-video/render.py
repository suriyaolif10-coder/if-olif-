#!/usr/bin/env python3
"""Ghost-classroom horror-comedy short (9:16) - title-swappable template.

All characters and artwork are drawn in code (original designs).
The shot list mirrors the pacing of the reference clip: 86 shots, 164 s.

    python render.py --title "ห้องเรียนผีสิง" --out video.mp4
    python render.py --config config.json --preview      # fast 540x960 draft
    python render.py --title "..." --still 120 --out f.png # one frame
"""
import argparse, json, math, os, random, shutil, subprocess, sys, tempfile, wave
from multiprocessing import Pool

import cairo
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920
PI2 = 2 * math.pi

DEFAULT_CFG = {
    "title": "ห้องเรียนผีสิง",
    "subtitle": "",
    "rule": "ตอบไม่ได้ = ตาย",
    "answer_word": "ตอบ",
    "show_title_banner": True,
    "fps": 24,
    "music": True,
    "font": "",
}

# ---------------------------------------------------------------- colours
def hx(c, a=1.0):
    c = c.lstrip("#")
    return (int(c[0:2], 16) / 255, int(c[2:4], 16) / 255, int(c[4:6], 16) / 255, a)

OUT = hx("#2a221e")
SKIN = hx("#f6d2b4")
SKIN_PALE = hx("#e9dfe6")
SHIRT = hx("#fbfbf7")
SHIRT_SH = hx("#dfe3e6")
T_SKIN = hx("#cfdcd2")
T_SOCKET = hx("#3d3a44")
T_DRESS = hx("#6b2832")
T_HAIR = hx("#141316")
WALL_T = hx("#8d8a74")
WALL_B = hx("#6f6c5a")
FLOOR = hx("#595a52")
WOOD = hx("#8a5a33")
WOOD_D = hx("#5e3a1e")
BOARD = hx("#2f4a3b")
BOARD_F = hx("#6a4426")
GOLD = hx("#e0a72a")
GOLD_D = hx("#a8731a")
RED = hx("#b8262e")

# ---------------------------------------------------------------- text queue
TXT = []  # (text, dx, dy, size_px, rgba, anchor)

def add_text(ctx, s, x, y, size, color=(240, 244, 236, 255), anchor="mm"):
    dx, dy = ctx.user_to_device(x, y)
    sz = abs(ctx.user_to_device_distance(size, 0)[0])
    TXT.append((s, dx, dy, sz, color, anchor))

# ---------------------------------------------------------------- primitives
def ell(ctx, x, y, rx, ry, rot=0.0):
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(max(rx, .01), max(ry, .01))
    ctx.arc(0, 0, 1, 0, PI2); ctx.restore()

def rrect(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()

def fs(ctx, fill, lw=6, stroke=OUT):
    if fill is not None:
        ctx.set_source_rgba(*fill)
        if lw: ctx.fill_preserve()
        else: ctx.fill(); return
    ctx.set_source_rgba(*stroke); ctx.set_line_width(lw)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND); ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.stroke()

def line(ctx, pts, lw, col=OUT):
    ctx.move_to(*pts[0])
    for p in pts[1:]: ctx.line_to(*p)
    ctx.set_source_rgba(*col); ctx.set_line_width(lw)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.set_line_join(cairo.LINE_JOIN_ROUND); ctx.stroke()

def curve(ctx, p0, p1, p2, p3, lw, col=OUT):
    ctx.move_to(*p0); ctx.curve_to(*p1, *p2, *p3)
    ctx.set_source_rgba(*col); ctx.set_line_width(lw); ctx.set_line_cap(cairo.LINE_CAP_ROUND); ctx.stroke()

def vgrad(ctx, x0, y0, x1, y1, c0, c1):
    g = cairo.LinearGradient(x0, y0, x0, y1)
    g.add_color_stop_rgba(0, *c0); g.add_color_stop_rgba(1, *c1)
    ctx.rectangle(x0, y0, x1 - x0, y1 - y0); ctx.set_source(g); ctx.fill()

def vignette(ctx, strength=0.55, col=(0, 0, 0)):
    g = cairo.RadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1250)
    g.add_color_stop_rgba(0, *col, 0); g.add_color_stop_rgba(1, *col, strength)
    ctx.rectangle(0, 0, W, H); ctx.set_source(g); ctx.fill()

def ease(x):
    x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)

# ---------------------------------------------------------------- props
def chalkboard(ctx, x, y, w, h):
    rrect(ctx, x - 22, y - 22, w + 44, h + 44, 10); fs(ctx, BOARD_F, 6)
    rrect(ctx, x, y, w, h, 4); fs(ctx, BOARD, 5)
    rnd = random.Random(int(x * 7 + y))
    for _ in range(5):  # chalk smudges
        sx, sy = x + rnd.uniform(.1, .8) * w, y + rnd.uniform(.15, .85) * h
        line(ctx, [(sx, sy), (sx + rnd.uniform(80, 220), sy + rnd.uniform(-8, 8))], 6, (1, 1, 1, .06))
    ctx.rectangle(x + 30, y + h + 6, w - 60, 14); fs(ctx, BOARD_F, 4)

def clock(ctx, x, y, r, minute=55.0, second=None):
    ell(ctx, x, y, r, r); fs(ctx, hx("#3a3a3a"), r * .06)
    ell(ctx, x, y, r * .88, r * .88); fs(ctx, hx("#f4f1e6"), r * .02)
    for i in range(12):
        a = i / 12 * PI2
        l0 = .74 if i % 3 == 0 else .8
        line(ctx, [(x + math.sin(a) * r * l0, y - math.cos(a) * r * l0),
                   (x + math.sin(a) * r * .84, y - math.cos(a) * r * .84)], r * (.035 if i % 3 == 0 else .02))
    if r > 150:
        for n, a in ((12, 0), (3, 90), (6, 180), (9, 270)):
            rad = math.radians(a)
            add_text(ctx, str(n), x + math.sin(rad) * r * .6, y - math.cos(rad) * r * .6, r * .2, (40, 40, 40, 255))
    ha = (11 + minute / 60) / 12 * PI2
    ma = minute / 60 * PI2
    line(ctx, [(x, y), (x + math.sin(ha) * r * .45, y - math.cos(ha) * r * .45)], r * .07)
    line(ctx, [(x, y), (x + math.sin(ma) * r * .72, y - math.cos(ma) * r * .72)], r * .045)
    if second is not None:
        sa = second / 60 * PI2
        line(ctx, [(x - math.sin(sa) * r * .15, y + math.cos(sa) * r * .15),
                   (x + math.sin(sa) * r * .78, y - math.cos(sa) * r * .78)], r * .015, hx("#c62828"))
    ell(ctx, x, y, r * .06, r * .06); fs(ctx, hx("#c62828"), 0)

def desk(ctx, x, y, w=230, h=120):
    ctx.rectangle(x - w / 2 + 14, y, 16, h + 40); fs(ctx, WOOD_D, 4)
    ctx.rectangle(x + w / 2 - 30, y, 16, h + 40); fs(ctx, WOOD_D, 4)
    rrect(ctx, x - w / 2, y - 14, w, h * .55, 6); fs(ctx, WOOD, 5)
    rrect(ctx, x - w / 2 - 8, y - 22, w + 16, 20, 5); fs(ctx, hx("#a06a3c"), 5)

def door(ctx, x, y, w, h, open_amt=0.0):
    ctx.rectangle(x - 14, y - 14, w + 28, h + 14); fs(ctx, hx("#5b3b22"), 5)
    ctx.rectangle(x, y, w, h); fs(ctx, hx("#0c0b0c"), 4)
    dw = w * (1 - open_amt * .85)
    ctx.rectangle(x, y, dw, h); fs(ctx, hx("#8b5a33"), 5)
    if dw > w * .4:
        ctx.rectangle(x + dw * .62, y + h * .12, dw * .2, h * .45); fs(ctx, hx("#2b3036"), 4)
        ell(ctx, x + dw * .12, y + h * .55, 8, 8); fs(ctx, hx("#d0c9b8"), 3)

def window(ctx, x, y, w, h):
    ctx.rectangle(x, y, w, h); fs(ctx, hx("#4d5d59"), 6)
    ctx.rectangle(x + 10, y + 10, w - 20, h - 20); fs(ctx, hx("#33423f"), 3)
    for i in range(1, 4):
        line(ctx, [(x + 10, y + h * i / 4), (x + w - 10, y + h * i / 4)], 4, hx("#22302c"))

def corkboard(ctx, x, y, w, h):
    ctx.rectangle(x, y, w, h); fs(ctx, hx("#3f6b58"), 6)
    for (px, py, pw, ph) in ((.08, .1, .38, .35), (.52, .12, .4, .3), (.12, .55, .7, .35)):
        ctx.rectangle(x + w * px, y + h * py, w * pw, h * ph); fs(ctx, hx("#ece7d6"), 3)

def wall_bg(ctx, horizon=1150):
    vgrad(ctx, 0, 0, W, horizon, WALL_T, WALL_B)
    ctx.rectangle(0, horizon - 30, W, 30); fs(ctx, hx("#4a4a40"), 0)
    vgrad(ctx, 0, horizon, W, H, FLOOR, hx("#3d3e38"))
    for i in range(-6, 14):  # floor tiles in perspective
        x0 = W / 2 + i * 150 - 600
        line(ctx, [(W / 2 + (x0 - W / 2) * .35, horizon), (x0 * 1.0 + (x0 - W / 2) * .9, H)], 3, (0, 0, 0, .18))
    for k in range(1, 8):
        yy = horizon + (H - horizon) * (k / 8) ** 1.6
        line(ctx, [(0, yy), (W, yy)], 3, (0, 0, 0, .15))

def closeup_bg(ctx, dark=False):
    vgrad(ctx, 0, 0, W, H, hx("#7d7b67"), hx("#545244"))
    ctx.rectangle(-40, 200, 520, 480); ctx.set_source_rgba(*hx("#4c6152", .55)); ctx.fill()
    ctx.rectangle(700, 300, 420, 330); ctx.set_source_rgba(*hx("#5c7462", .5)); ctx.fill()
    if dark:
        ctx.rectangle(0, 0, W, H); ctx.set_source_rgba(0, 0, 0, .25); ctx.fill()

def closeup_desk(ctx, y=1450):
    vgrad(ctx, 0, y, W, H, hx("#8a5530"), hx("#4b2c15"))
    ctx.rectangle(0, y, W, 34); fs(ctx, hx("#a26b3c"), 6)

# ---------------------------------------------------------------- students
STUDENTS = {
    # original cast: Fah (bob + clip), Mint (pigtails), Keng (headband),
    # Boss (backwards cap), Toon (beanie)
    "fah":  {"hair": hx("#7e3524"), "style": "bob", "acc": hx("#f2c230")},
    "mint": {"hair": hx("#282b45"), "style": "pigtails", "acc": hx("#d23a4c")},
    "keng": {"hair": hx("#1d1b1b"), "style": "spiky", "acc": hx("#2f6fd0")},
    "boss": {"hair": hx("#2b2220"), "style": "cap", "acc": hx("#2f8a56")},
    "toon": {"hair": hx("#4a2d1b"), "style": "beanie", "acc": hx("#e5752b")},
}

def student_hair_back(ctx, st, s):
    c = STUDENTS[st]; col = c["hair"]
    if c["style"] == "bob":
        ctx.move_to(-122 * s, -20 * s)
        ctx.curve_to(-140 * s, -170 * s, 140 * s, -170 * s, 122 * s, -20 * s)
        ctx.line_to(128 * s, 95 * s); ctx.curve_to(80 * s, 120 * s, -80 * s, 120 * s, -128 * s, 95 * s)
        ctx.close_path(); fs(ctx, col, 6 * s)
    elif c["style"] == "pigtails":
        for sx in (-1, 1):
            ell(ctx, sx * 150 * s, 40 * s, 48 * s, 95 * s, sx * -.35); fs(ctx, col, 6 * s)
            ell(ctx, sx * 112 * s, -40 * s, 18 * s, 18 * s); fs(ctx, c["acc"], 5 * s)

def student_hair_front(ctx, st, s):
    c = STUDENTS[st]; col = c["hair"]
    if c["style"] == "bob":
        ctx.move_to(-112 * s, 10 * s)
        ctx.curve_to(-120 * s, -150 * s, 120 * s, -150 * s, 112 * s, 10 * s)
        ctx.curve_to(90 * s, -50 * s, 40 * s, -60 * s, 20 * s, -55 * s)
        ctx.curve_to(-20 * s, -40 * s, -70 * s, -55 * s, -112 * s, 10 * s)
        ctx.close_path(); fs(ctx, col, 6 * s)
        rrect(ctx, 52 * s, -92 * s, 46 * s, 16 * s, 6 * s); fs(ctx, c["acc"], 4 * s)
    elif c["style"] == "pigtails":
        ctx.move_to(-110 * s, -5 * s)
        ctx.curve_to(-118 * s, -150 * s, 118 * s, -150 * s, 110 * s, -5 * s)
        ctx.curve_to(60 * s, -70 * s, -60 * s, -70 * s, -110 * s, -5 * s)
        ctx.close_path(); fs(ctx, col, 6 * s)
        line(ctx, [(0, -128 * s), (0, -70 * s)], 4 * s, hx("#14162a"))
    elif c["style"] == "spiky":
        ctx.move_to(-108 * s, -10 * s)
        pts = [(-120, -80), (-95, -100), (-100, -150), (-55, -128), (-40, -175), (0, -135),
               (30, -178), (55, -128), (100, -150), (95, -100), (120, -80), (108, -10)]
        for px, py in pts: ctx.line_to(px * s, py * s)
        ctx.curve_to(60 * s, -60 * s, -60 * s, -60 * s, -108 * s, -10 * s)
        ctx.close_path(); fs(ctx, col, 6 * s)
        ctx.move_to(-104 * s, -58 * s); ctx.curve_to(-50 * s, -88 * s, 50 * s, -88 * s, 104 * s, -58 * s)
        ctx.set_source_rgba(*c["acc"]); ctx.set_line_width(22 * s); ctx.stroke()
    elif c["style"] == "cap":
        ctx.move_to(-110 * s, -20 * s)
        ctx.curve_to(-115 * s, -165 * s, 115 * s, -165 * s, 110 * s, -20 * s)
        ctx.curve_to(70 * s, -60 * s, -70 * s, -60 * s, -110 * s, -20 * s)
        ctx.close_path(); fs(ctx, c["acc"], 6 * s)
        rrect(ctx, -150 * s, -55 * s, 70 * s, 26 * s, 10 * s); fs(ctx, hx("#236b42"), 5 * s)  # brim backwards-side
        ell(ctx, 0, -130 * s, 12 * s, 9 * s); fs(ctx, hx("#236b42"), 4 * s)
        add_text(ctx, "B", 10 * s, -88 * s, 42 * s, (250, 240, 200, 255))
    elif c["style"] == "beanie":
        ell(ctx, 0, -160 * s, 30 * s, 28 * s); fs(ctx, hx("#f7e2b8"), 5 * s)
        ctx.move_to(-115 * s, -30 * s)
        ctx.curve_to(-120 * s, -175 * s, 120 * s, -175 * s, 115 * s, -30 * s); ctx.close_path()
        fs(ctx, c["acc"], 6 * s)
        rrect(ctx, -122 * s, -58 * s, 244 * s, 40 * s, 14 * s); fs(ctx, hx("#c45a1b"), 5 * s)
        for i in range(-4, 5):
            line(ctx, [(i * 24 * s, -110 * s), (i * 24 * s, -62 * s)], 3 * s, hx("#c45a1b"))
        for sx in (-1, 1):  # curls poking out
            ell(ctx, sx * 108 * s, 0, 22 * s, 30 * s); fs(ctx, STUDENTS["toon"]["hair"], 5 * s)

def eyes(ctx, s, expr, t, look=0.0, pale=False):
    blink = (t % 3.3) < .12 and expr in ("normal", "worried", "side")
    for sx in (-1, 1):
        ex, ey = sx * 40 * s, 0
        if expr in ("cry", "calm") or blink:
            if expr == "cry":
                line(ctx, [(ex - 22 * s, ey - 8 * s), (ex + 4 * s * sx, ey + 4 * s), (ex - 22 * s * -1, ey - 8 * s)], 6 * s)
            else:
                ctx.arc(ex, ey - 4 * s, 20 * s, .15 * math.pi, .85 * math.pi)
                ctx.set_source_rgba(*OUT); ctx.set_line_width(6 * s); ctx.stroke()
            continue
        big = expr == "shock"
        rx, ry = (30, 34) if big else (23, 27)
        ell(ctx, ex, ey, rx * s, ry * s); fs(ctx, (1, 1, 1, 1), 5 * s)
        pr = 7 if big else 15
        px = ex + (look * 8 + (0 if big else 0)) * s
        ell(ctx, px, ey + 3 * s, pr * s, (pr + 2) * s); fs(ctx, hx("#2a1c18"), 0)
        if not big:
            ell(ctx, px + 5 * s, ey - 4 * s, 5 * s, 5 * s); fs(ctx, (1, 1, 1, 1), 0)
    if expr in ("worried", "shock", "cry"):
        for sx in (-1, 1):
            line(ctx, [(sx * 18 * s, -48 * s), (sx * 60 * s, -38 * s - (8 if expr != "shock" else -2) * s)], 6 * s)

def mouth(ctx, s, m, t):
    y = 58 * s
    if m == "flat":
        line(ctx, [(-16 * s, y), (16 * s, y)], 5 * s)
    elif m == "smile":
        ctx.arc(0, y - 18 * s, 22 * s, .2 * math.pi, .8 * math.pi); ctx.set_source_rgba(*OUT); ctx.set_line_width(5 * s); ctx.stroke()
    elif m == "frown":
        ctx.arc(0, y + 20 * s, 20 * s, 1.2 * math.pi, 1.8 * math.pi); ctx.set_source_rgba(*OUT); ctx.set_line_width(5 * s); ctx.stroke()
    elif m == "o":
        ell(ctx, 0, y, 10 * s, 13 * s); fs(ctx, hx("#6d2626"), 4 * s)
    elif m == "wobble":
        pts = [((-24 + i * 8) * s, y + math.sin(i * 1.7 + t * 30) * 3 * s) for i in range(7)]
        line(ctx, pts, 5 * s)
    elif m == "scream":
        r = 1 + .08 * math.sin(t * 40)
        ell(ctx, 0, y + 12 * s, 30 * s * r, 40 * s * r); fs(ctx, hx("#7a1f24"), 5 * s)
        ell(ctx, 0, y + 34 * s, 18 * s, 10 * s); fs(ctx, hx("#e2737a"), 0)

def sweat(ctx, x, y, s, t):
    k = (t * .7) % 1
    yy = y + k * 40 * s
    ctx.move_to(x, yy - 22 * s); ctx.curve_to(x + 14 * s, yy, x + 10 * s, yy + 12 * s, x, yy + 12 * s)
    ctx.curve_to(x - 10 * s, yy + 12 * s, x - 14 * s, yy, x, yy - 22 * s)
    fs(ctx, hx("#a9d8f2"), 4 * s)

def tears(ctx, s, t):
    for sx in (-1, 1):
        x = sx * 42 * s
        ctx.rectangle(x - 7 * s, 10 * s, 14 * s, 90 * s); ctx.set_source_rgba(*hx("#9fd2f1", .9)); ctx.fill()
        k = (t * 2 + (sx + 1) * .3) % 1
        ell(ctx, x, (20 + k * 80) * s, 9 * s, 12 * s); fs(ctx, hx("#bfe3f8"), 0)

def hand(ctx, x, y, s, rot=0.0, col=SKIN):
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
    ell(ctx, 0, 0, 30 * s, 26 * s); fs(ctx, col, 5 * s)
    for i in range(3):
        ell(ctx, (-14 + i * 14) * s, -22 * s, 8 * s, 14 * s); fs(ctx, col, 4 * s)
    ctx.restore()

def student(ctx, st, x, y, s, expr="normal", m="flat", arms="desk", t=0.0,
            sweat_on=False, pale=False, shake=0.0, look=0.0, tear=False, tied=0.0, point_dir=-1):
    ctx.save()
    if shake: ctx.translate(math.sin(t * 70) * shake * s, 0)
    ctx.translate(x, y)
    skin = SKIN_PALE if pale else SKIN
    # torso
    ctx.move_to(-115 * s, 300 * s); ctx.curve_to(-120 * s, 150 * s, -95 * s, 115 * s, 0, 112 * s)
    ctx.curve_to(95 * s, 115 * s, 120 * s, 150 * s, 115 * s, 300 * s); ctx.close_path(); fs(ctx, SHIRT, 6 * s)
    line(ctx, [(-40 * s, 118 * s), (0, 160 * s), (40 * s, 118 * s)], 5 * s)
    rrect(ctx, 30 * s, 185 * s, 50 * s, 50 * s, 6 * s); fs(ctx, None, 4 * s)
    line(ctx, [(38 * s, 175 * s), (72 * s, 175 * s)], 6 * s, hx("#2e5bb8"))  # school initials stripe
    ell(ctx, 0, 100 * s, 30 * s, 22 * s); fs(ctx, skin, 5 * s)  # neck
    student_hair_back(ctx, st, s)
    # ears + head
    for sx in (-1, 1):
        ell(ctx, sx * 104 * s, 10 * s, 18 * s, 24 * s); fs(ctx, skin, 5 * s)
    ell(ctx, 0, 0, 108 * s, 118 * s); fs(ctx, skin, 6 * s)
    if pale:
        ell(ctx, 0, -10 * s, 100 * s, 90 * s); ctx.set_source_rgba(*hx("#b9c5e8", .35)); ctx.fill()
    for sx in (-1, 1):
        ell(ctx, sx * 62 * s, 38 * s, 20 * s, 11 * s); ctx.set_source_rgba(*hx("#f29a9a", .45)); ctx.fill()
    eyes(ctx, s, expr, t, look)
    line(ctx, [(-3 * s, 22 * s), (3 * s, 28 * s)], 4 * s, hx("#b97f62"))
    mouth(ctx, s, m, t)
    if tear: tears(ctx, s, t)
    student_hair_front(ctx, st, s)
    if sweat_on:
        sweat(ctx, -95 * s, -40 * s, s, t); sweat(ctx, 98 * s, -10 * s, s, t + .4)
    # arms
    if arms == "desk":
        for sx in (-1, 1):
            rrect(ctx, sx * 20 * s - 75 * s, 250 * s, 150 * s, 50 * s, 24 * s); fs(ctx, SHIRT, 5 * s)
        hand(ctx, -40 * s, 268 * s, s * .9, 1.4, skin); hand(ctx, 40 * s, 262 * s, s * .9, -1.4, skin)
    elif arms == "cheeks":
        for sx in (-1, 1):
            ctx.move_to(sx * 112 * s, 300 * s); ctx.curve_to(sx * 150 * s, 200 * s, sx * 140 * s, 120 * s, sx * 110 * s, 70 * s)
            ctx.set_source_rgba(*SHIRT); ctx.set_line_width(44 * s); ctx.stroke()
            hand(ctx, sx * 92 * s, 55 * s, s, sx * .25, skin)
    elif arms == "up":
        for sx in (-1, 1):
            line(ctx, [(sx * 100 * s, 180 * s), (sx * 160 * s, 80 * s), (sx * 150 * s, -40 * s)], 40 * s, SHIRT)
            hand(ctx, sx * 150 * s, -60 * s, s, sx * .3, skin)
    elif arms == "point":
        d = point_dir
        line(ctx, [(d * 90 * s, 170 * s), (d * 200 * s, 165 * s), (d * 300 * s, 150 * s)], 40 * s, SHIRT)
        hand(ctx, d * 320 * s, 148 * s, s * .9, d * 1.57, skin)
        line(ctx, [(d * 330 * s, 148 * s), (d * 370 * s, 146 * s)], 14 * s, skin)
        rrect(ctx, -10 * s, 250 * s, 120 * s, 46 * s, 22 * s); fs(ctx, SHIRT, 5 * s)
    if tied > 0:
        rnd = random.Random(7)
        n = int(3 + 9 * tied)
        for i in range(n):
            yy = (130 + i * 22) * s
            ctx.move_to(-150 * s, yy + rnd.uniform(-10, 10) * s)
            ctx.curve_to(-60 * s, yy + 40 * s, 60 * s, yy - 30 * s, 150 * s, yy + rnd.uniform(-10, 10) * s)
            ctx.set_source_rgba(*T_HAIR); ctx.set_line_width(14 * s); ctx.stroke()
    ctx.restore()

# ---------------------------------------------------------------- teacher ghost (original design)
def teacher(ctx, x, y, s, expr="grin", pose="cane", view="front", t=0.0, arm_t=0.0, lean=0.0):
    ctx.save(); ctx.translate(x, y); ctx.rotate(lean)
    sway = math.sin(t * 1.3) * 4 * s
    # long hair behind
    ctx.move_to(-115 * s, -40 * s)
    ctx.curve_to(-140 * s, 300 * s, -150 * s, 520 * s, -120 * s + sway, 620 * s)
    ctx.line_to(120 * s + sway, 620 * s)
    ctx.curve_to(150 * s, 520 * s, 140 * s, 300 * s, 115 * s, -40 * s)
    ctx.curve_to(110 * s, -150 * s, -110 * s, -150 * s, -115 * s, -40 * s)
    fs(ctx, T_HAIR, 6 * s)
    # dress
    ctx.move_to(-95 * s, 120 * s); ctx.line_to(95 * s, 120 * s)
    ctx.curve_to(120 * s, 400 * s, 150 * s, 700 * s, 160 * s, 900 * s)
    ctx.line_to(-160 * s, 900 * s); ctx.curve_to(-150 * s, 700 * s, -120 * s, 400 * s, -95 * s, 120 * s)
    fs(ctx, T_DRESS, 6 * s)
    for k in (-1, 0, 1):
        line(ctx, [(k * 50 * s, 450 * s), (k * 70 * s, 890 * s)], 3 * s, (0, 0, 0, .25))
    rrect(ctx, -100 * s, 400 * s, 200 * s, 26 * s, 8 * s); fs(ctx, hx("#3a1219"), 4 * s)
    # feet
    for sx in (-1, 1):
        ell(ctx, sx * 55 * s, 910 * s, 42 * s, 18 * s); fs(ctx, hx("#1b1b1b"), 4 * s)
    if view == "back":
        ctx.move_to(-110 * s, -40 * s)
        ctx.curve_to(-120 * s, 250 * s, -110 * s, 420 * s, -100 * s + sway, 500 * s)
        ctx.line_to(100 * s + sway, 500 * s)
        ctx.curve_to(110 * s, 420 * s, 120 * s, 250 * s, 110 * s, -40 * s)
        ctx.curve_to(105 * s, -150 * s, -105 * s, -150 * s, -110 * s, -40 * s)
        fs(ctx, T_HAIR, 6 * s)
        ell(ctx, 0, -120 * s, 46 * s, 36 * s); fs(ctx, T_HAIR, 5 * s)  # bun
        line(ctx, [(-50 * s, -150 * s), (40 * s, -90 * s)], 8 * s, hx("#b33a3a"))
        # writing arm
        a = math.sin(arm_t * 9) * 25 * s
        line(ctx, [(95 * s, 160 * s), (210 * s, 20 * s), (230 * s + a, -160 * s)], 26 * s, T_SKIN)
        line(ctx, [(95 * s, 160 * s), (210 * s, 20 * s), (230 * s + a, -160 * s)], 26 * s, (0, 0, 0, 0))
        hand(ctx, 232 * s + a, -180 * s, s * .9, 0, T_SKIN)
        line(ctx, [(232 * s + a, -200 * s), (236 * s + a, -235 * s)], 8 * s, (1, 1, 1, 1))
        line(ctx, [(-95 * s, 160 * s), (-130 * s, 420 * s)], 24 * s, T_SKIN)
        ctx.restore(); return
    # collar
    ctx.move_to(-70 * s, 115 * s); ctx.line_to(0, 190 * s); ctx.line_to(70 * s, 115 * s); ctx.close_path()
    fs(ctx, hx("#efe9da"), 5 * s)
    # arms
    if pose == "cane":
        line(ctx, [(-90 * s, 150 * s), (-140 * s, 400 * s), (-120 * s, 560 * s)], 26 * s, T_SKIN)
        hand(ctx, -118 * s, 580 * s, s * .9, 3.1, T_SKIN)
        line(ctx, [(-125 * s, 560 * s), (-210 * s, 910 * s)], 12 * s, hx("#6b4a2b"))
        line(ctx, [(90 * s, 150 * s), (140 * s, 400 * s), (125 * s, 560 * s)], 26 * s, T_SKIN)
        hand(ctx, 125 * s, 580 * s, s * .9, 3.1, T_SKIN)
    elif pose == "reach":
        line(ctx, [(-90 * s, 150 * s), (-140 * s, 400 * s)], 26 * s, T_SKIN)
        line(ctx, [(90 * s, 150 * s), (260 * s, 260 * s), (420 * s, 240 * s)], 26 * s, T_SKIN)
        for i in range(4):
            line(ctx, [(430 * s, 240 * s), (500 * s, (205 + i * 22) * s)], 9 * s, T_SKIN)
    else:
        for sx in (-1, 1):
            line(ctx, [(sx * 90 * s, 150 * s), (sx * 140 * s, 400 * s), (sx * 130 * s, 560 * s)], 26 * s, T_SKIN)
    # neck & head
    ctx.rectangle(-28 * s, 70 * s, 56 * s, 60 * s); fs(ctx, T_SKIN, 5 * s)
    ell(ctx, 0, 0, 98 * s, 116 * s); fs(ctx, T_SKIN, 6 * s)
    for k in range(3):  # cracks
        line(ctx, [((-70 + k * 8) * s, (-70 + k * 14) * s), ((-55 + k * 6) * s, (-50 + k * 14) * s),
                   ((-62 + k * 6) * s, (-35 + k * 14) * s)], 2.5 * s, hx("#8fa197"))
    # hair fringe: centre part
    ctx.move_to(0, -116 * s); ctx.curve_to(-70 * s, -110 * s, -100 * s, -70 * s, -100 * s, 30 * s)
    ctx.curve_to(-80 * s, -40 * s, -40 * s, -90 * s, 0, -100 * s)
    ctx.curve_to(40 * s, -90 * s, 80 * s, -40 * s, 100 * s, 30 * s)
    ctx.curve_to(100 * s, -70 * s, 70 * s, -110 * s, 0, -116 * s); fs(ctx, T_HAIR, 5 * s)
    ell(ctx, -78 * s, -82 * s, 16 * s, 16 * s); fs(ctx, hx("#b33a3a"), 4 * s)  # red hair flower
    # eye sockets
    angry = expr == "angry"
    for sx in (-1, 1):
        ell(ctx, sx * 40 * s, -5 * s, 34 * s, 30 * s); fs(ctx, T_SOCKET, 4 * s)
        pr = 9 + 2 * math.sin(t * 3)
        ell(ctx, sx * 40 * s + math.sin(t * .8) * 4 * s, -3 * s, pr * s, pr * s); fs(ctx, hx("#f6f2c8"), 0)
        if angry:
            line(ctx, [(sx * 10 * s, -38 * s), (sx * 72 * s, -52 * s)], 8 * s)
    # cracked round glasses (her trademark)
    for sx in (-1, 1):
        ell(ctx, sx * 40 * s, -5 * s, 44 * s, 42 * s); ctx.set_source_rgba(*hx("#c9c4b0")); ctx.set_line_width(5 * s); ctx.stroke()
    line(ctx, [(-4 * s, -8 * s), (4 * s, -8 * s)], 5 * s, hx("#c9c4b0"))
    line(ctx, [(20 * s, -40 * s), (34 * s, -18 * s), (28 * s, 0)], 2.5 * s, (1, 1, 1, .8))
    # nose
    line(ctx, [(-8 * s, 35 * s), (-12 * s, 42 * s)], 3 * s, hx("#6e7e74"))
    line(ctx, [(8 * s, 35 * s), (12 * s, 42 * s)], 3 * s, hx("#6e7e74"))
    # mouth
    if expr in ("grin", "tongue"):
        ctx.move_to(-78 * s, 52 * s); ctx.curve_to(-40 * s, 120 * s, 40 * s, 120 * s, 78 * s, 52 * s)
        ctx.curve_to(40 * s, 75 * s, -40 * s, 75 * s, -78 * s, 52 * s); fs(ctx, hx("#4a1015"), 5 * s)
        for i in range(-5, 6):
            xx = i * 12 * s
            line(ctx, [(xx, 66 * s + abs(i) * 1.4 * s), (xx, 78 * s + (25 - abs(i) * 3) * s * .5)], 3 * s, hx("#e8e2c8"))
        if expr == "tongue":
            wag = math.sin(t * 6) * 10 * s
            ctx.move_to(-30 * s, 90 * s); ctx.curve_to(-35 * s + wag, 170 * s, 25 * s + wag, 190 * s, 30 * s, 92 * s)
            fs(ctx, hx("#d4626c"), 5 * s)
    elif expr == "angry":
        rrect(ctx, -60 * s, 58 * s, 120 * s, 30 * s, 6 * s); fs(ctx, hx("#e8e2c8"), 5 * s)
        for i in range(-4, 5): line(ctx, [(i * 13 * s, 60 * s), (i * 13 * s, 86 * s)], 2.5 * s)
        line(ctx, [(-60 * s, 73 * s), (60 * s, 73 * s)], 3 * s)
    else:  # stitched
        line(ctx, [(-50 * s, 72 * s), (50 * s, 72 * s)], 5 * s)
        for i in range(-3, 4): line(ctx, [(i * 14 * s, 62 * s), (i * 14 * s, 82 * s)], 3 * s)
    ctx.restore()

# ---------------------------------------------------------------- dancer ghost (original design)
def dancer(ctx, x, y, s, t=0.0, pose=0, expr="smile"):
    ctx.save(); ctx.translate(x, y); ctx.rotate(math.sin(t * 2.2) * .06)
    COST = hx("#1f6f6a"); SKIRT = hx("#5d1a4a")
    # skirt
    ctx.move_to(-110 * s, 380 * s); ctx.line_to(110 * s, 380 * s); ctx.line_to(130 * s, 1000 * s); ctx.line_to(-130 * s, 1000 * s)
    ctx.close_path(); fs(ctx, SKIRT, 6 * s)
    for i in range(6):
        yy = (450 + i * 95) * s
        line(ctx, [(-118 * s, yy), (118 * s, yy)], 8 * s, GOLD)
        for k in range(-3, 4):
            ell(ctx, k * 32 * s, yy + 45 * s, 8 * s, 8 * s); fs(ctx, GOLD, 0)
    rrect(ctx, -40 * s, 380 * s, 80 * s, 600 * s, 6 * s); fs(ctx, hx("#7a2860"), 4 * s)
    for sx in (-1, 1):
        ell(ctx, sx * 45 * s, 1010 * s, 40 * s, 16 * s); fs(ctx, (1, 1, 1, 1), 4 * s)
    # torso
    ctx.move_to(-95 * s, 120 * s); ctx.line_to(95 * s, 120 * s); ctx.line_to(110 * s, 390 * s); ctx.line_to(-110 * s, 390 * s)
    ctx.close_path(); fs(ctx, COST, 6 * s)
    ctx.move_to(-95 * s, 130 * s); ctx.line_to(110 * s, 360 * s); ctx.line_to(80 * s, 390 * s); ctx.line_to(-95 * s, 190 * s)
    ctx.close_path(); fs(ctx, RED, 4 * s)  # sash
    ell(ctx, 0, 140 * s, 110 * s, 45 * s); fs(ctx, GOLD, 5 * s)  # collar
    for k in range(-4, 5):
        ell(ctx, k * 22 * s, 165 * s, 7 * s, 7 * s); fs(ctx, RED, 0)
    rrect(ctx, -115 * s, 370 * s, 230 * s, 30 * s, 8 * s); fs(ctx, GOLD, 4 * s)
    # arms (classical bent pose)
    ph = math.sin(t * 2.2) * .25 + (0.4 if pose else 0)
    for sx in (-1, 1):
        up = (sx == 1) ^ bool(pose)
        if up:
            pts = [(sx * 90 * s, 150 * s), (sx * 200 * s, 40 * s), (sx * 160 * s, (-120 - ph * 60) * s)]
        else:
            pts = [(sx * 90 * s, 150 * s), (sx * 170 * s, 320 * s), (sx * 60 * s, 300 * s)]
        line(ctx, pts, 24 * s, (1, 1, 1, 1)); line(ctx, pts, 24 * s, (1, 1, 1, 1))
        ex, ey = pts[-1]
        ell(ctx, ex, ey, 20 * s, 20 * s); fs(ctx, (1, 1, 1, 1), 4 * s)
        line(ctx, [(pts[-2][0] + (ex - pts[-2][0]) * .7, pts[-2][1] + (ey - pts[-2][1]) * .7)], 1, OUT) if False else None
        for i in range(4):  # long golden finger-nails
            a = -1.9 + i * .28 + (0 if sx > 0 else math.pi)
            nx, ny = ex + math.cos(a) * 20 * s, ey + math.sin(a) * 20 * s
            line(ctx, [(nx, ny), (nx + math.cos(a + .3) * 70 * s, ny + math.sin(a + .3) * 70 * s)], 7 * s, GOLD)
        ell(ctx, sx * 175 * s, (60 if up else 250) * s, 14 * s, 10 * s); fs(ctx, GOLD, 3 * s)  # armlet
    # neck/head
    ctx.rectangle(-26 * s, 70 * s, 52 * s, 60 * s); fs(ctx, (1, 1, 1, 1), 5 * s)
    ell(ctx, 0, 0, 90 * s, 108 * s); fs(ctx, hx("#fbfaf6"), 6 * s)
    # crown: tiered spire
    for i in range(7):
        w = (105 - i * 13) * s; yy = (-95 - i * 42) * s
        rrect(ctx, -w, yy - 30 * s, 2 * w, 36 * s, 14 * s); fs(ctx, GOLD if i % 2 == 0 else GOLD_D, 4 * s)
        ell(ctx, 0, yy - 12 * s, 6 * s, 6 * s); fs(ctx, RED, 0)
    ctx.move_to(-12 * s, -380 * s); ctx.line_to(0, -470 * s); ctx.line_to(12 * s, -380 * s); fs(ctx, GOLD, 4 * s)
    rrect(ctx, -100 * s, -100 * s, 200 * s, 34 * s, 10 * s); fs(ctx, GOLD, 4 * s)
    for sx in (-1, 1):  # ear flaps
        ctx.move_to(sx * 88 * s, -70 * s); ctx.line_to(sx * 120 * s, 10 * s); ctx.line_to(sx * 90 * s, 40 * s); fs(ctx, GOLD, 4 * s)
    # face
    for sx in (-1, 1):
        ell(ctx, sx * 36 * s, -5 * s, 28 * s, 30 * s); fs(ctx, (1, 1, 1, 1), 5 * s)
        ell(ctx, sx * 36 * s + math.sin(t * 5) * 6 * s, -3 * s, 9 * s, 9 * s); fs(ctx, OUT, 0)
        line(ctx, [(sx * 12 * s, -48 * s), (sx * 62 * s, -44 * s)], 5 * s)
    if expr == "laugh":
        ctx.move_to(-62 * s, 40 * s); ctx.curve_to(-30 * s, 110 * s, 30 * s, 110 * s, 62 * s, 40 * s); ctx.close_path()
        fs(ctx, hx("#7a1f24"), 5 * s)
        for i in range(-4, 5): line(ctx, [(i * 12 * s, 44 * s), (i * 12 * s, 58 * s)], 3 * s, (1, 1, 1, 1))
    else:
        ctx.move_to(-60 * s, 48 * s); ctx.curve_to(-25 * s, 82 * s, 25 * s, 82 * s, 60 * s, 48 * s)
        ctx.set_source_rgba(*RED); ctx.set_line_width(8 * s); ctx.stroke()
    ell(ctx, 0, -60 * s, 7 * s, 7 * s); fs(ctx, RED, 0)  # forehead dot
    ctx.restore()

# ---------------------------------------------------------------- classroom world
SEATS = {"boss": (230, 1180), "toon": (540, 1180), "keng": (850, 1180), "mint": (330, 1480), "fah": (760, 1480)}

def classroom(ctx, t, p):
    wall_bg(ctx, 1080)
    for i in range(2): window(ctx, 40 + i * 140, 360, 115, 380)
    corkboard(ctx, 340, 380, 200, 230)
    clock(ctx, 640, 240, 70, p.get("minute", 55 + t / 30))
    ctx.rectangle(310, 140, 40, 50); fs(ctx, hx("#8d6c4a"), 4); ctx.rectangle(380, 140, 40, 50); fs(ctx, hx("#6c8a86"), 4)
    door(ctx, 790, 400, 230, 640, p.get("door", 0.0))
    for k in (180, 760):
        rrect(ctx, k, 60, 220, 22, 10); fs(ctx, hx("#f1f0e3", .9), 3)
    present = p.get("students", list(SEATS))
    tpos = p.get("teacher")
    for row in (1180, 1480):
        if tpos and abs(tpos[1] - row) < 160 and tpos[1] < row:
            teacher(ctx, tpos[0], tpos[1], tpos[2], p.get("texpr", "grin"), "cane", "front", t)
        for st, (sx, sy) in SEATS.items():
            if sy != row: continue
            sc = .56 if row == 1180 else .64
            if st in present:
                d = p.get("st", {}).get(st, {})
                student(ctx, st, sx, sy - 175 * sc, sc, d.get("e", p.get("e", "normal")), d.get("m", p.get("m", "flat")),
                        d.get("a", "desk"), t + sx * .01, d.get("sw", False), d.get("pale", False), d.get("shake", 0),
                        tied=d.get("tied", 0), point_dir=d.get("pd", -1))
            desk(ctx, sx, sy, 230 * sc / .55, 120 * sc / .55)
        if tpos and abs(tpos[1] - row) < 160 and tpos[1] >= row:
            teacher(ctx, tpos[0], tpos[1], tpos[2], p.get("texpr", "grin"), "cane", "front", t)
    if p.get("drag"):
        k = ease(t / p["dur"])
        fx, fy = 760 + (900 - 760) * k, 1400 - 520 * k
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(-1.1 * k)
        student(ctx, "fah", 0, 0, .5, "cry", "scream", "up", t, tied=1.0)
        ctx.restore()
        for i in range(6):
            line(ctx, [(fx + i * 6, fy), (910 + i * 8, 640)], 10, T_HAIR)

# ---------------------------------------------------------------- scenes
def sc_board_back(ctx, t, p):
    wall_bg(ctx, 1500)
    chalkboard(ctx, 70, 300, 940, 620)
    txt = p.get("text", "")
    n = len(txt)
    k = n if p.get("full") else int(n * min(1, t / max(.4, p["dur"] * .8)))
    lines = txt.split("\n")
    shown, out = k, []
    for ln in lines:
        out.append(ln[:max(0, shown)]); shown -= len(ln)
    for i, ln in enumerate(out):
        if ln: add_text(ctx, ln, 540, 520 + i * 170 - (len(lines) - 1) * 60, p.get("size", 120))
    teacher(ctx, 520, 1080, 1.05, view="back", t=t, arm_t=t)

def sc_board_front(ctx, t, p):
    wall_bg(ctx, 1450)
    chalkboard(ctx, 70, 380, 820, 520)
    if "count" in p:
        v = max(0, int(p["count"] - t))
        add_text(ctx, f"00:{v:02d}", 480, 560, 160)
        add_text(ctx, CFG["rule"], 480, 760, 86)
    elif "big" in p:
        add_text(ctx, str(p["big"]), 480, 560, 220)
        add_text(ctx, CFG["rule"], 480, 780, 86)
    elif p.get("rule"):
        add_text(ctx, CFG["rule"], 480, 640, 110)
    teacher(ctx, 820, 1020, 1.0, p.get("texpr", "grin"), "cane", "front", t)

def sc_cu_student(ctx, t, p):
    closeup_bg(ctx)
    student(ctx, p["who"], 540, 1000 + math.sin(t * 2) * 3, 2.3, p.get("e", "normal"), p.get("m", "flat"),
            p.get("a", "desk"), t, p.get("sw", False), p.get("pale", False), p.get("shake", 0),
            p.get("look", 0), p.get("tear", False), p.get("tied", 0), p.get("pd", -1))
    closeup_desk(ctx)

def sc_cu_teacher(ctx, t, p):
    vgrad(ctx, 0, 0, W, H, hx("#29433a"), hx("#16241f"))
    for i in range(4):
        line(ctx, [(80 + i * 200, 200 + i * 60), (300 + i * 200, 205 + i * 60)], 10, (1, 1, 1, .05))
    teacher(ctx, 540, 820, 2.7, p.get("texpr", "grin"), "idle", "front", t)

def sc_xcu_teacher(ctx, t, p):
    vgrad(ctx, 0, 0, W, H, hx("#1a1a1a"), hx("#0b0b0b"))
    teacher(ctx, 540, 760, 6.2, p.get("texpr", "tongue"), "idle", "front", t)

def sc_clock(ctx, t, p):
    vgrad(ctx, 0, 0, W, H, hx("#6f6d5c"), hx("#3e3d33"))
    clock(ctx, 540, 960, 380, p.get("minute", 59.5) + t / 120, second=(t * 6) % 60 if p.get("sec") else None)

def sc_backview(ctx, t, p):
    wall_bg(ctx, 1150)
    chalkboard(ctx, 170, 330, 740, 420)
    add_text(ctx, CFG["rule"], 540, 540, 92)
    teacher(ctx, 820, 900, .55, "grin", "cane", "front", t)
    for i, x in enumerate((180, 540, 900)):
        ctx.rectangle(x - 170, 1390, 340, 60); fs(ctx, WOOD, 6)
    for i, (x, y, st) in enumerate(((280, 1520, "keng"), (560, 1560, "toon"), (860, 1520, "boss"))):
        ctx.move_to(x - 170, H); ctx.curve_to(x - 170, y + 80, x + 170, y + 80, x + 170, H); fs(ctx, SHIRT, 6)
        ell(ctx, x, y, 115, 125); fs(ctx, STUDENTS[st]["hair"] if st != "boss" else STUDENTS["boss"]["acc"], 6)
    ell(ctx, 540, 1240, 70, 78); fs(ctx, STUDENTS["fah"]["hair"], 5)

def sc_legs(ctx, t, p):
    vgrad(ctx, 0, 0, W, H, hx("#2d2620"), hx("#120f0c"))
    ctx.rectangle(0, 0, W, 220); fs(ctx, WOOD_D, 6)
    for sx in (-1, 1):
        x = 540 + sx * 150
        ctx.rectangle(x - 45, 200, 90, 1250); fs(ctx, SKIN, 6)
        ctx.rectangle(x - 47, 1180, 94, 220); fs(ctx, (1, 1, 1, 1), 6)
        ell(ctx, x + sx * 20, 1460, 110, 60); fs(ctx, hx("#151515"), 6)
    k = ease(t / p["dur"])
    for i in range(14):
        sx = -1 if i % 2 else 1
        x0 = 540 + sx * (540 + i * 20)
        y0 = 1700 - i * 30
        ctx.move_to(x0, y0)
        ctx.curve_to(x0 - sx * 300 * k, y0 - 100, 540 + sx * 150 + 40, 1300 - 300 * k, 540 + sx * 150 - 40, 1250 - 400 * k)
        ctx.set_source_rgba(*T_HAIR); ctx.set_line_width(16); ctx.stroke()

def sc_hand(ctx, t, p):
    vgrad(ctx, 0, 0, W, H, hx("#3a2f25"), hx("#191410"))
    vgrad(ctx, 0, 1100, W, H, hx("#8a5530"), hx("#4b2c15"))
    k = ease(t / p["dur"])
    ctx.save(); ctx.translate(-80 * k, 30 * k)
    line(ctx, [(200, 1900), (420, 1250), (480, 1080)], 90, SKIN); line(ctx, [(200, 1900), (420, 1250), (480, 1080)], 0.1)
    hand(ctx, 490, 1040, 3.0, -.2)
    for i in range(7):
        y = 1300 + i * 70
        ctx.move_to(150, y + 40); ctx.curve_to(350, y - 60, 500, y + 20, 700, y - 80)
        ctx.set_source_rgba(*T_HAIR); ctx.set_line_width(18); ctx.stroke()
    ctx.restore()

def sc_door(ctx, t, p):
    vgrad(ctx, 0, 0, W, H, hx("#5a584a"), hx("#2e2d26"))
    ctx.rectangle(0, 1400, W, 520); fs(ctx, hx("#36362f"), 0)
    door(ctx, 280, 520, 520, 900, .25 + .35 * ease(t / p["dur"]))
    vignette(ctx, .7)

def sc_dancer(ctx, t, p):
    mode = p["mode"]
    if mode == "hand":
        vgrad(ctx, 0, 0, W, H, hx("#4a1210"), hx("#220807"))
        ctx.rectangle(0, 900, W, 60); fs(ctx, GOLD_D, 0)
        dancer(ctx, -100, 1080, 3.2, t, 0)
        return
    if mode == "legs":
        wall_bg(ctx, 1500)
        dancer(ctx, 520, -380, 1.85, t, 0)
        return
    closeup_bg(ctx, dark=True)
    if mode == "full":
        door(ctx, 250, 520, 560, 980, 1.0)
        dancer(ctx, 540, 720, .78, t, 0)
    elif mode == "face":
        dancer(ctx, 540, 1100, 3.3, t, 0, "smile")
    elif mode == "pose":
        dancer(ctx, 580, 760, 1.9, t, 1, "laugh" if p.get("laugh") else "smile")

SCENES = {"board_back": sc_board_back, "board": sc_board_front, "class": classroom, "cu": sc_cu_student,
          "tcu": sc_cu_teacher, "txcu": sc_xcu_teacher, "clock": sc_clock, "backview": sc_backview,
          "legs": sc_legs, "hand": sc_hand, "door": sc_door, "dancer": sc_dancer}

# ---------------------------------------------------------------- shot list (timing mirrors the reference)
CUTS = [0, 2.636, 4.538, 10.41, 13.48, 15.082, 16.15, 16.65, 17.551, 19.486, 22.489, 23.49, 25.092, 26.393, 29.997,
        31.331, 32.132, 37.604, 42.376, 45.946, 46.647, 50.817, 57.257, 57.891, 63.397, 64.097, 69.536, 72.639, 73.24,
        76.143, 76.743, 77.344, 78.712, 80.714, 81.815, 82.816, 83.483, 84.885, 85.686, 88.722, 92.159, 92.626, 97.231,
        101.368, 102.035, 103.203, 103.804, 108.175, 108.675, 109.343, 112.179, 112.779, 114.047, 114.581, 115.382,
        116.984, 117.985, 118.785, 119.987, 121.154, 124.291, 126.126, 129.429, 129.83, 132.566, 133.066, 133.834,
        134.334, 136.97, 138.772, 139.306, 139.906, 140.507, 140.974, 141.208, 143.01, 146.413, 147.314, 150.117,
        151.518, 153.92, 154.921, 155.922, 157.224, 158.125, 159.726, 164.05]

NOFAH = ["boss", "toon", "keng", "mint"]
MID_L = (380, 1150, 1.7)   # camera: centre x, centre y, zoom
MID_R = (700, 1180, 1.6)

def shots():
    S = [
        ("board_back", {"title": True}),
        ("class", {"door": .9, "students": ["boss", "toon", "keng", "mint", "fah"], "e": "normal"}),
        ("cu", {"who": "fah", "e": "calm", "m": "smile"}),
        ("class", {"door": .9}),
        ("board", {"blank": True, "texpr": "stitch"}),
        ("cu", {"who": "toon", "e": "shock", "m": "scream", "a": "up", "sw": True, "sfx": "sting"}),
        ("class", {"door": 0}),
        ("txcu", {"texpr": "tongue", "sfx": "sting"}),
        ("board_back", {"rule_part": True}),
        ("tcu", {}),
        ("cu", {"who": "keng", "e": "worried", "m": "flat", "sw": True}),
        ("tcu", {}),
        ("cu", {"who": "mint", "e": "normal", "m": "flat"}),
        ("class", {"teacher": (560, 1300, .5), "e": "worried"}),
        ("cu", {"who": "boss", "e": "normal", "m": "flat"}),
        ("board", {"count": 52, "tick": True}),
        ("cu", {"who": "toon", "e": "normal", "m": "flat"}),
        ("class", {"teacher": (690, 1030, .42), "e": "worried"}),
        ("cu", {"who": "fah", "e": "normal", "m": "smile"}),
        ("board", {"count": 38, "tick": True}),
        ("class", {"teacher": (540, 1040, .42), "e": "worried"}),
        ("cu", {"who": "boss", "e": "worried", "m": "flat", "sw": True}),
        ("tcu", {}),
        ("cu", {"who": "fah", "e": "worried", "m": "frown", "sw": True}),
        ("clock", {"minute": 58.5, "sec": True, "tick": True}),
        ("cu", {"who": "toon", "e": "worried", "m": "wobble", "sw": True}),
        ("class", {"cam": MID_R, "st": {"fah": {"a": "point", "pd": -1, "e": "worried", "m": "o"}}}),
        ("cu", {"who": "fah", "e": "shock", "m": "scream", "a": "point", "pd": -1, "sw": True}),
        ("class", {"cam": MID_R, "st": {"toon": {"a": "point", "pd": 1, "e": "worried"},
                                        "fah": {"a": "point", "pd": -1, "e": "shock", "m": "o"}}}),
        ("board", {"count": 8, "tick": True}),
        ("tcu", {}),
        ("cu", {"who": "fah", "e": "worried", "m": "wobble", "sw": True, "pale": True}),
        ("txcu", {"texpr": "tongue", "sfx": "sting"}),
        ("tcu", {}),
        ("class", {"cam": MID_R, "st": {"fah": {"e": "cry", "m": "wobble", "shake": 6, "pale": True}}}),
        ("cu", {"who": "fah", "e": "cry", "m": "wobble", "tear": True, "shake": 5, "pale": True}),
        ("board", {"count": 0.9, "sfx": "sting"}),
        ("cu", {"who": "fah", "e": "cry", "m": "frown", "a": "cheeks", "tear": True, "pale": True}),
        ("tcu", {}),
        ("backview", {}),
        ("cu", {"who": "fah", "e": "worried", "m": "wobble", "look": -1, "sw": True, "pale": True}),
        ("class", {"cam": MID_R, "teacher": (900, 1300, .5), "st": {"fah": {"e": "shock", "m": "o", "pale": True}}}),
        ("cu", {"who": "keng", "e": "worried", "m": "flat", "sw": True}),
        ("tcu", {}),
        ("cu", {"who": "keng", "e": "shock", "m": "o", "sw": True}),
        ("board", {"big": 3, "sfx": "sting"}),
        ("class", {"teacher": (930, 1300, .5), "st": {"fah": {"e": "shock", "m": "o", "pale": True}}}),
        ("cu", {"who": "fah", "e": "shock", "m": "scream", "sw": True, "pale": True}),
        ("board", {"big": 2, "sfx": "sting"}),
        ("cu", {"who": "fah", "e": "cry", "m": "frown", "tear": True, "pale": True}),
        ("tcu", {}),
        ("cu", {"who": "fah", "e": "shock", "m": "scream", "a": "cheeks", "sw": True, "pale": True}),
        ("board", {"big": 1, "sfx": "sting"}),
        ("tcu", {"texpr": "tongue"}),
        ("legs", {"sfx": "whoosh"}),
        ("hand", {}),
        ("cu", {"who": "fah", "e": "shock", "m": "scream", "tied": 1.0, "shake": 4, "sfx": "scream"}),
        ("class", {"cam": MID_R, "st": {"fah": {"e": "cry", "m": "scream", "tied": 1.0, "shake": 8}}}),
        ("cu", {"who": "fah", "e": "shock", "m": "scream", "tied": 1.0, "shake": 6}),
        ("class", {"door": .9, "students": NOFAH, "drag": True, "e": "shock", "m": "o", "sfx": "whoosh"}),
        ("cu", {"who": "mint", "e": "shock", "m": "o", "a": "cheeks", "sw": True}),
        ("class", {"cam": MID_L, "students": NOFAH, "st": {"mint": {"a": "point", "pd": 1, "e": "shock", "m": "o"}}}),
        ("tcu", {"texpr": "stitch"}),
        ("class", {"students": NOFAH, "teacher": (960, 1340, .5), "e": "shock", "m": "o"}),
        ("cu", {"who": "toon", "e": "worried", "m": "wobble", "sw": True, "pale": True}),
        ("clock", {"minute": 59.6, "sec": True, "tick": True}),
        ("cu", {"who": "boss", "e": "worried", "m": "wobble", "sw": True, "pale": True}),
        ("tcu", {}),
        ("cu", {"who": "toon", "e": "shock", "m": "wobble", "sw": True, "pale": True}),
        ("clock", {"minute": 59.85, "tick": True}),
        ("tcu", {}),
        ("clock", {"minute": 59.95, "tick": True}),
        ("txcu", {"texpr": "tongue", "sfx": "sting"}),
        ("tcu", {}),
        ("board", {"rule": True}),
        ("tcu", {"texpr": "angry", "sfx": "bell"}),
        ("class", {"students": NOFAH, "e": "shock", "m": "o"}),
        ("door", {"sfx": "creak"}),
        ("dancer", {"mode": "legs", "music": "dance"}),
        ("dancer", {"mode": "full"}),
        ("dancer", {"mode": "hand"}),
        ("dancer", {"mode": "face"}),
        ("dancer", {"mode": "pose"}),
        ("class", {"students": NOFAH, "teacher": (110, 1060, .42), "e": "shock", "m": "scream", "minute": 0.2}),
        ("dancer", {"mode": "pose"}),
        ("dancer", {"mode": "pose", "laugh": True}),
    ]
    out = []
    for i, (kind, p) in enumerate(S):
        p = dict(p); p["dur"] = CUTS[i + 1] - CUTS[i]
        out.append((CUTS[i], CUTS[i + 1], kind, p))
    return out

SHOTS = None
CFG = dict(DEFAULT_CFG)

def prep_shots():
    global SHOTS
    SHOTS = shots()
    for a, b, kind, p in SHOTS:
        if kind == "board_back":
            if p.get("title"):
                p["text"] = CFG["title"] + (("\n" + CFG["subtitle"]) if CFG.get("subtitle") else "")
                p["size"] = 130 if len(CFG["title"]) <= 12 else 100 if len(CFG["title"]) <= 18 else 78
            else:
                parts = CFG["rule"].split("=")
                p["text"] = (parts[0].strip() + " =") if len(parts) > 1 else CFG["rule"]
                p["size"] = 110
    return SHOTS

# ---------------------------------------------------------------- frame renderer
_FONT_CACHE = {}

def font_path():
    for f in (CFG.get("font"), os.path.join(HERE, "fonts", "Kanit-Bold.ttf"),
              "/usr/share/fonts/opentype/tlwg/Loma-Bold.otf", "/usr/share/fonts/truetype/tlwg/Loma-Bold.ttf"):
        if f and os.path.exists(f): return f
    out = subprocess.run(["fc-match", "-f", "%{file}", ":lang=th:weight=bold"], capture_output=True, text=True).stdout
    return out or None

def get_font(sz):
    sz = max(8, int(sz))
    if sz not in _FONT_CACHE:
        fp = font_path()
        _FONT_CACHE[sz] = ImageFont.truetype(fp, sz) if fp else ImageFont.load_default()
    return _FONT_CACHE[sz]

def render_frame(T, scale=1.0):
    TXT.clear()
    idx = max(i for i, s in enumerate(SHOTS) if s[0] <= T + 1e-6)
    a, b, kind, p = SHOTS[min(idx, len(SHOTS) - 1)]
    t = T - a
    w, h = int(W * scale), int(H * scale)
    surf = cairo.ImageSurface(cairo.FORMAT_RGB24, w, h)
    ctx = cairo.Context(surf)
    ctx.scale(scale, scale)
    # camera
    cx, cy, z = p.get("cam", (W / 2, H / 2, 1.0))
    push = {"tcu": .07, "txcu": .05, "clock": .06}.get(kind, .035)
    z *= 1 + push * (t / max(p["dur"], .1))
    ctx.translate(W / 2, H / 2)
    if p.get("sfx") in ("sting", "scream") and t < .35:
        ctx.translate(math.sin(t * 90) * 14, math.cos(t * 70) * 10)
    ctx.scale(z, z); ctx.translate(-cx, -cy)
    SCENES[kind](ctx, t, p)
    ctx.identity_matrix(); ctx.scale(scale, scale)
    vignette(ctx, .45)
    if t < .08 and kind in ("txcu",):
        ctx.rectangle(0, 0, W, H); ctx.set_source_rgba(1, 1, 1, .5 * (1 - t / .08)); ctx.fill()
    if T > CUTS[-1] - .6:
        ctx.rectangle(0, 0, W, H); ctx.set_source_rgba(0, 0, 0, ease((T - (CUTS[-1] - .6)) / .6)); ctx.fill()
    buf = surf.get_data()
    arr = np.ndarray((h, surf.get_stride() // 4, 4), np.uint8, buf)[:, :w, :3][:, :, ::-1]
    img = Image.fromarray(np.ascontiguousarray(arr))
    d = ImageDraw.Draw(img)
    for s, x, y, sz, col, anc in TXT:
        d.text((x, y), s, font=get_font(sz), fill=col, anchor=anc)
    if CFG.get("show_title_banner") and T < 4.5:
        al = int(255 * min(1, (4.5 - T) / .4, T / .25 + .001))
        draw_banner(img, al, scale)
    return img

def draw_banner(img, alpha, scale):
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    f = get_font(78 * scale)
    title = CFG["title"]
    bw = d.textlength(title, font=f)
    x0, y0 = img.size[0] / 2, 150 * scale
    pad = 40 * scale
    d.rounded_rectangle([x0 - bw / 2 - pad, y0 - 70 * scale, x0 + bw / 2 + pad, y0 + 70 * scale], radius=30 * scale,
                        fill=(20, 16, 18, int(alpha * .85)), outline=(184, 38, 46, alpha), width=max(2, int(6 * scale)))
    d.text((x0, y0), title, font=f, fill=(255, 244, 230, alpha), anchor="mm")
    img.paste(ov, (0, 0), ov)

# ---------------------------------------------------------------- audio (synthesised, original)
SR = 44100

def synth_audio(path):
    n = int(SR * CUTS[-1]); tt = np.arange(n) / SR
    rng = np.random.default_rng(3)
    a = np.zeros(n)
    if CFG.get("music", True):
        lfo = .5 + .5 * np.sin(PI2 * .07 * tt)
        a += .10 * np.sin(PI2 * 55 * tt) * lfo + .07 * np.sin(PI2 * 82.6 * tt + 2 * np.sin(PI2 * .3 * tt))
        a += .03 * np.sin(PI2 * 116.5 * tt) * (1 - lfo)
        # music-box motif every 8 s in the first act
        notes = [659.3, 587.3, 523.3, 493.9, 523.3, 440.0]
        for bar in np.arange(0, 100, 8.0):
            for k, f in enumerate(notes):
                st = int((bar + k * .55) * SR); ln = int(.9 * SR)
                if st + ln >= n: continue
                e = np.exp(-np.arange(ln) / SR * 5)
                a[st:st + ln] += .06 * e * np.sin(PI2 * f * np.arange(ln) / SR)
    def add(start, sig):
        st = int(start * SR); e = min(n, st + len(sig)); a[st:e] += sig[:e - st]
    for s0, s1, kind, p in SHOTS:
        sfx = p.get("sfx")
        if p.get("tick") or kind == "clock":
            for k in np.arange(s0, s1, 1.0):
                ln = int(.04 * SR); add(k, .35 * rng.standard_normal(ln) * np.exp(-np.arange(ln) / SR * 120))
        if sfx == "sting":
            ln = int(1.4 * SR); x = np.arange(ln) / SR
            sig = (.25 * rng.standard_normal(ln) * np.exp(-x * 9) +
                   .22 * np.sin(PI2 * (440 - 260 * x) * x) * np.exp(-x * 2.5) +
                   .15 * np.sin(PI2 * 466 * x) * np.exp(-x * 2.5))
            add(s0, sig)
        elif sfx == "whoosh":
            ln = int(1.2 * SR); x = np.arange(ln) / SR
            sig = rng.standard_normal(ln); sig = np.convolve(sig, np.ones(40) / 40, "same")
            add(s0, .5 * sig * np.sin(math.pi * x / 1.2))
        elif sfx == "scream":
            ln = int(1.5 * SR); x = np.arange(ln) / SR
            f = 900 + 120 * np.sin(PI2 * 7 * x)
            add(s0, .12 * np.sign(np.sin(PI2 * np.cumsum(f) / SR)) * np.exp(-x * 1.4))
        elif sfx == "bell":
            ln = int(4 * SR); x = np.arange(ln) / SR
            sig = sum(np.sin(PI2 * f * x) * np.exp(-x * d) for f, d in ((392, 1), (784, 2), (1176, 3)))
            add(s0, .14 * sig)
        elif sfx == "creak":
            ln = int(1.6 * SR); x = np.arange(ln) / SR
            add(s0, .12 * np.sin(PI2 * (180 + 80 * np.sin(PI2 * 3 * x)) * x) * np.sin(math.pi * x / 1.6))
        if p.get("music") == "dance":  # pentatonic xylophone-like loop for the dancer finale
            scale_ = [523.3, 587.3, 659.3, 784.0, 880.0]
            r = random.Random(11); beat = .3
            for k in np.arange(s0, CUTS[-1] - .6, beat):
                f = r.choice(scale_); ln = int(.35 * SR); x = np.arange(ln) / SR
                add(k, .10 * np.sin(PI2 * f * x) * np.exp(-x * 14) + .04 * np.sin(PI2 * 2 * f * x) * np.exp(-x * 20))
                if int(round((k - s0) / beat)) % 4 == 0:
                    add(k, .18 * np.sin(PI2 * 70 * x) * np.exp(-x * 18))
    fade = np.clip((CUTS[-1] - tt) / 1.0, 0, 1)
    a = np.tanh(a * 1.4) * .8 * fade
    pcm = (a * 32767).astype(np.int16)
    with wave.open(path, "wb") as wv:
        wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes(pcm.tobytes())

# ---------------------------------------------------------------- encode
def _worker(args):
    seg, f0, f1, fps, scale, path, cfg = args
    CFG.update(cfg); prep_shots()
    w, h = int(W * scale) // 2 * 2, int(H * scale) // 2 * 2
    pr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
                           "-r", str(fps), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                           "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for f in range(f0, f1):
        img = render_frame(f / fps, scale)
        if img.size != (w, h): img = img.crop((0, 0, w, h))
        pr.stdin.write(img.tobytes())
    pr.stdin.close(); pr.wait()
    return path

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title"); ap.add_argument("--subtitle"); ap.add_argument("--rule")
    ap.add_argument("--config"); ap.add_argument("--out", default="ghost_classroom.mp4")
    ap.add_argument("--preview", action="store_true", help="540x960 fast draft")
    ap.add_argument("--still", type=float, help="render one frame at this second to --out (.png)")
    ap.add_argument("--jobs", type=int, default=os.cpu_count() or 2)
    ap.add_argument("--no-banner", action="store_true")
    a = ap.parse_args()
    if a.config:
        with open(a.config, encoding="utf-8") as f: CFG.update(json.load(f))
    for k in ("title", "subtitle", "rule"):
        if getattr(a, k): CFG[k] = getattr(a, k)
    if a.no_banner: CFG["show_title_banner"] = False
    prep_shots()
    scale = .5 if a.preview else 1.0
    if a.still is not None:
        render_frame(a.still, scale).save(a.out); print(a.out); return
    fps = int(CFG["fps"]); total = int(CUTS[-1] * fps)
    tmp = tempfile.mkdtemp(prefix="ghostclass_")
    nj = max(1, a.jobs); chunk = math.ceil(total / nj)
    jobs = [(i, i * chunk, min(total, (i + 1) * chunk), fps, scale, os.path.join(tmp, f"seg{i}.mp4"), dict(CFG))
            for i in range(nj) if i * chunk < total]
    with Pool(len(jobs)) as pool:
        segs = pool.map(_worker, jobs)
    lst = os.path.join(tmp, "list.txt")
    with open(lst, "w") as f:
        for s in segs: f.write(f"file '{s}'\n")
    wav = os.path.join(tmp, "audio.wav"); synth_audio(wav)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav,
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", a.out], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print(a.out)

if __name__ == "__main__":
    main()
