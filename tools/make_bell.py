"""Ora's church bell, made from scratch (no recordings, so no rights to clear).

A bell's voice is a set of inharmonic partials - hum, prime, tierce, quint, nominal and above - each
ringing and dying at its own rate, with a little beating from the bell's slight asymmetry. A short
felted strike, then a small stone church's reverb.

Writes assets/sounds/bell.wav (one stroke) and angelus.wav (three strokes).
Usage: python3 tools/make_bell.py mobile/assets/sounds
"""
import os
import sys
import wave

import numpy as np

SR = 44100
# (ratio to the prime, level, decay seconds, beat Hz)
PARTIALS = [(0.5, 0.55, 9.0, 0.35), (1.0, 0.75, 6.0, 0.6), (1.19, 0.45, 4.2, 0.0), (1.5, 0.22, 3.0, 0.9),
            (2.0, 0.60, 3.4, 1.1), (2.5, 0.12, 2.0, 0.0), (2.66, 0.18, 1.8, 1.4), (3.0, 0.14, 1.5, 0.0),
            (4.0, 0.08, 1.0, 0.0), (5.33, 0.04, 0.6, 0.0)]


def stroke(prime=196.0, secs=8.0, velocity=1.0):
    t = np.arange(int(SR * secs)) / SR
    out = np.zeros_like(t)
    rng = np.random.default_rng(7)
    for ratio, level, decay, beat in PARTIALS:
        f = prime * ratio
        phase = rng.uniform(0, 2 * np.pi)
        tone = np.sin(2 * np.pi * f * t + phase)
        if beat:
            tone = 0.6 * tone + 0.4 * np.sin(2 * np.pi * (f + beat) * t + phase * 1.3)
        env = np.exp(-t / decay) * (1 - np.exp(-t / 0.004))
        out += level * velocity ** (1 + ratio * 0.15) * tone * env
    # the clapper: a soft, dark thump
    n = int(SR * 0.03)
    thump = rng.normal(0, 1, n) * np.exp(-np.arange(n) / (SR * 0.006))
    thump = np.convolve(thump, np.ones(40) / 40, mode="same")
    out[:n] += 0.25 * velocity * thump
    return out


def reverb(x, mix=0.22):
    """A small Schroeder reverb: four combs into two allpasses."""
    def comb(sig, d, g):
        y = np.copy(sig)
        for i in range(d, len(sig)):
            y[i] += g * y[i - d]
        return y

    def allpass(sig, d, g):
        y = np.zeros_like(sig)
        for i in range(len(sig)):
            xd = sig[i - d] if i >= d else 0.0
            yd = y[i - d] if i >= d else 0.0
            y[i] = -g * sig[i] + xd + g * yd
        return y
    # downsample the work for speed: process at full rate but with numpy-friendly loops on a copy
    wet = sum(comb(x, int(SR * d), g) for d, g in ((0.0297, 0.80), (0.0371, 0.78), (0.0411, 0.76), (0.0437, 0.74))) / 4
    wet = allpass(allpass(wet, int(SR * 0.005), 0.7), int(SR * 0.0017), 0.7)
    return (1 - mix) * x + mix * wet


def write(path, x):
    x = x / np.max(np.abs(x)) * 0.7
    fade = int(SR * 2.5)
    x[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def main(out):
    one = stroke(196.0, 9.0)
    write(os.path.join(out, "bell.wav"), reverb(one))
    total = np.zeros(int(SR * 13.5))
    for k, v in enumerate((1.0, 0.92, 0.96)):
        s = stroke(196.0, 9.0, v)
        start = int(SR * 2.4 * k)
        total[start:start + len(s)] += s[: len(total) - start]
    write(os.path.join(out, "angelus.wav"), reverb(total))
    print("ok")


if __name__ == "__main__":
    main(sys.argv[1])
