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


# ---------------------------------------------------------------- catechisms, Aquinas and the Fathers

def unfoot(p):
    """Drop footnote markers like [25] and editorial italics underscores."""
    p = re.sub(r"\[\d+\]", "", p).replace("_", "")
    return re.sub(r"\s+", " ", p.replace("--", "—")).strip()

def summa(name, part):
    body = gutenberg_body(name)
    segs = re.split(r"(?m)^QUESTION (\d+)\s*$", body)
    chapters = []
    for k in range(1, len(segs) - 1, 2):
        qn, seg = int(segs[k]), segs[k + 1]
        if "ARTICLE [" not in seg:
            continue
        L = seg.split("\n")
        head, i = [], 0
        while i < len(L) and not L[i].strip(): i += 1
        while i < len(L) and L[i].strip(): head.append(L[i].strip()); i += 1
        title = re.sub(r"\s*\(.*?\)\s*$", "", " ".join(head)).strip(" .")
        rest = "\n".join(L[i:])
        arts = re.split(r"(?m)^\w+ ARTICLE \[([^\]]+)\]\s*$", rest)
        paras = [unfoot(x) for x in paragraphs(arts[0].split("\n")) if x.strip()]
        for a in range(1, len(arts) - 1, 2):
            ps = [unfoot(x) for x in paragraphs(arts[a + 1].split("\n"))]
            ps = [x for x in ps if x]
            if not ps: continue
            n = re.search(r"Art\. (\d+)", arts[a])
            paras.append(f"Article {n.group(1) if n else (a + 1) // 2}. {ps[0]}")
            paras += ps[1:]
        chapters.append({"title": f"Question {qn}. {smart_title(title)}", "section": part, "paras": paras})
    # keep the fullest copy of each question (the contents pages repeat the headings)
    best = {}
    for c in chapters:
        q = c["title"].split(".")[0]
        if q not in best or len(c["paras"]) > len(best[q]["paras"]): best[q] = c
    return sorted(best.values(), key=lambda c: int(re.search(r"\d+", c["title"]).group()))

ORD = {w: i + 1 for i, w in enumerate("FIRST SECOND THIRD FOURTH FIFTH SIXTH SEVENTH EIGHTH NINTH TENTH ELEVENTH TWELFTH THIRTEENTH FOURTEENTH FIFTEENTH SIXTEENTH SEVENTEENTH EIGHTEENTH NINETEENTH TWENTIETH".split())}

def baltimore2():
    body = gutenberg_body("baltimore2.txt")
    segs = re.split(r"(?m)^LESSON ([A-Z\-]+(?: [A-Z\-]+)?)\s*$", body)
    chapters = []
    for k in range(1, len(segs) - 1, 2):
        L = segs[k + 1].strip("\n").split("\n")
        title = L[0].strip() if L else ""
        paras = []
        for p in paragraphs(L[1:]):
            m = re.match(r"^(\d+)\. Q\. (.*?) A\. (.*)$", p)
            if m:
                paras.append(f"{m.group(1)}. {m.group(2).strip()} — {m.group(3).strip()}")
            elif paras and len(p) < 400 and not p.isupper():
                continue  # stray notes between questions
        if paras:
            chapters.append({"title": f"Lesson {k // 2 + 1}. {smart_title(title)}", "paras": paras})
    return chapters

def kinkead():
    body = gutenberg_body("baltimore_explained.txt")
    start = body.find("\nLesson 1\n")
    segs = re.split(r"(?m)^Lesson (\d+)\s*$", body[start:])
    chapters = []
    for k in range(1, len(segs) - 1, 2):
        L = segs[k + 1].strip("\n").split("\n")
        title = L[0].strip()
        paras = []
        for p in paragraphs(L[1:]):
            p = unfoot(p)
            m = re.match(r"^\*?(\d+) Q\. (.*?) A\. (.*)$", p)
            paras.append(f"{m.group(1)}. {m.group(2)} — {m.group(3)}" if m else p)
        if any(c["title"].startswith(f"Lesson {segs[k]}.") for c in chapters): break  # an index of questions follows the lessons
        chapters.append({"title": f"Lesson {segs[k]}. {smart_title(title)}", "paras": [x for x in paras if x]})
    return chapters

def cityofgod():
    chapters = []
    for name in ("cityofgod1.txt", "cityofgod2.txt"):
        body = gutenberg_body(name)
        books = re.split(r"(?m)^\s+BOOK ([A-Z\-]+)\.\s*$", body)
        for k in range(1, len(books) - 1, 2):
            word = books[k]
            if word not in ORD and not re.match(r"^[A-Z]+-[A-Z]+$", word): continue
            num = ORD.get(word) or sum(ORD.get(w, 0) for w in word.split("-")) or k
            text = books[k + 1]
            parts = re.split(r"\n[ \t]+(\d+)\. _([^_]*?)_[ \t]*\n", "\n" + text)
            for j in range(1, len(parts) - 2, 3):
                ps = [unfoot(p) for p in paragraphs(parts[j + 2].split("\n"))]
                ps = [p for p in ps if p and not re.match(r"^(FOOTNOTES|\[\d+\])", p) and not p.isupper()]
                if len(ps) < 1: continue
                chapters.append({"title": f"{parts[j]}. {unfoot(parts[j + 1]).rstrip('.')}", "section": f"Book {num}", "paras": ps})
    # the contents pages also match: keep the first full chapter of each (book, number)
    seen, out = set(), []
    for c in chapters:
        key = (c["section"], c["title"].split(".")[0])
        if key in seen or sum(len(p) for p in c["paras"]) < 200: continue
        seen.add(key); out.append(c)
    return out

APOSTOLIC = [("THE FIRST EPISTLE OF CLEMENT.", "The First Epistle of Clement"), ("THE EPISTLE OF POLYCARP.", "The Epistle of Polycarp"),
             ("THE ENCYCLICAL EPISTLE OF THE CHURCH AT SMYRNA", "The Martyrdom of Polycarp"),
             ("THE EPISTLE OF IGNATIUS TO THE EPHESIANS.", "Ignatius to the Ephesians"), ("THE EPISTLE OF IGNATIUS TO THE MAGNESIANS.", "Ignatius to the Magnesians"),
             ("THE EPISTLE OF IGNATIUS TO THE TRALLIANS.", "Ignatius to the Trallians"), ("THE EPISTLE OF IGNATIUS TO THE ROMANS.", "Ignatius to the Romans"),
             ("THE EPISTLE OF IGNATIUS TO THE PHILADELPHIANS.", "Ignatius to the Philadelphians"), ("THE EPISTLE OF IGNATIUS TO THE SMYRNÆANS.", "Ignatius to the Smyrnaeans"),
             ("THE EPISTLE OF IGNATIUS TO POLYCARP.", "Ignatius to Polycarp"), ("THE EPISTLE TO DIOGNETUS.", "The Epistle to Diognetus")]

def apostolic():
    body = gutenberg_body("apostolic.txt")
    heads = [(m.start(), m.group(0).strip()) for m in re.finditer(r"(?m)^ *THE [A-ZÆ ,.’]{10,}$", body)]
    chapters = []
    for head, title in APOSTOLIC:
        hits = [i for i, (pos, h) in enumerate(heads) if h == head]
        if not hits: print("apostolic: missing", head); continue
        i = hits[-1]
        start = heads[i][0]
        end = heads[i + 1][0] if i + 1 < len(heads) else len(body)
        text = body[start:end]
        text = text[text.find("\n") + 1:]
        # Ignatius survives in a shorter and a longer form; keep the shorter, the genuine one.
        if "SHORTER." in text:
            text = re.sub(r"(?s)\n\s*LONGER\.\s*\n.*?(?=\n\s*(?:CHAP\.|SHORTER\.)|\Z)", "\n", text)
            text = text.replace("SHORTER.", "")
        fn = re.search(r"(?m)^\s*Footnote \d+:", text)
        if fn: text = text[:fn.start()]
        first = re.search(r"(?m)^\s*CHAP\. I\.", text)
        if first:
            pre = [p for p in paragraphs(text[:first.start()].split("\n")) if p.startswith("_")]
            text = "\n\n".join(pre) + "\n\n" + text[first.start():]
        ps = []
        for p in paragraphs(text.split("\n")):
            if re.match(r"^\s*(CHAP\.|INTRODUCTORY NOTICE|\[\d+\]|FOOTNOTES)", p) or p.isupper(): continue
            p = unfoot(p)
            if p: ps.append(p)
        if "INTRODUCTORY NOTICE" in body[heads[i - 1][0]:start] if i else False:
            pass
        chapters.append({"title": title, "paras": ps})
    return chapters

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
    dict(id="baltimore", title="The Baltimore Catechism", author="The Third Plenary Council of Baltimore", translator="", year="1885",
         blurb="The catechism that taught generations of English-speaking Catholics: 421 short questions and answers on the Creed, the Sacraments and the Commandments (No. 2).",
         source="Project Gutenberg #14552", parse=baltimore2, raw="baltimore2.txt"),
    dict(id="kinkead", title="An Explanation of the Baltimore Catechism", author="Rev. Thomas L. Kinkead", translator="", year="1891",
         blurb="Each question of the Baltimore Catechism, explained simply and warmly for teachers and families, with stories and examples.",
         source="Project Gutenberg #14554", parse=kinkead, raw="baltimore_explained.txt"),
    dict(id="summa1", title="Summa Theologica: Part I", author="Saint Thomas Aquinas", translator="Fathers of the English Dominican Province", year="1265–1274",
         blurb="God, the Trinity, creation, the angels and man: the first part of the greatest work of Catholic theology, set out as questions and answers.",
         source="Project Gutenberg #17611", parse=lambda: summa("summa1.txt", "Part I"), raw="summa1.txt"),
    dict(id="summa12", title="Summa Theologica: Part I-II", author="Saint Thomas Aquinas", translator="Fathers of the English Dominican Province", year="1265–1274",
         blurb="Happiness, human acts, the passions, habits, virtue and vice, law and grace.",
         source="Project Gutenberg #17897", parse=lambda: summa("summa12.txt", "Part I-II"), raw="summa12.txt"),
    dict(id="summa22", title="Summa Theologica: Part II-II", author="Saint Thomas Aquinas", translator="Fathers of the English Dominican Province", year="1265–1274",
         blurb="Faith, hope and charity, and the cardinal virtues of prudence, justice, fortitude and temperance, one by one.",
         source="Project Gutenberg #18755", parse=lambda: summa("summa22.txt", "Part II-II"), raw="summa22.txt"),
    dict(id="summa3", title="Summa Theologica: Part III", author="Saint Thomas Aquinas", translator="Fathers of the English Dominican Province", year="1265–1274",
         blurb="Christ, Our Lady and the Sacraments: Baptism, Confirmation, the Eucharist and Penance.",
         source="Project Gutenberg #19950", parse=lambda: summa("summa3.txt", "Part III"), raw="summa3.txt"),
    dict(id="apostolic", title="The Apostolic Fathers", author="Clement, Ignatius, Polycarp and others", translator="Roberts, Donaldson and Crombie", year="c. 96–150",
         blurb="Letters from the generation after the Apostles: Clement of Rome, the seven letters of Ignatius of Antioch on his way to martyrdom, Polycarp, and the Epistle to Diognetus.",
         source="Ante-Nicene Christian Library, vol. I (1870), Project Gutenberg #77576", parse=apostolic, raw="apostolic.txt"),
    dict(id="cityofgod", title="The City of God", author="Saint Augustine of Hippo", translator="Marcus Dods", year="413–426",
         blurb="Augustine's great answer to the fall of Rome: two cities, built by two loves, the love of self and the love of God.",
         source="Project Gutenberg #45304–45305", parse=cityofgod, raw="cityofgod1.txt"),
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
