"""Extract and clean a selection of sayings from Budge's 'The Paradise of the Holy Fathers', vol. II (1907, OCR text)."""
import json, re, sys

L = open(sys.argv[1], encoding="utf-8", errors="replace").read().split("\n")
sayings, cur, num = [], None, None
for raw in L:
    s = raw.strip()
    if not s or "Digitized" in s or re.match(r"^\d+\s*[a-z]?\s*\d*\s*$", s) or "Sayings of" in s or "S a y i n g s" in s or "tbe" in s:
        continue
    m = re.match(r"^(\d{1,4})\.\s+(.*)$", s)
    if m and m.group(2)[:1].isupper():
        if cur: sayings.append((num, cur))
        num, cur = int(m.group(1)), [m.group(2)]
        continue
    if cur is not None:
        s = re.sub(r"^[\"'4*]+\s*", "", s)   # Budge repeats quote marks at the start of every quoted line
        cur.append(s)
if cur: sayings.append((num, cur))

def join(lines):
    out = ""
    for l in lines:
        if out.endswith("-"):
            out = out[:-1] + l
        else:
            out = (out + " " + l).strip()
    return out

FIX = [(r"\bAbb[a-zA-Z&]\b", "Abba"), (r"Abba(?=[A-Z])", "Abba "), (r",(?=[A-Za-z])", ", "), (r"(^|\s)\"\s+", r"\1\""), (r"\s+\"(?=[,.;!?]|$)", "\""), (r"\baman\b", "a man"), (r"\s+([;:,.!?])", r"\1"), (r"\[|\]", ""),
       (r"\s+'\s+", " '"), (r"\s{2,}", " "), (r"\bAbbA\b", "Abba")]
clean = []
for n, lines in sayings:
    t = join(lines)
    for a, b in FIX:
        t = re.sub(a, b, t)
    t = re.sub(r"\.\s+(?=[a-z])", " ", t).strip()
    if re.search(r"\b(O\.M\.|B\.)\s", t) or t.startswith(("And he", "And they", "He said", "And the")): continue
    if not (90 <= len(t) <= 650): continue
    if re.search(r"[^A-Za-z0-9 ,.;:'\"!?()\-—’‘“”]", t): continue
    if re.search(r"\d", t): continue
    if t.count('"') % 2: t = t.replace('"', "")  # unbalanced quotes from OCR: drop them
    clean.append(t)
# Drop sayings with words that are not in a reference vocabulary (catches OCR errors).
import glob, os
vocab = set()
for path in [sys.argv[3]] + glob.glob(os.path.join(os.path.dirname(sys.argv[2]) or ".", "*.vocab")):
    pass
ref = json.load(open(sys.argv[3]))
for book in ref.values():
    for ch in book.values():
        for v in ch.values():
            vocab.update(w.lower() for w in re.findall(r"[A-Za-z]+", v))
for extra in sys.argv[4:]:
    vocab.update(w.lower() for w in re.findall(r"[A-Za-z]+", open(extra, encoding="utf-8", errors="replace").read()))
def ok(t):
    for w in re.findall(r"[A-Za-z]+", t):
        if w.lower() not in vocab and not w[0].isupper():
            return False
    return True
clean = [t for t in clean if ok(t)]
print(len(sayings), "sayings found,", len(clean), "kept after cleaning", file=sys.stderr)
json.dump(clean, open(sys.argv[2], "w"), indent=1, ensure_ascii=False)
