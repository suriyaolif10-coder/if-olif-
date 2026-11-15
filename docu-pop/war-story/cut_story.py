"""Cut a long landscape AI video into a vertical docu-pop story synced to a voiceover's pauses.
usage: python3 -I cut_story.py <video.mp4> <voice.wav> <workdir> <out_main.mp4>
Output has synth tension music only (mix the voice afterwards with mix_voice.sh).
"""
import sys, os, re, subprocess, wave
import numpy as np

V, A, WD, OUT = sys.argv[1:5]
os.makedirs(WD, exist_ok=True)
W, H, FPS = 1080, 1920, 30
FG_H = 900

def sh(cmd):
    subprocess.run(cmd, check=True)

def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]).decode())

# 1) sentence boundaries from voice pauses (cut ~0.15 s before speech resumes)
log = subprocess.run(["ffmpeg", "-v", "info", "-i", A, "-af", "silencedetect=noise=-35dB:d=0.55", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
total = dur(A) + 0.6
cuts = [0.0] + [round(e - 0.15, 2) for e in ends if 1.5 < e < total - 1.5] + [total]
# merge too-short shots, split long ones so every shot is ~2-4 s
merged = [cuts[0]]
for c in cuts[1:]:
    if c - merged[-1] < 2.0 and c != total:
        continue
    merged.append(c)
if merged[-1] - merged[-2] < 2.0 and len(merged) > 2:
    merged.pop(-2)
shots = []
for a, b in zip(merged, merged[1:]):
    n = max(1, int(np.ceil((b - a) / 4.0)))
    for k in range(n):
        shots.append((a + (b - a) * k / n, a + (b - a) * (k + 1) / n))

# 2) curated source moments in story order (start time in source, pan direction)
SRC = [(0.5, 1), (5.5, -1), (11.0, 1), (20.5, -1), (25.5, 1), (30.2, 1), (32.6, -1), (35.5, 0), (40.0, 1),
       (45.2, -1), (50.0, 1), (57.0, 0), (60.5, -1), (65.2, 1), (70.2, 0), (75.2, -1), (80.2, 1), (85.0, -1),
       (90.2, 1), (95.0, 0), (100.2, -1), (105.0, 1)]
idx = np.linspace(0, len(SRC) - 1, len(shots)).round().astype(int)
print(f"{len(shots)} shots, voice {total:.2f}s")

# 3) render each shot: blurred cover background + panning/zooming foreground
parts = []
for i, ((a, b), j) in enumerate(zip(shots, idx)):
    d = b - a; s, pdir = SRC[j]
    p = os.path.join(WD, f"s{i:02d}.mp4"); parts.append(p)
    fc = (f"[0:v]fps={FPS},split[bg0][fg0];"
          f"[bg0]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:2,eq=brightness=-0.18:saturation=0.8[bg];"
          f"[fg0]scale=-2:'trunc({FG_H}*(1+0.08*t/{d:.3f})/2)*2':eval=frame,"
          f"crop={W}:{FG_H}:x='(iw-{W})/2+{pdir}*(iw-{W})*0.4*(t/{d:.3f}-0.5)':y='(ih-{FG_H})/2'[fg];"
          f"[bg][fg]overlay=0:{(H - FG_H) // 2 - 60},format=yuv420p[v]")
    sh(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{s:.2f}", "-t", f"{d:.3f}", "-i", V, "-filter_complex", fc, "-map", "[v]",
        "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", str(FPS), p])
    print(f"shot {i+1}/{len(shots)}  out {a:5.2f}-{b:5.2f}  src {s:6.2f}", flush=True)

# 4) tension music: low minor drone + pulse + drum hit on each cut
sr = 44100; N = int(sr * total); t = np.arange(N) / sr; out = np.zeros((N, 2))
for k, fq in enumerate([73.42, 110.0, 146.83, 174.61, 220.0]):  # D minor
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * (0.07 + 0.02 * k) * t + k)
    amp = (0.08 if fq < 120 else 0.035) * lfo
    out[:, 0] += amp * np.sin(2 * np.pi * fq * t); out[:, 1] += amp * np.sin(2 * np.pi * fq * 1.004 * t + 0.6)
pulse = 0.05 * np.sin(2 * np.pi * 55 * t) * np.exp(-((t * 1.1) % 1.0) * 6)  # slow heartbeat
out += pulse[:, None]
for a, _ in shots:
    i0 = int(a * sr); L = int(0.8 * sr); tt = np.arange(L) / sr
    f = 45 + 45 * np.exp(-tt * 20); hit = 0.38 * np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt * 6)
    e = min(N, i0 + L); out[i0:e] += hit[: e - i0, None]
out *= np.clip(np.minimum(t / 1.0, (total - t) / 1.5), 0, 1)[:, None]
out = np.tanh(out * 1.2); out *= 0.7 / np.max(np.abs(out))
wav = os.path.join(WD, "music.wav")
with wave.open(wav, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((out * 32767).astype(np.int16).tobytes())

# 5) concat shots + music
lst = os.path.join(WD, "list.txt")
open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav, "-map", "0:v", "-map", "1:a",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-shortest", "-movflags", "+faststart", OUT])
print("done", OUT, dur(OUT))
