import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { currentHour, GLORIA, HOURS } from '../content';
import { load, save, todayKey } from '../storage';
import { C, F } from '../theme';
import { Panel, Sheet, Small, Sub, Title } from '../components/panels';
import PrayerSession, { PrayerLine, toLines } from './PrayerSession';
import Reader, { ReaderChapter } from './Reader';
import { SacredSymbol, SYMBOLS } from './Fast';
import type { Hour } from '../content';

/** The Hours: the Hour now, large, and the day's seven as tiles. Nothing to scroll. */
export default function Hours() {
  const [done, setDone] = useState<string[]>([]);
  const [sheet, setSheet] = useState<Hour | null>(null);
  const [praying, setPraying] = useState<Hour | null>(null);
  const [reading, setReading] = useState<Hour | null>(null);
  const key = 'prayed:' + todayKey();
  useEffect(() => { load<string[]>(key, []).then(setDone); }, [key]);
  const cur = currentHour();
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const rose = SYMBOLS.find((x) => x.name === 'rose') ?? SYMBOLS[0];

  const markDone = (id: string) => {
    const next = done.includes(id) ? done : [...done, id];
    setDone(next); save(key, next);
  };
  const linesFor = (x: Hour): PrayerLine[] => [
    { text: 'O God, come to my assistance.', secs: 5, label: 'Opening' },
    { text: 'O Lord, make haste to help me.', secs: 5 },
    ...toLines(GLORIA),
    ...toLines(x.psalm[1], x.psalm[0]),
    ...(x.cant ? toLines(x.cant[1], x.cant[0]) : []),
    ...toLines(GLORIA),
    { text: 'Let us bless the Lord.', secs: 4.5, label: 'Conclusion' },
    { text: 'Thanks be to God.', secs: 5 },
  ];
  const chapterFor = (x: Hour): ReaderChapter => ({
    key: 'hour:' + x.id, heading: 'The Hours', title: x.name, section: x.sub,
    units: [
      { text: '℣. O God, come to my assistance.' }, { text: '℟. O Lord, make haste to help me.' }, { text: GLORIA },
      { text: x.psalm[0].toUpperCase() }, { text: x.psalm[1] },
      ...(x.cant ? [{ text: x.cant[0].toUpperCase() }, { text: x.cant[1] }] : []),
      { text: GLORIA }, { text: '℣. Let us bless the Lord.' }, { text: '℟. Thanks be to God.' },
    ],
    mode: 'prose', sourceFor: () => `${x.psalm[0]} · ${x.name}`, position: x.label,
  });

  return (
    <View style={{ flex: 1, gap: 10 }}>
      <Panel accent style={st.hero} onPress={() => setPraying(cur)} label={`Pray ${cur.name} now`}>
        <View style={st.rose} pointerEvents="none"><SacredSymbol sym={rose} size={260} /></View>
        <Small>Now · {now}</Small>
        <Text style={st.heroTitle}>{cur.name}</Text>
        <Sub>{cur.sub} · a few minutes of stillness and prayer</Sub>
        <View style={st.pray}><Text style={st.prayText}>{done.includes(cur.id) ? 'Pray again' : `Pray ${cur.name}`}</Text></View>
      </Panel>
      <View style={st.grid}>
        {HOURS.map((x) => {
          const isNow = x.id === cur.id, d = done.includes(x.id);
          return (
            <Panel key={x.id} style={[st.tile, isNow && st.tileNow]} onPress={() => setSheet(x)} label={`${x.name}, ${x.sub}`}>
              <View style={st.tileTop}>
                <Text style={st.time}>{x.label}</Text>
                {d ? <Text style={st.tick}>✓</Text> : isNow ? <View style={st.dot} /> : null}
              </View>
              <Title style={{ fontSize: 22 }} lines={1}>{x.name}</Title>
              <Text style={st.tileSub} numberOfLines={1}>{x.sub}</Text>
            </Panel>
          );
        })}
      </View>
      <Text style={st.verse}>“Seven times a day I have given praise to thee.” Psalm 118:164</Text>

      <Sheet visible={!!sheet} onClose={() => setSheet(null)} eyebrow={sheet ? `${sheet.label} · ${sheet.sub}` : ''} title={sheet?.name}>
        {sheet ? (
          <View style={{ gap: 10 }}>
            <Text style={st.refs}>{sheet.psalm[0]}{sheet.cant ? ` · ${sheet.cant[0]}` : ''}</Text>
            <Pressable onPress={() => { const x = sheet; setSheet(null); setPraying(x); }} style={st.primary}><Text style={st.primaryText}>Pray with guidance</Text></Pressable>
            <Pressable onPress={() => { const x = sheet; setSheet(null); setReading(x); }} style={st.secondary}><Text style={st.secondaryText}>Read the text</Text></Pressable>
            <Pressable onPress={() => { markDone(sheet.id); setSheet(null); }} style={st.secondary}>
              <Text style={st.secondaryText}>{done.includes(sheet.id) ? 'Prayed today ✓' : 'Mark as prayed'}</Text>
            </Pressable>
            <Text style={st.fine}>A short form of the Hour for this preview. The full app will follow the day's psalter.</Text>
          </View>
        ) : null}
      </Sheet>

      {praying ? (
        <PrayerSession visible title={praying.name} subtitle={praying.sub} lines={linesFor(praying)}
          onFinish={() => markDone(praying.id)} onClose={() => setPraying(null)} />
      ) : null}
      {reading ? (
        <Reader chapter={chapterFor(reading)} loading={false} onClose={() => setReading(null)}
          finish={{ label: done.includes(reading.id) ? 'Done' : 'Mark as prayed', onPress: () => { markDone(reading.id); setReading(null); } }} />
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  hero: { flex: 1, minHeight: 200, justifyContent: 'flex-end', padding: 20 },
  rose: { position: 'absolute', right: -60, top: -40, opacity: 0.16 },
  heroTitle: { fontFamily: F.display, fontSize: 52, lineHeight: 56, color: C.ink, marginTop: 2 },
  pray: { alignSelf: 'flex-start', marginTop: 16, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 11 },
  prayText: { fontFamily: F.sc, fontSize: 14, color: C.deep },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31.5%', flexGrow: 1, padding: 12, minHeight: 84 },
  tileNow: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(196,168,112,0.7)' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontFamily: F.sc, fontSize: 10.5, color: C.inkFaint, letterSpacing: 0.6 },
  tick: { fontFamily: F.sc, fontSize: 12, color: C.green },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold },
  tileSub: { fontFamily: F.ui, fontSize: 11, color: C.inkSoft, marginTop: 1 },
  verse: { fontFamily: F.bodyItalic, fontSize: 12, color: C.inkFaint, textAlign: 'center', marginTop: 2 },
  refs: { fontFamily: F.bodyItalic, fontSize: 14, color: C.inkSoft },
  primary: { backgroundColor: C.ink, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  primaryText: { fontFamily: F.sc, fontSize: 14, color: C.deep },
  secondary: { borderWidth: 1, borderColor: C.vellum3, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { fontFamily: F.sc, fontSize: 14, color: C.ink },
  fine: { fontFamily: F.bodyItalic, fontSize: 12, color: C.inkFaint, textAlign: 'center', marginTop: 4 },
});
