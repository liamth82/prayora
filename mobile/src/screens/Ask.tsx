import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ANSWERS } from '../content';
import { C, F } from '../theme';
import { Button, Eyebrow, H2, Lede, Proto } from '../components/ui';

type Msg = { q: string; a?: string; c?: string };

export default function Ask() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ask = (q: string, idx?: number) => {
    const hit = idx != null ? ANSWERS[idx] : ANSWERS.find((a) => a.k.test(q));
    setMsgs((m) => [{ q }, ...m]);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setMsgs((m) => {
        const [first, ...rest] = m;
        return [{
          ...first,
          a: hit ? hit.a : 'In the full app this question will be answered from the Catechism, Scripture and the Fathers, with each source cited. This preview has answers for the questions above.',
          c: hit ? hit.c : 'Preview',
        }, ...rest];
      });
    }, 800);
  };

  const submit = () => {
    const q = text.trim();
    if (!q) return;
    ask(q);
    setText('');
  };

  return (
    <View>
      <Eyebrow>Ask</Eyebrow>
      <H2>Seek, and you shall find</H2>
      <Lede>Questions of faith, answered from the Catechism, Scripture and the Fathers, with every source named.</Lede>
      <View style={st.bar}>
        <TextInput
          style={st.input}
          value={text}
          onChangeText={setText}
          placeholder="Ask about the faith…"
          placeholderTextColor={C.inkFaint}
          returnKeyType="send"
          onSubmitEditing={submit}
        />
        <Button label="Ask" onPress={submit} />
      </View>
      <View style={st.chips}>
        {ANSWERS.map((a, i) => (
          <Pressable key={a.q} onPress={() => ask(a.q, i)} style={({ pressed }) => [st.chip, pressed && { backgroundColor: C.vellum2 }]}>
            <Text style={st.chipText}>{a.q}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 14 }}>
        {msgs.map((m, i) => (
          <View key={msgs.length - i} style={{ gap: 10 }}>
            <View style={st.q}><Text style={st.qText}>{m.q}</Text></View>
            <View style={st.a}>
              {m.a ? (
                <>
                  <Text style={st.aText}>{m.a}</Text>
                  <Text style={st.cite}>{m.c}</Text>
                </>
              ) : (
                <Text style={[st.aText, { fontFamily: F.bodyItalic, color: C.inkFaint }]}>Consulting the Catechism…</Text>
              )}
            </View>
          </View>
        ))}
      </View>
      <Proto>Preview: sample answers only. The live version will answer any question, with sources.</Proto>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: C.vellum3, backgroundColor: C.paper, borderRadius: 3, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.body, fontSize: 15, color: C.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: { borderWidth: 1, borderColor: C.gold, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { fontFamily: F.body, fontSize: 13.5, color: C.ink },
  q: { alignSelf: 'flex-end', maxWidth: '90%', backgroundColor: C.ink, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12, borderBottomRightRadius: 2 },
  qText: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.vellum },
  a: { alignSelf: 'flex-start', maxWidth: '95%', borderLeftWidth: 2, borderColor: C.gold, paddingLeft: 12 },
  aText: { fontFamily: F.body, fontSize: 15, lineHeight: 24, color: C.ink },
  cite: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 0.8, color: C.rubric, marginTop: 6 },
});
