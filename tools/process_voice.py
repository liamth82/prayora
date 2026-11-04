"""Turn Liam's Compline recordings into one clip per line for the app.

Each recording is one section of the script (tools/compline_script.py); the file name must contain the
section number ("03.m4a", "Compline 3.m4a", "section-03 take2.wav"). Each file starts with ~10 seconds of
room silence, then the lines, with a pause of about two seconds between lines.

For each file: decode to mono 48 kHz; take the noise profile from the opening silence and reduce it; cut
rumble below 75 Hz; level to -19 LUFS; find the lines by looking for pauses (the pause length is tuned
until the number of pieces matches the script); add a touch of stone-church reverb; write
mobile/assets/voice/compline/SS-LL.m4a and regenerate mobile/src/voice.ts.

Usage: python3 tools/process_voice.py <file or folder> [...]   [--section N for a file without a number]
Needs: ffmpeg, node 22+, pip install --break-system-packages noisereduce pyloudnorm soundfile scipy
"""
import glob, json, os, re, subprocess, sys, tempfile
import numpy as np
import soundfile as sf
import noisereduce as nr
import pyloudnorm as pyln
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "mobile", "assets", "voice", "compline")
SR = 48000


def script():
    js = "import('./src/compline.ts').then(m=>console.log(JSON.stringify(m.COMPLINE.map(s=>({n:s.n,title:s.title,lines:s.lines.map(l=>l.text)})))))"
    r = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "-e", js], cwd=os.path.join(ROOT, "mobile"),
                       capture_output=True, text=True, check=True)
    return {s["n"]: s for s in json.loads(r.stdout)}


def decode(path):
    tmp = tempfile.mktemp(suffix=".wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", str(SR), tmp], check=True)
    x, _ = sf.read(tmp); os.remove(tmp)
    return x.astype(np.float64)


def frames_db(x, hop=0.02):
    h = int(SR * hop)
    n = len(x) // h
    e = np.sqrt((x[: n * h].reshape(n, h) ** 2).mean(1) + 1e-12)
    return 20 * np.log10(e), h


def speech_mask(x):
    db, h = frames_db(x)
    floor = np.percentile(db, 10)
    loud = np.percentile(db, 95)
    thr = floor + max(10, (loud - floor) * 0.3)
    m = db > thr
    # close tiny gaps (inside words) and drop clicks
    m = signal.medfilt(m.astype(float), 5) > 0.5
    return m, h


def runs(mask):
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None: start = i
        if not v and start is not None: out.append([start, i]); start = None
    if start is not None: out.append([start, len(mask)])
    return out


def split(x, want, skip_secs):
    m, h = speech_mask(x)
    m[: int(skip_secs / 0.02)] = False
    r = [s for s in runs(m) if (s[1] - s[0]) * 0.02 >= 0.15]
    if not r: return None, 0
    best, hits = None, []
    for gap in np.arange(0.5, 3.01, 0.05):
        g = int(gap / 0.02)
        pieces = [list(r[0])]
        for s in r[1:]:
            if s[0] - pieces[-1][1] < g: pieces[-1][1] = s[1]
            else: pieces.append(list(s))
        if len(pieces) == want: hits.append((gap, pieces))
        if best is None or abs(len(pieces) - want) < abs(len(best[1]) - want): best = (gap, pieces)
    # of all pause lengths that give the right count, take the middle one: the clearest boundary
    gap, pieces = hits[len(hits) // 2] if hits else best
    return [(max(0, a * h - int(0.18 * SR)), min(len(x), b * h + int(0.35 * SR))) for a, b in pieces], gap


def reverb(x):
    rng = np.random.default_rng(3)
    L = int(SR * 2.2)
    ir = rng.normal(0, 1, L) * np.exp(-np.arange(L) / (SR * 0.45))
    ir = signal.sosfilt(signal.butter(1, 3000, fs=SR, output="sos"), ir)
    ir[: int(SR * 0.02)] = 0
    wet = signal.fftconvolve(x, ir)[: len(x) + L]
    wet = np.pad(wet, (0, len(x) + L - len(wet)))
    wet *= np.sqrt((x ** 2).sum() / max(1e-12, (wet ** 2).sum()))
    y = np.concatenate([x, np.zeros(L)])
    return y + 0.16 * wet


def write_clip(x, name):
    k = int(0.05 * SR)
    x = x.copy(); x[:k] *= np.linspace(0, 1, k)
    y = reverb(x)
    # trim the reverb tail to ~0.9 s past the voice, with a fade
    end = len(x) + int(0.9 * SR)
    y = y[:end]; f = int(0.4 * SR); y[-f:] *= np.linspace(1, 0, f)
    tmp = tempfile.mktemp(suffix=".wav")
    sf.write(tmp, np.clip(y, -1, 1), SR, subtype="PCM_16")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-ar", "44100", "-c:a", "aac", "-b:a", "64k",
                    os.path.join(OUT, name + ".m4a")], check=True)
    os.remove(tmp)


def process(path, n, sec):
    x = decode(path)
    noise = x[int(1 * SR): int(8 * SR)]
    if len(noise) > SR: x = nr.reduce_noise(y=x, sr=SR, y_noise=noise, prop_decrease=0.85, stationary=True)
    x = signal.sosfiltfilt(signal.butter(2, 75, btype="high", fs=SR, output="sos"), x)
    meter = pyln.Meter(SR)
    m, h = speech_mask(x)
    voiced = np.repeat(m, h)[: len(x)]
    if voiced.sum() > SR: x = pyln.normalize.loudness(x, meter.integrated_loudness(x[: len(voiced)][voiced]), -19.0)
    peak = np.abs(x).max()
    if peak > 0.95: x *= 0.95 / peak
    want = len(sec["lines"])
    cuts, gap = split(x, want, skip_secs=6)
    if cuts is None or len(cuts) != want:
        got = 0 if cuts is None else len(cuts)
        print(f"  section {n}: found {got} lines, script has {want}. Not written. Pieces (s):",
              [round((b - a) / SR, 1) for a, b in (cuts or [])])
        return 0
    os.makedirs(OUT, exist_ok=True)
    for i, (a, b) in enumerate(cuts):
        write_clip(x[a:b], f"{n:02d}-{i + 1:02d}")
    print(f"  section {n} ({sec['title']}): {want} lines, pause {gap:.2f}s, lengths",
          [round((b - a) / SR, 1) for a, b in cuts])
    return want


def manifest():
    names = sorted(os.path.basename(p)[:-4] for p in glob.glob(os.path.join(OUT, "*.m4a")))
    body = "\n".join(f"  '{k}': require('../assets/voice/compline/{k}.m4a')," for k in names)
    open(os.path.join(ROOT, "mobile", "src", "voice.ts"), "w").write(
        "// Generated by tools/process_voice.py: Liam's recorded Compline, one clip per line (section-line).\n"
        "export const COMPLINE_VOICE: Record<string, number> = {\n" + body + ("\n" if body else "") + "};\n")
    print(len(names), "clips in mobile/src/voice.ts")


def main():
    args = sys.argv[1:]
    force = None
    if "--section" in args:
        i = args.index("--section"); force = int(args[i + 1]); del args[i:i + 2]
    files = []
    for a in args:
        files += sorted(glob.glob(os.path.join(a, "*"))) if os.path.isdir(a) else [a]
    sc = script()
    for f in files:
        m = re.findall(r"\d+", os.path.basename(f).rsplit(".", 1)[0])
        n = force or (int(m[0]) if m else None)
        if n not in sc: print("skip (no section number):", f); continue
        print(os.path.basename(f))
        process(f, n, sc[n])
    manifest()


if __name__ == "__main__":
    main()
