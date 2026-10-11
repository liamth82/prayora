"""Search the Project Gutenberg catalogue by title and download chosen texts by id (and archive.org texts by identifier)."""
import csv, io, json, os, sys, time, urllib.request

UA = {"User-Agent": "OraApp/0.1 (https://prayora.co)"}
OUT = sys.argv[1]
KEYWORDS_OLD = ["devout life", "little flowers", "unknowing", "spiritual combat", "interior castle", "dark night",
            "ascent of mount carmel", "story of a soul", "abandonment", "rule of", "patrick", "desert", "fathers",
            "presence of god", "way of perfection", "love of god", "francis of assisi", "scupoli", "julian of norwich",
            "revelations of divine love"]
KEYWORDS_DONE = ["summa theologica", "catechism", "city of god", "apostolic fathers", "didache", "council of trent", "baltimore", "chrysostom", "homilies", "aquinas", "augustine", "cyprian", "ambrose", "gregory the great", "athanasius", "francis de sales", "liguori", "catholic doctrine", "christian doctrine"]
KEYWORDS = []
IDS = {"baltimore2": 14552, "baltimore_explained": 14554, "summa1": 17611, "summa12": 17897, "summa22": 18755, "summa3": 19950, "cityofgod1": 45304, "cityofgod2": 45305, "apostolic": 77576}
ARCHIVE = {}

def fetch(url, timeout=120):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()

os.makedirs(OUT, exist_ok=True)
found = {}
try:
    cat = fetch("https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv", 300).decode("utf-8", "replace")
    for row in csv.DictReader(io.StringIO(cat)):
        if row.get("Language") != "en" or row.get("Type") != "Text": continue
        t = row.get("Title", "").lower()
        for k in KEYWORDS:
            if k in t:
                found.setdefault(k, []).append({"id": row["Text#"], "title": row["Title"][:120], "authors": row.get("Authors", "")[:160]})
except Exception as e:
    print("catalogue failed", e)

# Schaff's Fathers at CCEL: try the plain-text URL patterns and keep whichever answers.
CCEL = []
probe = {}
for vol in CCEL:
    for url in (f"https://ccel.org/ccel/s/schaff/{vol}/cache/{vol}.txt", f"https://www.ccel.org/ccel/s/schaff/{vol}/cache/{vol}.txt",
                f"https://ccel.org/ccel/schaff/{vol}/cache/{vol}.txt", f"https://www.ccel.org/ccel/schaff/{vol}.txt"):
        try:
            data = fetch(url, 180)
            if len(data) > 100000 and b"<html" not in data[:500].lower():
                open(os.path.join(OUT, "ccel_" + vol + ".txt"), "wb").write(data); probe[vol] = url; print("ccel ok", url, len(data)); break
            probe.setdefault(vol + "_bad", []).append([url, len(data), data[:80].decode("utf-8", "replace")])
        except Exception as e:
            probe.setdefault(vol + "_err", []).append([url, str(e)])

for key, gid in IDS.items():
    for url in (f"https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.txt", f"https://www.gutenberg.org/files/{gid}/{gid}-0.txt"):
        try:
            open(os.path.join(OUT, key + ".txt"), "wb").write(fetch(url)); print("ok", key, gid); break
        except Exception as e:
            print("fail", key, url, e)
    time.sleep(2)
for key, ident in ARCHIVE.items():
    try:
        open(os.path.join(OUT, key + ".txt"), "wb").write(fetch(f"https://archive.org/download/{ident}/{ident}_djvu.txt", 180)); print("ok", key, ident)
    except Exception as e:
        print("archive fail", key, e)
