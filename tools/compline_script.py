"""Print the Compline recording script (markdown) from mobile/src/compline.ts, one numbered line per clip."""
import json, subprocess, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
js = "import('./src/compline.ts').then(m=>console.log(JSON.stringify(m.COMPLINE)))"
secs = json.loads(subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "-e", js],
                                 cwd=os.path.join(ROOT, "mobile"), capture_output=True, text=True, check=True).stdout)
out = []
for s in secs:
    out.append(f"## Section {s['n']} · {s['title']}\n")
    for i, l in enumerate(s["lines"], 1):
        t = l["text"].replace("\n", " / ")
        lab = f"*{l['label']}* · " if l.get("label") else ""
        hold = f" *(silence {l['hold']}s)*" if l.get("hold") else ""
        out.append(f"{i}. {lab}{t}{hold}")
    out.append("")
print("\n".join(out))
