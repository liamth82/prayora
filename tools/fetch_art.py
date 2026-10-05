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
    "martyr": "Book of Hours martyrdom of saint miniature",
    "allsaints": "Très Riches Heures All Saints",
    "souls": "Office of the Dead Book of Hours miniature",
    "angels": "Très Riches Heures Saint Michael",
    "apostles": "Book of Hours Saint Peter miniature",
    "default": "Très Riches Heures",
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
        r = get({"action": "query", "format": "json", "generator": "search", "gsrsearch": q + " filetype:bitmap",
                 "gsrnamespace": 6, "gsrlimit": 10, "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size",
                 "iiurlwidth": 1000})
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
