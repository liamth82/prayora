import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BOOKS } from '../content';
import { load, save } from '../storage';
import { C, F } from '../theme';
import { Back, Eyebrow, H2, H3, Illumination, Lede, Rule } from '../components/ui';

export default function Scripture({ scrollTop }: { scrollTop: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => { load<string | null>('lastBook', null).then(setLast); }, []);

  const go = (id: string | null) => {
    setOpen(id);
    if (id) { setLast(id); save('lastBook', id); }
    scrollTop();
  };

  if (open) {
    const b = BOOKS.find((x) => x.id === open)!;
    return (
      <View>
        <Back label="All books" onPress={() => go(null)} />
        <Eyebrow>{b.ref}</Eyebrow>
        <H2>{b.note}</H2>
        <Rule />
        <View style={st.reader}>
          <Illumination book={b} width={96} />
          <View style={{ flex: 1 }}>
            {b.verses.map(([n, t], i) => (
              <Text key={n} style={st.verse}>
                <Text style={st.vn}>{n} </Text>
                {i === 0 ? <Text style={st.firstLetter}>{t[0]}</Text> : null}
                {i === 0 ? t.slice(1) : t}
              </Text>
            ))}
            <Text style={st.src}>Douay-Rheims, Challoner revision. Public domain.</Text>
          </View>
        </View>
      </View>
    );
  }

  const lb = BOOKS.find((x) => x.id === last);
  return (
    <View>
      <Eyebrow>Sacred Scripture</Eyebrow>
      <H2>Take up and read</H2>
      <Lede>
        {lb ? <Text>You were last in <Text style={{ fontFamily: F.bodyItalic }}>{lb.name}</Text>. </Text> : null}
        Five passages in this preview. The full app carries all seventy-three books.
      </Lede>
      <View style={{ gap: 12 }}>
        {BOOKS.map((b) => (
          <Pressable key={b.id} onPress={() => go(b.id)} style={({ pressed }) => [st.book, pressed && { backgroundColor: C.vellum2 }]}>
            <Illumination book={b} width={60} />
            <View style={{ flex: 1 }}>
              <Text style={st.ref}>{b.ref}</Text>
              <H3>{b.name}</H3>
              <Text style={st.note}>{b.note}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  book: { flexDirection: 'row', gap: 14, alignItems: 'center', borderWidth: 1, borderColor: C.vellum3, borderRadius: 4, padding: 10 },
  ref: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 1, color: C.rubric },
  note: { fontFamily: F.body, fontSize: 13, color: C.inkSoft },
  reader: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  verse: { fontFamily: F.body, fontSize: 17, lineHeight: 29, color: C.ink, marginBottom: 10 },
  vn: { fontFamily: F.sc, fontSize: 12, color: C.rubric },
  firstLetter: { fontFamily: F.display, fontSize: 26, color: C.rubric },
  src: { fontFamily: F.bodyItalic, fontSize: 12, color: C.inkFaint, marginTop: 8 },
});
