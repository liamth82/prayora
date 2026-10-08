"""Generate traditional line-and-engraving style Christian symbols (200x200 viewBox) as JSON for the app,
plus a preview sheet. Letters are real serif glyph outlines (EB Garamond, SIL Open Font Licence).

Usage: python make_symbols.py OUT_JSON PREVIEW_SVG FONT_DIR
FONT_DIR holds eb-garamond-latin-500-normal.woff and eb-garamond-greek-500-normal.woff (from @fontsource/eb-garamond).
Each symbol has 'paths' (stroked), 'fills' (filled), 'circles' (stroked) and 'dots' (filled circles)."""
import json, math, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT_DIR = sys.argv[3]
FONTS = {
    "latin": TTFont(os.path.join(FONT_DIR, "eb-garamond-latin-500-normal.woff")),
    "greek": TTFont(os.path.join(FONT_DIR, "eb-garamond-greek-500-normal.woff")),
}

def glyph(ch, cx, baseline, cap_h, script="latin"):
    """Filled outline of a character, horizontally centred on cx, sitting on baseline, cap height ~cap_h."""
    f = FONTS[script]
    upm = f["head"].unitsPerEm
    cmap = f.getBestCmap()
    gs = f.getGlyphSet()
    name = cmap[ord(ch)]
    cap = getattr(f["OS/2"], "sCapHeight", 0) or upm * 0.65
    s = cap_h / cap
    adv = gs[name].width * s
    pen = SVGPathPen(gs)
    tp = TransformPen(pen, (s, 0, 0, -s, cx - adv / 2, baseline))
    gs[name].draw(tp)
    return pen.getCommands()

def P(pts):
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + " Z"

def polar(cx, cy, r, a):
    return cx + r * math.cos(a), cy + r * math.sin(a)

def tapered_ray(cx, cy, a, r1, r2, w):
    n = (math.cos(a + math.pi / 2), math.sin(a + math.pi / 2))
    b = polar(cx, cy, r1, a)
    return P([(b[0] + n[0] * w / 2, b[1] + n[1] * w / 2), polar(cx, cy, r2, a), (b[0] - n[0] * w / 2, b[1] - n[1] * w / 2)])

def flame_ray(cx, cy, a, r1, r2, w, amp=2.2, waves=1.5):
    n = (math.cos(a + math.pi / 2), math.sin(a + math.pi / 2))
    left, right = [], []
    steps = 14
    for i in range(steps + 1):
        t = i / steps
        r = r1 + (r2 - r1) * t
        half = w / 2 * (1 - t)
        off = amp * math.sin(t * math.pi * 2 * waves) * (1 - t * 0.4)
        x, y = polar(cx, cy, r, a)
        left.append((x + n[0] * (off + half), y + n[1] * (off + half)))
        right.append((x + n[0] * (off - half), y + n[1] * (off - half)))
    return P(left + right[::-1])

def glory(cx, cy, r1, r2, n, a0=0, a1=360, w=3.2, flame_every=2):
    out = []
    full = (a1 - a0) >= 360
    for i in range(n):
        a = math.radians(a0 + (a1 - a0) * (i / n if full else (i + 0.5) / n))
        if i % flame_every == 1:
            out.append(tapered_ray(cx, cy, a, r1 + (r2 - r1) * 0.12, r1 + (r2 - r1) * 0.62, w * 0.55))
        else:
            out.append(tapered_ray(cx, cy, a, r1, r2, w))
    return out

def cross_patee(cx, cy, arm, w0, w1, top=None):
    """Cross whose arms flare from w0 at the centre to w1 at the ends (filled). 'top' lengthens the upper arm."""
    t = top or arm
    h0, h1 = w0 / 2, w1 / 2
    pts = [
        (cx - h0, cy - h0), (cx - h1, cy - t), (cx + h1, cy - t), (cx + h0, cy - h0),
        (cx + arm, cy - h1), (cx + arm, cy + h1), (cx + h0, cy + h0),
        (cx + h1, cy + arm * 1.25), (cx - h1, cy + arm * 1.25), (cx - h0, cy + h0),
        (cx - arm, cy + h1), (cx - arm, cy - h1),
    ]
    return P(pts)

def beads(cx, cy, r, n, rad=1.1):
    return [[round(x, 1), round(y, 1), rad] for x, y in (polar(cx, cy, r, 2 * math.pi * i / n) for i in range(n))]

def leaf(x, y, a, length=9, width=3.6):
    tip = (x + length * math.cos(a), y + length * math.sin(a))
    n = (math.cos(a + math.pi / 2) * width / 2, math.sin(a + math.pi / 2) * width / 2)
    mid = (x + length / 2 * math.cos(a), y + length / 2 * math.sin(a))
    return (f"M{x:.1f} {y:.1f} Q {mid[0] + n[0]:.1f} {mid[1] + n[1]:.1f} {tip[0]:.1f} {tip[1]:.1f} "
            f"Q {mid[0] - n[0]:.1f} {mid[1] - n[1]:.1f} {x:.1f} {y:.1f} Z")

def star(cx, cy, r, r2=None):
    r2 = r2 or r * 0.42
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        pts.append(polar(cx, cy, r if i % 2 == 0 else r2, a))
    return P(pts)

def mirror(d):
    toks = d.replace(",", " ").split()
    out, xnext = [], True
    for t in toks:
        if t[0].isalpha():
            out.append(t[0]); t = t[1:]; xnext = True
            if not t: continue
        v = float(t)
        out.append(f"{200 - v:.1f}" if xnext else f"{v:.1f}")
        xnext = not xnext
    return " ".join(out)

S = []

# 1. The Holy Spirit descending, with cruciform nimbus and a glory of rays
def dove_wing():
    d = ["M96 82 C 78 62 48 46 12 44"]
    tips = [(12, 44), (22, 58), (36, 68), (50, 76), (64, 84), (78, 90), (98, 98)]
    for (x0, y0), (x1, y1) in zip(tips, tips[1:]):
        d.append(f"M{x0} {y0} Q {(x0 + x1) / 2 - 4:.1f} {max(y0, y1) + 7:.1f} {x1} {y1}")
    for (x, y), lx in zip(tips[1:-1], (24, 38, 52, 66, 80)):
        d.append(f"M{x} {y} L {lx + 5} {y - 8}")
    d.append("M40 54 C 56 58 72 66 90 80")  # covert line across the wing
    return d
W = dove_wing()
S.append(dict(name="dove", caption="Veni, Sancte Spiritus",
    paths=["M100 48 C 92 68 91 96 100 118 C 109 96 108 68 100 48 Z",
           "M100 50 L 86 26 M100 50 L 100 22 M100 50 L 114 26 M86 26 Q 100 16 114 26 M93 26 L 100 50 L 107 26"]
          + W + [mirror(x) for x in W] + ["M97 131 L 100 138 L 103 131"],
    fills=glory(100, 125, 19, 60, 9, 32, 148, w=3.6),
    circles=[[100, 125, 6.5], [100, 125, 14]], dots=[]))

# 2. The Sacred Heart: flames, cross, crown of thorns, wound and glory
heart = "M100 168 C 64 144 44 118 50 94 C 56 72 86 66 100 88 C 114 66 144 72 150 94 C 156 118 136 144 100 168 Z"
inner = "M100 160 C 70 139 54 117 59 97 C 64 80 86 76 100 96 C 114 76 136 80 141 97 C 146 117 130 139 100 160"
strand1, strand2, spikes = [], [], []
for i in range(0, 41):
    x = 52 + i * 2.4
    base = 108 + 9 * math.sin((x - 52) / 96 * math.pi)
    strand1.append((x, base + 3.2 * math.sin(i * 0.9)))
    strand2.append((x, base - 3.2 * math.sin(i * 0.9)))
for i in range(2, 40, 4):
    x, y = strand1[i]
    spikes.append(tapered_ray(x, y, -math.pi / 2 - 0.5 + (i % 8) * 0.12, 0, 7, 1.6))
    x, y = strand2[i + 2]
    spikes.append(tapered_ray(x, y, math.pi / 2 + 0.4 - (i % 8) * 0.1, 0, 6, 1.4))
line = lambda pts: "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
S.append(dict(name="heart", caption="Cor Jesu sacratissimum",
    paths=[heart, inner, line(strand1), line(strand2)],
    fills=[flame_ray(100, 88, -math.pi / 2, 0, 26, 9, amp=1.6, waves=1),
           flame_ray(92, 88, -math.pi / 2 - 0.35, 0, 17, 6, amp=1.2, waves=1),
           flame_ray(108, 88, -math.pi / 2 + 0.35, 0, 17, 6, amp=1.2, waves=1),
           cross_patee(100, 46, 9, 3, 7, top=14),
           "M122 128 Q 127 134 124 142 Q 121 135 122 128 Z"]
          + [tapered_ray(124, 146 + i * 6, math.pi / 2, 0, 3.5, 2.2) for i in range(2)]
          + spikes + glory(100, 112, 70, 96, 24, w=3.4),
    circles=[], dots=[]))

# 3. Alpha and Omega with the cross, in a beaded double ring
S.append(dict(name="alphaomega", caption="Ego sum Alpha et Omega",
    paths=[], fills=[glyph("Α", 58, 128, 44, "greek"), glyph("Ω", 142, 128, 44, "greek"),
                     cross_patee(100, 100, 18, 4, 11, top=46)],
    circles=[[100, 100, 90], [100, 100, 80]], dots=beads(100, 100, 85, 48, 1.2)))

# 4. Chi-Rho within a laurel wreath (built with thick and thin strokes, like a carved inscription)
def bar(x1, y1, x2, y2, w):
    a = math.atan2(y2 - y1, x2 - x1); n = (math.cos(a + math.pi / 2) * w / 2, math.sin(a + math.pi / 2) * w / 2)
    return P([(x1 + n[0], y1 + n[1]), (x2 + n[0], y2 + n[1]), (x2 - n[0], y2 - n[1]), (x1 - n[0], y1 - n[1])])
leaves = []
for i in range(36):
    a = 2 * math.pi * i / 36
    x, y = polar(100, 100, 84, a)
    side = 1 if i % 2 else -1
    leaves.append(leaf(x, y, a + math.pi / 2 + side * 0.6, 12, 4.8))
chirho = [
    bar(100, 30, 100, 168, 8),                      # stem of Rho
    bar(91, 30, 109, 30, 2.2), bar(90, 168, 110, 168, 2.4),   # serifs
    "M104 30 C 136 30 148 43 148 58 C 148 74 136 88 104 88 L 104 82 C 128 82 138 72 138 58 C 138 44 128 36 104 36 Z",
    bar(64, 76, 136, 148, 8.5),                    # thick diagonal of Chi
    bar(136, 76, 64, 148, 3.4),                    # thin diagonal
    bar(57, 76, 72, 76, 2.2), bar(129, 76, 144, 76, 2.2), bar(56, 148, 72, 148, 2.2), bar(128, 148, 144, 148, 2.2),
]
S.append(dict(name="chirho", caption="In hoc signo vinces",
    paths=[], fills=chirho + leaves, circles=[[100, 100, 84]], dots=[]))

# 5. Marian monogram: A and M interlaced beneath a crown, with twelve stars
crown = ("M78 52 L 82 34 L 90 46 L 100 28 L 110 46 L 118 34 L 122 52 Z M78 52 L 122 52 M80 58 L 120 58")
stars = [star(*polar(100, 104, 82, -math.pi / 2 + 2 * math.pi * (i + 0.5) / 12), 4.2) for i in range(12)]
S.append(dict(name="marian", caption="Ave Maria, gratia plena",
    paths=[crown], fills=[glyph("M", 100, 140, 66), glyph("A", 100, 132, 50)] + stars,
    circles=[], dots=[[82, 32, 2], [100, 26, 2.2], [118, 32, 2]]))

# 6. IHS with cross and nails in a glory
nails = [tapered_ray(100 + dx, 140, math.pi / 2 + rot, 0, 22, 4) for dx, rot in ((-9, 0.32), (0, 0), (9, -0.32))]
S.append(dict(name="ihs", caption="In nomine Jesu",
    paths=[], fills=[glyph("I", 64, 126, 38), glyph("H", 100, 126, 38), glyph("S", 136, 126, 38),
                     cross_patee(100, 84, 8, 2.4, 6, top=28)] + nails + glory(100, 104, 70, 96, 32, w=3.4),
    circles=[], dots=[[100, 140, 2.2]]))

# 7. The anchor cross of hope, in a beaded ring
S.append(dict(name="anchor", caption="Spes nostra",
    paths=["M58 126 C 64 156 136 156 142 126"],
    fills=[P([(98, 43), (102, 43), (104, 150), (96, 150)]),
           P([(66, 63), (134, 63), (134, 68), (66, 68)]),
           P([(50, 136), (58, 118), (66, 136), (58, 130)]), P([(134, 136), (142, 118), (150, 136), (142, 130)])],
    circles=[[100, 34, 9], [100, 100, 90]], dots=beads(100, 100, 84, 40, 1.1) + [[64, 65.5, 4.2], [136, 65.5, 4.2]]))

# 8. Gothic chalice and the Host in a glory
S.append(dict(name="chalice", caption="Panis angelicus",
    paths=["M62 98 C 64 122 84 130 100 130 C 116 130 136 122 138 98 Z", "M66 106 L 134 106",
           "M100 130 L 100 138 M100 150 L 100 156",
           "M92 144 L 100 136 L 108 144 L 100 152 Z",
           "M70 168 C 74 158 90 156 100 156 C 110 156 126 158 130 168 C 120 172 80 172 70 168 Z"],
    fills=[glyph("I", 89, 66, 12), glyph("H", 100, 66, 12), glyph("S", 111, 66, 12)]
          + glory(100, 60, 30, 50, 15, 190, 350, w=2.8),
    circles=[[100, 60, 24], [100, 60, 20]], dots=[]))

json.dump(S, open(sys.argv[1], "w"), indent=0)

def svg(sym, x, y):
    ink = "#F2EAD8"
    g = [f'<g transform="translate({x},{y})">',
         f'<g fill="none" stroke="{ink}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">']
    g += [f'<path d="{d}"/>' for d in sym["paths"]]
    g += [f'<circle cx="{c[0]}" cy="{c[1]}" r="{c[2]}"/>' for c in sym.get("circles", [])]
    g.append(f'</g><g fill="{ink}" stroke="none">')
    g += [f'<path d="{d}"/>' for d in sym.get("fills", [])]
    g += [f'<circle cx="{c[0]}" cy="{c[1]}" r="{c[2]}"/>' for c in sym.get("dots", [])]
    g.append(f'</g><text x="100" y="197" fill="#9a8a6a" font-size="9" text-anchor="middle" font-family="serif" font-style="italic">{sym["caption"]}</text></g>')
    return "".join(g)
cols = 4
sheet = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{cols*210*2}" height="{420*2}" viewBox="0 0 {cols*210} 420">'
         f'<rect width="100%" height="100%" fill="#07060A"/>'
         + "".join(svg(s, (i % cols) * 210, (i // cols) * 210) for i, s in enumerate(S)) + "</svg>")
open(sys.argv[2], "w").write(sheet)
print(len(S), "symbols")
