#!/usr/bin/env python3
"""Synthesise the 90 s ambience / SFX bed for EESINHIAN (no narration).

Everything is generated with numpy: wind, crickets, a khaen-like reed drone
(Isan texture), wood creaks, fabric rustle, footsteps, heartbeat, impacts,
morning birds. Output: audio/ambience.wav (stereo, 44.1 kHz).
Event times are on the 90 s base timeline (see story.js).
"""
import os, wave
import numpy as np

SR = 44100
DUR = 90.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def env(a, b, fade_in=1.0, fade_out=1.0):
    e = np.clip((t - a) / max(fade_in, 1e-3), 0, 1) * np.clip((b - t) / max(fade_out, 1e-3), 0, 1)
    return e

def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, mode="same")

def add(start, sig, pan=0.0, gain=1.0):
    s = int(start * SR)
    if s >= N or s + len(sig) <= 0: return
    a, b = max(0, s), min(N, s + len(sig))
    seg = sig[a - s:b - s] * gain
    L[a:b] += seg * (1 - max(0, pan)); R[a:b] += seg * (1 + min(0, pan))

# ---- beds ----
wind_n = lowpass(rng.standard_normal(N), 60)
wind_g = 0.10 + 0.07 * np.sin(2 * np.pi * 0.09 * t) + 0.04 * np.sin(2 * np.pi * 0.23 * t + 1)
wind_g *= np.where(t < 67, 1, np.where(t < 77, .45, 1))           # calmer in the morning
wind_g *= 1 + 1.4 * env(46, 56.2, 4, .2)                            # wind increasing (scene 6)
wind_g *= np.clip((89.2 - t) / 0.05, 0, 1)                          # wind abruptly stops
wind = wind_n * wind_g * 2.2
L += wind; R += np.roll(wind, 900)

whisper = (rng.standard_normal(N) - lowpass(rng.standard_normal(N), 6)) * 0.02 * env(17, 27.5, 1.5, 1.5)
L += whisper; R += np.roll(whisper, 300)

drone_g = 0.06 + 0.05 * env(0, 90, 2, .1)
drone_g *= np.where((t > 62.2) & (t < 63.6), 0.0, 1.0)              # short silence after the scare
drone_g *= np.where(t > 89.2, 0, 1)
drone_g *= np.where((t > 67) & (t < 77), .5, 1)
drone = (np.sin(2 * np.pi * 43.65 * t) + .6 * np.sin(2 * np.pi * 65.4 * t + np.sin(2 * np.pi * .2 * t))
         + .25 * np.sin(2 * np.pi * 87.3 * t * (1 + .002 * np.sin(2 * np.pi * .13 * t))))
build = 1 + 1.2 * env(38, 46, 8, .3) + 1.5 * env(46, 56, 2, .3)
L += drone * drone_g * build; R += drone * drone_g * build

# khaen-like reed chord (A minor pentatonic), very quiet, scenes 2, 5 and 8
def reed(f, dur):
    x = np.arange(int(dur * SR)) / SR
    vib = 1 + .004 * np.sin(2 * np.pi * 5.2 * x)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    s = sum(np.sin(k * ph) / k ** 1.3 for k in range(1, 8))
    return s * np.clip(x / .6, 0, 1) * np.clip((dur - x) / .8, 0, 1)
for st, du, fs, g in ((8.5, 8.4, (110, 164.8, 220), .018), (39, 7, (110, 130.8, 220), .016), (68, 8.5, (110, 146.8, 220), .014)):
    for f in fs: add(st, reed(f, du), pan=.1, gain=g)
# sparse plucked phin-like notes in scene 2
for i, (tt, f) in enumerate(((9.2, 440), (10.4, 392), (11.1, 330), (12.6, 440), (14.0, 523.3), (15.2, 440))):
    x = np.arange(int(1.4 * SR)) / SR
    add(tt, (np.sin(2 * np.pi * f * x) + .4 * np.sin(4 * np.pi * f * x)) * np.exp(-x * 4), pan=-.2, gain=.03)

# crickets (night scenes)
def crickets(a, b, gain):
    x = t[int(a * SR):int(b * SR)] - a
    chirp = np.sin(2 * np.pi * 4300 * x) * (np.sin(2 * np.pi * 30 * x) > .2) * (np.sin(2 * np.pi * .9 * x) > -.2)
    e = np.clip(x / 1.0, 0, 1) * np.clip((b - a - x) / 1.0, 0, 1)
    add(a, chirp * e, pan=.5, gain=gain)
    add(a + .37, chirp * e, pan=-.5, gain=gain * .7)
crickets(8, 17.2, .02); crickets(17, 27, .012); crickets(36, 46, .014)

# morning birds (scene 8)
for k in range(14):
    st = 67.3 + k * .68 + rng.uniform(0, .3)
    x = np.arange(int(.18 * SR)) / SR
    f = 2600 + 900 * np.sin(np.pi * x / .18) + rng.uniform(-200, 300)
    add(st, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / .18), pan=rng.uniform(-.6, .6), gain=.03)

# ---- spot effects ----
def creak(dur=1.2, f0=160):
    x = np.arange(int(dur * SR)) / SR
    f = f0 + 60 * np.sin(2 * np.pi * 1.7 * x) + 25 * rng.standard_normal(len(x)).cumsum() / 400
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (rng.random(len(x)) < .35)
    return lowpass(s, 8) * np.sin(np.pi * x / dur)
add(2.4, creak(1.3), pan=.3, gain=.16); add(4.6, creak(1.1, 120), pan=-.2, gain=.14); add(31.0, creak(.9, 200), gain=.05)

def step(gain=1.0, bright=1.0):
    x = np.arange(int(.12 * SR)) / SR
    n = rng.standard_normal(len(x)); n = lowpass(n, int(10 / bright) + 1)
    return (n * np.exp(-x * 45) + .6 * np.sin(2 * np.pi * 70 * x) * np.exp(-x * 40)) * gain

def rustle(dur):
    x = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(x)) - lowpass(rng.standard_normal(len(x)), 4)
    return n * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * .7 * x))) * np.sin(np.pi * x / dur)
add(30.0, rustle(5.8), gain=.05); add(36.5, rustle(9), pan=.4, gain=.025)       # fabric, leaves

for k, st in enumerate(np.arange(36.2, 41.2, 0.6)): add(st, step(.22), pan=(-.15 if k % 2 else .15))  # walking
for k, st in enumerate(np.arange(47.0, 56.0, 1.15)):                                                   # unseen steps approaching
    add(st, step(.06 + .3 * (st - 47) / 9, .7), pan=.4 - .4 * (st - 47) / 9)
hb_t = 48.0  # heartbeat 60 -> 105 bpm
while hb_t < 56.0:
    bpm = 60 + 45 * (hb_t - 48) / 8
    x = np.arange(int(.25 * SR)) / SR
    beat = np.sin(2 * np.pi * 52 * x) * np.exp(-x * 22)
    add(hb_t, beat, gain=.22 * (.5 + (hb_t - 48) / 16)); add(hb_t + .22, beat, gain=.15 * (.5 + (hb_t - 48) / 16))
    hb_t += 60 / bpm
for k, st in enumerate(np.arange(56.1, 61.0, 0.31)): add(st, step(.3, 1.4), pan=(-.1 if k % 2 else .1))  # running

def impact(dur=2.5):
    x = np.arange(int(dur * SR)) / SR
    boom = np.sin(2 * np.pi * (60 * np.exp(-x * 3) + 30) * x) * np.exp(-x * 2.2)
    hit = rng.standard_normal(len(x)) * np.exp(-x * 14)
    screech = np.sin(2 * np.pi * (1800 - 700 * x) * x) * np.exp(-x * 5) * .25
    return boom + .5 * hit + screech
add(62.0, impact(1.2), gain=.75)                    # scare, then short silence (drone muted 62.2-63.6)
add(88.6, impact(0.6), gain=.85)                    # final eye close-up

# rising string-like tension before the end
x = np.arange(int(4.5 * SR)) / SR
add(84.1, np.sin(2 * np.pi * (220 + 80 * x / 4.5) * x) * np.clip(x / 4.5, 0, 1) ** 2, gain=.05)

# ---- mix, cut to silence at 89.2, normalise ----
mute = np.clip((89.2 - t) / 0.03, 0, 1)
fade = np.clip(t / .6, 0, 1)
L *= mute * fade; R *= mute * fade
L = np.tanh(L * 1.1); R = np.tanh(R * 1.1)
peak = max(np.abs(L).max(), np.abs(R).max(), 1e-6)
L *= .89 / peak; R *= .89 / peak
pcm = (np.stack([L, R], 1) * 32767).astype(np.int16)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio", "ambience.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(out)
