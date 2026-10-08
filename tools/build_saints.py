"""Build saints/MM-DD.json for the Today screen from saints_content.py, the 1962 Collect and fetched paintings."""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from saints_content import SAINTS

ROOT = os.path.join(os.path.dirname(__file__), "..")

def ef_collect(md, match):
    for path in sorted(glob.glob(os.path.join(ROOT, "data", "ef", f"*-{md}.json"))):
        d = json.load(open(path))
        if match.lower() not in d["title"].lower():
            continue
        for s in d["sections"]:
            if s["id"] == "Oratio":
                lines = [l for l in s["en"] if l.strip() and not l.startswith("*")]
                return " ".join(lines).replace("Through our Lord…", "Through our Lord Jesus Christ. Amen.").strip()
    return None

def main():
    images = {}
    p = os.path.join(ROOT, "saints", "images.json")
    if os.path.exists(p):
        images = json.load(open(p))
    n = 0
    for md, s in SAINTS.items():
        out = {k: v for k, v in s.items() if k not in ("efMatch", "query", "calendars")}
        out["match"] = [s["efMatch"].lower()] if s.get("efMatch") else [w.lower() for w in s["name"].replace("Saints ", "").replace("Saint ", "").replace("The ", "").split() if len(w) > 3][:2]
        if "prayer" not in out and s.get("efMatch"):
            c = ef_collect(md, s["efMatch"])
            if c:
                out["prayer"] = c
                out["prayerSource"] = "Collect of the day, Roman Missal of 1962"
        img = images.get(md)
        if img:
            out["image"] = img["file"]
            artist = img.get("artist") or ""
            out["imageCredit"] = f"{artist + '. ' if artist else ''}{img['title'].rsplit('.', 1)[0]}. {img.get('license') or 'Public domain'}, via Wikimedia Commons."
            out["imageRatio"] = round(img["w"] / img["h"], 3) if img.get("w") and img.get("h") else 0.8
        json.dump(out, open(os.path.join(ROOT, "saints", md + ".json"), "w"), ensure_ascii=False, indent=1)
        n += 1
    index = [{"md": md, "name": s["name"]} for md, s in sorted(SAINTS.items())]
    json.dump(index, open(os.path.join(ROOT, "saints", "index.json"), "w"), ensure_ascii=False)
    print("built", n)

if __name__ == "__main__":
    main()
