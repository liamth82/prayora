"""The hush of a stone church at night, made from scratch (placeholder until a real church is recorded).

A low, slowly breathing rumble (the building and the town outside), a faint high air, and now and then a
distant creak of old wood, given the long tail of a stone nave. Loops seamlessly.
Usage: python3 tools/make_church.py mobile/assets/sounds   (needs ffmpeg for the .m4a)
"""
import os, subprocess, sys, wave
import numpy as np
from scipy import signal

SR = 44100
SECS = 96
rng = np.random.default_rng(11)

def band(x, lo, hi):
    sos = signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfiltfilt(sos, x)

def lfo(f, depth, n, phase=0.0):
    t = np.arange(n) / SR
    return 1 - depth + depth * (0.5 + 0.5 * np.sin(2 * np.pi * f * t + phase))

n = SR * (SECS + 8)
rumble = band(np.cumsum(rng.normal(0, 1, n)) * 0.02, 60, 420)
rumble = rumble / np.abs(rumble).max() * lfo(1 / 23, 0.35, n)
air = band(rng.normal(0, 1, n), 900, 5000)
air = air / np.abs(air).max() * lfo(1 / 37, 0.5, n, 1.3)

# a stone nave: exponentially decaying noise, darker as it fades
L = int(SR * 4.5)
ir = rng.normal(0, 1, L) * np.exp(-np.arange(L) / (SR * 0.9))
ir = signal.sosfilt(signal.butter(1, 2500, fs=SR, output="sos"), ir)
ir /= np.abs(ir).sum() ** 0.5 * 40

events = np.zeros(n)
for at in (13.0, 41.5, 77.0):
    i = int(at * SR)
    k = int(SR * 0.09)
    creak = band(rng.normal(0, 1, k), 300, 1400) * np.hanning(k)
    events[i:i + k] += creak * 0.35
events = signal.fftconvolve(events, ir)[:n]

mix = 10 ** (-22 / 20) * rumble + 10 ** (-44 / 20) * air + 10 ** (-26 / 20) * events / max(1e-9, np.abs(events).max())
# seamless loop: crossfade the extra tail into the head
m = SR * SECS
x = 8 * SR
out = mix[:m].copy()
w = np.linspace(0, 1, x)
out[:x] = mix[:x] * w + mix[m:m + x] * (1 - w)

out *= 10 ** ((-30 - 20 * np.log10(np.sqrt((out ** 2).mean()))) / 20)
dest = sys.argv[1] if len(sys.argv) > 1 else "."
wav = os.path.join(dest, "church.wav")
with wave.open(wav, "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", "64k", os.path.join(dest, "church.m4a")], check=True)
os.remove(wav)
print("church.m4a", round(20 * np.log10(np.sqrt((out ** 2).mean())), 1), "dBFS rms")
