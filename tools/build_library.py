"""Turn downloaded public-domain texts (library/raw/*.txt) into library/<id>.json chapters and library/index.json.
Each book has its own small parser because every old edition is laid out differently."""
import json, os, re, sys

RAW = sys.argv[1] if len(sys.argv) > 1 else "library/raw"
OUT = sys.argv[2] if len(sys.argv) > 2 else "library"

def gutenberg_body(name):
    t = open(os.path.join(RAW, name), encoding="utf-8", errors="replace").read().replace("\r\n", "\n")
    a, b = t.find("*** START"), t.find("*** END")
    return t[t.find("\n", a) + 1:b] if a >= 0 else t

def paragraphs(lines):
    paras, cur = [], []
    for l in lines:
        if l.strip():
            cur.append(l.strip())
        elif cur:
            paras.append(" ".join(cur)); cur = []
    if cur:
        paras.append(" ".join(cur))
    return paras

def tidy(p):
    p = re.sub(r"\(\d+\)", "", p)            # footnote markers
    p = p.replace("_", "")                    # italics
    p = re.sub(r"^\d+\.\s+", "", p)           # paragraph numbers
    return re.sub(r"\s+", " ", p).strip()

def keep(p):
    return bool(p) and not re.match(r"^\(\d+\)", p)

ROMAN = {"FIRST": "I", "SECOND": "II", "THIRD": "III", "FOURTH": "IV"}

def imitation():
    L = gutenberg_body("imitation.txt").split("\n")
    start = [i for i, l in enumerate(L) if l.strip() == "THE FIRST BOOK"][-1]
    chapters, book, i = [], None, start
    cur = None
    while i < len(L):
        s = L[i].strip()
        m = re.match(r"^THE (FIRST|SECOND|THIRD|FOURTH) BOOK$", s)
        if m:
            book = f"Book {ROMAN[m.group(1)]} · {L[i + 1].strip().capitalize()}"
            i += 2; continue
        if re.match(r"^CHAPTER [IVXLC]+$", s):
            if cur: chapters.append(cur)
            j = i + 1
            while not L[j].strip(): j += 1
            title = []
            while L[j].strip(): title.append(L[j].strip()); j += 1
            cur = {"section": book, "title": " ".join(title).rstrip(".").replace("_", ""), "lines": []}
            i = j; continue
        if cur is not None: cur["lines"].append(L[i])
        i += 1
    if cur: chapters.append(cur)
    out = []
    for c in chapters:
        paras = [tidy(p) for p in paragraphs(c["lines"]) if keep(p)]
        out.append({"section": c["section"], "title": c["title"], "paras": [p for p in paras if p]})
    return out

def confessions():
    L = gutenberg_body("confessions.txt").split("\n")
    chapters, cur = [], None
    for l in L:
        s = l.strip()
        m = re.match(r"^BOOK ([IVXL]+)$", s)
        if m:
            if cur: chapters.append(cur)
            cur = {"title": f"Book {m.group(1)}", "lines": []}; continue
        if cur is not None: cur["lines"].append(l)
    if cur: chapters.append(cur)
    return [{"title": c["title"], "paras": [tidy(p) for p in paragraphs(c["lines"]) if keep(p) and p.strip() != "GRATIAS TIBI DOMINE"]} for c in chapters]

BOOKS = [
    dict(id="imitation", title="The Imitation of Christ", author="Thomas à Kempis", translator="William Benham", year="c. 1418",
         blurb="After the Bible, perhaps the most widely read book in Christian history. Four short books on the inner life, humility and the love of Jesus.",
         source="Project Gutenberg #1653", parse=imitation),
    dict(id="confessions", title="The Confessions", author="Saint Augustine of Hippo", translator="E. B. Pusey", year="397–400",
         blurb="Augustine's prayer to God about his restless youth, his long search and his conversion. 'Our heart is restless, until it repose in Thee.'",
         source="Project Gutenberg #3296", parse=confessions),
]

def main():
    index = []
    existing = {}
    ip = os.path.join(OUT, "index.json")
    if os.path.exists(ip):
        existing = {b["id"]: b for b in json.load(open(ip))}
    for b in BOOKS:
        if not os.path.exists(os.path.join(RAW, b["id"] + ".txt")):
            print("missing", b["id"]); continue
        chapters = b["parse"]()
        chapters = [c for c in chapters if c["paras"]]
        doc = {k: b[k] for k in ("id", "title", "author", "translator", "source")}
        doc["chapters"] = chapters
        json.dump(doc, open(os.path.join(OUT, b["id"] + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
        existing[b["id"]] = {k: b[k] for k in ("id", "title", "author", "translator", "year", "blurb")} | {"chapters": len(chapters)}
        print(b["id"], len(chapters), "chapters", sum(len(c["paras"]) for c in chapters), "paragraphs")
    order = [b["id"] for b in BOOKS]
    index = sorted(existing.values(), key=lambda x: order.index(x["id"]) if x["id"] in order else 99)
    json.dump(index, open(ip, "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
