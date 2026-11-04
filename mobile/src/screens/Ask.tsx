import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, F } from '../theme';
import { useKeepable } from '../keep';
import { useSettings } from '../settings';
import { BASE, getDay, isoDate } from '../today';
import { Panel, Sheet, Small, Sub, Title } from '../components/panels';
import { chapterFor } from '../chapters';
import { load, save, todayKey } from '../storage';
import Reader, { ReaderChapter } from './Reader';

type Source = { n: number; kind: 'bible' | 'library' | 'saint'; book: string; chapter: number; unit?: number; count?: number; ref: string; text: string };
type Msg = { role: 'user' | 'assistant'; content: string; sources?: Source[]; error?: boolean; retry?: string; rated?: 'up' | 'down' };

const DAILY = 20; // questions a day; the server holds the same line
const LIMIT_MSG = `You've asked ${DAILY} questions today, which is Ask's daily limit. It opens again tomorrow. In the meantime, the readings and the Library are always there.`;

/** An anonymous id for this install, used only to share out Ask's daily allowance fairly. */
async function deviceId() {
  let id = await load<string>('ask:device', '');
  if (!id) {
    id = Array.from({ length: 24 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
    save('ask:device', id);
  }
  return id;
}

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
  const [reader, setReader] = useState<{ chapter: ReaderChapter; focus?: { unit: number; count: number } } | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [rating, setRating] = useState<{ i: number; r: 'up' | 'down' } | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const [saintSource, setSaintSource] = useState<Source | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    load<{ day: string; n: number }>('ask:used', { day: '', n: 0 }).then((u) => setLeft(DAILY - (u.day === todayKey() ? u.n : 0)));
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

  const answerY = useRef<Record<number, number>>({});
  const scrollToAnswer = (i: number) => setTimeout(() => {
    const y = answerY.current[i];
    if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    else scroll.current?.scrollToEnd({ animated: true });
  }, 120);

  const ask = async (history: Msg[]) => {
    const body = JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), today, device: await deviceId() });
    let lastErr = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(`${BASE}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.answer) return j as { answer: string; sources: Source[]; left?: number };
        lastErr = j.error || '';
        if (r.status === 400 || r.status === 429) { if (j.limit) setLeft(0); break; }
      } catch { lastErr = ''; }
      await new Promise((res) => setTimeout(res, 1500));
    }
    throw new Error(lastErr || 'Ask could not answer just now. Check your connection and try again.');
  };

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const base = msgs.filter((m) => !m.error);
    const history: Msg[] = [...base, { role: 'user', content: question }];
    const used = await load<{ day: string; n: number }>('ask:used', { day: '', n: 0 });
    const n = used.day === todayKey() ? used.n : 0;
    if (n >= DAILY) {
      setLeft(0); Keyboard.dismiss(); setText('');
      setMsgs([...history, { role: 'assistant', content: LIMIT_MSG, error: true }]);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
      return;
    }
    setMsgs(history);
    setText(''); setBusy(true); Keyboard.dismiss();
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    try {
      const j = await ask(history);
      save('ask:used', { day: todayKey(), n: n + 1 });
      setLeft(Math.min(DAILY - n - 1, typeof j.left === 'number' ? j.left : DAILY));
      setMsgs([...history, { role: 'assistant', content: j.answer, sources: j.sources }]);
      scrollToAnswer(history.length);
    } catch (e: any) {
      setMsgs([...history, { role: 'assistant', content: e?.message || 'Ask could not answer just now.', error: true, retry: question }]);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    } finally {
      setBusy(false);
    }
  };
  const retry = (q: string) => {
    // drop the failed exchange and ask again
    setMsgs((m) => { const k = m.length - 2; return m.slice(0, Math.max(0, k)); });
    setTimeout(() => send(q), 50);
  };

  const openSource = async (s: Source) => {
    if (s.kind === 'saint') { setSaintSource(s); return; }
    const c = await chapterFor(s.kind, s.book, s.chapter);
    if (c) setReader({ chapter: c, focus: s.unit != null ? { unit: s.unit, count: s.count ?? 1 } : undefined });
  };

  const sendFeedback = async () => {
    if (!rating || sending) return;
    const a = msgs[rating.i], q = msgs[rating.i - 1];
    if (!a || !q) return;
    setSending(true); setSendErr('');
    try {
      const r = await fetch(`${BASE}/api/feedback`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating: rating.r, note: note.trim(), question: q.content, answer: a.content, sources: (a.sources ?? []).map((s) => `[${s.n}] ${s.ref}`) }),
      });
      if (!r.ok) throw new Error();
      setMsgs((m) => m.map((x, k) => (k === rating.i ? { ...x, rated: rating.r } : x)));
      setRating(null); setNote('');
    } catch {
      setSendErr("That didn't send. Please try again in a moment.");
    } finally {
      setSending(false);
    }
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
            <Text style={st.fine}>Press and hold any paragraph of an answer to keep it in My Wisdom. Ask is not a priest: for confession, direction or anything weighing heavily on you, please speak to one.</Text>
          </View>
        ) : (
          msgs.map((m, i) => m.role === 'user' ? (
            <View key={i} style={st.q}><Text style={st.qText}>{m.content}</Text></View>
          ) : (
            <View key={i} style={st.a} onLayout={(e) => { answerY.current[i] = e.nativeEvent.layout.y; }}>
              {m.error ? (
                <>
                  <Text style={[st.aText, { color: C.rubric }]}>{m.content}</Text>
                  {m.retry ? <Pressable onPress={() => retry(m.retry!)} hitSlop={8}><Text style={st.retry}>Try again</Text></Pressable> : null}
                </>
              ) : (
                m.content.split(/\n\s*\n/).map((para, k) => {
                  const clean = para.replace(/\s*\[\d+\]/g, '').replace(/\*/g, '').trim();
                  if (!clean) return null;
                  const cited = [...para.matchAll(/\[(\d+)\]/g)].map((x) => m.sources?.find((s) => s.n === Number(x[1]))?.ref.split(' · ')[0]).filter(Boolean);
                  const label = cited.length ? `Ask · ${[...new Set(cited)].join('; ')}` : 'Ask · Ora';
                  return <Text key={k} style={[st.aText, k > 0 && { marginTop: 12 }]} {...kp(clean, label)}>{renderAnswer(para.trim())}</Text>;
                })
              )}
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
              {!m.error ? (
                m.rated ? <Text style={st.thanks}>Thank you for your feedback.</Text> : (
                  <View style={st.rate}>
                    <Text style={st.rateQ}>Was this helpful?</Text>
                    <Pressable onPress={() => { setRating({ i, r: 'up' }); setSendErr(''); }} hitSlop={8} accessibilityLabel="Helpful"><Text style={st.rateBtn}>Yes</Text></Pressable>
                    <Pressable onPress={() => { setRating({ i, r: 'down' }); setSendErr(''); }} hitSlop={8} accessibilityLabel="Not helpful"><Text style={st.rateBtn}>No</Text></Pressable>
                  </View>
                )
              ) : null}
            </View>
          ))
        )}
        {msgs.length && left != null && left <= 5 && left > 0 ? <Text style={st.left}>{left === 1 ? 'One question left today' : `${left} questions left today`}</Text> : null}
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

      {reader ? <Reader chapter={reader.chapter} focus={reader.focus} loading={false} onClose={() => setReader(null)} /> : null}
      <Sheet visible={!!rating} onClose={() => setRating(null)} eyebrow="Ask" title={rating?.r === 'up' ? 'Glad it helped' : 'What was wrong?'}>
        <View style={{ gap: 12 }}>
          <View style={st.segRow}>
            {(['up', 'down'] as const).map((r) => (
              <Pressable key={r} onPress={() => rating && setRating({ ...rating, r })} style={[st.seg, rating?.r === r && st.segOn]}>
                <Text style={[st.segText, rating?.r === r && { color: C.deep }]}>{r === 'up' ? 'Helpful' : 'Not helpful'}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={st.note} value={note} onChangeText={setNote} multiline maxLength={1000} placeholderTextColor={C.inkFaint}
            placeholder={rating?.r === 'up' ? 'Anything to add? (optional)' : 'A wrong source, something unclear, not faithful to Church teaching… (optional)'} />
          <Text style={st.fineLeft}>This sends your question, Ask's answer and your note to the Ora team, without your name or anything that identifies you. Please don't include personal details.</Text>
          {sendErr ? <Text style={[st.fineLeft, { color: C.rubric }]}>{sendErr}</Text> : null}
          <Pressable onPress={sendFeedback} disabled={sending} style={[st.sendFb, sending && { opacity: 0.5 }]}>
            {sending ? <ActivityIndicator color={C.deep} /> : <Text style={st.sendFbText}>Send</Text>}
          </Pressable>
        </View>
      </Sheet>
      <Sheet visible={!!saintSource} onClose={() => setSaintSource(null)} eyebrow="Saints" title={saintSource?.ref.split(' · ')[0]}>
        <Text style={st.aText}>{saintSource?.text}</Text>
      </Sheet>
    </View>
  );
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = (n: string) => n.split('').map((d) => SUP[Number(d)] ?? d).join('');

/** Answer text: citation numbers small and gold, *quotations* in italics, **emphasis** a touch heavier. */
function renderAnswer(t: string) {
  return t.split(/(\[\d+\]|\*\*[^*]+\*\*|\*[^*\n]+\*)/g).filter(Boolean).map((part, i) => {
    if (/^\[\d+\]$/.test(part)) return <Text key={i} style={st.cite}>{'\u2009' + sup(part.slice(1, -1))}</Text>;
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
  aText: { fontFamily: F.body, fontSize: 15.5, lineHeight: 23.5, color: C.ink },
  retry: { fontFamily: F.sc, fontSize: 13, color: C.gold, marginTop: 10 },
  cite: { fontFamily: F.body, color: C.gold },
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
  rate: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  rateQ: { flex: 1, fontFamily: F.bodyItalic, fontSize: 12.5, color: C.inkFaint },
  rateBtn: { fontFamily: F.sc, fontSize: 12, color: C.gold },
  thanks: { fontFamily: F.bodyItalic, fontSize: 12.5, color: C.inkFaint, marginTop: 12 },
  left: { fontFamily: F.bodyItalic, fontSize: 12, color: C.inkFaint, textAlign: 'center' },
  segRow: { flexDirection: 'row', gap: 8 },
  seg: { flex: 1, borderRadius: 999, borderWidth: 1, borderColor: C.vellum3, paddingVertical: 9, alignItems: 'center' },
  segOn: { backgroundColor: C.gold, borderColor: C.gold },
  segText: { fontFamily: F.sc, fontSize: 12.5, color: C.ink },
  note: { minHeight: 90, backgroundColor: C.vellum, borderRadius: 12, padding: 12, fontFamily: F.body, fontSize: 15, color: C.ink, textAlignVertical: 'top' },
  fineLeft: { fontFamily: F.bodyItalic, fontSize: 12, lineHeight: 17, color: C.inkFaint },
  sendFb: { backgroundColor: C.ink, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  sendFbText: { fontFamily: F.sc, fontSize: 13.5, color: C.deep, letterSpacing: 0.4 },
});
