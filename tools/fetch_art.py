"""Download public-domain manuscript illuminations from Wikimedia Commons for Ora's Today screen.
Writes art/<key>.jpg (1000px wide) and art/manifest.json with attribution."""
import json, os, re, sys, time, urllib.parse, urllib.request

UA = "OraApp/0.1 (https://prayora.co; contact via GitHub liamth82/prayora)"
API = "https://commons.wikimedia.org/w/api.php"

QUERIES = {
    "advent": "Très Riches Heures Annunciation",
    "christmas": "Très Riches Heures Nativity",
    "epiphany": "Très Riches Heures Adoration of the Magi",
    "lent": "Très Riches Heures Temptation of Christ",
    "holyweek": "Très Riches Heures Crucifixion",
    "easter": "Book of Hours Resurrection of Christ miniature",
    "ascension": "Book of Hours Ascension miniature",
    "pentecost": "Très Riches Heures Pentecost",
    "marian": "Book of Hours Virgin and Child miniature",
    "martyr": "File:Zanino di Pietro - Book of Hours - Walters W322 - Obverse Detail.jpg",
    "allsaints": "Book of Hours All Saints miniature",
    "souls": "Book of Hours Office of the Dead funeral miniature",
    "angels": "Très Riches Heures Saint Michael",
    "apostles": "Book of Hours Saint Andrew apostle miniature",
    "default": "Book of Hours Christ in Majesty miniature",
    "m01": "Très Riches Heures janvier", "m02": "Très Riches Heures février", "m03": "Très Riches Heures mars",
    "m04": "Très Riches Heures avril", "m05": "Très Riches Heures mai", "m06": "Très Riches Heures juin",
    "m07": "Très Riches Heures juillet", "m08": "Très Riches Heures août", "m09": "Très Riches Heures septembre",
    "m10": "Très Riches Heures octobre", "m11": "Très Riches Heures novembre", "m12": "Très Riches Heures décembre",
}

def get(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return json.load(urllib.request.urlopen(req, timeout=30))

def strip_html(t):
    return re.sub(r"<[^>]+>", "", t or "").strip()

def main(out):
    os.makedirs(out, exist_ok=True)
    manifest = {}
    for key, q in QUERIES.items():
        common = {"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size", "iiurlwidth": 1000}
        if q.startswith("File:"):
            r = get({**common, "titles": q})
        else:
            r = get({**common, "generator": "search", "gsrsearch": q + " filetype:bitmap", "gsrnamespace": 6, "gsrlimit": 10})
        pages = sorted(r.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
        chosen = None
        for p in pages:
            ii = (p.get("imageinfo") or [{}])[0]
            md = ii.get("extmetadata", {})
            lic = (md.get("LicenseShortName", {}).get("value", "") + " " + md.get("License", {}).get("value", "")).lower()
            if ii.get("mime") != "image/jpeg" or not ("public domain" in lic or "pd" in lic or "cc0" in lic):
                continue
            if ii.get("width", 0) < 600:
                continue
            chosen = (p, ii, md, lic)
            break
        if not chosen:
            print("none for", key); continue
        p, ii, md, lic = chosen
        req = urllib.request.Request(ii["thumburl"], headers={"User-Agent": UA})
        data = urllib.request.urlopen(req, timeout=60).read()
        with open(os.path.join(out, key + ".jpg"), "wb") as f:
            f.write(data)
        manifest[key] = {
            "file": key + ".jpg", "title": p["title"].replace("File:", ""),
            "description": strip_html(md.get("ImageDescription", {}).get("value", ""))[:300],
            "artist": strip_html(md.get("Artist", {}).get("value", ""))[:200],
            "credit": strip_html(md.get("Credit", {}).get("value", ""))[:200],
            "license": md.get("LicenseShortName", {}).get("value", ""),
            "source": ii.get("descriptionurl", ""),
            "w": ii.get("thumbwidth"), "h": ii.get("thumbheight"),
        }
        print("ok", key, p["title"])
        time.sleep(1)
    with open(os.path.join(out, "manifest.json"), "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main(sys.argv[1])
