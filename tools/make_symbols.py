"""Generate line-art Christian symbols (200x200 viewBox) as JSON for the app, plus a preview SVG sheet."""
import json, math, sys

def rays(cx, cy, r1, r2, n, a0=0, a1=360, alt=None):
    out = []
    for i in range(n):
        a = math.radians(a0 + (a1 - a0) * (i + 0.5) / n) if a1 - a0 < 360 else math.radians(a0 + 360 * i / n)
        rr2 = r2 if not alt or i % 2 == 0 else alt
        out.append(f"M{cx + r1*math.cos(a):.1f} {cy + r1*math.sin(a):.1f} L{cx + rr2*math.cos(a):.1f} {cy + rr2*math.sin(a):.1f}")
    return out

def mirror(d):
    # mirror an absolute path of M/L/C/Q commands with numbers about x=100
    toks = d.replace(",", " ").split()
    out, xnext = [], True
    for t in toks:
        if t[0].isalpha():
            out.append(t[0]); t = t[1:]
            xnext = True
            if not t: continue
        v = float(t)
        out.append(f"{200 - v:.1f}" if xnext else f"{v:.1f}")
        xnext = not xnext
    return " ".join(out)

S = []

# 1. The Holy Spirit as a dove, descending, wings spread, with rays
def dove_wing():
    # leading edge from the shoulder out to the wing tip, then rounded feather tips back to the body
    d = ["M96 82 C 78 62 48 46 12 44"]
    tips = [(12, 44), (22, 58), (36, 68), (50, 76), (64, 84), (78, 90), (98, 98)]
    for (x0, y0), (x1, y1) in zip(tips, tips[1:]):
        cx, cy = (x0 + x1) / 2 - 4, max(y0, y1) + 7
        d.append(f"M{x0} {y0} Q {cx:.1f} {cy:.1f} {x1} {y1}")
    for (x, y), lx in zip(tips[1:-1], (24, 38, 52, 66, 80)):
        d.append(f"M{x} {y} L {lx + 5} {y - 8}")
    return d
L = dove_wing()
S.append(dict(name="dove", caption="Veni, Sancte Spiritus", paths=[
    "M100 48 C 92 68 91 96 100 118 C 109 96 108 68 100 48 Z",
    "M100 50 L 86 26 M100 50 L 100 22 M100 50 L 114 26 M86 26 Q 100 16 114 26",
] + L + [mirror(x) for x in L] + [
    "M97 133 L 100 141 L 103 133",
] + rays(100, 128, 24, 58, 9, 40, 140, alt=46), circles=[[100, 126, 7]]))

# 2. The Sacred Heart with flames, cross, crown of thorns and rays
heart = "M100 172 C 62 146 42 118 48 92 C 54 68 86 62 100 86 C 114 62 146 68 152 92 C 158 118 138 146 100 172 Z"
thorns = []
for i in range(9):
    x = 56 + i * 11
    y = 108 + 10 * math.sin((x - 56) / 88 * math.pi) * 0.9
    thorns.append(f"M{x - 4:.1f} {y - 6:.1f} L{x + 5:.1f} {y + 7:.1f}")
S.append(dict(name="heart", caption="Cor Jesu sacratissimum", paths=[
    heart,
    "M52 104 C 78 124 122 124 148 104", "M54 116 C 80 134 120 134 146 116",
    "M100 86 C 90 74 94 62 100 52 C 106 62 110 74 100 86",
    "M92 82 C 84 74 86 66 90 60", "M108 82 C 116 74 114 66 110 60",
    "M100 52 L 100 18 M89 29 L 111 29",
    "M118 132 C 122 136 124 140 124 146",
] + thorns + rays(100, 112, 78, 94, 24), circles=[]))

# 3. Alpha and Omega with the cross
S.append(dict(name="alphaomega", caption="Ego sum Alpha et Omega", paths=[
    "M36 132 L 54 82 L 72 132 M43 114 L 65 114",
    "M128 132 L 140 132 C 130 124 124 114 126 102 C 128 88 138 80 150 80 C 162 80 172 88 174 102 C 176 114 170 124 160 132 L 172 132",
    "M100 42 L 100 158 M80 72 L 120 72",
], circles=[[100, 100, 90], [100, 100, 84]]))

# 4. Chi-Rho
S.append(dict(name="chirho", caption="In hoc signo vinces", paths=[
    "M64 64 L 136 136 M136 64 L 64 136",
    "M100 28 L 100 172",
    "M100 30 C 128 30 138 44 138 57 C 138 71 126 82 100 82",
], circles=[[100, 100, 88], [100, 100, 82]]))

# 5. Ichthys
S.append(dict(name="fish", caption="Ἰησοῦς Χριστός Θεοῦ Υἱός Σωτήρ", paths=[
    "M32 100 C 62 58 124 56 164 112", "M32 100 C 62 142 124 144 164 88",
    "M64 86 C 72 96 72 104 64 114",
], circles=[], dots=[[132, 96, 2.4]]))

# 6. IHS with cross and nails, in a sunburst
S.append(dict(name="ihs", caption="In nomine Jesu", paths=[
    "M56 84 L 56 128", "M50 84 L 62 84 M50 128 L 62 128",
    "M78 84 L 78 128 M112 84 L 112 128 M78 106 L 112 106",
    "M72 84 L 84 84 M106 84 L 118 84 M72 128 L 84 128 M106 128 L 118 128",
    "M95 106 L 95 60 M86 70 L 104 70",
    "M150 90 C 146 82 134 82 132 90 C 130 100 150 102 150 114 C 150 126 134 128 128 120",
    "M86 138 L 94 162 M95 138 L 95 164 M104 138 L 96 162",
] + rays(100, 104, 72, 92, 32, alt=84), circles=[]))

# 7. Anchor cross
S.append(dict(name="anchor", caption="Spes nostra", paths=[
    "M100 40 L 100 164", "M76 64 L 124 64",
    "M58 128 C 64 158 136 158 142 128", "M50 136 L 58 126 L 66 136", "M134 136 L 142 126 L 150 136",
], circles=[[100, 31, 9]]))

# 8. Chalice and Host
S.append(dict(name="chalice", caption="Panis angelicus", paths=[
    "M64 96 C 64 128 136 128 136 96 Z",
    "M100 122 L 100 132 M100 140 L 100 150",
    "M72 166 C 84 152 116 152 128 166 Z",
    "M100 50 L 100 74 M88 62 L 112 62",
] + rays(100, 62, 30, 44, 11, 195, 345, alt=38), circles=[[100, 62, 22], [100, 136, 4]]))

json.dump(S, open(sys.argv[1], "w"), indent=1)

def svg(sym, x, y):
    g = [f'<g transform="translate({x},{y})" fill="none" stroke="#F7EFDC" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">']
    for d in sym["paths"]: g.append(f'<path d="{d}"/>')
    for c in sym.get("circles", []): g.append(f'<circle cx="{c[0]}" cy="{c[1]}" r="{c[2]}"/>')
    for c in sym.get("dots", []): g.append(f'<circle cx="{c[0]}" cy="{c[1]}" r="{c[2]}" fill="#F7EFDC"/>')
    g.append(f'<text x="100" y="196" fill="#9a8a6a" stroke="none" font-size="9" text-anchor="middle" font-family="serif">{sym["caption"]}</text></g>')
    return "".join(g)
w = 4 * 210
sheet = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w*2}" height="{2*210*2}" viewBox="0 0 {w} {2*210}"><rect width="100%" height="100%" fill="#07060A"/>' + "".join(svg(s, (i % 4) * 210, (i // 4) * 210) for i, s in enumerate(S)) + "</svg>"
open(sys.argv[2], "w").write(sheet)
