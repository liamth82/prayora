"""Gothic line-drawn symbols for Ora's fast screen.

Every form is built as solid geometry (shapely), then drawn the way an engraver would: a firm outer
contour and a fine inner contour just inside it. Frames are taken from church architecture: pointed
(equilateral) arches, quatrefoils, the vesica, rose windows. No fills, no sun-rays.

Usage: python3 tools/make_gothic.py mobile/src/symbols.json preview.svg FONT.ttf
Output JSON per symbol: {name, caption, paths (bold), fine (hairline), circles, fineCircles, dots}
"""
import json
import math
import sys

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont
from shapely import affinity
from shapely.geometry import LineString, MultiPolygon, Point, Polygon
from shapely.ops import unary_union

INSET = 2.1  # gap between the bold contour and its fine inner contour

# ---------------------------------------------------------------------------- geometry helpers

def bez(p0, p1, p2, p3, n=24):
    out = []
    for i in range(n + 1):
        t = i / n
        a, b, c, d = (1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3
        out.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return out


def chain(start, *segs, n=24):
    """start point, then (c1, c2, end) cubic segments or a bare end point for a straight line."""
    pts = [start]
    for s in segs:
        if len(s) == 3 and isinstance(s[0], tuple):
            pts += bez(pts[-1], s[0], s[1], s[2], n)[1:]
        else:
            pts.append(s)
    return pts


def arc_pts(cx, cy, r, a0, a1, n=48):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def stroke(pts, w, cap='flat'):
    return LineString(pts).buffer(w / 2, cap_style=cap, join_style='mitre', mitre_limit=3)


def mirror(geom, x=100):
    return affinity.scale(geom, xfact=-1, yfact=1, origin=(x, 0))


def poly(pts):
    p = Polygon(pts)
    return p if p.is_valid else p.buffer(0)


def pointed_arch(xl, xr, ys, base, k=1.0):
    """Pointed arch on jambs down to base. k = radius / span: 1 is equilateral, nearer 0.5 is a drop arch."""
    w = xr - xl
    R = k * w
    cl, cr = xl + R, xr - R          # each side is struck from a centre on the springing line
    mid = (xl + xr) / 2
    left = arc_pts(cl, ys, R, 180, 360 - math.degrees(math.acos((mid - cl) / R)), 40)
    right = arc_pts(cr, ys, R, 360 - math.degrees(math.acos((mid - cr) / R)), 360, 40)
    return poly([(xl, base)] + left + right[1:] + [(xr, base)])


def foil(n, a, r, cx=100, cy=100, rot=-90):
    return unary_union([Point(cx + a * math.cos(math.radians(rot + 360 * k / n)), cy + a * math.sin(math.radians(rot + 360 * k / n))).buffer(r, 64) for k in range(n)])


def vesica(cx, cy, r, d):
    """Pointed oval: the lens where two circles of radius r, d apart, overlap (vertical)."""
    return Point(cx - d / 2, cy).buffer(r, 128).intersection(Point(cx + d / 2, cy).buffer(r, 128))


def star(cx, cy, r, k=0.42):
    return poly([(cx + (r if i % 2 == 0 else r * k) * math.cos(math.radians(-90 + 36 * i)), cy + (r if i % 2 == 0 else r * k) * math.sin(math.radians(-90 + 36 * i))) for i in range(10)])


# ---------------------------------------------------------------------------- glyph outlines

class FlatPen(BasePen):
    def __init__(self, gs):
        super().__init__(gs)
        self.rings, self.cur = [], []

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        self.cur += bez(self.cur[-1], p1, p2, p3, 12)[1:]

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        c1 = (p0[0] + 2 / 3 * (p1[0] - p0[0]), p0[1] + 2 / 3 * (p1[1] - p0[1]))
        c2 = (p2[0] + 2 / 3 * (p1[0] - p2[0]), p2[1] + 2 / 3 * (p1[1] - p2[1]))
        self._curveToOne(c1, c2, p2)

    def _closePath(self):
        if len(self.cur) > 2:
            self.rings.append(self.cur)
        self.cur = []

    _endPath = _closePath


FONT = None
GREEK = None


def glyph(ch, cx, baseline, cap):
    """A letter from the font as solid geometry, centred on cx, with capital height `cap`."""
    font = GREEK if ord(ch) >= 0x370 and GREEK else FONT
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord(ch)]
    pen = FlatPen(gs)
    gs[name].draw(pen)
    capH = font['OS/2'].sCapHeight or 640
    s = cap / capH
    shape = None
    # even-odd fill: XOR the rings
    for ring in pen.rings:
        p = Polygon(ring).buffer(0)
        shape = p if shape is None else shape.symmetric_difference(p)
    adv = gs[name].width
    shape = affinity.scale(shape, xfact=s, yfact=-s, origin=(0, 0))
    return affinity.translate(shape, cx - adv * s / 2, baseline)


# ---------------------------------------------------------------------------- output

def ring_d(coords):
    c = list(coords)
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in c) + (' Z' if c[0] == c[-1] else '')


def boundary_paths(geom):
    out = []
    if geom.is_empty:
        return out
    b = geom.boundary if geom.geom_type in ('Polygon', 'MultiPolygon') else geom
    parts = getattr(b, 'geoms', [b])
    for g in parts:
        if len(g.coords) > 1:
            out.append(ring_d(g.simplify(0.08).coords))
    return out


class Sym:
    def __init__(self, name, caption):
        self.name, self.caption = name, caption
        self.paths, self.fine, self.circles, self.fineCircles, self.dots = [], [], [], [], []
        self.drawn = []  # (geom, inset?) in paint order: later items occlude earlier

    def solid(self, geom, inset=True, inset_by=INSET):
        """Draw a solid form as bold contour + fine inner contour. Later forms hide what lies beneath."""
        self.drawn.append(('solid', geom, inset, inset_by))

    def line(self, geom, bold=False):
        self.drawn.append(('line', geom, bold, 0))

    def finish(self):
        # paint back-to-front, letting each form hide the strokes of forms beneath it
        layers = []
        for kind, g, a, b in self.drawn:
            if kind == 'solid':
                bold = g.boundary
                fine = g.buffer(-b, join_style='mitre').boundary if a else None
                cover = g
            else:
                bold, fine, cover = (g, None, None) if a else (None, g, None)
            layers.append([bold, fine, cover])
        for i, (bold, fine, cover) in enumerate(layers):
            occl = unary_union([c for _, _, c in layers[i + 1:] if c is not None])
            if not occl.is_empty:
                occl = occl.buffer(0.9)
                bold = bold.difference(occl) if bold is not None else None
                fine = fine.difference(occl) if fine is not None else None
            if bold is not None:
                self.paths += boundary_paths(bold)
            if fine is not None:
                self.fine += boundary_paths(fine)
        return {'name': self.name, 'caption': self.caption, 'paths': self.paths, 'fine': self.fine,
                'circles': self.circles, 'fineCircles': self.fineCircles, 'dots': self.dots}


def ring(sym, r1=88, r2=84.5, beads=0):
    sym.circles.append([100, 100, r1])
    sym.fineCircles.append([100, 100, r2])
    for k in range(beads):
        a = math.radians(360 * k / beads)
        sym.dots.append([round(100 + (r1 + r2) / 2 * math.cos(a), 2), round(100 + (r1 + r2) / 2 * math.sin(a), 2), 0.7])


# ---------------------------------------------------------------------------- the symbols

def cross_fleury():
    s = Sym('cross', 'Ave Crux, spes unica')
    ring(s)
    qf = foil(4, 31, 44, rot=0)
    s.solid(qf, inset_by=3.2)
    # tracery between the lobes: a spoke to the ring and a small oculus on each diagonal
    for k in range(4):
        a = math.radians(45 + 90 * k)
        t = (31 + math.sqrt(2 * 44 ** 2 - 31 ** 2)) / 2 * math.sqrt(2)
        s.line(LineString([(100 + t * math.cos(a), 100 + t * math.sin(a)), (100 + 66 * math.cos(a), 100 + 66 * math.sin(a))]))
        s.line(LineString([(100 + 78 * math.cos(a), 100 + 78 * math.sin(a)), (100 + 84.5 * math.cos(a), 100 + 84.5 * math.sin(a))]))
        s.fineCircles.append([round(100 + 72 * math.cos(a), 2), round(100 + 72 * math.sin(a), 2), 6])
    # the cross: slender arms ending in fleurs-de-lis
    w, L = 4.6, 44
    arms = [stroke([(100, 100), (100, 100 - L)], 2 * w), stroke([(100, 100), (100, 100 + L + 6)], 2 * w),
            stroke([(100, 100), (100 - L, 100)], 2 * w), stroke([(100, 100), (100 + L, 100)], 2 * w)]

    def fleur(dirdeg, length):
        y0 = 100 - length
        petal = poly(chain((100 - w, y0 + 1), ((100 - w - 1, y0 - 8), (96, y0 - 14), (100, y0 - 21)),
                           ((104, y0 - 14), (100 + w + 1, y0 - 8), (100 + w, y0 + 1))))
        curl = poly(chain((100 - w + 0.5, y0 + 1), ((100 - w - 7, y0 + 2), (100 - w - 14, y0 - 4), (100 - w - 11, y0 - 11)),
                          ((100 - w - 9, y0 - 15), (100 - w - 4, y0 - 13), (100 - w - 3.5, y0 - 8)),
                          ((100 - w - 5.5, y0 - 8), (100 - w - 8, y0 - 5), (100 - w - 4, y0 - 1.5)), (100 - w + 0.5, y0 - 1.5)))
        band = stroke([(100 - w - 3, y0 + 3.5), (100 + w + 3, y0 + 3.5)], 3.2)
        f = unary_union([petal, curl, mirror(curl), band])
        return affinity.rotate(f, dirdeg, origin=(100, 100))

    terms = [fleur(0, L), fleur(180, L + 6), fleur(-90, L), fleur(90, L)]
    boss = Point(100, 100).buffer(9.5, 64)
    s.solid(unary_union(arms + terms + [boss]))
    s.fineCircles.append([100, 100, 4])
    return s.finish()


def rose_window():
    s = Sym('rose', 'Lux in tenebris lucet')
    ring(s, 89, 85.5)
    s.circles.append([100, 100, 41])
    s.fineCircles.append([100, 100, 37.5])
    for k in range(12):
        lan = pointed_arch(90.5, 109.5, 36, 56)  # in local coords, pointing up from the centre
        lan = affinity.translate(lan, 0, 0)
        lan = affinity.rotate(lan, 30 * k, origin=(100, 100))
        s.solid(lan, inset_by=2.2)
        # an oculus in the head of each light
        a = math.radians(-90 + 30 * k)
        s.fineCircles.append([round(100 + 54.5 * math.cos(a), 2), round(100 + 54.5 * math.sin(a), 2), 3.6])
        # cusped spandrel between the lights, near the rim
        b = math.radians(-90 + 30 * k + 15)
        s.dots.append([round(100 + 80 * math.cos(b), 2), round(100 + 80 * math.sin(b), 2), 1.1])
    six = foil(6, 16.5, 12.5)
    s.solid(six, inset_by=2)
    s.circles.append([100, 100, 6.5])
    for k in range(6):
        a = math.radians(-90 + 60 * k)
        s.dots.append([round(100 + 18.5 * math.cos(a), 2), round(100 + 18.5 * math.sin(a), 2), 1])
    return s.finish()


def chi_rho():
    s = Sym('chirho', 'In hoc signo vinces')
    ring(s, 88, 84.5, beads=60)
    s.fineCircles.append([100, 100, 81])
    W = 8.5
    cx, cy = 100, 106
    stem = stroke([(cx, 34), (cx, 168)], W)
    d = 46
    x1 = stroke([(cx - d, cy - d * 0.92), (cx + d, cy + d * 0.92)], W * 0.82)
    x2 = stroke([(cx + d, cy - d * 0.92), (cx - d, cy + d * 0.92)], W * 0.82)
    bowl_c = (cx + 1, 52)
    bowl = LineString(arc_pts(bowl_c[0], bowl_c[1], 19, -90, 90, 60)).buffer(W * 0.62 / 2, cap_style='flat')
    bowl = unary_union([bowl, stroke([(cx, 33 + 0.5), (cx + 1.5, 33)], 0.1), stroke([(cx, 71), (cx + 1.5, 71)], 0.1)])

    def serif(p, ang, ln=15, th=3):
        a = math.radians(ang)
        return stroke([(p[0] - ln / 2 * math.cos(a), p[1] - ln / 2 * math.sin(a)), (p[0] + ln / 2 * math.cos(a), p[1] + ln / 2 * math.sin(a))], th)

    serifs = [serif((cx, 168), 0, 18)]
    for sx, sy in [(-1, -1), (1, 1), (1, -1), (-1, 1)]:
        ex, ey = cx + sx * d, cy + sy * d * 0.92
        ang = math.degrees(math.atan2(sy * 0.92, sx)) + 90
        serifs.append(serif((ex, ey), ang, 14))
    s.solid(unary_union([stem, x1, x2, bowl] + serifs))
    a = glyph('Α', 52, 92, 24)
    o = glyph('Ω', 148, 92, 24)
    s.solid(a, inset=False)
    s.solid(o, inset=False)
    return s.finish()


def heart_shape(cx, cy, sc):
    pts = []
    for i in range(240):
        t = 2 * math.pi * i / 240
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * sc, cy - y * sc))
    return poly(pts)


def lancet_frame(s, xl=34, xr=166, ys=92, base=188, gap=4.5, k=0.58):
    outer = pointed_arch(xl, xr, ys, base, k)
    inner = pointed_arch(xl + gap, xr - gap, ys, base - gap, (k * (xr - xl) - gap) / (xr - xl - 2 * gap))
    s.line(outer.boundary, bold=True)
    s.line(inner.boundary)
    # cusping: a trefoil head tucked under the apex
    w = xr - xl
    apex_y = ys - w * math.sqrt(3) / 2


def sacred_heart():
    s = Sym('heart', 'Cor Jesu sacratissimum')
    lancet_frame(s)
    # cross above the flames
    cr = unary_union([stroke([(100, 18), (100, 46)], 3.6), stroke([(91.5, 27), (108.5, 27)], 3.6)])
    # three flames rising from the cleft
    def flame(dx, h, lean, w):
        b, y0 = 100 + dx, 86
        tip = (b + lean, y0 - h)
        return poly(chain((b - w, y0), ((b - w - 3, y0 - h * 0.35), (b - w * 0.2 + lean * 0.1, y0 - h * 0.55), tip),
                          ((b + w * 0.6 + lean * 0.7, y0 - h * 0.62), (b + w + 3, y0 - h * 0.35), (b + w, y0)), n=30))
    flames = [flame(-11, 24, -13, 5), flame(11, 24, 13, 5), flame(0, 38, 0, 6.5)]
    heart = heart_shape(100, 116, 2.55)
    # crown of thorns: a braided band across the upper heart
    def braid(phase):
        pts = []
        for i in range(161):
            t = 2 * math.pi * i / 160
            r = 1 + 0.05 * math.sin(9 * t + phase)
            pts.append((100 + 46 * r * math.cos(t), 104 + 9.5 * r * math.sin(t) + 2.2 * math.sin(9 * t + phase)))
        return LineString(pts)
    band = Polygon([(100 + 49 * math.cos(2 * math.pi * i / 160), 104 + 13 * math.sin(2 * math.pi * i / 160)) for i in range(160)]).difference(
        Polygon([(100 + 43 * math.cos(2 * math.pi * i / 160), 104 + 6.5 * math.sin(2 * math.pi * i / 160)) for i in range(160)]))
    front = band.intersection(Polygon([(0, 104), (200, 104), (200, 200), (0, 200)]))
    s.solid(cr)
    for f in flames:
        s.solid(f, inset_by=1.6)
    s.solid(heart, inset_by=2.4)
    # the wound
    wound = affinity.rotate(vesica(88, 128, 9, 13.5), -28, origin=(88, 128))
    s.solid(wound, inset=False)
    # thorns behind the heart are hidden by it; the front of the band covers the heart
    back_band = braid(0).difference(heart.buffer(1)).union(braid(math.pi).difference(heart.buffer(1)))
    s.line(back_band, bold=False)
    s.drawn.append(('solid', front.buffer(0.01), False, 0))
    s.drawn[-1] = ('line', LineString([]), False, 0)
    cover = front
    # draw the front braid over everything, hiding the heart outline beneath it
    s.drawn.append(('cover', cover, None, None))
    out = s
    for ph in (0, math.pi):
        out.line(braid(ph).intersection(Polygon([(0, 104), (200, 104), (200, 200), (0, 200)]).buffer(0)), bold=True)
    # thorn points
    for i in range(14):
        t = math.pi * (i + 0.5) / 14
        x, y = 100 + 47 * math.cos(t), 104 + 10.5 * math.sin(t)
        nx, ny = math.cos(t) / 46, math.sin(t) / 9.5
        nl = math.hypot(nx, ny)
        nx, ny = nx / nl, ny / nl
        sgn = 1 if i % 2 else -1
        out.line(LineString([(x, y), (x + nx * 4.5 + sgn * 1.5, y + ny * 4.5)]))
    return finish_with_cover(out)


def finish_with_cover(s):
    """Like Sym.finish but understands ('cover', geom) entries that hide earlier strokes without drawing."""
    items = []
    for kind, g, a, b in s.drawn:
        if kind == 'solid':
            items.append((g.boundary, g.buffer(-b, join_style='mitre').boundary if a else None, g))
        elif kind == 'line':
            if g.is_empty:
                continue
            items.append((g, None, None) if a else (None, g, None))
        elif kind == 'cover':
            items.append((None, None, g))
    for i, (bold, fine, cover) in enumerate(items):
        occl = unary_union([c for _, _, c in items[i + 1:] if c is not None])
        if not occl.is_empty:
            occl = occl.buffer(0.9)
            bold = bold.difference(occl) if bold is not None else None
            fine = fine.difference(occl) if fine is not None else None
        if bold is not None:
            s.paths += boundary_paths(bold)
        if fine is not None:
            s.fine += boundary_paths(fine)
    return {'name': s.name, 'caption': s.caption, 'paths': s.paths, 'fine': s.fine,
            'circles': s.circles, 'fineCircles': s.fineCircles, 'dots': s.dots}


def leaf(x, y, ang, length, width, bend=0.0):
    """A slender pointed feather from (x, y) towards angle `ang` (degrees, screen coords)."""
    a = math.radians(ang)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux
    tip = (x + ux * length, y + uy * length)
    def pt(t, side):
        return (x + ux * length * t + nx * side + nx * bend * length * t * t, y + uy * length * t + ny * side + ny * bend * length * t * t)
    l1, l2 = pt(0.3, width * 0.55), pt(0.75, width * 0.5)
    r1, r2 = pt(0.3, -width * 0.55), pt(0.75, -width * 0.5)
    return poly(chain((x + nx * width * 0.3, y + ny * width * 0.3), (l1, l2, tip), (r2, r1, (x - nx * width * 0.3, y - ny * width * 0.3)), n=20))


def dove():
    s = Sym('dove', 'Veni, Sancte Spiritus')
    ring(s)
    # wings raised in a V, each a fan of long primaries under a rounded covert
    def wing():
        sx, sy = 94, 101
        feathers = []
        for ang, ln, bend in ((194, 74, 0.06), (205, 77, 0.05), (217, 74, 0.04), (230, 66, 0.03), (243, 55, 0.02)):
            feathers.append(leaf(sx, sy, ang, ln, 12, bend))
        covert = poly(chain((98, 95), ((84, 80), (64, 68), (40, 64)), ((56, 78), (76, 96), (98, 112)), n=30))
        return feathers, covert
    fl, cl = wing()
    for f in fl:
        s.solid(f, inset=False)
    s.solid(cl, inset_by=1.8)
    for f in fl:
        s.solid(mirror(f), inset=False)
    s.solid(mirror(cl), inset_by=1.8)
    # tail: a single wedge with two quills
    tail = poly(chain((94, 80), (88, 52), ((94, 55), (106, 55), (112, 52)), (106, 80)))
    s.solid(tail, inset=False)
    s.line(LineString([(98, 78), (95, 56)]))
    s.line(LineString([(102, 78), (105, 56)]))
    body = poly(chain((100, 72), ((111, 80), (113, 102), (108, 118)), ((105, 124), (95, 124), (92, 118)), ((87, 102), (89, 80), (100, 72))))
    s.solid(body, inset_by=1.8)
    s.fineCircles.append([100, 131, 17.5])
    for ang in (90, 180, 0):
        a = math.radians(ang)
        s.line(LineString([(100 + 12.5 * math.cos(a), 131 + 12.5 * math.sin(a)), (100 + 17.5 * math.cos(a), 131 + 17.5 * math.sin(a))]))
    head = unary_union([Point(100, 130).buffer(8.4, 64), poly([(96.6, 136), (100, 145), (103.4, 136)])])
    s.solid(head, inset_by=1.6)
    s.dots += [[96.7, 129, 1.05], [103.3, 129, 1.05]]
    return finish_with_cover(s)


def chalice():
    s = Sym('chalice', 'Panis angelicus')
    lancet_frame(s)
    cup = poly(chain((70, 104), ((71, 126), (84, 136), (96, 140)), (104, 140), ((116, 136), (129, 126), (130, 104))))
    lip = stroke([(67, 103), (133, 103)], 3.4)
    stem = stroke([(100, 140), (100, 170)], 7)
    knop = poly([(100, 145), (111, 154), (100, 163), (89, 154)])
    collar1 = stroke([(92, 143.5), (108, 143.5)], 2.6)
    collar2 = stroke([(92, 165), (108, 165)], 2.6)
    foot = poly(chain((96, 168), ((92, 174), (78, 176), (66, 180)), (134, 180), ((122, 176), (108, 174), (104, 168))))
    base = stroke([(62, 181.5), (138, 181.5)], 3)
    s.solid(unary_union([cup, lip, stem, knop, collar1, collar2, foot, base]))
    # gothic arcading round the cup
    for x in (82, 91, 100, 109, 118):
        pa = pointed_arch(x - 3.6, x + 3.6, 112, 124)
        s.line(pa.intersection(cup.buffer(-3)).boundary if not pa.intersection(cup.buffer(-3)).is_empty else LineString([]))
    s.line(LineString([(73, 108), (127, 108)]))
    # the Host
    host = Point(100, 68).buffer(25, 96)
    s.solid(host, inset_by=2.6)
    for ch, x in (('I', 87.5), ('H', 100), ('S', 112.5)):
        s.solid(glyph(ch, x, 75, 14), inset=False)
    s.solid(unary_union([stroke([(100, 48), (100, 58)], 1.6), stroke([(96, 51.5), (104, 51.5)], 1.6)]), inset=False)
    return finish_with_cover(s)


def marian():
    s = Sym('marian', 'Ave Maria, gratia plena')
    ring(s)
    for k in range(12):
        a = math.radians(-90 + 30 * k)
        st = star(100 + 72 * math.cos(a), 100 + 72 * math.sin(a), 5.6)
        s.solid(st, inset=False)
    m = glyph('M', 100, 138, 58)
    a = glyph('A', 100, 138, 66)
    s.solid(m, inset_by=1.7)
    s.solid(a, inset_by=1.7)
    # crown
    cx, by = 100, 66
    rim = stroke([(cx - 24, by), (cx + 24, by)], 4)
    pts = [(cx - 24, by - 2)]
    for i, (dx, h) in enumerate([(-24, 14), (-12, 9), (0, 18), (12, 9), (24, 14)]):
        pts.append((cx + dx, by - h))
        if i < 4:
            pts.append((cx + dx + 6, by - 5))
    pts.append((cx + 24, by - 2))
    crown = unary_union([poly(pts + [(cx + 24, by), (cx - 24, by)]), rim] + [Point(cx + dx, by - h - 2.4).buffer(2.3, 32) for dx, h in [(-24, 14), (0, 18), (24, 14)]])
    s.solid(crown, inset_by=1.5)
    return finish_with_cover(s)


def anchor():
    s = Sym('anchor', 'Spes nostra')
    ring(s, 88, 84.5, beads=0)
    qf = foil(4, 0.1, 0.1)
    shank = stroke([(100, 52), (100, 158)], 7)
    eye = Point(100, 42).buffer(10, 64).difference(Point(100, 42).buffer(5.2, 64))
    stock = stroke([(70, 64), (130, 64)], 6.5)
    stock_ends = [Point(70, 64).buffer(4.6, 32), Point(130, 64).buffer(4.6, 32)]
    arm_c = (100, 118)
    arms = LineString(arc_pts(arm_c[0], arm_c[1], 44, 18, 162, 80)).buffer(3.6, cap_style='flat')

    def fluke(sign):
        a = math.radians(18 if sign > 0 else 162)
        tx, ty = arm_c[0] + 44 * math.cos(a), arm_c[1] + 44 * math.sin(a)
        # arrow-head barb pointing up and outwards
        return poly([(tx - sign * 6, ty + 3), (tx + sign * 7, ty - 15), (tx + sign * 5, ty + 5)])
    crown = poly(chain((93, 160), ((96, 166), (104, 166), (107, 160))))
    s.solid(unary_union([shank, eye, stock] + stock_ends + [arms, fluke(1), fluke(-1), crown, Point(100, 158).buffer(5.5)]))
    return finish_with_cover(s)


def main():
    global FONT, GREEK
    out_json, out_svg, font = sys.argv[1], sys.argv[2], sys.argv[3]
    FONT = TTFont(font)
    GREEK = TTFont(sys.argv[4]) if len(sys.argv) > 4 else None
    syms = [dove(), sacred_heart(), cross_fleury(), chi_rho(), marian(), rose_window(), anchor(), chalice()]
    json.dump(syms, open(out_json, 'w'), separators=(',', ':'))
    cells = []
    for i, sy in enumerate(syms):
        g = [f'<g transform="translate({i * 210},0)"><rect width="200" height="200" fill="#15131A"/>',
             '<g fill="none" stroke="#EEE7DA" stroke-linecap="round" stroke-linejoin="round">']
        g += [f'<path d="{d}" stroke-width="1.25"/>' for d in sy['paths']]
        g += [f'<circle cx="{c[0]}" cy="{c[1]}" r="{c[2]}" stroke-width="1.25"/>' for c in sy['circles']]
        g += [f'<path d="{d}" stroke-width="0.6" stroke-opacity="0.75"/>' for d in sy['fine']]
        g += [f'<circle cx="{c[0]}" cy="{c[1]}" r="{c[2]}" stroke-width="0.6" stroke-opacity="0.75"/>' for c in sy['fineCircles']]
        g.append('</g>')
        g += [f'<circle cx="{c[0]}" cy="{c[1]}" r="{c[2]}" fill="#EEE7DA"/>' for c in sy['dots']]
        g.append('</g>')
        cells.append(''.join(g))
    open(out_svg, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{len(syms) * 210 * 2}" height="400" viewBox="0 0 {len(syms) * 210} 200">{"".join(cells)}</svg>')
    print('ok', [len(s['paths']) + len(s['fine']) for s in syms], sum(len(json.dumps(s)) for s in syms))


if __name__ == '__main__':
    main()
