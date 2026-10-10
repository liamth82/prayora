"""Build Ora's library of public-domain sacred art.

Finds well-known religious paintings on Wikidata (famous = many Wikipedia sitelinks), keeps those whose
Commons image is public domain, tags each by liturgical season and theme from its title and what it
depicts, and downloads a 900px copy.

Writes:
  art/lib/<QID>.jpg          the images
  art/library.json           [{id, file, title, artist, year, collection, tags, w, h, source, license}]
  art/lib/_sheet.jpg         a numbered contact sheet for reviewing the selection
  art/lib/_report.txt        what was kept and dropped, and why

Usage: python3 tools/fetch_art_library.py art [max_items]
Re-running keeps existing downloads. tools/art_exclude.txt lists QIDs to leave out (one per line).
"""
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw

UA = "OraApp/0.2 (https://prayora.co; GitHub liamth82/prayora)"
SPARQL = "https://query.wikidata.org/sparql"
COMMONS = "https://commons.wikimedia.org/w/api.php"

# Paintings (Q3305213) by artists who died before 1925, with an image, that are religious art (genre
# Q2864737) or depict Jesus (Q302) or the Virgin Mary (Q345). Sitelinks is a fair proxy for renown.
QUERY = """
SELECT ?item ?itemLabel ?img ?sl (SAMPLE(?creatorLabel) AS ?artist) (MIN(YEAR(?inception)) AS ?year)
       (SAMPLE(?collLabel) AS ?collection) (GROUP_CONCAT(DISTINCT ?depLabel; separator="|") AS ?depicts)
WHERE {
  { ?item wdt:P136 wd:Q2864737 } UNION { ?item wdt:P180 wd:Q302 } UNION { ?item wdt:P180 wd:Q345 }
  ?item wdt:P31 wd:Q3305213; wdt:P18 ?img; wikibase:sitelinks ?sl.
  FILTER(?sl >= %(min_sl)d)
  ?item wdt:P170 ?creator. ?creator wdt:P570 ?died. FILTER(YEAR(?died) < 1925)
  OPTIONAL { ?creator rdfs:label ?creatorLabel. FILTER(LANG(?creatorLabel) = "en") }
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P195 ?coll. ?coll rdfs:label ?collLabel. FILTER(LANG(?collLabel) = "en") }
  OPTIONAL { ?item wdt:P180 ?dep. ?dep rdfs:label ?depLabel. FILTER(LANG(?depLabel) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
GROUP BY ?item ?itemLabel ?img ?sl
ORDER BY DESC(?sl)
LIMIT 900
"""

# Subjects left out of a prayer app's daily picture, however fine the painting.
AVOID = ["venus", "leda", "susanna", "bathsheba", " lot ", "lot and his", "judith", "salome", "holofernes",
         "adam and eve", "last judgment", "last judgement", "massacre", " hell ", "sebastian", "penitent",
         "drunkenness", "noah", "temptation of st", "temptation of saint", "garden of earthly", "bacchus",
         "danaë", "danae", "nude", "naked", "flaying", "martyrdom", "beheading", "decapitation", "triumph of death",
         "dead christ", "christ in the tomb", "slaughter", "lucretia", "magdalene", "satan", "demon", "devil"]

# Liturgical tags from title and depicted subjects. Order matters only for readability.
RULES = [
    ("advent", ["annunciation", "visitation", "john the baptist", "isaiah", "zechariah", "zacharias", "elizabeth"]),
    ("christmas", ["nativity of christ", "nativity of jesus", "the nativity", "nativity", "adoration of the shepherds",
                   "adoration of the child", "holy family", "flight into egypt", "rest on the flight", "presentation in the temple",
                   "presentation of christ", "circumcision"]),
    ("epiphany", ["magi", "adoration of the kings", "three kings", "baptism of christ", "wedding at cana", "marriage at cana"]),
    ("lent", ["temptation of christ", "christ in the desert", "wilderness", "prodigal", "lazarus", "samaritan",
              "woman taken in adultery", "healing", "blind", "transfiguration", "tribute money", "cleansing of the temple",
              "moneychangers", "money changers", "christ and the woman"]),
    ("holyweek", ["crucifixion", "on the cross", "crucified", "deposition", "descent from the cross", "lamentation", "pietà",
                  "pieta", "entombment", "last supper", "entry into jerusalem", "agony in the garden", "ecce homo",
                  "carrying the cross", "christ carrying", "road to calvary", "way to calvary", "flagellation", "crowning with thorns",
                  "man of sorrows", "betrayal", "kiss of judas", "arrest of christ", "washing of the feet", "christ before"]),
    ("easter", ["resurrection", "risen", "noli me tangere", "emmaus", "incredulity", "doubting thomas", "christ appearing",
                "harrowing", "three marys at the tomb", "women at the tomb"]),
    ("ascension", ["ascension"]),
    ("pentecost", ["pentecost", "descent of the holy spirit", "holy spirit"]),
    ("marian", ["madonna", "virgin", "mary", "assumption", "coronation of the virgin", "immaculate", "our lady", "theotokos"]),
    ("angels", ["angel", "archangel", "michael", "raphael", "gabriel", "tobias", "guardian"]),
    ("allsaints", ["all saints", "adoration of the lamb", "mystic lamb", "paradise", "communion of saints", "glory"]),
    ("saints", ["saint", " st.", " st ", "apostle", "evangelist", "peter", "paul", "francis", "jerome", "augustine",
                "dominic", "catherine", "george", "martin", "anthony", "benedict", "ignatius", "teresa"]),
    ("ordinary", ["christ", "jesus", "parable", "miracle", "calling of", "sermon", "loaves", "storm on the sea",
                  "sea of galilee", "fishes", "trinity", "god the father", "good shepherd", "light of the world", "pilgrim"]),
]


def get(url, params=None, accept="application/json"):
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:  # rate limits and the odd timeout
            print("retry", attempt, e)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("failed " + url)


def tags_for(text):
    t = " " + text.lower() + " "
    out = []
    for tag, words in RULES:
        if any(w in t for w in words):
            out.append(tag)
    # "nativity of the virgin" is a Marian feast, not Christmas
    if "nativity of the virgin" in t or "birth of the virgin" in t or "nativity of mary" in t:
        out = [x for x in out if x != "christmas"] + (["marian"] if "marian" not in out else [])
    return out


def commons_info(filenames):
    """License, size and page for Commons files, 40 at a time."""
    info = {}
    for i in range(0, len(filenames), 40):
        chunk = filenames[i:i + 40]
        r = json.loads(get(COMMONS, {"action": "query", "format": "json", "prop": "imageinfo",
                                     "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 900,
                                     "titles": "|".join("File:" + f for f in chunk)}))
        norm = {n["to"]: n["from"] for n in r.get("query", {}).get("normalized", [])}
        for p in r.get("query", {}).get("pages", {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            md = ii.get("extmetadata", {})
            title = p.get("title", "")
            key = norm.get(title, title).replace("File:", "")
            info[key] = {
                "thumb": ii.get("thumburl"), "w": ii.get("width", 0), "h": ii.get("height", 0), "mime": ii.get("mime"),
                "page": ii.get("descriptionurl", ""),
                "license": md.get("LicenseShortName", {}).get("value", ""),
                "lic": (md.get("LicenseShortName", {}).get("value", "") + " " + md.get("License", {}).get("value", "")).lower(),
            }
        time.sleep(1)
    return info


def main(out, max_items=220):
    lib = os.path.join(out, "lib")
    os.makedirs(lib, exist_ok=True)
    exclude = set()
    ex_path = os.path.join(os.path.dirname(__file__), "art_exclude.txt")
    if os.path.exists(ex_path):
        exclude = {l.split("#")[0].strip() for l in open(ex_path) if l.split("#")[0].strip()}

    rows = []
    for min_sl in (12, 8):
        r = json.loads(get(SPARQL, {"query": QUERY % {"min_sl": min_sl}, "format": "json"}, "application/sparql-results+json"))
        rows = r["results"]["bindings"]
        print("sparql rows", len(rows), "min sitelinks", min_sl)
        if len(rows) >= max_items * 2:
            break

    report, cand, seen_img = [], [], set()
    for b in rows:
        qid = b["item"]["value"].rsplit("/", 1)[-1]
        title = b.get("itemLabel", {}).get("value", qid)
        img = urllib.parse.unquote(b["img"]["value"].rsplit("/", 1)[-1])
        dep = b.get("depicts", {}).get("value", "")
        text = f"{title} | {dep}"
        low = " " + text.lower() + " "
        if qid in exclude:
            report.append(f"- {qid} excluded by list: {title}"); continue
        if re.match(r"^Q\d+$", title):
            report.append(f"- {qid} no English title"); continue
        if any(w in low for w in AVOID):
            report.append(f"- {qid} avoided subject: {title}"); continue
        if img in seen_img:
            continue
        tags = tags_for(text)
        if not tags:
            report.append(f"- {qid} no liturgical tag: {title} [{dep[:80]}]"); continue
        seen_img.add(img)
        cand.append({"id": qid, "img": img, "title": title, "artist": b.get("artist", {}).get("value", ""),
                     "year": b.get("year", {}).get("value", ""), "collection": b.get("collection", {}).get("value", ""),
                     "tags": tags, "sl": int(b["sl"]["value"])})

    info = commons_info([c["img"] for c in cand[: max_items * 2]])
    kept = []
    for c in cand[: max_items * 2]:
        i = info.get(c["img"]) or info.get(c["img"].replace("_", " "))
        if not i or not i.get("thumb"):
            report.append(f"- {c['id']} no Commons info: {c['img']}"); continue
        if i["mime"] not in ("image/jpeg", "image/png", "image/tiff"):
            report.append(f"- {c['id']} mime {i['mime']}"); continue
        if not any(k in i["lic"] for k in ("public domain", "pd", "cc0")):
            report.append(f"- {c['id']} licence '{i['license']}': {c['title']}"); continue
        if not i["w"] or not i["h"]:
            continue
        ratio = i["w"] / i["h"]
        if ratio < 0.42 or ratio > 2.1:
            report.append(f"- {c['id']} shape {ratio:.2f}: {c['title']}"); continue
        c.update({"thumb": i["thumb"], "source": i["page"], "license": i["license"] or "Public domain"})
        kept.append(c)
        if len(kept) >= max_items:
            break

    entries = []
    for c in kept:
        path = os.path.join(lib, c["id"] + ".jpg")
        if not os.path.exists(path):
            try:
                data = get(c["thumb"], accept="image/*")
                im = Image.open(io.BytesIO(data)).convert("RGB")
                if im.width > 900:
                    im = im.resize((900, round(im.height * 900 / im.width)), Image.LANCZOS)
                im.save(path, "JPEG", quality=82, optimize=True, progressive=True)
                time.sleep(0.5)
            except Exception as e:
                report.append(f"- {c['id']} download failed: {e}"); continue
        with Image.open(path) as im:
            w, h = im.size
        entries.append({"id": c["id"], "file": "lib/" + c["id"] + ".jpg", "title": c["title"], "artist": c["artist"],
                        "year": c["year"], "collection": c["collection"], "tags": c["tags"], "w": w, "h": h,
                        "source": c["source"], "license": c["license"]})
        report.append(f"+ {c['id']} [{','.join(c['tags'])}] {c['title']} — {c['artist']} ({c['year']})")

    with open(os.path.join(out, "library.json"), "w") as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)
    with open(os.path.join(lib, "_report.txt"), "w") as f:
        counts = {}
        for e in entries:
            for t in e["tags"]:
                counts[t] = counts.get(t, 0) + 1
        f.write(f"kept {len(entries)}\n" + json.dumps(counts) + "\n\n" + "\n".join(report) + "\n")

    # contact sheet: 12 across, numbered by position in library.json
    cell, cols = 150, 12
    rows_n = (len(entries) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, max(1, rows_n) * (cell + 16)), (20, 18, 24))
    d = ImageDraw.Draw(sheet)
    for n, e in enumerate(entries):
        with Image.open(os.path.join(out, e["file"])) as im:
            im.thumbnail((cell - 6, cell - 6))
            x, y = (n % cols) * cell, (n // cols) * (cell + 16)
            sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
            d.text((x + 4, y + cell), f"{n} {e['id']}", fill=(220, 210, 190))
    sheet.save(os.path.join(lib, "_sheet.jpg"), "JPEG", quality=70)
    print("kept", len(entries))


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 220)
