"""Docu-Pop Real Motion renderer: images -> 1080x1920 MP4 with Ken Burns / parallax, Thai text, synth music.
usage: python3 -I render_docupop.py <images_dir> <out.mp4>
"""
import sys, math, subprocess, wave, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

IMG, OUT = sys.argv[1], sys.argv[2]
W, H, FPS = 1080, 1920, 30
FB = os.path.expanduser("~/.fonts/Kanit-Bold.ttf")
FM = os.path.expanduser("~/.fonts/Kanit-Medium.ttf")
TOP = (19, 22, 750, 675)
BOT = (19, 700, 750, 1352)

# kind, image, crop, dur, zoom(a,b), center a, center b, headline, subtitle, extras
S = [
 dict(k="full", img="a-family-farm.jpg", d=3.5, z=(1.0, 1.15), c=((.5, .55), (.5, .6)), hl="มี**ครบ**ทุกอย่าง", sub="ชายคนหนึ่ง มีเมีย มีลูก มีนา มีบ้าน"),
 dict(k="full", img="b-village-wife.jpg", d=3.5, z=(1.3, 1.0), c=((.66, .62), (.5, .5)), hl="**ทิ้ง**ทุกอย่าง", sub="แต่วันหนึ่ง เขาทิ้งทุกอย่าง แล้วเดินเข้าป่า"),
 dict(k="full", img="c-portrait.jpg", d=4, z=(1.0, 1.12), c=((.5, .45), (.5, .38)), hl="**หลวงปู่ขาว** อนาลโย", sub="พระป่า ผู้ไม่มีอาลัย", bell=True),
 dict(k="full", img="a-family-farm.jpg", d=4, z=(1.45, 1.55), c=((.38, .78), (.44, .76)), hl="พ.ศ. **2431**", sub="ขาว โคระถา ลูกชาวนา บ้านบ่อชะเนง อำนาจเจริญ"),
 dict(k="full", img="b-village-wife.jpg", d=3.5, z=(1.45, 1.6), c=((.68, .6), (.68, .58)), hl="แต่งงานตอนอายุ **20**", sub="พ่อแม่จัดให้แต่งงาน มีลูกด้วยกันสามคน"),
 dict(k="full", img="d-dusk-sorrow.jpg", d=3.5, z=(1.0, 1.12), c=((.5, .5), (.45, .55)), hl="**แยกทาง**", sub="ชีวิตคู่ไม่ราบรื่น สุดท้ายต้องแยกทางกัน"),
 dict(k="full", img="d-dusk-sorrow.jpg", d=3.5, z=(1.45, 1.65), c=((.45, .45), (.42, .42)), hl="ความหวง = **ทุกข์**", sub="เขาเห็นว่า ความรัก ความหวง คือทุกข์"),
 dict(k="panel", img="e-ordination-2panel.jpg", crop=TOP, d=3.5, hl="บวช พ.ศ. **2462**", sub="ออกบวชที่วัดโพธิ์ศรี บ้านเกิด", bell=True),
 dict(k="panel", img="e-ordination-2panel.jpg", crop=BOT, d=3.5, hl="อนาลโย = **ไม่อาลัย**", sub="ฉายาของท่าน แปลว่า ผู้ไม่มีอาลัย"),
 dict(k="panel", img="f-tudong-elephant-2panel.jpg", crop=TOP, d=3.5, hl="ตามหา**ครู**", sub="แบกกลด ออกธุดงค์เข้าป่าลึก"),
 dict(k="panel", img="g-teacher-2panel.jpg", crop=TOP, d=3.5, hl="**หลวงปู่มั่น**", sub="ฝากตัวเป็นศิษย์ หลวงปู่มั่น ภูริทัตโต"),
 dict(k="panel", img="g-teacher-2panel.jpg", crop=BOT, d=4, hl="ธุดงค์**ทั่วประเทศ**", sub="ร่วมกับหลวงปู่ฝั้น หลวงปู่แหวน หลวงปู่ตื้อ"),
 dict(k="panel", img="f-tudong-elephant-2panel.jpg", crop=BOT, d=4, hl="**ช้างป่า**เข้ามาหา", sub="คืนหนึ่ง ขณะนั่งสมาธิ ช้างป่ายื่นงวงเข้ามาใกล้", night=True),
 dict(k="panel", img="f-tudong-elephant-2panel.jpg", crop=(330, 900, 750, 1352), d=3.5, hl="**ไม่หนี**", sub="ท่านไม่หนี นั่งแผ่เมตตาอยู่อย่างนั้น", night=True),
 dict(k="full", img="h-cave-meditate.jpg", d=4, z=(1.2, 1.0), c=((.5, .5), (.5, .5)), hl="วัด**ถ้ำกลองเพล**", sub="พ.ศ. 2501 ท่านมาหยุดที่หนองบัวลำภู"),
 dict(k="full", img="h-cave-meditate.jpg", d=3.5, z=(1.0, 1.2), c=((.5, .45), (.5, .3)), hl="จน**วาระสุดท้าย**", sub="อยู่ที่นี่ จนวาระสุดท้ายของชีวิต"),
 dict(k="full", img="i-pilgrims.jpg", d=4, z=(1.15, 1.0), c=((.5, .7), (.5, .5)), hl="**95** ปี · 64 พรรษา", sub="16 พฤษภาคม 2526 ท่านละสังขารอย่างสงบ"),
 dict(k="full", img="j-ending.jpg", d=5, z=(1.22, 1.0), c=((.5, .62), (.5, .5)), hl="ผู้**ไม่มีอาลัย**", sub="หลวงปู่ขาว อนาลโย · 2431–2526", bell=True, top=True),
]

if os.environ.get("DURS"):
    for _sh, _d in zip(S, os.environ["DURS"].split(",")):
        _sh["d"] = float(_d)

def ease(u):  # ease in-out sine
    return 0.5 - 0.5 * math.cos(math.pi * max(0, min(1, u)))

# ---------- text ----------
def segs(s):
    parts = s.split("**")
    return [(p, i % 2 == 1) for i, p in enumerate(parts) if p]

def text_img(markup, font_path, size, stroke, maxw, hl_color=(255, 214, 0)):
    while True:
        f = ImageFont.truetype(font_path, size, layout_engine=ImageFont.Layout.RAQM)
        sg = segs(markup)
        total = sum(f.getlength(t) for t, _ in sg)
        if total <= maxw or size < 40:
            break
        size -= 4
    asc, desc = f.getmetrics()
    h = asc + desc + stroke * 2 + 30
    im = Image.new("RGBA", (int(total) + stroke * 2 + 20, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = stroke + 10
    for t, hl in sg:
        d.text((x, stroke + 10), t, font=f, fill=hl_color if hl else (255, 255, 255),
               stroke_width=stroke, stroke_fill=(0, 0, 0))
        x += f.getlength(t)
    return im

def wrap_sub(text, font_path, size, maxw):
    f = ImageFont.truetype(font_path, size, layout_engine=ImageFont.Layout.RAQM)
    words, lines, cur = text.split(" "), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if f.getlength(t) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur); cur = w_
    lines.append(cur)
    return lines

def sub_img(text):
    lines = wrap_sub(text, FM, 52, 940)
    ims = [text_img(l, FM, 52, 5, 980) for l in lines]
    w = max(i.width for i in ims); h = sum(i.height - 18 for i in ims) + 18
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0)); y = 0
    for i in ims:
        out.alpha_composite(i, ((w - i.width) // 2, y)); y += i.height - 18
    return out

# ---------- overlays ----------
def radial_vignette(strength=0.42):
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / math.sqrt(2)
    a = np.clip((r - 0.45) / 0.55, 0, 1) ** 1.6 * strength
    g = np.zeros((H, W, 4), np.uint8); g[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(g, "RGBA")

def bottom_grad():
    g = np.zeros((H, W, 4), np.uint8)
    y = np.arange(H)
    a = np.clip((y - H * 0.58) / (H * 0.3), 0, 1) * 0.72
    g[..., 3] = (a[:, None] * 255).astype(np.uint8)
    return Image.fromarray(g, "RGBA")

VIG, GRAD = radial_vignette(), bottom_grad()
GRAD_T = GRAD.transpose(Image.FLIP_TOP_BOTTOM)

def night(im):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    a = a * np.array([0.42, 0.52, 0.78]) + np.array([4, 8, 22])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

# ---------- frames ----------
def full_frame(src, z, cx, cy):
    sw, sh = src.size
    s = max(W / sw, H / sh) * z
    hw, hh = W / 2 / s, H / 2 / s
    x0 = min(max(cx * sw, hw), sw - hw); y0 = min(max(cy * sh, hh), sh - hh)
    return src.transform((W, H), Image.AFFINE, (1 / s, 0, x0 - W / 2 / s, 0, 1 / s, y0 - H / 2 / s), resample=Image.BICUBIC)

def prep_panel(sh):
    src = Image.open(os.path.join(IMG, sh["img"])).convert("RGB")
    p = src.crop(sh["crop"])
    if sh.get("night"):
        p = night(p)
    bgsrc = p.filter(ImageFilter.GaussianBlur(18))
    bgsrc = Image.eval(bgsrc, lambda v: int(v * 0.5))
    # foreground card: fit into 1000x1180 with white border
    sc = min(1000 / p.width, 1180 / p.height)
    fw, fh = int(p.width * sc), int(p.height * sc)
    card = Image.new("RGBA", (fw + 16, fh + 16), (255, 255, 255, 255))
    card.paste(p.resize((fw, fh), Image.LANCZOS), (8, 8))
    shadow = Image.new("RGBA", (card.width + 120, card.height + 120), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle((60, 75, 60 + card.width, 75 + card.height), fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    return bgsrc, card, shadow

def panel_frame(bgsrc, card, shadow, u):
    e = ease(u)
    bg = full_frame(bgsrc, 1.08 + 0.1 * e, 0.5 - 0.03 * e, 0.5).convert("RGBA")
    k = 0.96 + 0.07 * e
    cw, ch = int(card.width * k), int(card.height * k)
    c = card.resize((cw, ch), Image.BICUBIC)
    s = shadow.resize((int(shadow.width * k), int(shadow.height * k)), Image.BICUBIC)
    cx, cy = 540 + 18 * (e - 0.5), 800
    bg.alpha_composite(s, (int(cx - s.width / 2), int(cy - s.height / 2)))
    bg.alpha_composite(c, (int(cx - cw / 2), int(cy - ch / 2)))
    return bg

def main():
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-i", OUT + ".wav", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
                           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
    total = sum(s["d"] for s in S); gf = 0; nfr_total = int(round(total * FPS))
    for i, sh in enumerate(S):
        n = int(round(sh["d"] * FPS))
        hl = text_img(sh["hl"], FB, 104, 9, 980)
        sb = sub_img(sh["sub"])
        if sh["k"] == "full":
            src = Image.open(os.path.join(IMG, sh["img"])).convert("RGB")
        else:
            bgsrc, card, shadow = prep_panel(sh)
        for f in range(n):
            u = f / max(n - 1, 1); t = f / FPS
            if sh["k"] == "full":
                e = ease(u); z = sh["z"][0] + (sh["z"][1] - sh["z"][0]) * e
                (ax, ay), (bx, by) = sh["c"]
                fr = full_frame(src, z, ax + (bx - ax) * e, ay + (by - ay) * e).convert("RGBA")
            else:
                fr = panel_frame(bgsrc, card, shadow, u)
            fr.alpha_composite(VIG); fr.alpha_composite(GRAD_T if sh.get("top") else GRAD)
            HY, SY = (300, 390) if sh.get("top") else (1440, 1530)
            # headline pop
            th = t - 0.15
            if th > 0:
                if th < 0.18: k = 0.7 + 0.4 * (th / 0.18)
                elif th < 0.32: k = 1.1 - 0.1 * ((th - 0.18) / 0.14)
                else: k = 1.0
                im = hl.resize((max(1, int(hl.width * k)), max(1, int(hl.height * k))), Image.BICUBIC)
                if th < 0.1:
                    a = np.asarray(im).copy(); a[..., 3] = (a[..., 3] * (th / 0.1)).astype(np.uint8); im = Image.fromarray(a, "RGBA")
                fr.alpha_composite(im, (int(540 - im.width / 2), int(HY - im.height / 2)))
            ts = t - 0.4
            if ts > 0:
                k2 = min(1, ts / 0.3); im = sb
                if k2 < 1:
                    a = np.asarray(sb).copy(); a[..., 3] = (a[..., 3] * k2).astype(np.uint8); im = Image.fromarray(a, "RGBA")
                fr.alpha_composite(im, (int(540 - im.width / 2), int(SY + 20 * (1 - k2))))
            rgb = fr.convert("RGB")
            # global fades
            gt = gf / FPS
            fade = min(1, gt / 0.5, (nfr_total - gf) / FPS / 1.5)
            if fade < 1:
                rgb = Image.eval(rgb, lambda v, fd=fade: int(v * fd))
            ff.stdin.write(rgb.tobytes()); gf += 1
        print(f"shot {i+1}/{len(S)} done", flush=True)
    ff.stdin.close(); ff.wait()

# ---------- audio ----------
def audio():
    sr = 44100; total = sum(s["d"] for s in S); N = int(sr * (total + 0.5)); t = np.arange(N) / sr
    out = np.zeros((N, 2))
    starts = np.cumsum([0] + [s["d"] for s in S[:-1]])
    # pad: A minor add9 drone, slow swells, stereo detune
    freqs = [110, 164.81, 220, 246.94, 261.63, 329.63]
    for j, fq in enumerate(freqs):
        lfo = 0.55 + 0.45 * np.sin(2 * np.pi * (0.05 + 0.017 * j) * t + j)
        amp = (0.07 if fq < 200 else 0.04) * lfo
        out[:, 0] += amp * np.sin(2 * np.pi * fq * t) + amp * 0.25 * np.sin(2 * np.pi * fq * 2.001 * t)
        out[:, 1] += amp * np.sin(2 * np.pi * fq * 1.003 * t + 0.7) + amp * 0.25 * np.sin(2 * np.pi * fq * 1.998 * t)
    # elephant section (shots 13-14): duck pad, add low drone + crickets + night air
    es, ee = starts[12], starts[14]
    env = np.clip(np.minimum((t - es) / 0.6, (ee - t) / 0.8), 0, 1)
    out *= (1 - 0.6 * env)[:, None]
    drone = 0.16 * np.sin(2 * np.pi * 55 * t) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * t))
    rng = np.random.default_rng(7); noise = rng.standard_normal(N)
    k = 400; air = np.convolve(noise, np.ones(k) / k, mode="same") * 0.9
    chirp = 0.012 * np.sin(2 * np.pi * 4600 * t) * (np.sin(2 * np.pi * 14 * t) > 0.6) * (np.sin(2 * np.pi * 0.7 * t) > 0)
    for ch in (0, 1):
        out[:, ch] += env * (drone + air + chirp * (1 if ch else 0.6))
    # drum (กลองเพล-like low thump) on every cut
    for st in starts:
        i0 = int(st * sr); L = int(0.9 * sr); tt = np.arange(L) / sr
        f = 48 + 40 * np.exp(-tt * 18); ph = 2 * np.pi * np.cumsum(f) / sr
        hit = 0.42 * np.sin(ph) * np.exp(-tt * 5.5)
        seg = slice(i0, min(N, i0 + L)); out[seg] += hit[: seg.stop - i0, None]
    # temple bell
    for st, sh in zip(starts, S):
        if sh.get("bell"):
            i0 = int((st + 0.15) * sr); L = int(5 * sr); tt = np.arange(L) / sr
            b = sum(a * np.sin(2 * np.pi * 392 * r * tt) * np.exp(-tt * dcy) for r, a, dcy in [(1, .2, .7), (2.76, .1, 1.3), (5.4, .05, 2.2), (8.93, .025, 3.5)])
            seg = slice(i0, min(N, i0 + L)); out[seg, 0] += b[: seg.stop - i0] * 0.9; out[seg, 1] += b[: seg.stop - i0]
    fade = np.clip(np.minimum(t / 1.2, (total - t) / 2.5), 0, 1)
    out *= fade[:, None]
    out = np.tanh(out * 1.2); out *= 0.7 / np.max(np.abs(out))
    with wave.open(OUT + ".wav", "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((out * 32767).astype(np.int16).tobytes())

if __name__ == "__main__":
    if len(sys.argv) > 3 and sys.argv[3] == "preview":
        # write one still per shot (mid-point) for checking
        for i, sh in enumerate(S):
            u = 0.9
            if sh["k"] == "full":
                src = Image.open(os.path.join(IMG, sh["img"])).convert("RGB")
                z = sh["z"][0] + (sh["z"][1] - sh["z"][0]) * ease(u); (ax, ay), (bx, by) = sh["c"]
                fr = full_frame(src, z, ax + (bx - ax) * ease(u), ay + (by - ay) * ease(u)).convert("RGBA")
            else:
                fr = panel_frame(*prep_panel(sh), u)
            fr.alpha_composite(VIG); fr.alpha_composite(GRAD)
            hl = text_img(sh["hl"], FB, 104, 9, 980); sb = sub_img(sh["sub"])
            fr.alpha_composite(hl, (int(540 - hl.width / 2), int(1440 - hl.height / 2)))
            fr.alpha_composite(sb, (int(540 - sb.width / 2), 1530))
            fr.convert("RGB").resize((360, 640)).save(os.path.join(OUT, f"p{i+1:02d}.jpg"))
        sys.exit()
    audio(); main(); os.remove(OUT + ".wav")
