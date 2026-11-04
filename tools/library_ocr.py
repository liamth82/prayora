"""Parsers for the Library's archive.org OCR texts (djvu.txt of old printed books).

These need much more cleaning than the Gutenberg texts in build_library.py: running heads, page numbers,
signature marks, catchwords, footnotes, words hyphenated across lines and pages, and plain OCR misreadings.
Each fix is deliberately narrow; anything that cannot be fixed with confidence is left as printed.

    darknight()  St John of the Cross, The Dark Night of the Soul, tr. David Lewis, ed. Benedict Zimmerman
                 (London: Thomas Baker, 1908)                                     library/raw/darknight_lewis.txt
    flowers()    The Little Flowers of Saint Francis, tr. Abby Langdon Alger
                 (Boston: Little, Brown, and Company, 1898; copyright 1887)       library/raw/flowers_alger.txt
"""
import collections, difflib, glob, os, re

from build_library import RAW

ROMAN_NUM = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
             (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]

def roman(n):
    out = ""
    for v, s in ROMAN_NUM:
        while n >= v: out += s; n -= v
    return out

def read_lines(name):
    return open(os.path.join(RAW, name), encoding="utf-8", errors="replace").read().replace("\r\n", "\n").split("\n")


# ---------------------------------------------------------------- vocabulary (built from the clean texts in RAW)

_VOCAB = None
def vocab():
    """Case-sensitive and lower-case word counts over every other raw text, used to tell real words from OCR noise."""
    global _VOCAB
    if _VOCAB is None:
        cased = collections.Counter()
        for f in sorted(glob.glob(os.path.join(RAW, "*.txt"))):
            if os.path.basename(f) in ("darknight_lewis.txt", "flowers_alger.txt"): continue
            cased.update(re.findall(r"[A-Za-z]+", open(f, encoding="utf-8", errors="replace").read()))
        lower = collections.Counter()
        for w, c in cased.items(): lower[w.lower()] += c
        # the system's English dictionary, with its common suffix flags, fills in rarer words (as a weak count of 3)
        dic = "/usr/share/hunspell/en_US.dic"
        if os.path.exists(dic):
            for line in open(dic, encoding="utf-8", errors="replace").read().split("\n")[1:]:
                word, _, flags = line.partition("/")
                if not word.isalpha(): continue
                forms = {word}
                for f, suf in (("S", "s"), ("D", "ed"), ("G", "ing"), ("R", "er"), ("Y", "ly"), ("M", "'s"), ("Z", "ers"), ("T", "est"), ("P", "ness")):
                    if f in flags:
                        base = word[:-1] if word.endswith("e") and suf[0] in "ei" else word
                        if suf == "s" and re.search(r"(s|x|z|ch|sh)$", word): suf = "es"
                        if suf == "s" and word.endswith("f") and not word.endswith("ff"): continue    # "cruft": would let "crufts" pass
                        if suf == "s" and re.search(r"[^aeiou]y$", word): base, suf = word[:-1], "ies"
                        if suf in ("ed", "er", "est") and re.search(r"[^aeiou]y$", word): base, suf = word[:-1], "i" + suf
                        forms.add(base + suf)
                for x in forms:
                    if lower.get(x.lower(), 0) < 3: lower[x.lower()] = 3
        _VOCAB = (cased, lower)
    return _VOCAB

def freq(w):
    return vocab()[1].get(w.lower(), 0)

def known(w, n=3):
    return freq(w) >= n

def recase(new, old):
    if old.isupper() and len(old) > 1: return new.upper()
    if old[:1].isupper(): return new[:1].upper() + new[1:]
    return new

def candidates(word, rules, max_cost=2.0):
    """Every spelling reachable from word by the substitution rules, with its cost."""
    seen = {word: 0.0}
    frontier = [word]
    while frontier:
        nxt = []
        for w in frontier:
            for pat, rep, cost in rules:
                for m in re.finditer(pat, w):
                    v = w[:m.start()] + rep + w[m.end():]
                    c = seen[w] + cost
                    if c <= max_cost and c < seen.get(v, 99):
                        seen[v] = c; nxt.append(v)
        frontier = nxt
    return seen


# ---------------------------------------------------------------- shared cleaning

def tighten(p):
    """Typographic tidying common to both books: OCR spacing, spaces before punctuation, dashes."""
    p = re.sub(r"\s+", " ", p).strip()
    p = re.sub(r"\s*—\s*", "—", p)
    p = re.sub(r"\s+([,;:.!?)])", r"\1", p)
    p = re.sub(r"([(])\s+", r"\1", p)
    p = re.sub(r"\.\s?\.\s?\.", "...", p)
    return p.strip()

def fix_single_quotes(p):
    """The OCR leaves spaces around most single quotes. Quote marks that are clearly opening (space before, word after,
    no space between) or closing (word before, space or punctuation after) are kept; a quote spaced on both sides is
    decided by alternation with the quotes before it. Apostrophes inside words (God's, don't) are untouched."""
    toks = re.split(r"(\s*(?<![A-Za-z])'(?![A-Za-z])\s*|\s+'(?=[A-Za-z])|(?<=[A-Za-z.,;:!?])'(?=\s|$|[;:,.!?)—]))", p)
    out, inside = toks[0], False
    for k in range(1, len(toks), 2):
        q, after = toks[k], toks[k + 1] if k + 1 < len(toks) else ""
        before = out
        lsp, rsp = q[:1].isspace() or not before.strip(), q[-1:].isspace() or not after.strip()
        if not inside and not q[:1].isspace() and before.endswith("s") and q.strip() == "'" and re.match(r"^\s+[a-z]", q[1:] + after):
            out = before + "'" + after; continue                                         # plural possessive: "souls' sorrow"
        if not before.strip() or before.rstrip()[-1:] in "(—": opening = True
        elif not after.strip() or re.match(r"^\s*[;:,.!?)—]", after): opening = False
        elif lsp and not rsp: opening = True
        elif rsp and not lsp: opening = False
        else: opening = not inside
        inside = opening
        if opening: out = before.rstrip() + (" " if before.strip() and before.rstrip()[-1:] not in "(—" else "") + "'"; after = after.lstrip()
        else: out = before.rstrip() + "'" + (" " if after.strip() and not re.match(r"^\s*[;:,.!?)—\"]", after) else ""); after = after.lstrip()
        out += after
    return re.sub(r"\s+", " ", out).strip()

def fix_double_quotes(p):
    """Decide each double quote as opening or closing from the spaces around it (falling back on alternation) and
    attach it to its word."""
    pieces = re.split(r'(\s*"\s*)', p)
    if len(pieces) == 1: return p
    inside = False
    for k in range(1, len(pieces), 2):
        q = pieces[k]
        before, after = pieces[k - 1], pieces[k + 1] if k + 1 < len(pieces) else ""
        lsp = q[:1].isspace() or not before.strip()
        rsp = q[-1:].isspace() or not after.strip()
        if not before.strip(): opening = True
        elif not after.strip() or re.match(r"^[,.;:!?)]", after): opening = False
        elif lsp and not rsp: opening = True
        elif rsp and not lsp: opening = False
        else: opening = not inside
        inside = opening
        if opening:
            pieces[k] = (" " if before.strip() and not before.rstrip().endswith(("(", "—", "'")) else "") + '"'
            pieces[k - 1] = before.rstrip() if before.strip() else before
            if k + 1 < len(pieces): pieces[k + 1] = after.lstrip()
        else:
            pieces[k - 1] = before.rstrip()
            pieces[k] = '"' + (" " if after.strip() and not re.match(r"^[,.;:!?)—'\"]", after.lstrip()) else "")
            if k + 1 < len(pieces): pieces[k + 1] = after.lstrip()
    return re.sub(r"[ ]+", " ", "".join(pieces)).strip()

def is_signature(line):
    """Printer's signature marks, stray page-foot digits and other one- or two-character debris."""
    s = line.strip()
    return bool(s) and (len(re.sub(r"[^A-Za-z]", "", s)) < 2 and len(s) <= 6 or re.fullmatch(r"[\W\dIlSO]{1,4}", s) is not None)

def sentence_case(t, keep=()):
    """Lower-case the capitalised common nouns of an old title-cased heading, keeping proper nouns and the like."""
    cased, lower = vocab()
    words = t.split(" ")
    out, start = [], True
    for w in words:
        core = re.sub(r"^[^A-Za-z]+|[^A-Za-z]+$", "", w)
        prevw = re.sub(r"[^A-Za-z.]", "", out[-1]) if out else ""
        nxt = words[len(out) + 1] if len(out) + 1 < len(words) else ""
        if core == "Holy" and re.sub(r"[^A-Za-z]", "", nxt) in ("Ghost", "Spirit", "Trinity", "Cross", "Father", "Gospel", "Scriptures", "See", "Land", "Church"):
            keep = tuple(keep) + (core,)
        if prevw in ("Brother", "Saint", "St.", "Sister") or (core in ("Angels",) and prevw == "the"): keep = tuple(keep) + (core,)
        if core and not start and core[0].isupper() and not (core.isupper() and len(core) > 1) and core not in keep:
            lw = core.lower()
            if cased.get(lw, 0) > cased.get(core, 0) and core not in KEEP_CAPS:
                w = w.replace(core, lw, 1)
        out.append(w)
        if core: start = bool(re.search(r"[.!?]['\"]?$", w))
    return " ".join(out)

KEEP_CAPS = {"God", "Christ", "Jesus", "Lord", "Saviour", "Saint", "St", "Brother", "Virgin", "Mary", "Ghost", "Spirit",
             "Trinity", "Order", "Mass", "He", "Him", "His", "Who", "Whom", "I", "Gray", "Friars", "Paradise", "Our", "Lady",
             "Mother", "Father", "Third", "Rule", "Ghost", "Portiuncula", "Stigmata", "Sultan", "Pope", "King", "Sisters", "Clara",
             "Evangelist", "Christmas", "Cross", "Souls'", "Matins", "Nones", "Purgatory", "Consistory", "Babylon"}


# ---------------------------------------------------------------- page assembly

def assemble(lines, is_head, is_note_start=None, catchwords=False, junk=None):
    """Split OCR lines into pages at running heads, drop footnotes (trailing blocks at a page foot), signature marks and
    catchwords, and return the body as a list of blocks, each {"lines": [...], "page_start": bool}."""
    pages, cur = [], []
    for i, l in enumerate(lines):
        if is_head(l, lines[i - 1] if i else "", lines[i + 1] if i + 1 < len(lines) else ""):
            pages.append(cur); cur = []
        else:
            cur.append(l)
    pages.append(cur)
    out = []
    for pg in pages:
        blocks, b = [], []
        for l in pg:
            if l.strip(): b.append(re.sub(r"\s+", " ", l.strip()))
            elif b: blocks.append(b); b = []
        if b: blocks.append(b)
        # junk blocks: signature marks, single letters, illustration captions
        blocks = [x for x in blocks if not all(is_signature(l) for l in x) and not (junk and junk(x))]
        # signature mark on the last line of the page ("At" / "IS")
        if blocks and len(blocks[-1]) > 1 and is_signature(blocks[-1][-1]): blocks[-1] = blocks[-1][:-1]
        if is_note_start:
            # footnotes: from the first note block after which the page holds only notes (and bracketed note text)
            cut = None
            for k in range(1, len(blocks)):
                if not is_note_start(blocks[k]): continue
                depth, ok = 0, True
                for x in blocks[k:]:
                    t = " ".join(x)
                    if not (is_note_start(x) or depth > 0): ok = False; break
                    depth += t.count("[") - t.count("]")
                if ok: cut = k; break
            if cut is not None: blocks = blocks[:cut]
            # a note set directly under the last line of text, with no blank line between
            if blocks:
                last = blocks[-1]
                for i in range(1, len(last)):
                    if is_note_start([last[i]]):
                        blocks[-1] = last[:i]; break
        for i, x in enumerate(blocks):
            out.append({"lines": x, "page_start": i == 0})
    if catchwords:
        # the word printed alone at the foot of each page, repeating the first word of the next page
        keep = []
        for i, b in enumerate(out):
            if i + 1 < len(out) and out[i + 1]["page_start"] and len(b["lines"]) == 1 and len(b["lines"][0]) <= 18 and len(b["lines"][0].split()) <= 2:
                cw = re.sub(r"[^A-Za-z]", "", b["lines"][0]).lower()
                nw = re.sub(r"[^A-Za-z]", "", out[i + 1]["lines"][0].split()[0]).lower()
                if cw and nw and (cw == nw or difflib.SequenceMatcher(None, cw, nw).ratio() >= 0.7):
                    if i + 1 < len(out): out[i + 1]["page_start"] = True
                    continue
            keep.append(b)
        # a catchword can also sit on the page's last line, after a signature number ("7 and")
        for i, b in enumerate(keep):
            if i + 1 < len(keep) and keep[i + 1]["page_start"] and len(b["lines"]) > 1:
                last = re.sub(r"^[\dIl]+\s+", "", b["lines"][-1])
                nw = keep[i + 1]["lines"][0].split()[0] if keep[i + 1]["lines"][0].split() else ""
                if len(last.split()) == 1 and re.sub(r"\W", "", last).lower() == re.sub(r"\W", "", nw).lower():
                    b["lines"] = b["lines"][:-1]
        out = keep
    return out

def join_lines(lines, fix_word):
    """Join a paragraph's lines, closing words hyphenated across lines ("remem- ber" -> "remember")."""
    text = ""
    for l in lines:
        l = l.strip()
        if not text:
            text = l; continue
        m = re.search(r"(\S*?)([A-Za-z]+)-$", text)
        if m and not re.search(r"--$|—$", text):
            first = m.group(2)
            rest = re.match(r"([A-Za-z]+)(.*)$", l)
            if rest:
                second = rest.group(1)
                joined = fix_word(first + second)
                hyph = fix_word(first) + "-" + fix_word(second)
                text = text[:m.start(2)] + (choose_hyphen(fix_word(first), fix_word(second), joined, hyph)) + rest.group(2)
                continue
        text += " " + l
    return text

HYPHEN_LOG = []
KEEP_HYPHEN = {"turtle-doves", "gate-keeper", "door-keeper", "loving-kindness", "dung-hill", "prison-house", "well-tempered",
               "hell-fire", "fellow-men", "day-dawn", "self-love", "hiding-place", "half-way", "now-a-days", "fainthearted"}
SPACE_NOT_HYPHEN = {("may", "arrive"), ("necessary", "it"), ("heavy", "affliction"), ("by", "setting"), ("these", "feelings"),
                    ("way", "resembling"), ("empty", "rejoicing"), ("truly", "thinking")}
JOIN_HYPHEN = {("some", "whither"), ("con", "sorted"), ("con", "forted")}

def choose_hyphen(a, b, joined, hyph):
    if hyph.lower() in KEEP_HYPHEN: r = hyph
    elif (a.lower(), b.lower()) in SPACE_NOT_HYPHEN: r = a + " " + b
    elif (a.lower(), b.lower()) in JOIN_HYPHEN: r = a + b
    elif known(joined): r = joined
    elif known(a) and known(b) and len(a) > 2 and len(b) > 2: r = hyph
    else: r = joined
    HYPHEN_LOG.append((a, b, r))
    return r


# ================================================================ The Dark Night of the Soul (Lewis / Zimmerman, 1908)

DN_HEAD = re.compile(r"(THE\s+DARK\s+NIGHT\.?\s*(\S?\[|fBOOK|$))|(^\S{0,6}\s*(CHA[PF][.,]?|INDEX).{0,14}OF\s+T\S{1,3}\s+SOUL)|^OF\s+THE\s+SOUL\.\s*$")
DN_NOTE_REF = re.compile(r"\b[ivxlc]+\.,?\s+[\dlIi^]|\b(Ex|Ch|ch|Cb|Bk|bk|lb|Ib|Ps|P\^|S\.|St\.|Cant|Matt|Job|Is|Isa|Jer|Jerem|Ecclus|Eccles|Wisd|Sap|Rom|Cor|Exod|Gen|Lam|Lament|"
                         r"Apoc|Heb|Os|Ezech|Tob|Baruch|Phil|Ephes|Habac|Numb|Prov|Jon|Esth|Dan|Mark|Luke|John|Acts|Serm|Horn|Hom|Thom|Thorn|See|Life|"
                         r"Ascent|Spirit|Off|Is|Ib|Mich|Deut|Judith|Reg|Kings|Col|Gal|Tim|Thess|Pet|Jac|Os|Mal|Zach|Mich|Soph|Agg|Joel|Amos)\b|§|\[")

def dn_is_head(l, before="", after=""):
    s = l.strip()
    return bool(s) and len(s) < 60 and DN_HEAD.search(s) is not None

def dn_is_note_start(block):
    first = block[0]
    if not re.match(r"^(\*|\[|†|‡|§|\|\||II\s|!\||■|[ftjJ+X1Ii]\s|t\s|\d\s+[A-Z])", first): return False
    return DN_NOTE_REF.search(" ".join(block)) is not None

DN_RULES = [(r"\}\^", "y", 0.2), (r"v\^\^", "w", 0.2), (r"\(\^", "e", 0.5), (r"'\^", "s", 0.5), (r"\^l", "a", 0.5), (r"\^", "", 0.2),
            (r"'", "", 0.5), (r"\)", "", 0.5), (r"ft", "ff", 1), (r"if", "ff", 1), (r"tb", "ff", 1), (r"fi", "ff", 1), (r"fii", "ffi", 1),
            (r"fi", "fl", 1), (r"^P", "F", 1), (r"^I(?=[a-z])", "T", 1), (r"^T(?=[a-z])", "L", 1), (r"^c", "t", 1), (r"t$", "f", 1),
            (r"n", "i", 1), (r"rfi", "m", 1), (r"rn", "m", 1), (r"li", "h", 1), (r"h", "li", 1), (r"cl", "d", 1), (r"^J[Vv]", "W", 0.5),
            (r"I\\I", "M", 0.5), (r"j'", "y", 0.5), (r"\b0", "O", 1), (r"1", "l", 1), (r"l", "I", 1), (r"vv", "w", 0.5), (r"ii", "u", 1)]
DN_FIX = [("O OULS begin", "Souls begin"), ("^-^ ", ""), ("TheTover", "The lover"), ("amid the hlies", "amid the lilies"),
          ("other Ught", "other light"), ("E)xplanation", "Explanation"), ("house ot sensuality", "house of sensuality"),
          ("In that happy iii'^ht", "In that happy night"), ("iii'^ht", "night"),
          ("O happy lot [", "O happy lot !"), ("IMany", "Many"), ("eftbrts", "efforts"), ("Thus itT", "Thus it"), (", fthough", ", though"),
          ("incom.plete", "incomplete"), ("beforet —", "before —"), (" ihe ", " the "), ("communicating-", "communicating"),
          ("ApostleSjt", "Apostles"), ("ladder r", "ladder?"), ("right 'we should", "right we should"), ("is'thus", "is thus"), ("proficients- In", "proficients. In"), ("us,'J hoping", "us,' hoping"), ("my ignorances. J", "my ignorances.'"), ("blesjings", "blessings"), ("her/* —", "her —"), ("her/*", "her"), ("known/*", "known.'"), ("purple/*", "purple.'"), ("divine • the", "divine; the"), ("I\\Iy house", "My house"), ("Mj' house", "My house")]
DN_LOG = collections.Counter()
DN_NUM = re.compile(r"^[■.,\"\s]*(?:\d{1,2}|1 \d|[lI]o|[lI]\d|\d[lI]|II|g|Q|0)\s?[.,\-]\s+(?=[A-Z'*\"])|^\d{1,2}\s+(?=[A-Z])")

def dn_word(w):
    """Correct a single OCR-damaged word when exactly one plausible reading exists."""
    m = re.match(r"^([^A-Za-z]*)([A-Za-z](?:[A-Za-z'^}\\)(]*[A-Za-z^}])?)([^A-Za-z]*)$", w)
    if not m: return w
    pre, core, post = m.groups()
    if core == "ot": return pre + "of" + post
    if re.fullmatch(r"[A-Za-z]+", core) and (freq(core) >= 2 or len(core) <= 2): return w
    if re.fullmatch(r"[A-Za-z]+'[a-z]{1,2}", core) and known(core.split("'")[0]): return w     # God's, don't
    best = None
    for v, c in candidates(core, DN_RULES, 1.0).items():
        if v == core or not re.fullmatch(r"[A-Za-z]+(?:'[a-z]+)?", v): continue
        f = freq(v)
        if f >= 25:
            key = (c, -f)
            if best is None or key < best[0]: best = (key, v)
    if best:
        DN_LOG[(core, best[1])] += 1
        v = best[1]
        return pre + (v[:1].upper() + v[1:] if core[:1].isupper() else v) + post
    return w

def dn_clean_line(l):
    """Footnote markers and quote marks on a raw line (where line ends are still known)."""
    l = l.rstrip()
    l = re.sub(r"(?<=\s)\*\s*$", "", l)                                   # marker left alone at a line end
    l = re.sub(r"(^|(?<=[\s(—]))\*\s+(?=['A-Za-z])", "'", l)             # '*' used for an opening quote
    l = re.sub(r"(?<=[\w.,;:!?'\"])\*+", "", l)                          # attached footnote markers
    l = re.sub(r"\*", "", l)
    l = re.sub(r"(?<=[.,;:!?])['’]?\s?[tfj+|§†‡](?=\s|$)", lambda m: "'" if "'" in m.group(0) else "", l)  # .'t  .f  .+
    l = re.sub(r"(?<=[.,;:!?]')\s?[tfjJ+|§†‡](?=\s|$)", "", l)
    l = re.sub(r"(?<=[a-z,.;:!?'])\s*[§†‡](?=\s|$)", "", l)
    l = re.sub(r"(?<=\s)'t(?=\s)", "'", l)                               # " 't and" after a closing quote
    l = re.sub(r"(?<=[.,;:!?])\s'[tfj](?=\s|$)", "'", l)                  # "consumed. 't"
    l = re.sub(r"(?<=[,;])\s?!?[\dJ](?=\s)", "", l)                       # "explained, !5 when", "said,J which"
    l = re.sub(r"(?<=[.,;:!?'])\s+[+|†‡]\s*$", "", l)
    l = re.sub(r"(?<=[.,;:!?'])\s+[+|†‡](?=\s)", "", l)
    l = re.sub(r"(?<=[A-Za-z.,;:!?'])\^+(?:l\^)?(?=[\s.,;:]|$)", "", l)  # superscript note numbers: "before.^"
    l = l.replace("v/", "w")                                                # "v/ith"
    l = re.sub(r"\bot\b", "of", l)                                         # "ot" is always a misread "of" here
    l = l.replace("H'm", "Him")
    l = re.sub(r'"(?=[.,;:])|(?<=[.,;:!?])\s?"|(?<=\w)"|"(?=\w)', "", l)   # this edition has single quotes only: '"' is debris
    l = re.sub(r"(?<=[a-z])-\s+(?=[a-z])", " ", l)                          # "going- to": a stray hyphen between whole words
    # "prayer/§ And": the closing quote (and a full stop, before a capital) read as "/", then the note marker
    l = re.sub(r"(?<=[a-z])/(?:§|\*)(?=(\s+\S)?)", lambda m: ".'" if m.group(1) and m.group(1).strip()[:1].isupper() else "'", l)
    l = re.sub(r"(?<=[.,;:!?'])\s?(\|\||!\|)(?=\s|$)", "", l)            # || markers
    return l

def dn_para(lines):
    lines = [re.sub(r"\s+", " ", l.strip()) for l in lines]
    for a, b in DN_FIX:
        lines = [l.replace(a, b) for l in lines]
    text = join_lines([dn_clean_line(l) for l in lines], lambda w: dn_word(w))
    text = DN_NUM.sub("", text)                                             # paragraph numbers
    text = " ".join(dn_word(w) if not re.fullmatch(r"[A-Za-z]+", w) or freq(w) < 2 else w for w in text.split(" "))
    text = tighten(text)
    text = fix_single_quotes(text)
    text = tighten(text)
    text = text.replace("_", "").replace("■", "")
    return text

def dn_poem_lines(L, a, b):
    """The eight stanzas (as lists of lines) between STANZAS. and EXPLANATION OF THE STANZAS."""
    stanzas, cur = [], None
    for l in L[a:b]:
        s = l.strip()
        if not s or dn_is_head(l) or s in ("THE DARK NIGHT", "OF THE SOUL."): continue
        if re.fullmatch(r"[IVX]{1,4}[.,]", s):
            cur = []; stanzas.append(cur); continue
        if cur is not None: cur.append(s)
    return stanzas

def dn_verse(lines):
    out = []
    for l in lines:
        l = re.sub(r"\s+", " ", l.strip())
        for a, b in DN_FIX: l = l.replace(a, b)
        l = tighten(dn_clean_line(l))
        out.append(" ".join(dn_word(w) for w in l.split(" ")))
    # the OCR reads many of the poem's commas as full stops (the same stanzas quoted in the chapters have commas):
    # inside a stanza a line ends with a comma or semicolon, and the last line with a full stop
    if len(out) > 1:
        out = [re.sub(r"\.$", ",", x) for x in out[:-1]] + [re.sub(r"[,.]?$", ".", out[-1]) if not out[-1].endswith(("!", "?")) else out[-1]]
    return "\n".join(out)

def darknight():
    L = read_lines("darknight_lewis.txt")
    idx = lambda pat, start=0: next(i for i in range(start, len(L)) if re.match(pat, L[i].strip()))
    contents = idx(r"^CONTENTS\.?$")
    argument = idx(r"^ARGUMENT\.$", contents)
    stanzas = idx(r"^STANZAS\.$", argument)
    explanation = idx(r"^EXPLANATION\s+OF\s+THE\s+STANZAS\.$", stanzas)
    book1 = idx(r"^BOOK\s+I\.$", explanation)
    book2 = idx(r"^BOOK\s+II\.$", book1 + 1)
    end = idx(r"^END\s+OF\s+THE\s+DARK", book2)

    # chapter titles from the contents, a fallback where the body heading is only "STANZA I."
    toc, book, cur = {}, 0, None
    for l in L[contents:argument]:
        s = re.sub(r"\s+", " ", l.strip())
        if re.match(r"^BOOK ", s): book += 1; n = 0; continue
        if re.match(r"^CHAPTER\b", s):
            n += 1; cur = (book, n); toc[cur] = ""; continue
        if cur and s and not re.match(r"^(PAGE|CONTENTS|X[XVIL]+\.? CONTENTS|CONTENTS\. X)", s) and not dn_is_head(l):
            toc[cur] = (toc[cur] + " " + s).strip()
    toc = {k: re.sub(r"[\s.,•]*(?:\.\s*){2,}.*$|\s+\S{1,4}$", "", v).strip(" .") for k, v in toc.items()}

    poem = dn_poem_lines(L, stanzas + 1, explanation)
    poem_lines = [tighten(dn_clean_line(l)).lower().strip(" .,;!") for st in poem for l in st]

    def is_lemma(line):
        s = tighten(dn_clean_line(re.sub(r"\s+", " ", line))).strip(" .,;!")
        s = re.sub(r"^'", "", s).strip()
        if not s[:1].isupper() or len(s) > 48: return False
        s = s.lower().replace("i\\iy", "my").replace("mj'", "my")
        return any(difflib.SequenceMatcher(None, s, p).ratio() >= 0.85 for p in poem_lines)

    def body(a, b):
        """Lines a..b as paragraphs: new paragraphs at numbered markers; lines of the poem quoted at the head of a
        block (as the commentary does before explaining them) become verse paragraphs of their own."""
        blocks = assemble(L[a:b], dn_is_head, dn_is_note_start)
        paras, cur = [], []
        for blk in blocks:
            lines = blk["lines"]
            k = 0
            while k < len(lines) and is_lemma(lines[k]): k += 1
            if k:
                if cur: paras.append(("prose", cur)); cur = []
                paras.append(("verse", lines[:k]))
            for line in lines[k:]:
                if cur and DN_NUM.match(line):
                    paras.append(("prose", cur)); cur = []
                cur.append(line)
        if cur: paras.append(("prose", cur))
        merged = []
        for m, ls in paras:
            if m == "verse" and merged and merged[-1][0] == "verse": merged[-1] = ("verse", merged[-1][1] + ls)
            else: merged.append((m, ls))
        paras = merged
        out = [dn_verse(ls) if m == "verse" else dn_para(ls) for m, ls in paras]
        # a paragraph followed by a numbered one is complete: a final comma is a misread full stop, a missing stop was dropped
        for i in range(len(out) - 1):
            if paras[i][0] == "prose" and DN_NUM.match(paras[i + 1][1][0]) and re.search(r"[A-Za-z,]$", out[i]):
                out[i] = out[i].rstrip(",") + "."
        return out

    chapters = []
    intro = body(argument + 1, stanzas)
    after = body(explanation + 1, book1)
    chapters.append({"section": None, "title": "Stanzas", "paras": intro + [dn_verse(st) for st in poem] + after})

    for bk, (a, b) in enumerate([(book1, book2), (book2, end)], start=1):
        section = ["Book I · The night of sense", "Book II · The night of the spirit"][bk - 1]
        heads = [i for i in range(a, b) if re.match(r"^CHAPTER\s+\S+\s*$", L[i].strip())]
        prelude = body(a + 1, heads[0])
        prelude = [p for p in prelude if not re.fullmatch(r"OF THE NIGHT OF (THE )?S\w+\.?", p.upper()) and not p.isupper()]
        for n, h in enumerate(heads, start=1):
            nxt = heads[n] if n < len(heads) else b
            j = h + 1
            while not L[j].strip(): j += 1
            title_lines = []
            if re.match(r"^STANZA\s", L[j].strip()):
                title = toc[(bk, n)]
                j += 1
            else:
                while True:
                    s = L[j].strip()
                    if s: title_lines.append(s)
                    j += 1
                    if s and re.search(r"[.!?]['’]?\s*$", s): break
                title = dn_para(title_lines)
            title = sentence_case(title.rstrip(".").replace(" ; ", "; ").replace(" ;", ";"))
            paras = body(j, nxt)
            if n == 1: paras = prelude + paras
            chapters.append({"section": section, "title": f"{roman(n)}. {title}", "paras": [p for p in paras if p]})
    return chapters


# ================================================================ The Little Flowers of Saint Francis (Alger, 1898)

FL_EVEN = "the little flowers of"
FL_ODD = "saint francis of assisi"

def fl_is_head(l, before="", after=""):
    """Running heads ("124 The Little Flowers of" / "Saint Francis of Assisi. 125"). They always stand alone, with
    blank lines on both sides, so a line of text that happens to read "Saint Francis of ..." is never taken."""
    s = re.sub(r"\s+", " ", l.strip())
    if not s or before.strip() or after.strip() or len(s) > 48 or len(s.split()) > 8: return False
    low = re.sub(r"\s+", " ", re.sub(r"[^a-z ]", "", s.lower())).strip()
    if re.search(r"\s(of|oC|oi|ot|o£|tif|ciC)$", s):                             # even pages
        tail = re.sub(r"^[\d\sIilo]*", "", low)
        return difflib.SequenceMatcher(None, tail, FL_EVEN).ratio() >= 0.45
    if re.match(r"^\W?\S?(Sa|aint|SaC|Sad|cS|\^)", s) and re.search(r"\s(of|oC|oi|ot|o£|c£)\s", s):   # odd pages
        return True
    return bool(re.match(r"^\d[\d ]*\s+\S*Flo\S*\s+of\s+", s))                  # last page: "228 Flowers of Saint Francis."

FL_RULES = [(r"f(?=[a-z])", "s", 0.0), (r"fl(?=[aeiouy])", "ss", 0.4), (r"[lfi]T", "ss", 0.3), (r"fti", "sh", 0.4), (r"lh", "sh", 0.5),
            (r"fn(?=[aeiou])", "sh", 0.6), (r"li", "h", 0.6), (r"iT", "ss", 0.3), (r"fh", "st", 0.5), (r"fie", "fle", 0.6),
            (r"(?<=[a-z])H(?=[a-z])", "li", 0.4), (r"(?<=[a-z])U(?=[a-z]|$)", "ll", 0.4), (r"ni", "m", 0.6), (r"n", "u", 0.8),
            (r"(?<=[aeiou])[li](?=[ckt])", "s", 0.7), (r"^l(?=[aeiou])", "s", 0.8), (r"^I(?=p)", "s", 0.6), (r"c(?=[a-z])", "e", 0.7), (r"fl(?=$|[^i])", "st", 0.5), (r"fb", "st", 0.5), (r"ll(?=$)", "st", 1), (r"ll(?=[a-z])", "st", 1),
            (r"fli", "sh", 0.5), (r"lli", "sh", 0.7), (r"Ili", "sh", 0.7), (r"^Ih", "Sh", 0.7), (r"^ih", "sh", 0.7), (r"ft", "ct", 1),
            (r"6l", "ct", 0.3), (r"6t", "ct", 0.3), (r"\(5l", "ct", 0.3), (r"5l", "ct", 0.3), (r"6", "ct", 0.5), (r"dl", "ct", 1),
            (r"m", "in", 1), (r"rn", "m", 1), (r"ii", "u", 1), (r"h", "li", 1), (r"^H", "Li", 1), (r"^U", "Li", 1),
            (r"c", "e", 1), (r"cl", "d", 1), (r"7i", "n", 0.5), (r"fj", "ff", 1), (r"vv", "w", 0.3), (r"^A(?=ngular)", "si", 0.5),
            (r"^J", "", 1), (r"^I(?=[a-z])", "l", 1), (r"in$", "is", 1)]
FL_NAMES = {"Affifi": "Assisi", "Maffa": "Massa", "Sylvefter": "Sylvester", "Silvefter": "Silvester", "Sylveller": "Sylvester",
            "Silveller": "Silvester", "Cafale": "Casale", "Francifcan": "Franciscan", "Francifcans": "Franciscans",
            "Angular": "singular", "Angularly": "singularly", "Paternofters": "Paternosters", "Quiiitavalle": "Quintavalle",
            "Qiiintavalle": "Quintavalle", "Ifliiah": "Isaiah", "Compoftella": "Compostella", "Bleifed": "Blessed",
            "Mafs": "Mass", "Maffes": "Masses", "fennight": "sennight", "faecula": "saecula", "faeculortnn": "saeculorum",
            "Hoc": "Hoc", "ejl": "est", "eji": "est", "enhn": "enim", "meimi": "meum", "nieum": "meum", "e7izm": "enim",
            "Phihp": "Philip", "Humihty": "Humility", "EHas": "Elias", "Hke": "like", "Uke": "like", "hght": "light",
            "beheve": "believe", "Ilkimination": "Illumination", "Sifters": "Sisters", "Sifter": "Sister", "Clara": "Clara",
            "Rufus": "Rufus", "Gubbio": "Gubbio", "Offida": "Offida", "Soffiano": "Soffiano", "Sofiiano": "Soffiano",
            "Fallerone": "Fallerone", "Bernardone": "Bernardone", "Monticello": "Monticello", "Forano": "Forano",
            "imto": "unto", "wito": "unto", "Ihall": "shall", "ihall": "shall", "fliall": "shall", "lliall": "shall",
            "mufe": "muse", "mufing": "musing", "fojourned": "sojourned", "fuavity": "suavity", "Nones": "Nones",
            "Chriil": "Christ", "Chriit": "Christ", "Chrifi": "Christ", "Chrifl": "Christ", "Chrijl": "Christ", "Chriji": "Christ",
            "Jeftis": "Jesus", "Jefiis": "Jesus", "Apofi": "Apostle", "moil": "most", "Moil": "Most", "mod": "most", "MaiTa": "Massa",
            "Majfa": "Massa", "Affedion": "Affection", "afflided": "afflicted", "afflidted": "afflicted", "malefadlor": "malefactor",
            "perfedly": "perfectly", "fandity": "sanctity", "fan6lity": "sanctity", "AiTifi": "Assisi", "SofBano": "Soffiano",
            "confldering": "considering", "conflder": "consider", "blelTed": "blessed", "Blefled": "Blessed", "alTembled": "assembled",
            "afflidted": "afflicted", "Faftiion": "Fashion", "Confiftory": "Consistory", "Ele6luary": "Electuary", "Eleftuary": "Electuary",
            "fafliion": "fashion", "anfvver": "answer", "anfvvered": "answered", "anfvvering": "answering", "Forafinuch": "Forasmuch"}

# words that are real in both spellings (long s or f); decided by context
def fl_ambig(w, prev, nxt, nxt2, prev2=""):
    norm = lambda x: fl_word(fl_glyphs(x)).lower() if re.search(r"[A-Za-z]", x) and x.lower() not in FL_AMBIG else x.lower()
    lw, p, n = w.lower(), norm(prev), norm(nxt)
    nxt2, prev2 = norm(nxt2), norm(prev2)
    S = lambda s: recase(s, w)
    if lw == "fo": return S("so")
    if lw in ("fame",): return w if p in ("great", "his", "her", "whose", "the") and n == "of" and nxt2 in ("the", "his", "their", "her") and prev2 not in ("required",) else S("same")
    if lw in ("foul", "fouls"): return w if p in ("a", "most", "moft") and n in ("spirit", "spirits", "fiend", "fiends") else S("s" + lw[1:])
    if lw == "faith":
        if p in ("his", "the", "their", "our", "my", "your", "thy", "in", "of", "to", "holy", "true", "a", "and", "with", "by", "hath", "her"): return w
        return S("saith") if (prev[:1].isupper() or p in ("he", "she", "it", "who", "which", "that", "lord", "god", "thus", "christ")) else w
    if lw == "left":
        if p in ("fear", "fearing", "feared", "afraid", "beware", "fearful", "dreading", "doubting", "troubled") or \
           (n in ("he", "she", "they", "i", "we", "you", "ye", "thou", "it", "any", "perchance", "haply", "peradventure", "that", "the", "his", "their", "some", "worldly") and
            nxt2.lower() in ("should", "fhould", "shall", "fhall", "might", "may", "be", "fall", "die", "fliould", "lose", "lofe", "hurt", "pefter", "fet", "set", "become", "honors", "pride", "grow")) or \
           (p in ("penitence,", "penitence") or n in ("he", "your") and nxt2.lower() in ("grow", "pride")):
            return S("lest")
        return w
    if lw == "fell": return S("sell") if p in ("and", "to") and n == "that" else w
    if lw == "fold": return S("sold")
    if lw in ("fee", "fet", "fay", "fon", "fons", "fave", "fins", "fms", "fm", "fin", "fea", "fide", "fides", "fend", "fees", "fun", "fang", "fad", "fat", "feat", "fake", "fore", "rife", "loft", "faints", "faintly", "fitting", "fit", "fought", "fear", "fight", "filly"):
        if lw == "fear" or lw == "fit" and p in ("he", "do", "not", "you", "to", "they", "did") and n not in ("for", "to"): pass
        if lw == "fear": return w
        if lw == "fight": return w if n in ("a", "the") or p in ("and", "to", "good") else S("sight")
        if lw == "fit": return S("sit") if p in ("to", "him", "did", "and") or n in ("befide", "beside", "down") else w
        if lw == "fitting": return S("sitting")
        if lw == "fought": return S("sought") if n not in ("valiantly", "against") else w
        if lw == "fat": return S("sat")
        if lw == "feat": return S("seat")
        if lw == "fake": return S("sake")
        if lw == "fun": return S("sun")
        if lw == "fang": return S("sang")
        if lw == "fad": return S("sad")
        if lw == "fore": return w if p in ("there", "where", "wherefore", "before") or n in ("-",) else S("sore")
        if lw == "faints": return S("saints")
        if lw == "faintly": return S("saintly")
        if lw == "loft": return S("lost")
        if lw == "rife": return S("rise")
        if lw == "filly": return S("silly")
        if lw == "fms": return S("sins")
        if lw == "fm": return S("sin")
        return S("s" + lw[1:])
    if lw == "found": return S("sound") if (p in ("the", "which", "a") and n in ("of", "that")) or p == "perfectly" or (p == "and" and prev2.strip(",.") == "safe") else w
    if lw == "fire": return w
    if lw == "fix": return S("six") if n in ("cubits", "months", "days", "years", "brethren") else w
    if lw == "wife": return w if p in ("my", "his", "thy", "your", "a", "the") and n not in ("words", "design", "decrees", "men", "man") else S("wise")
    if lw == "flew": return w
    if lw == "flight": return S("slight") if p == ";" or n in ("are",) else w
    if lw == "flow": return S("slow") if p == "is" else w
    if lw == "fix": return w
    if lw == "fully": return w
    if lw == "fever": return w
    if lw == "fingers": return w
    if lw == "four": return w
    if lw == "fa": return w
    return None

FL_AMBIG = {"fo", "fame", "foul", "fouls", "faith", "left", "fell", "fold", "fee", "fet", "fay", "fon", "fons", "fave", "fins", "fms", "fm",
            "fin", "fea", "fide", "fides", "fend", "fees", "fun", "fang", "fad", "fat", "feat", "fake", "fore", "rife", "loft", "faints", "faintly",
            "fitting", "fit", "fought", "fear", "fight", "filly", "found", "fire", "fix", "wife", "flight", "flow"}
FL_LOG = collections.Counter()

SUFFIXES = ("", "s", "es", "ed", "ing", "ly", "ness", "less", "ful", "fully", "eth", "ment", "ments", "ously", "ion", "ions")
def fl_known(v):
    """A spelling is acceptable if the corpus has it, or has its stem with an ordinary suffix."""
    if freq(v) >= 2: return freq(v)
    lv = v.lower()
    if lv.endswith("s") and freq(lv[:-1]) >= 3: return 1
    for suf in SUFFIXES[1:]:
        if lv.endswith(suf) and len(lv) - len(suf) >= 3:
            stem = lv[:-len(suf)]
            for st in (stem, stem + "e", stem[:-1] + "y" if stem.endswith("i") else None):
                if st and len(st) >= 4 and freq(st) >= 3: return 1
    return 0

def fl_word(w, prev="", nxt="", nxt2="", prev2=""):
    """Undo the long s (printed ſ, read as f) and the ct and st ligatures, and other OCR slips, in one word."""
    if not re.search(r"[A-Za-z]", w): return w
    if re.fullmatch(r"[A-Za-z]+(?:-[A-Za-z]+)+[^A-Za-z]*", w):                    # man-fervant -> man-servant
        tail = re.search(r"[^A-Za-z]*$", w).group(0)
        return "-".join(fl_word(x) for x in w[:len(w) - len(tail)].split("-")) + tail
    m = re.match(r"^([^A-Za-z]*)([A-Za-z][A-Za-z']*?[A-Za-z]|[A-Za-z])([^A-Za-z]*)$", w)
    if not m: return w
    pre, core, post = m.groups()
    if "'" in core:   # Chrift's
        a, _, b = core.partition("'")
        return pre + fl_word(a, prev, nxt, nxt2) + "'" + b + post
    if core in FL_NAMES: return pre + FL_NAMES[core] + post
    if core.lower() in FL_AMBIG:
        r = fl_ambig(core, prev.strip(".,;:!?\"'"), nxt.strip(".,;:!?\"'") if not re.search(r"[.,;:!?]$", core + post) else "", nxt2.strip(".,;:!?\"'"), prev2)
        if r is not None:
            if r != core: FL_LOG[(core, r)] += 1
            return pre + r + post
    if known(core, 5) and "f" not in core[:-1]: return w
    core = re.sub(r"(?<=[a-z])nefs$", "ness", core); core = re.sub(r"(?<=[a-z])lefs$", "less", core)
    core = re.sub(r"(?<=[a-z])nefs(?=es$)", "ness", core)
    cands = candidates(core, FL_RULES, 2.1)
    best = None
    orig = freq(core)
    for v, c in cands.items():
        f = freq(v)
        if f < 5:
            if c > 1.0 or not fl_known(v): continue
            f = 1
        if v == core: c = 0.0
        key = (c, -f)
        if best is None or key < best[0]: best = (key, v)
    if best is None:
        if not fl_known(core) and re.search(r"f[pcmnwkbdgqv]", core):
            v = re.sub(r"f(?=[pcmnwkbdgqv])", "s", core)
            FL_LOG[(core, v)] += 1
            return pre + v + post
        return w
    v = best[1]
    if v != core and orig >= 5 and freq(v) < 8 * orig and best[0][0] == 0:   # both real words: keep as printed
        return w
    if v == core and "f" in core[:-1] and orig <= 3:                         # the f reading is only a dictionary entry
        alts = [(freq(x), x) for x, c in cands.items() if c == 0 and x != core and fl_known(x)]
        if alts: v = max(alts)[1]
    if v != core: FL_LOG[(core, v)] += 1
    return pre + (recase(v, core) if not core[:1].isupper() else v[:1].upper() + v[1:]) + post

FL_FIX = [("fl:iall", "shall"), ("(hall", "fhall"), ("Of ^he", "Of the"), ("from lore Temptation", "from fore Temptation"), ("f orfake", "forfake"),
          ("Francis, • upon", "Francis, upon"), ("them,counfelled", "them, counfelled"), ("leave to fl}^ thence", "leave to fly thence"), ("in idipfum", "in idipfum"),
          ("birds and fifties", "birds and fifhes"), ("eve i fo", "even so"), ("AINT LOUIS", "SAINT LOUIS"), ("»^ ", ""), ("Apofbles", "Apostles"),
          ("Chrift.\\'\"", "Christ.'\""), ("Hell.\\'\"", "Hell.'\""), ("an}^", "any"), ("{■Aid", "said"), ("f aid", "said"),
          ("mockin[;ly", "mockingly"),
          ("i\\ony", "stony"), ("exceedin.GT", "exceeding"), ("thou } ", "thou? "), ("ftandins:", "ftanding"), ("feeins:", "feeing"),
          ("Hoc ejl corpus", "Hoc est corpus"), ("Hoc eji,", "Hoc est,"), ("Hoc ejl enhn", "Hoc est enim"), ("corpus meimi", "corpus meum"),
          ("e7izm corpus nieum", "enim corpus meum"), ("^' Lift tip yotir heart, Broth €7'- Bernard', lift lip your hearty", "\"Lift up your heart, Brother Bernard, lift up your heart!\""),
          ("\"hrift.", "Chrift."), ("bleifed", "bleffed"), ("bieffed", "bleffed"), ("confldering", "confidering"), ("afHiction", "affliction"),
          ("Apofi;le", "Apoftle"), ("Chrifi:", "Chrift"), ("PhiUp", "Philip"), ("fl;aff", "ftaff"), ("and.Chaftity", "and Chaftity"),
          ("reivealed", "revealed"), ("Ssaint", "Saint"), ("ferve ; in- inafmuch", "ferve ; inafmuch"), ("footHeps", "footfteps"), ("afiail", "affail"),
          ("whofover", "whofoever"), ("voucbfafed", "vouchfafed"), ("forafrauch", "forafmuch"), ("diftincStly", "diftinctly"),
          ("aflflicted", "afflicted"), ("dehre", "defire"), ("asrain", "again"), ("reviUngs", "revilings"), ("peeviflmefs", "peevifhnefs"),
          ("Hcs perfe", "lies perfe"), ("fscanding", "ftanding"), ("ffcanding", "ftanding"), ("firffc", "firft"), ("to hira", "to him"), ("praiied", "praifed"), ("floly", "holy"), ("fafliion", "fafhion"), ("Moniftero", "Monistero"),
          ("al]", "all"), ("be^^an", "began"), ("y\\h, ah, ah", "Ah, ah, ah"), ("clay came a]:)pointcd", "day came appointed"),
          ("v^^hen", "when"), ("P>ancis", "Francis"), ("sl}^", "fly"), ("conrideri;:g f.h'^ir", "confidering their"), ("{qqw", "seen"),
          ("ap^ain", "again"), ("the mod noble", "the most noble"), ("promifedjwith", "promifed with"),
          ("bleffingof", "bleffing of"), ("thatfame", "that fame"), ("ahofpital", "a hofpital"), ("allfpiritual", "all fpiritual"),
          ("yourf elves", "yourfelves"), ("f orfake", "forfake"), ("fceaila fcectdoriim", "faecula faeculorum"), ("fand ity", "fanctity"), ("blaaie", "blame"), ("he wa^", "he was"),
          ("wouki", "would"), ("rtream", "stream"), ("Ipcak", "Speak"), ("Everlail-'^ ingGod;", "Everlafting God;"),
          ("exprefQy", "exprefsly"), ("Bidiops", "Bishops"), ("bein^", "being"), ("affliaed", "afflicted"), ("procefifion", "proceffion"),
          ("fciit", "fent"), ("pafflng", "paffing"), ("but the Tick", "but the fick"), ("whatfover", "whatfoever"), ("pais barefoot", "pafs barefoot"),
          ("At lalt", "At laft"), ("feoff ed", "fcoffed"), ("Plood", "flood"), ("waters and fait", "waters and falt"), ("kicid", "lucid"),
          ("compaliion", "compaffion"), ("Reqidan (Eterjiain", "Requiem Aeternam"), ("alk of Thee", "afk of Thee"), ("the lafi:", "the laft"),
          ("confeifed", "confeffed"), ("doruiiamy et reqidefcam", "dormiam et requiefcam"), ("finiilied", "finifhed"),
          ("miraculoully", "miraculoufly"), ("promiled", "promifed"), ("v^rhich", "which"), ("fanc^lity", "fanctity"), ("Moil Holy", "Most Holy"), ("hoHnefs", "holinefs"), ("Qui pridie", "Qui pridie"), ("in faecula faeculortnn", "in saecula saeculorum")]

FL_JOINED = [("reivealed", "revealed"), ("afHiction", "affliction"), ("footHeps", "footsteps"), ("promifedjwith", "promised with"),
             ("promisedjwith", "promised with"), ("in faecula faeculorum", "in saecula saeculorum"), ("idipfum", "idipsum"), ("Subaffio", "Subasio"), ("forafrauch", "forasmuch"), ("aflflicted", "afflicted"), ("aflfli6led", "afflicted")]

def fl_quotes(p):
    p = re.sub(r"(\*\*|'\*|\*'|•\*|\*\"|\"\*|''|\^')", '"', p)
    p = p.replace("*", "'")
    return p

def fl_glyphs(l):
    """Character-level OCR slips that are certain: the ct ligature read as 6l, 6t, 61, (5l; the long s with ^ marks."""
    l = l.replace("^he ", "the ").replace("•*", '"').replace(" • ", " ").replace("•", "")
    l = re.sub(r"(?<=[A-Za-z])(?:6l|6t|61|51|\(5l|\(51:|\(5|6)(?=[a-z]|\b)", "ct", l)
    l = re.sub(r"(?<=\s)\}(?=[\s\"']|$)", "?", l)                           # "Wonderful }" (a question mark)
    l = re.sub(r"(?<=[a-z])\s\}(?=[\s\"']|$)", "?", l)
    l = re.sub(r"(^|(?<=[\s\"]))(?:\]5|15|l\^|\]\^)(?=r[oe]th)", "B", l)        # ]5rother, 15rother, l^rethren
    l = re.sub(r"(?<=\s)1(?=\s+[a-z])", "I", l)                                # "and 1 promise"
    l = re.sub(r"\b111\b", "Ill", l)
    l = re.sub(r"\b00\b", "oo", l)
    return l

def fl_para(lines):
    lines = [re.sub(r"\s+", " ", l.strip()) for l in lines]
    raw = "\n".join(lines)
    for a, b in FL_FIX:                         # fixes are written against the printed (long s) text, on one line or across two
        pat = r"[ \n]".join(re.escape(x) for x in re.split(r"[ \n]", a))
        raw = re.sub(pat, lambda m: b, raw)
    lines = [fl_glyphs(l) for l in raw.split("\n")]
    text = join_lines(lines, lambda w: fl_word(w))
    for a, b in FL_JOINED: text = text.replace(a, b)
    text = re.sub(r"(?<=[\w.,;:!?\"'])\^(?=[\s.,;:\"']|$)|\s\^(?=\s)", "", text)   # footnote markers
    text = fl_quotes(text)
    toks = text.split(" ")
    toks = [fl_word(t, toks[i - 1] if i else "", toks[i + 1] if i + 1 < len(toks) else "", toks[i + 2] if i + 2 < len(toks) else "",
                    toks[i - 2] if i > 1 else "") for i, t in enumerate(toks)]
    text = " ".join(toks)
    # small capitals that open each chapter: "THE firft" -> "The first", "SAINT LOUIS, King" -> "Saint Louis, King"
    m = re.match(r"^((?:[A-Z]{1,}[,.]?\s+)*[A-Z]{2,}[,.]?)(?=\s|$)", text)
    if m:
        cased, _ = vocab()
        ws = m.group(1).split(" ")
        fixed = []
        for i, x in enumerate(ws):
            core = re.sub(r"[^A-Za-z]", "", x)
            t = core.capitalize()
            if i and core != "I" and cased.get(core.lower(), 0) > cased.get(t, 0): t = core.lower()
            fixed.append(x.replace(core, t))
        text = " ".join(fixed) + text[m.end():]
    text = tighten(text)
    text = fix_double_quotes(text)
    text = fix_single_quotes(text)
    text = tighten(text)
    return text

def split_long(p, target=900, hard=1400):
    """This printing runs most chapters as one paragraph (the OCR keeps no indents inside a page). For reading on a
    phone, break very long paragraphs at a sentence end that lies outside any quotation (an even number of double
    quotes before it), aiming at ~target characters a piece."""
    if len(p) <= hard: return [p]
    if p.count('"') % 2:
        # an unclosed quotation (the printing sometimes omits the closing mark): parity cannot be trusted, so break
        # only where a new speaker's line starts (after a closing quote), which is also where the book would indent
        cuts, last = [], 0
        for m in re.finditer(r'[.!?]"(?=\s+[A-Z])', p):
            if m.end() - last >= target and len(p) - m.end() >= 300: cuts.append(m.end()); last = m.end()
        parts, prev = [], 0
        for c in cuts: parts.append(p[prev:c].strip()); prev = c
        parts.append(p[prev:].strip())
        return [x for x in parts if x]
    cuts, last = [], 0
    for m in re.finditer(r'[.!?]"?(?=\s+[A-Z])', p):
        end = m.end()
        if p[:end].count('"') % 2 == 0 and end - last >= target and len(p) - end >= 300:
            cuts.append(end); last = end
    parts, prev = [], 0
    for c in cuts:
        parts.append(p[prev:c].strip()); prev = c
    parts.append(p[prev:].strip())
    return [x for x in parts if x]

def flowers():
    L = read_lines("flowers_alger.txt")
    N = [re.sub(r"\s+", " ", l.strip()) for l in L]
    contents = next(i for i, l in enumerate(N) if l.startswith("CONTENTS"))
    start = next(i for i in range(contents + 1, len(N)) if N[i] == "The Little Flowers")
    end = next(i for i in range(start, len(N)) if N[i].startswith("University Press"))

    # titles from the contents (roman type, cleaner than the italic headings over each chapter)
    titles, cur = [], None
    for l in L[contents + 1:start]:
        s = re.sub(r"\s+", " ", l.strip())
        if not s or re.fullmatch(r"(PAGE|PAOB|TAOE|PAGB|PAQS|PA\S\S)", s) or (len(s) < 30 and re.search(r"(nttn|ntent|onttn|tonttn|ontents)", s)): continue
        if re.match(r"^CHAPTER\b", s):
            cur = []; titles.append(cur); continue
        if cur is not None: cur.append(s)
    def clean_title(ls):
        ls = [l for l in ls if not re.fullmatch(r"PA\S{2}", l)]
        t = join_lines(ls, lambda w: w)
        t = re.sub(r"\s+\d+\s+x[xvil]+\s+\S+$", "", t)                     # "216 xxvi Contents" (page foot of the contents)
        t = re.sub(r"\s*(?:[.•,]\s*){2,}\s*\S*\s*$", "", t)                # dot leaders and the page number
        t = re.sub(r"\s+(?:\d[\d ]*|[\dlIoOSsy]{1,3}\s?\d*|o \d+)$", "", t).strip(" .,")
        t = re.sub(r"(?<=[a-z])\s?(\d[\d ]*|loi|yS|8s)$", "", t).strip(" .,")
        return t
    titles = [re.sub(r"\. and\b", ", and", clean_title(t)) for t in titles]

    def junk(b):
        first = b[0]
        return (re.match(r"^\^\s+[A-Z]", first) is not None                         # footnotes: "^ The Stigmata."
                or first.startswith("From the Painting")                              # the plate and its caption
                or (len(b) == 1 and first.isupper() and len(first) > 12 and not re.match(r"^CHAPTER|^[XLVI]+\.$", first)))
    blocks = assemble(L[start + 1:end], fl_is_head, None, catchwords=True, junk=junk)

    chapters, cur, n = [], None, 0
    i = 0
    while i < len(blocks):
        b = blocks[i]
        first = b["lines"][0]
        if re.match(r"^CHAPTER\s+\S+\s*$", first) or (n and re.fullmatch(roman(n + 1) + r"\.", first)):
            n += 1
            # skip the italic heading: blocks up to the first one that opens with small capitals
            i += 1
            head = list(b["lines"][1:])
            while i < len(blocks) and not re.match(r"^[\W^]*(?:[A-Z]{2,}|A [A-Z]{2,})(?=[\s,.;:]|$)", blocks[i]["lines"][0]):
                head += blocks[i]["lines"]; i += 1
            t = fl_para([titles[n - 1]])
            cur = {"section": None, "title": t, "head": fl_para(head), "blocks": []}
            chapters.append(cur)
            continue
        if cur is not None: cur["blocks"].append(b)
        i += 1

    out = []
    for k, c in enumerate(chapters, start=1):
        paras = []
        for b in c["blocks"]:
            prev = paras[-1] if paras else None
            ended = prev and re.search(r"[.!?]['\"*]*\s*$", prev[-1]) and not prev[-1].endswith("-")
            # at a page top the indent is lost; a page that ends inside an open quotation runs on
            in_quote = prev and fl_quotes(" ".join(prev)).count('"') % 2 == 1
            if prev and (not ended or (b["page_start"] and in_quote)):
                prev.extend(b["lines"])
            else:
                paras.append(list(b["lines"]))
        ps = [x for p in paras for x in split_long(fl_para(p))]
        title = c["title"]
        if k == 1:
            # chapter I is headed by the book's long invocation; keep it as the opening paragraph
            ps = [title if title.endswith(".") else title + "."] + ps
            title = "In the name of Our Lord and Saviour Jesus Christ"
        title = sentence_case(title.rstrip(". "))
        out.append({"section": None, "title": f"{roman(k)}. {title}", "paras": [p for p in ps if p]})
    return out
