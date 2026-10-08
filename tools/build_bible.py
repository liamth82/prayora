"""Write the Douay-Rheims (Challoner) as bible/index.json and bible/<id>.json for the app's reader.
Input: drc.json from usfm_to_json.py."""
import json, os, re, sys

BOOKS = [  # (DR name, modern name, testament, group, id)
 ("Genesis","Genesis","OT","The Law","gen"),("Exodus","Exodus","OT","The Law","exo"),("Leviticus","Leviticus","OT","The Law","lev"),
 ("Numbers","Numbers","OT","The Law","num"),("Deuteronomy","Deuteronomy","OT","The Law","deu"),
 ("Josue","Joshua","OT","History","jos"),("Judges","Judges","OT","History","jdg"),("Ruth","Ruth","OT","History","rut"),
 ("1 Kings","1 Samuel","OT","History","1sa"),("2 Kings","2 Samuel","OT","History","2sa"),("3 Kings","1 Kings","OT","History","1ki"),
 ("4 Kings","2 Kings","OT","History","2ki"),("1 Paralipomenon","1 Chronicles","OT","History","1ch"),("2 Paralipomenon","2 Chronicles","OT","History","2ch"),
 ("1 Esdras","Ezra","OT","History","ezr"),("2 Esdras","Nehemiah","OT","History","neh"),("Tobias","Tobit","OT","History","tob"),
 ("Judith","Judith","OT","History","jdt"),("Esther","Esther","OT","History","est"),("1 Machabees","1 Maccabees","OT","History","1ma"),
 ("2 Machabees","2 Maccabees","OT","History","2ma"),
 ("Job","Job","OT","Wisdom","job"),("Psalms","Psalms","OT","Wisdom","psa"),("Proverbs","Proverbs","OT","Wisdom","pro"),
 ("Ecclesiastes","Ecclesiastes","OT","Wisdom","ecc"),("Canticles","Song of Songs","OT","Wisdom","sng"),("Wisdom","Wisdom","OT","Wisdom","wis"),
 ("Ecclesiasticus","Sirach","OT","Wisdom","sir"),
 ("Isaias","Isaiah","OT","The Prophets","isa"),("Jeremias","Jeremiah","OT","The Prophets","jer"),("Lamentations","Lamentations","OT","The Prophets","lam"),
 ("Baruch","Baruch","OT","The Prophets","bar"),("Ezechiel","Ezekiel","OT","The Prophets","ezk"),("Daniel","Daniel","OT","The Prophets","dan"),
 ("Osee","Hosea","OT","The Prophets","hos"),("Joel","Joel","OT","The Prophets","jol"),("Amos","Amos","OT","The Prophets","amo"),
 ("Abdias","Obadiah","OT","The Prophets","oba"),("Jonas","Jonah","OT","The Prophets","jon"),("Micheas","Micah","OT","The Prophets","mic"),
 ("Nahum","Nahum","OT","The Prophets","nam"),("Habacuc","Habakkuk","OT","The Prophets","hab"),("Sophonias","Zephaniah","OT","The Prophets","zep"),
 ("Aggeus","Haggai","OT","The Prophets","hag"),("Zacharias","Zechariah","OT","The Prophets","zec"),("Malachias","Malachi","OT","The Prophets","mal"),
 ("Matthew","Matthew","NT","The Gospels","mat"),("Mark","Mark","NT","The Gospels","mrk"),("Luke","Luke","NT","The Gospels","luk"),
 ("John","John","NT","The Gospels","jhn"),("Acts","Acts of the Apostles","NT","Acts","act"),
 ("Romans","Romans","NT","Letters of Saint Paul","rom"),("1 Corinthians","1 Corinthians","NT","Letters of Saint Paul","1co"),
 ("2 Corinthians","2 Corinthians","NT","Letters of Saint Paul","2co"),("Galatians","Galatians","NT","Letters of Saint Paul","gal"),
 ("Ephesians","Ephesians","NT","Letters of Saint Paul","eph"),("Philippians","Philippians","NT","Letters of Saint Paul","php"),
 ("Colossians","Colossians","NT","Letters of Saint Paul","col"),("1 Thessalonians","1 Thessalonians","NT","Letters of Saint Paul","1th"),
 ("2 Thessalonians","2 Thessalonians","NT","Letters of Saint Paul","2th"),("1 Timothy","1 Timothy","NT","Letters of Saint Paul","1ti"),
 ("2 Timothy","2 Timothy","NT","Letters of Saint Paul","2ti"),("Titus","Titus","NT","Letters of Saint Paul","tit"),
 ("Philemon","Philemon","NT","Letters of Saint Paul","phm"),("Hebrews","Hebrews","NT","Letters of Saint Paul","heb"),
 ("James","James","NT","Catholic Letters","jas"),("1 Peter","1 Peter","NT","Catholic Letters","1pe"),("2 Peter","2 Peter","NT","Catholic Letters","2pe"),
 ("1 John","1 John","NT","Catholic Letters","1jn"),("2 John","2 John","NT","Catholic Letters","2jn"),("3 John","3 John","NT","Catholic Letters","3jn"),
 ("Jude","Jude","NT","Catholic Letters","jud"),("Apocalypse","Revelation","NT","Apocalypse","rev"),
]

def main(src, out):
    bible = json.load(open(src))
    os.makedirs(out, exist_ok=True)
    index = []
    for dr, modern, test, group, bid in BOOKS:
        b = bible[dr]
        chapters = []
        for c in sorted(b, key=int):
            vs = [[int(v), re.sub(r"\s+", " ", t.replace("*", "")).strip()] for v, t in sorted(b[c].items(), key=lambda x: int(x[0]))]
            chapters.append(vs)
        json.dump({"id": bid, "name": dr, "modern": modern, "chapters": chapters}, open(os.path.join(out, bid + ".json"), "w"),
                  ensure_ascii=False, separators=(",", ":"))
        index.append({"id": bid, "name": dr, "modern": modern, "testament": test, "group": group, "chapters": len(chapters)})
    json.dump(index, open(os.path.join(out, "index.json"), "w"), ensure_ascii=False, indent=0)
    print(len(index), "books")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
