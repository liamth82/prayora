"""Build the source index that Ask searches: the Douay-Rheims, the Library, and the saints' entries.

Each passage is small enough to cite exactly: three verses of Scripture, or one paragraph (split if long)
of a classic. Writes api/_data/ask.json:
  {"docs": [[kind, book, chapter, ref, text], ...], "books": {book: title}}
kind is "bible", "library" or "saint". book/chapter let the app open the passage in its reader.

Usage: python3 tools/build_ask_index.py
"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "api", "_data", "ask.json")


def split_long(text, limit=900):
    if len(text) <= limit:
        return [text]
    parts, cur = [], ""
    for s in re.split(r"(?<=[.;:?!])\s+", text):
        if cur and len(cur) + len(s) > limit:
            parts.append(cur.strip()); cur = ""
        cur += s + " "
    if cur.strip():
        parts.append(cur.strip())
    return parts


def main():
    docs, books = [], {}
    index = json.load(open(os.path.join(ROOT, "bible", "index.json")))
    for meta in index:
        b = json.load(open(os.path.join(ROOT, "bible", meta["id"] + ".json")))
        name = "Psalm" if meta["id"] == "psa" else b["name"]
        books[meta["id"]] = b["name"]
        for ci, verses in enumerate(b["chapters"]):
            for i in range(0, len(verses), 3):
                group = verses[i:i + 3]
                first, last = group[0][0], group[-1][0]
                ref = f"{name} {ci + 1}:{first}" + (f"–{last}" if last != first else "")
                if len(b["chapters"]) == 1:
                    ref = f"{name} {first}" + (f"–{last}" if last != first else "")
                docs.append(["bible", meta["id"], ci, ref, " ".join(f"{n} {t}" for n, t in group)])

    PART = {"summa1": "I", "summa12": "I-II", "summa22": "II-II", "summa3": "III"}
    for meta in json.load(open(os.path.join(ROOT, "library", "index.json"))):
        t = json.load(open(os.path.join(ROOT, "library", meta["id"] + ".json")))
        books[meta["id"]] = f"{t['title']}, {t['author']}"
        for ci, ch in enumerate(t["chapters"]):
            if meta["id"] in PART:
                # Aquinas: index his own answer and replies, never the objections he goes on to refute.
                q = re.match(r"Question (\d+)", ch["title"])
                art, whether = 0, ""
                for para in ch["paras"]:
                    m = re.match(r"^Article (\d+)\. (.*)$", para)
                    if m:
                        art, whether = int(m.group(1)), m.group(2); continue
                    if not art or re.match(r"^(Objection \d|Obj\. \d)", para):
                        continue
                    ref = f"Summa Theologica {PART[meta['id']]}, Q. {q.group(1) if q else ci + 1}, Art. {art} · {whether}"[:160]
                    for piece in split_long(para):
                        docs.append(["library", meta["id"], ci, ref, piece])
                continue
            for para in ch["paras"]:
                if meta["id"] in ("baltimore", "kinkead"):
                    m = re.match(r"^(\d+)\. ", para)
                    ref = f"{t['title']} · {ch['title']}" + (f" · Q. {m.group(1)}" if m else "")
                    if meta["id"] == "kinkead" and m:
                        continue  # the questions themselves are indexed once, from the Catechism
                    if len(para) >= 30:
                        docs.append(["library", meta["id"], ci, ref[:160], para[:900]])
                    continue
                for piece in split_long(para):
                    if len(piece) < 60:
                        continue
                    docs.append(["library", meta["id"], ci, f"{t['title']} · {ch['title']}"[:160], piece])

    for path in sorted(glob.glob(os.path.join(ROOT, "saints", "[0-9][0-9]-[0-9][0-9].json"))):
        s = json.load(open(path))
        md = os.path.basename(path)[:-5]
        for field, label in (("history", "Life"), ("life", "Life"), ("prayerTo", "Prayer to"), ("prayer", "Prayer"), ("meditation", "Meditation")):
            if s.get(field):
                for piece in split_long(s[field]):
                    docs.append(["saint", md, 0, f"{s['name']} · {label}", piece])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"docs": docs, "books": books}, f, ensure_ascii=False, separators=(",", ":"))
    kinds = {}
    for d in docs:
        kinds[d[0]] = kinds.get(d[0], 0) + 1
    print(len(docs), kinds, os.path.getsize(OUT) // 1024, "KB")


if __name__ == "__main__":
    main()
