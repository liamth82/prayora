import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, F } from '../theme';
import { useKeepable } from '../keep';
import { useSettings } from '../settings';
import { BASE, getDay, isoDate } from '../today';
import { Panel, Sheet, Small, Sub, Title } from '../components/panels';
import { chapterFor } from '../chapters';
import Reader, { ReaderChapter } from './Reader';

type Source = { n: number; kind: 'bible' | 'library' | 'saint'; book: string; chapter: number; ref: string; text: string };
type Msg = { role: 'user' | 'assistant'; content: string; sources?: Source[]; error?: boolean };

const STARTERS = [
  "Reflect with me on today's Gospel",
  'Is Christ really present in the Eucharist?',
  'How do I pray when God feels far away?',
  'What does Scripture say about anxiety?',
  'Why do Catholics honour Mary?',
  'How can I resist temptation?',
];

/** Ask: questions of faith answered only from Ora's library, every source named and one tap away. */
export default function Ask() {
  const { form } = useSettings();
  const kp = useKeepable();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [today, setToday] = useState<{ date: string; title: string; gospel?: string } | null>(null);
  const [reader, setReader] = useState<ReaderChapter | null>(null);
  const [saintSource, setSaintSource] = useState<Source | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    const d = new Date();
    getDay(form, isoDate(d)).then((day) => {
      if (!day) return;
      setToday({
        date: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        title: day.title,
        gospel: day.form === 'OF' ? day.readings.find((r) => r.key === 'gospel')?.ref : undefined,
      });
    });
  }, [form]);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const history: Msg[] = [...msgs.filter((m) => !m.error), { role: 'user', content: question }];
    setMsgs([...msgs, { role: 'user', content: question }]);
    setText(''); setBusy(true);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    try {
      const r = await fetch(`${BASE}/api/ask`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), today }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.answer) throw new Error(j.error || 'Ask could not answer just now. Please try again in a moment.');
      setMsgs((m) => [...m, { role: 'assistant', content: j.answer, sources: j.sources }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: 'assistant', content: e?.message && !/JSON|token|fetch/i.test(e.message) ? e.message : 'Ask could not answer just now. Check your connection and try again.', error: true }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  const openSource = async (s: Source) => {
    if (s.kind === 'saint') { setSaintSource(s); return; }
    const c = await chapterFor(s.kind, s.book, s.chapter);
    if (c) setReader(c);
  };

  return (
    <View style={{ flex: 1, gap: 10 }}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 6, flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!msgs.length ? (
          <View style={{ flex: 1, gap: 10 }}>
            <Panel accent style={{ paddingVertical: 20 }}>
              <Small>Ask</Small>
              <Title style={{ fontSize: 30, lineHeight: 34 }}>Seek, and you shall find</Title>
              <Sub>Answers from the Scriptures, the saints and the spiritual classics, with every source named. Tap a source to read it in full.</Sub>
            </Panel>
            <View style={st.starters}>
              {STARTERS.map((s) => (
                <Pressable key={s} onPress={() => send(s)} style={({ pressed }) => [st.starter, pressed && { backgroundColor: C.vellum3 }]}>
                  <Text style={st.starterText}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={st.fine}>Ask is not a priest. For confession, direction or anything weighing heavily on you, please speak to one.</Text>
          </View>
        ) : (
          msgs.map((m, i) => m.role === 'user' ? (
            <View key={i} style={st.q}><Text style={st.qText}>{m.content}</Text></View>
          ) : (
            <View key={i} style={st.a}>
              <Text style={[st.aText, m.error && { color: C.rubric }]} {...(m.error ? {} : kp(m.content.replace(/\s*\[\d+\]/g, '').replace(/\*/g, ''), 'Ask · Ora'))}>
                {renderAnswer(m.content)}
              </Text>
              {m.sources?.length ? (
                <View style={{ gap: 6, marginTop: 10 }}>
                  {m.sources.map((s) => (
                    <Pressable key={s.n} onPress={() => openSource(s)} style={({ pressed }) => [st.src, pressed && { backgroundColor: C.vellum3 }]}>
                      <Text style={st.srcN}>{s.n}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={st.srcRef} numberOfLines={1}>{s.ref}</Text>
                        <Text style={st.srcText} numberOfLines={2}>{s.text.replace(/^\d+\s/, '')}</Text>
                      </View>
                      <Text style={st.chev}>›</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        )}
        {busy ? <View style={st.thinking}><ActivityIndicator color={C.gold} /><Text style={st.thinkingText}>Searching the Scriptures and the saints…</Text></View> : null}
      </ScrollView>

      <View style={st.bar}>
        {msgs.length ? (
          <Pressable onPress={() => setMsgs([])} hitSlop={8} style={st.newBtn} accessibilityLabel="New conversation"><Text style={st.newText}>New</Text></Pressable>
        ) : null}
        <TextInput style={st.input} value={text} onChangeText={setText} placeholder="Ask about the faith…" placeholderTextColor={C.inkFaint}
          returnKeyType="send" onSubmitEditing={() => send(text)} editable={!busy} multiline={false} maxLength={600} />
        <Pressable onPress={() => send(text)} disabled={busy || !text.trim()} style={[st.send, (busy || !text.trim()) && { opacity: 0.4 }]} accessibilityLabel="Ask">
          <Text style={st.sendText}>↑</Text>
        </Pressable>
      </View>

      {reader ? <Reader chapter={reader} loading={false} onClose={() => setReader(null)} /> : null}
      <Sheet visible={!!saintSource} onClose={() => setSaintSource(null)} eyebrow="Saints" title={saintSource?.ref.split(' · ')[0]}>
        <Text style={st.aText}>{saintSource?.text}</Text>
      </Sheet>
    </View>
  );
}

/** Answer text: citation numbers small and gold, *quotations* in italics, **emphasis** a touch heavier. */
function renderAnswer(t: string) {
  return t.split(/(\[\d+\]|\*\*[^*]+\*\*|\*[^*\n]+\*)/g).filter(Boolean).map((part, i) => {
    if (/^\[\d+\]$/.test(part)) return <Text key={i} style={st.cite}>{part.slice(1, -1)}</Text>;
    if (/^\*\*.+\*\*$/.test(part)) return <Text key={i} style={{ fontFamily: F.bodyMedium }}>{part.slice(2, -2)}</Text>;
    if (/^\*.+\*$/.test(part)) return <Text key={i} style={{ fontFamily: F.bodyItalic }}>{part.slice(1, -1)}</Text>;
    return <Text key={i}>{part}</Text>;
  });
}

const st = StyleSheet.create({
  starters: { gap: 8 },
  starter: { backgroundColor: C.vellum2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  starterText: { fontFamily: F.body, fontSize: 15, color: C.ink },
  fine: { fontFamily: F.bodyItalic, fontSize: 12, color: C.inkFaint, textAlign: 'center', marginTop: 'auto', paddingHorizontal: 12 },
  q: { alignSelf: 'flex-end', maxWidth: '86%', backgroundColor: C.ink, borderRadius: 18, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  qText: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.deep },
  a: { backgroundColor: C.vellum2, borderRadius: 18, borderBottomLeftRadius: 6, padding: 16 },
  aText: { fontFamily: F.body, fontSize: 16, lineHeight: 25, color: C.ink },
  cite: { fontFamily: F.sc, fontSize: 10.5, color: C.gold },
  src: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.vellum, borderRadius: 12, padding: 10 },
  srcN: { width: 20, height: 20, borderRadius: 10, overflow: 'hidden', textAlign: 'center', lineHeight: 20, fontFamily: F.sc, fontSize: 11, color: C.deep, backgroundColor: C.gold },
  srcRef: { fontFamily: F.sc, fontSize: 12, color: C.ink },
  srcText: { fontFamily: F.bodyItalic, fontSize: 12.5, lineHeight: 17, color: C.inkSoft, marginTop: 1 },
  chev: { fontFamily: F.display, fontSize: 20, color: C.goldDeep },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
  thinkingText: { fontFamily: F.bodyItalic, fontSize: 13.5, color: C.inkSoft },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.vellum2, borderRadius: 999, paddingLeft: 16, paddingRight: 5, paddingVertical: 5 },
  newBtn: { paddingRight: 4 },
  newText: { fontFamily: F.sc, fontSize: 12, color: C.gold },
  input: { flex: 1, fontFamily: F.body, fontSize: 15.5, color: C.ink, paddingVertical: 8 },
  send: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  sendText: { fontSize: 19, color: C.deep, fontWeight: '600', marginTop: -2 },
});
