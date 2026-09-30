import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SAINTS } from '../content';
import { C, F } from '../theme';
import { Dot, Eyebrow, Rule } from '../components/ui';

const keyOf = (d: Date) => String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const labelOf = (k: string, month: 'long' | 'short') => {
  const [m, d] = k.split('-').map(Number);
  return new Date(2026, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month });
};

export default function Saints({ scrollTop }: { scrollTop: () => void }) {
  const today = keyOf(new Date());
  const keys = Object.keys(SAINTS).sort();
  const [pick, setPick] = useState(SAINTS[today] ? today : keys.find((k) => k > today) ?? keys[0]);
  const s = SAINTS[pick];
  const upcoming = [...keys.filter((k) => k >= today), ...keys.filter((k) => k < today)].filter((k) => k !== pick).slice(0, 6);

  return (
    <View>
      <Eyebrow>{pick === today ? 'Today' : labelOf(pick, 'long')} · Saints of the Calendar</Eyebrow>
      <View style={st.feast}>
        <View style={st.inner} pointerEvents="none" />
        <View style={st.rank}><Dot color={s.c} /><Text style={st.rankText}>{s.r}</Text></View>
        <Text style={st.name}>{s.n}</Text>
        {s.d ? <Text style={st.dates}>{s.d}</Text> : null}
        <Text style={st.bio}>{s.b}</Text>
        {s.q ? (
          <View style={{ marginTop: 12 }}>
            <Text style={st.quote}>“{s.q[0]}”</Text>
            <Text style={st.cite}>{s.q[1]}</Text>
          </View>
        ) : null}
      </View>
      <Rule />
      <Eyebrow>Coming days</Eyebrow>
      {upcoming.map((k) => (
        <Pressable key={k} onPress={() => { setPick(k); scrollTop(); }} style={st.row}>
          <Text style={st.d}>{labelOf(k, 'short')}</Text>
          <Text style={st.nm}>{SAINTS[k].n}</Text>
          <Dot color={SAINTS[k].c} />
        </Pressable>
      ))}
      {pick !== today && SAINTS[today] ? (
        <Pressable onPress={() => setPick(today)} style={{ marginTop: 14 }}><Text style={st.back}>‹ Back to today</Text></Pressable>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  feast: { borderWidth: 1, borderColor: C.gold, padding: 18, backgroundColor: 'rgba(255,255,255,0.25)' },
  inner: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderWidth: 1, borderColor: 'rgba(201,168,76,0.45)' },
  rank: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankText: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 1, color: C.inkSoft, flexShrink: 1 },
  name: { fontFamily: F.display, fontSize: 27, lineHeight: 31, color: C.ink, marginTop: 6, marginBottom: 2 },
  dates: { fontFamily: F.bodyItalic, fontSize: 13, color: C.inkSoft, marginBottom: 10 },
  bio: { fontFamily: F.body, fontSize: 15, lineHeight: 23, color: C.ink },
  quote: { fontFamily: F.displayItalic, fontSize: 18, lineHeight: 25, color: C.ink },
  cite: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1, color: C.inkFaint, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderColor: C.vellum3 },
  d: { width: 52, fontFamily: F.sc, fontSize: 13, color: C.inkSoft },
  nm: { flex: 1, fontFamily: F.body, fontSize: 15, color: C.ink },
  back: { fontFamily: F.sc, fontSize: 14, letterSpacing: 1, color: C.inkSoft },
});
