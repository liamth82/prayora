"""Download a public-domain painting for each saint in saints_content.py from Wikimedia Commons.
Writes saints/img/MM-DD.jpg and saints/images.json."""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from fetch_art import get, strip_html, UA
import urllib.request
from saints_content import SAINTS

def main(out):
    os.makedirs(os.path.join(out, "img"), exist_ok=True)
    images = {}
    for md, s in SAINTS.items():
        q = s.get("query")
        if not q: continue
        r = get({"action": "query", "format": "json", "generator": "search", "gsrsearch": q + " filetype:bitmap",
                 "gsrnamespace": 6, "gsrlimit": 10, "prop": "imageinfo", "iiprop": "url|extmetadata|mime|size", "iiurlwidth": 900})
        pages = sorted(r.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
        for p in pages:
            ii = (p.get("imageinfo") or [{}])[0]; md_ = ii.get("extmetadata", {})
            lic = (md_.get("LicenseShortName", {}).get("value", "") + " " + md_.get("License", {}).get("value", "")).lower()
            if ii.get("mime") != "image/jpeg" or not ("public domain" in lic or "pd" in lic or "cc0" in lic) or ii.get("width", 0) < 500:
                continue
            data = urllib.request.urlopen(urllib.request.Request(ii["thumburl"], headers={"User-Agent": UA}), timeout=60).read()
            open(os.path.join(out, "img", md + ".jpg"), "wb").write(data)
            images[md] = {"file": "img/" + md + ".jpg", "title": p["title"].replace("File:", ""),
                          "artist": strip_html(md_.get("Artist", {}).get("value", ""))[:160],
                          "license": md_.get("LicenseShortName", {}).get("value", ""), "source": ii.get("descriptionurl", ""),
                          "w": ii.get("thumbwidth"), "h": ii.get("thumbheight")}
            print("ok", md, p["title"]); break
        else:
            print("none", md)
        time.sleep(1)
    json.dump(images, open(os.path.join(out, "images.json"), "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main(sys.argv[1])
