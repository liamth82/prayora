"""Export 1962 Missal propers (English + Latin) per day as JSON, using Missale Meum.
Usage (from missalemeum/backend): python export_ef.py START_DATE DAYS OUT_DIR
"""
import datetime, json, os, sys
from api import controller

COLORS = {"w": "white", "r": "red", "g": "green", "v": "violet", "b": "black", "p": "rose"}

def color_of(cid):
    try:
        return COLORS.get(cid.split(":")[-1][:1], "")
    except Exception:
        return ""

def export(date_):
    cal = controller.get_calendar(date_.year, "en")
    day = cal.get_day(date_)
    propers = controller.get_proper_by_date(date_, "en")
    vern, lat = propers[0]
    sections = []
    for sid in vern.keys():
        sv, sl = vern.get_section(sid), lat.get_section(sid)
        sections.append({
            "id": sid,
            "label": sv.label if sv else sid,
            "en": sv.get_body() if sv else [],
            "la": sl.get_body() if sl else [],
        })
    cid = day.get_celebration_id() or ""
    tid = day.get_tempora_id() or ""
    col = color_of(tid) if (cid.startswith(":feria") or not color_of(cid)) and tid else color_of(cid)
    title = day.get_celebration_name()
    if title == "Feria" and day.get_tempora_name():
        title = day.get_tempora_name()
    return {
        "form": "EF",
        "date": date_.isoformat(),
        "title": title,
        "tempora": day.get_tempora_name(),
        "rank": day.get_celebration_rank(),
        "color": col or color_of(cid),
        "id": cid,
        "commemorations": list(day.get_commemorations_titles() or []),
        "sections": sections,
    }

if __name__ == "__main__":
    start = datetime.date.fromisoformat(sys.argv[1])
    days = int(sys.argv[2])
    out = sys.argv[3]
    os.makedirs(out, exist_ok=True)
    ok = 0
    for i in range(days):
        d = start + datetime.timedelta(days=i)
        try:
            data = export(d)
            with open(os.path.join(out, d.isoformat() + ".json"), "w") as f:
                json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
            ok += 1
        except Exception as e:
            print("FAIL", d, repr(e), file=sys.stderr)
    print(f"exported {ok}/{days}")
