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
    p = p.replace("--", "—")
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
            book = f"Book {ROMAN[m.group(1)]} · {smart_title(L[i + 1].strip())}"
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

def presence():
    L = gutenberg_body("presence.txt").split("\n")
    chapters, cur, section = [], None, None
    for l in L:
        s = l.strip()
        if s == "NOTES:": break
        if s in ("CONVERSATIONS.", "LETTERS."):
            section = s.rstrip(".").capitalize(); continue
        m = re.match(r"^([A-Z]+) (CONVERSATION|LETTER)\.$", s)
        if m:
            if cur: chapters.append(cur)
            cur = {"section": section, "title": f"{m.group(1).capitalize()} {m.group(2).capitalize()}", "lines": []}; continue
        if cur is not None: cur["lines"].append(l)
    if cur: chapters.append(cur)
    return [{"section": c["section"], "title": c["title"], "paras": [tidy(p) for p in paragraphs(c["lines"]) if keep(p)]} for c in chapters]

def julian():
    L = gutenberg_body("julian.txt").split("\n")
    start = [i for i, l in enumerate(L) if l.strip() == "REVELATIONS OF DIVINE LOVE"][-1]
    chapters, cur, section = [], None, "Introduction"
    for l in L[start + 1:]:
        s = l.strip()
        if s.startswith("POSTSCRIPT BY A SCRIBE"): break
        m = re.match(r"^_(THE [A-Z]+ REVELATION|ANENT .*)\.?_$", s)
        if m:
            section = m.group(1).rstrip(".").capitalize(); continue
        m = re.match(r"^CHAPTER ([IVXLC]+)$", s)
        if m:
            if cur: chapters.append(cur)
            cur = {"section": section, "title": f"Chapter {m.group(1)}", "lines": []}; continue
        if cur is not None: cur["lines"].append(l)
    if cur: chapters.append(cur)
    out = []
    for c in chapters:
        paras = [tidy(p) for p in paragraphs(c["lines"]) if keep(p)]
        paras = [re.sub(r"\[(\d+)\]", "", p) for p in paras if not re.match(r"^\[\d+\]", p)]
        out.append({"section": c["section"], "title": c["title"], "paras": paras})
    return out

def teresa():
    L = gutenberg_body("teresa.txt").split("\n")
    chapters, cur = [], None
    i = 0
    while i < len(L):
        s = L[i].strip()
        if s == "I.H.S.": break
        m = re.match(r"^Chapter ([IVXL]+)\.$", s)
        if m:
            if cur: chapters.append(cur)
            j = i + 1
            while not L[j].strip(): j += 1
            title = []
            while L[j].strip(): title.append(L[j].strip()); j += 1
            cur = {"title": f"Chapter {m.group(1)}", "summary": re.sub(r"\s+", " ", " ".join(title)), "lines": []}
            i = j; continue
        if cur is not None: cur["lines"].append(L[i])
        i += 1
    if cur: chapters.append(cur)
    out = []
    for c in chapters:
        raw = paragraphs(c["lines"])
        kept, last = [], 0
        for p in raw:
            m = re.match(r"^(\d+)\.\s", p)
            if m:
                n = int(m.group(1))
                if n == 1 and last > 1: break      # footnotes start again at 1
                last = n
            kept.append(p)
        paras = [re.sub(r"\s*\[\d+\]", "", tidy(p)) for p in kept if keep(p)]
        out.append({"section": c["summary"], "title": c["title"], "paras": [p for p in paras if p]})
    return out

SMALL = {"of", "the", "and", "at", "in", "to", "a", "an", "on", "for", "by", "with", "from", "into", "his", "her", "is", "are", "be"}
def smart_title(t):
    words = t.lower().split()
    return " ".join(w if (i and w in SMALL) else w[:1].upper() + w[1:] for i, w in enumerate(words))

def caps_chapters(name, stop=None, start_nth=-1):
    """Books laid out as 'CHAPTER I' followed by a capitalised summary paragraph."""
    L = gutenberg_body(name).split("\n")
    starts = [i for i, l in enumerate(L) if l.strip() == "CHAPTER I"]
    i = starts[start_nth]
    chapters, cur = [], None
    while i < len(L):
        s = L[i].strip()
        if stop and s.startswith(stop): break
        m = re.match(r"^CHAPTER ([IVXLC]+)\.?$", s)
        if m:
            if cur: chapters.append(cur)
            j = i + 1
            while not L[j].strip(): j += 1
            title = []
            while L[j].strip(): title.append(L[j].strip()); j += 1
            summary = smart_title(re.sub(r"\s+", " ", " ".join(title)).replace("--", " · "))
            cur = {"section": summary, "title": f"Chapter {m.group(1)}", "lines": []}
            i = j; continue
        if cur is not None: cur["lines"].append(L[i])
        i += 1
    if cur: chapters.append(cur)
    return [{"section": c["section"], "title": c["title"], "paras": [tidy(p) for p in paragraphs(c["lines"]) if keep(p)]} for c in chapters]

def ignatius():
    return caps_chapters("ignatiuslife.txt", stop="APPENDIX")

ROMANS = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV"]
def desert():
    say = json.load(open(os.path.join(RAW, "desert_sayings.json")))
    n = 16
    return [{"title": f"Sayings {ROMANS[i // n]}", "paras": say[i:i + n]} for i in range(0, len(say), n)]

BOOKS = [
    dict(id="imitation", title="The Imitation of Christ", author="Thomas à Kempis", translator="William Benham", year="c. 1418",
         blurb="After the Bible, perhaps the most widely read book in Christian history. Four short books on the inner life, humility and the love of Jesus.",
         source="Project Gutenberg #1653", parse=imitation),
    dict(id="desert", title="The Sayings of the Desert Fathers", author="The Fathers of the Egyptian desert", translator="E. A. Wallis Budge", year="4th–5th century",
         blurb="Short, sharp and often funny words of the monks and nuns who went into the deserts of Egypt to seek God. A selection from The Paradise of the Holy Fathers (1907).",
         source="The Paradise of the Holy Fathers, vol. II (1907), archive.org", parse=desert, raw="desert_sayings.json"),
    dict(id="presence", title="The Practice of the Presence of God", author="Brother Lawrence of the Resurrection", translator="anonymous (1895)", year="1692",
         blurb="A Carmelite lay brother who worked in the monastery kitchen and found God among the pots and pans. Four conversations and fifteen letters.",
         source="Project Gutenberg #13871", parse=presence),
    dict(id="julian", title="Revelations of Divine Love", author="Julian of Norwich", translator="Grace Warrack", year="c. 1373–1393",
         blurb="The first book in English known to be written by a woman: sixteen 'shewings' of the love of God given to an anchoress of Norwich. 'All shall be well, and all manner of thing shall be well.'",
         source="Project Gutenberg #52958", parse=julian),
    dict(id="teresa", title="The Life of Saint Teresa of Jesus", author="Saint Teresa of Ávila", translator="David Lewis", year="1565",
         blurb="Teresa's own story, written at her confessors' command: her lukewarm years, her conversion, and the 'four waters' of prayer. Honest, funny and on fire.",
         source="Project Gutenberg #8120", parse=teresa),
    dict(id="ignatius", title="The Autobiography of Saint Ignatius", author="Saint Ignatius of Loyola", translator="J. F. X. O'Conor", year="1553–1555",
         blurb="The wounded soldier who read the lives of the saints on his sickbed and became the founder of the Jesuits, told in his own words to a companion.",
         source="Project Gutenberg #24534", parse=ignatius, raw="ignatiuslife.txt"),
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
        if not os.path.exists(os.path.join(RAW, b.get("raw", b["id"] + ".txt"))):
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
