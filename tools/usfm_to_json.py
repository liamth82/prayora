"""Convert the BibleCorps Challoner Douay-Rheims USFM files (public domain) to one JSON: {book: {chapter: {verse: text}}}.
Book keys use the Douay-Rheims names that build_of.py maps to."""
import glob, json, os, re, sys

NAMES = {"GEN":"Genesis","EXO":"Exodus","LEV":"Leviticus","NUM":"Numbers","DEU":"Deuteronomy","JOS":"Josue","JDG":"Judges","RUT":"Ruth",
"1SA":"1 Kings","2SA":"2 Kings","1KI":"3 Kings","2KI":"4 Kings","1CH":"1 Paralipomenon","2CH":"2 Paralipomenon","EZR":"1 Esdras","NEH":"2 Esdras",
"TOB":"Tobias","JDT":"Judith","EST":"Esther","JOB":"Job","PSA":"Psalms","PRO":"Proverbs","ECC":"Ecclesiastes","SNG":"Canticles","WIS":"Wisdom",
"SIR":"Ecclesiasticus","ISA":"Isaias","JER":"Jeremias","LAM":"Lamentations","BAR":"Baruch","EZK":"Ezechiel","DAN":"Daniel","HOS":"Osee","JOL":"Joel",
"AMO":"Amos","OBA":"Abdias","JON":"Jonas","MIC":"Micheas","NAM":"Nahum","HAB":"Habacuc","ZEP":"Sophonias","HAG":"Aggeus","ZEC":"Zacharias",
"MAL":"Malachias","1MA":"1 Machabees","2MA":"2 Machabees","MAT":"Matthew","MRK":"Mark","LUK":"Luke","JHN":"John","ACT":"Acts","ROM":"Romans",
"1CO":"1 Corinthians","2CO":"2 Corinthians","GAL":"Galatians","EPH":"Ephesians","PHP":"Philippians","COL":"Colossians","1TH":"1 Thessalonians",
"2TH":"2 Thessalonians","1TI":"1 Timothy","2TI":"2 Timothy","TIT":"Titus","PHM":"Philemon","HEB":"Hebrews","JAS":"James","JAM":"James","1PE":"1 Peter",
"2PE":"2 Peter","1JN":"1 John","2JN":"2 John","3JN":"3 John","JUD":"Jude","REV":"Apocalypse"}

def strip(t):
    t = re.sub(r"\\f .*?\\f\*", "", t)
    t = re.sub(r"\\x .*?\\x\*", "", t)
    t = re.sub(r"\\[a-z0-9]+\*?", "", t)
    return re.sub(r"\s+", " ", t).strip()

bible = {}
for path in sorted(glob.glob(os.path.join(sys.argv[1], "*DRC1750*.sfm"))):
    code = os.path.basename(path).split("-")[1]
    if code not in NAMES: continue
    book = bible.setdefault(NAMES[code], {})
    ch = None; cur = None
    for line in open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        m = re.match(r"\\c (\d+)", line)
        if m: ch = book.setdefault(m.group(1), {}); cur = None; continue
        m = re.match(r"\\v (\d+)\S*\s*(.*)", line)
        if m and ch is not None:
            cur = m.group(1); ch[cur] = strip(m.group(2)); continue
        if cur and ch is not None and line and not re.match(r"\\(c|s\d?|cl|cd|d|ms|mt\d?|h|toc\d|id|ide|im|is|ip|r)\b", line):
            extra = strip(line)
            if extra:
                ch[cur] = (ch[cur] + " " + extra).strip()
json.dump(bible, open(sys.argv[2], "w"), ensure_ascii=False)
print(len(bible), "books")
