# Brief: writing saint-of-the-day entries for Ora

Ora is a Catholic prayer app (UK publisher, British spelling). Each saint entry appears on the Today and
Saints screens: a painting, a short history, and tiles for the Life, Prayers, Fast & penance and Meditation.
The existing entries live in `tools/saints_content.py` — read it first and match its voice exactly: warm,
plain, concrete, faithful to Catholic teaching, no gush, no clichés, no exclamation marks, no em-dashes
(use commas, colons or full stops), no headings or lists inside fields.

## Fields (all strings unless noted)
- `name`: "Saint Agnes", "Saints Timothy and Titus", "The Conversion of Saint Paul", "Our Lady of Lourdes".
- `dates`: life span and places, e.g. "c. 291–304 · Rome", "1225–1274 · Naples, Paris and Fossanova".
  For feasts of the Lord or Our Lady: when instituted or the event, e.g. "Apparitions of 1858".
- `history`: 45–75 words. Who they were and why they matter.
- `life`: 110–170 words. A fuller life with specific, accurate detail. Do not repeat `history` sentence for sentence.
- `prayerTo`: 45–75 words, original, addressed to the saint (or to God through them, or to Our Lady), ending "Amen."
- `penance`: 1–2 sentences. A concrete, moderate act for today linked to the saint: prayer, almsgiving,
  a small fast or abstinence, a work of mercy. Never anything harsh or risky for health; no extreme fasting.
- `meditation`: 1–3 sentences: a line or idea from or about the saint, then one searching question or invitation.
- `query`: a Wikimedia Commons search phrase likely to find a public-domain PAINTING (artist died before 1925),
  e.g. "Saint Agnes painting Zurbarán". Name a real artist who painted the subject when you can.
- `match` (list of lowercase words): words that appear in the day's Mass title (see the date list you are
  given) so the app knows the saint is kept that day. Use a distinctive word: ["agnes"], ["aquinas"],
  ["lourdes"], ["fisher"]. If both calendars keep the saint under different spellings, include both forms
  (e.g. ["aloysius"]). Avoid generic words like "saint", "apostle", "martyr", "mary" on their own.
- `efMatch` (optional string): ONLY when the 1962 (EF) calendar keeps the same saint on that date. Give a word
  from the EF title, e.g. "Agnes". The build then takes the 1962 Collect as the saint's prayer.
- `prayer` + `prayerSource` (optional): a traditional public-domain prayer associated with the saint, quoted
  accurately, with its source. Only use one if you are sure of the wording and that it is old (pre-1900) or
  ancient. Never quote a modern copyrighted translation. If unsure, leave both out; prayerTo is enough.

## Content rules
- Accuracy first. Use only facts you are confident of; prefer "tradition holds" for legend. No invented quotations.
  Quote saints only with famous, well-attested lines, and briefly.
- Original wording throughout: do not copy from Butler's Lives, Catholic Encyclopedia, Wikipedia or anywhere else.
- Distinguish defined doctrine from pious tradition (e.g. apparitions are approved private revelation).
- Charity toward other Christians (e.g. English martyrs: tell the truth without polemic).
- No living people's private details. No political opinions.

## Which days
You are given lines like `05-26 | OF: Saint Philip Neri, Priest [MEMORIAL] | EF: St. Philip Neri` for 2027.
- Write one entry per date for fixed-date saints and fixed-date feasts of Our Lord and Our Lady.
- Prefer the OF saint (memorial or feast before an optional memorial). If the OF day is a feria but the EF keeps a
  saint, write that EF saint. Where the OF has several optional memorials, choose the best known (and for England
  prefer the English or patron saint, e.g. George, Fisher and More, Bede, Augustine of Canterbury).
- SKIP movable feasts (Easter, Holy Week, Ascension, Pentecost, Trinity, Corpus Christi, Sacred Heart,
  Immaculate Heart, Mary Mother of the Church, Baptism of the Lord, Holy Family, Divine Mercy) and days that are
  only ferias, Sundays, octave days or Ember days.
- ALSO write any major General Roman Calendar saint whose fixed date falls on a Sunday or in Lent/Easter in 2027
  and so is missing from the list (you will be told which). For those, `match` is the word that would appear
  in a normal year's title.

## Output
Write a Python module at the path you are given, containing exactly:

```python
"""Saint-of-the-day entries for Ora, <months> (original text). See tools/SAINTS_BRIEF.md."""
SAINTS_NEW = {
 "MM-DD": dict(name=..., dates=..., match=[...], efMatch=..., history=..., life=..., prayerTo=..., penance=..., meditation=..., query=...),
 ...
}
```

Keys sorted by date. Use double-quoted strings; use curly apostrophes (’) or escape straight ones. Then run
`python3 -c "import sys; sys.path.insert(0,'tools'); import <module>; print(len(<module>.SAINTS_NEW))"` from the
repo root to prove it imports, and check every `match` word appears (case-insensitive) in that date's OF or EF
title from your list (except the Sunday/Lent extras). Do not edit any other file. Report the count and any
facts you were unsure of.
