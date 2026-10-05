"""Build Ordinary Form daily files: feast, season, colour and readings with Douay-Rheims text.

Usage: python build_of.py CRA_DIR DRB_JSON OUT_DIR
  CRA_DIR  = checkout of github.com/acupofjose/catholic-readings-api (MIT; reading references)
  DRB_JSON = EntireBible-DR.json from github.com/xxruyle/Bible-DouayRheims (MIT; public-domain text)
"""
import json, os, re, sys, glob

BOOKS = {
    "Isaiah": "Isaias", "1 Samuel": "1 Kings", "2 Samuel": "2 Kings", "1 Kings": "3 Kings", "2 Kings": "4 Kings",
    "1 Chronicles": "1 Paralipomenon", "2 Chronicles": "2 Paralipomenon", "Ezra": "1 Esdras", "Nehemiah": "2 Esdras",
    "Tobit": "Tobias", "Song of Songs": "Canticles", "Song of Solomon": "Canticles", "Sirach": "Ecclesiasticus",
    "Jeremiah": "Jeremias", "Ezekiel": "Ezechiel", "Hosea": "Osee", "Obadiah": "Abdias", "Jonah": "Jonas",
    "Micah": "Micheas", "Habakkuk": "Habacuc", "Zephaniah": "Sophonias", "Haggai": "Aggeus", "Zechariah": "Zacharias",
    "Malachi": "Malachias", "1 Maccabees": "1 Machabees", "2 Maccabees": "2 Machabees", "Revelation": "Apocalypse",
    "Psalm": "Psalms", "Phiippians": "Philippians", "Sirarch": "Ecclesiasticus", "Psalms": "Psalms", "Joshua": "Josue", "Qoheleth": "Ecclesiastes",
}
LABELS = {"firstReading": "First Reading", "psalm": "Responsorial Psalm", "secondReading": "Second Reading", "gospel": "Gospel"}
ORDER = ["firstReading", "psalm", "secondReading", "gospel"]


def heb_to_vulg_psalm(n, v):
    """Map a Hebrew-numbered psalm verse (as in the lectionary) to Vulgate/Douay-Rheims (chapter, verse).
    Both count psalm titles as verses, so only the chapter splits and merges need handling."""
    if n <= 8: return n, v
    if n == 9: return 9, v
    if n == 10: return 9, v + 21
    if n <= 113: return n - 1, v
    if n == 114: return 113, v
    if n == 115: return 113, v + 8
    if n == 116: return (114, v) if v <= 9 else (115, v)
    if n <= 146: return n - 1, v
    if n == 147: return (146, v) if v <= 11 else (147, v)
    return n, v


def clean(t):
    return re.sub(r"\s+", " ", t.replace("*", "")).strip()


def parse_ref(ref):
    """'Philippians 4:12-14, 19-20' -> ('Philippians', [(4,12,4,14),(4,19,4,20)])"""
    ref = ref.split(" or ")[0].strip()
    m = re.match(r"^((?:[1-3] )?[A-Za-z][A-Za-z ]*?)\s+(\d.*)$", ref)
    if not m:
        return None, []
    book, rest = m.group(1).strip(), m.group(2)
    rest = rest.replace("—", "-").replace("–", "-")
    spans, chap = [], None
    if book in ("Philemon", "2 John", "3 John", "Jude", "Obadiah") and ":" not in rest:
        chap = 1
    for part in [p.strip() for p in re.split(r",|;| and ", rest) if p.strip()]:
        part = re.sub(r"(?<=\d)[a-z]+", "", part)  # drop verse letters 1b, 10a
        part = re.sub(r"[^0-9:\-]", "", part)
        if not part or not part[0].isdigit():
            continue
        if ":" in part and "-" in part:
            a, b = part.split("-", 1)
            if ":" in a:
                c1, v1 = map(int, a.split(":"))
            else:
                c1, v1 = chap, int(a)
            if ":" in b:
                c2, v2 = map(int, b.split(":"))
            else:
                c2, v2 = c1, int(b)
            chap = c2
        elif ":" in part:
            c1, v1 = map(int, part.split(":")); c2, v2 = c1, v1; chap = c1
        elif "-" in part:
            bits = part.split("-")
            a, b = bits[0], bits[-1]
            c1 = c2 = chap; v1, v2 = int(a), int(b)
        else:
            c1 = c2 = chap; v1 = v2 = int(part)
        if c1 is None:
            return None, []
        spans.append((c1, v1, c2, v2))
    return book, spans


def verses_for(bible, book, spans):
    drbook = BOOKS.get(book, book)
    if drbook not in bible:
        return None, []
    out = []
    psalm = drbook == "Psalms"
    for c1, v1, c2, v2 in spans:
        if psalm:
            for v in range(v1, v2 + 1):
                vc, vv = heb_to_vulg_psalm(c1, v)
                t = bible["Psalms"].get(str(vc), {}).get(str(vv))
                if t: out.append([f"{vc}:{vv}", clean(t)])
            continue
        for c in range(c1, c2 + 1):
            ch = bible[drbook].get(str(c), {})
            lo = v1 if c == c1 else 1
            hi = v2 if c == c2 else max(map(int, ch.keys() or [0]))
            for v in range(lo, hi + 1):
                t = ch.get(str(v))
                if t: out.append([f"{c}:{v}" if c1 != c2 else str(v), clean(t)])
    return drbook, out


def colour(season, name, ctype):
    n = (name or "").lower()
    s0 = (season or "").lower()
    if "lent" in s0 or "holy week" in s0:
        if "palm sunday" in n or "good friday" in n or "passion" in n: return "red"
        if "holy thursday" in n or ctype in ("SOLEMNITY", "FEAST"): return "white"
        if "4th sunday of lent" in n: return "rose"
        return "violet"
    red = ("martyr" in n or "apostle" in n or "evangelist" in n or "pentecost" in n or "passion" in n
           or "good friday" in n or "holy cross" in n or "holy innocents" in n or "stephen" in n)
    if "john, apostle and evangelist" in n: red = False
    if red: return "red"
    if "palm sunday" in n: return "red"
    if "holy thursday" in n or "lord's supper" in n: return "white"
    if "gaudete" in n or ("3rd sunday of advent" in n): return "rose"
    if "laetare" in n or ("4th sunday of lent" in n): return "rose"
    if "all souls" in n or "faithful departed" in n: return "violet"
    if ctype in ("SOLEMNITY", "FEAST", "MEMORIAL") or "christmas" in n or "easter" in n: return "white"
    s = (season or "").lower()
    if "advent" in s or "lent" in s: return "violet"
    if "christmas" in s or "easter" in s: return "white"
    return "green"


def main(cra, drb, out):
    bible = json.load(open(drb))
    os.makedirs(out, exist_ok=True)
    n = bad = 0
    for path in sorted(glob.glob(os.path.join(cra, "readings", "*", "*.json"))):
        r = json.load(open(path))
        date = r["date"]
        if date < "2026-09-01":
            continue
        year, md = date[:4], date[5:]
        cal_path = os.path.join(cra, "liturgical-calendar", year, md + ".json")
        cel = json.load(open(cal_path)).get("celebration", {}) if os.path.exists(cal_path) else {}
        readings = []
        for key in ORDER:
            ref = r.get("readings", {}).get(key)
            if not ref:
                continue
            try:
                book, spans = parse_ref(ref)
            except Exception:
                book, spans = None, []
            drbook, verses = verses_for(bible, book, spans) if book else (None, [])
            if not verses:
                bad += 1
                print("no text", date, key, ref, file=sys.stderr)
            readings.append({"key": key, "label": LABELS[key], "ref": ref, "drBook": drbook, "verses": verses})
        season = r.get("season", "")
        title = cel.get("name") or season
        data = {
            "form": "OF", "date": date, "title": title, "rank": cel.get("type", ""), "season": season,
            "color": colour(season, cel.get("name"), cel.get("type")), "readings": readings,
        }
        with open(os.path.join(out, date + ".json"), "w") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        n += 1
    print(f"built {n} days, {bad} readings without text")


if __name__ == "__main__":
    main(*sys.argv[1:4])
