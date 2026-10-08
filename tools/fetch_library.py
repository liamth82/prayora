"""Find and download public-domain spiritual classics (Project Gutenberg via gutendex; archive.org search for others).
Writes library/raw/catalog.json (all candidates with translators) and library/raw/<key>.txt for the top English match."""
import json, os, sys, time, urllib.parse, urllib.request

UA = {"User-Agent": "OraApp/0.1 (https://prayora.co)"}
SEARCHES = {
    "devout": "devout life",
    "soul": "story of a soul",
    "flowers": "little flowers",
    "cloud": "unknowing",
    "combat": "spiritual combat",
    "interiorcastle": "interior castle",
    "darknight": "dark night soul cross",
    "ascent": "ascent of mount carmel",
    "patrick": "patrick",
    "benedict2": "rule benedict",
    "philothea": "love of god sales",
    "garden": "garden of the soul",
}
ARCHIVE = {  # key: archive.org identifier (plain-text OCR)
    "desert2": "ParadiseOfTheHolyFathersV2",
}

def get(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))

def main(out):
    os.makedirs(out, exist_ok=True)
    catalog = {}
    for key, q in SEARCHES.items():
        try:
            r = get("https://gutendex.com/books/?languages=en&search=" + urllib.parse.quote(q))
            r["results"] = sorted(r.get("results", []), key=lambda b: -b.get("download_count", 0))
        except Exception as e:
            print("search failed", key, e); continue
        cands = []
        for b in r.get("results", [])[:6]:
            fmts = b.get("formats", {})
            txt = next((u for k, u in fmts.items() if k.startswith("text/plain") and not u.endswith(".zip")), None)
            cands.append({"id": b["id"], "title": b["title"],
                          "authors": [(a["name"], a.get("birth_year"), a.get("death_year")) for a in b.get("authors", [])],
                          "translators": [(a["name"], a.get("birth_year"), a.get("death_year")) for a in b.get("translators", [])],
                          "txt": txt, "downloads": b.get("download_count")})
        catalog[key] = cands
        if cands and cands[0]["txt"]:
            try:
                data = urllib.request.urlopen(urllib.request.Request(cands[0]["txt"], headers=UA), timeout=120).read()
                open(os.path.join(out, key + ".txt"), "wb").write(data)
                print("ok", key, cands[0]["id"], cands[0]["title"][:60])
            except Exception as e:
                print("download failed", key, e)
        time.sleep(1)
    for key, ident in ARCHIVE.items():
        try:
            data = urllib.request.urlopen(urllib.request.Request(f"https://archive.org/download/{ident}/{ident}_djvu.txt", headers=UA), timeout=180).read()
            open(os.path.join(out, key + ".txt"), "wb").write(data); print("ok", key, ident)
        except Exception as e:
            print("archive download failed", key, e)
    # archive.org candidates for the Rule of St Benedict (Gasquet, 1909)
    try:
        q = urllib.parse.quote('title:(rule benedict) AND (creator:(gasquet) OR creator:(hunter-blair)) AND date:[1880-01-01 TO 1930-12-31]')
        r = get(f"https://archive.org/advancedsearch.php?q={q}&fl[]=identifier&fl[]=title&fl[]=year&rows=10&output=json")
        catalog["archive_benedict"] = r.get("response", {}).get("docs", [])
    except Exception as e:
        print("archive search failed", e)
    json.dump(catalog, open(os.path.join(out, "catalog2.json"), "w"), indent=1, ensure_ascii=False)

if __name__ == "__main__":
    main(sys.argv[1])
