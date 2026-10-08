import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { F } from '../theme';
import PrayerSession from './PrayerSession';
import { addGratitude, CAUSES, GratitudeEntry, loadGratitude, removeGratitude, THANKS_LINES, THANKS_REST, THANKS_SETTLE } from '../gratitude';

type Step = 'home' | 'give' | 'done' | 'journal';
const INK = '#F3E9CF', DIM = '#B9A57F', FAINT = '#75684F', GOLD = '#D4B45E', BG = '#0D0A06';

export default function Gratitude({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>('home');
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [praying, setPraying] = useState(false);
  const [log, setLog] = useState<GratitudeEntry[]>([]);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  useEffect(() => { if (visible) { setStep('home'); setPicked([]); setNote(''); loadGratitude().then(setLog); } }, [visible]);

  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const thank = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setLog(await addGratitude({ t: new Date().toISOString(), causes: picked, note: note.trim() || undefined }));
    setPraying(true);
  };

  const week = log.filter((e) => Date.now() - new Date(e.t).getTime() < 7 * 86400000).length;
  const counts: Record<string, number> = {};
  log.forEach((e) => e.causes.forEach((c) => { counts[c] = (counts[c] ?? 0) + 1; }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={st.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.top}>
          {step !== 'home' ? <Pressable onPress={() => setStep('home')} hitSlop={12}><Text style={st.link}>‹ Deo gratias</Text></Pressable> : <View />}
          <Pressable onPress={onClose} hitSlop={12}><Text style={st.link}>Close</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
          {step === 'home' ? (
            <View style={{ gap: 14 }}>
              <Text style={st.eyebrow}>A MOMENT OF GRATITUDE</Text>
              <Text style={st.title}>Deo gratias</Text>
              <Text style={st.quote}>“In all things give thanks for this is the will of God in Christ Jesus concerning you all.”</Text>
              <Text style={st.cite}>1 THESSALONIANS 5:18</Text>
              <Text style={st.text}>When something good happens, large or small, stop and give thanks. Ora will remember it for you.</Text>
              <Pressable onPress={() => setStep('give')} style={st.primary}><Text style={st.primaryText}>Give thanks now</Text></Pressable>
              <Pressable onPress={() => setStep('journal')} style={st.secondary}><Text style={st.secondaryText}>Your gratitude{log.length ? ` · ${log.length}` : ''}</Text></Pressable>
              <Text style={st.fine}>Kept only on this phone.</Text>
            </View>
          ) : null}

          {step === 'give' ? (
            <View style={{ gap: 14 }}>
              <Text style={st.eyebrow}>WHAT BROUGHT IT ON?</Text>
              <Text style={st.h2}>What are you thankful for?</Text>
              <View style={st.chips}>
                {CAUSES.map((c) => {
                  const on = picked.includes(c);
                  return (
                    <Pressable key={c} onPress={() => toggle(c)} style={[st.chip, on && st.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                      <Text style={[st.chipText, on && { color: BG }]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput value={note} onChangeText={setNote} placeholder="A few words to remember it by (optional)" placeholderTextColor={FAINT}
                style={st.input} multiline maxLength={240} />
              <Pressable onPress={thank} style={st.primary}><Text style={st.primaryText}>Thank God</Text></Pressable>
            </View>
          ) : null}

          {step === 'done' ? (
            <View style={{ gap: 14, alignItems: 'center', paddingTop: 40 }}>
              <Text style={[st.title, { textAlign: 'center' }]}>Remembered</Text>
              <Text style={[st.text, { textAlign: 'center' }]}>{week === 1 ? 'Your first thanksgiving this week.' : `${week} thanksgivings this week.`} Look back on them when the days are hard.</Text>
              <Pressable onPress={() => setStep('journal')} style={[st.secondary, { alignSelf: 'stretch' }]}><Text style={st.secondaryText}>See your gratitude</Text></Pressable>
              <Pressable onPress={onClose} style={{ padding: 10 }}><Text style={st.link}>Return to Ora</Text></Pressable>
            </View>
          ) : null}

          {step === 'journal' ? (
            <View style={{ gap: 14 }}>
              <Text style={st.eyebrow}>YOUR GRATITUDE</Text>
              <Text style={st.h2}>{log.length ? `${log.length} ${log.length === 1 ? 'gift' : 'gifts'} remembered` : 'Nothing remembered yet'}</Text>
              {top.length ? (
                <View style={st.chips}>
                  {top.map(([c, n]) => <View key={c} style={st.tag}><Text style={st.tagText}>{c} · {n}</Text></View>)}
                </View>
              ) : null}
              {[...log].reverse().map((e) => {
                const d = new Date(e.t);
                return (
                  <Pressable key={e.t} onLongPress={() => setConfirmDel(e.t)} style={st.entry}>
                    <Text style={st.date}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })} · {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>
                    {e.note ? <Text style={st.note}>{e.note}</Text> : null}
                    {e.causes.length ? <Text style={st.causes}>{e.causes.join(' · ')}</Text> : null}
                    {!e.note && !e.causes.length ? <Text style={st.causes}>Thanks be to God</Text> : null}
                    {confirmDel === e.t ? (
                      <View style={{ flexDirection: 'row', gap: 18, marginTop: 8 }}>
                        <Pressable onPress={async () => { setLog(await removeGratitude(e.t)); setConfirmDel(null); }}><Text style={[st.link, { color: '#C46A5A' }]}>Remove</Text></Pressable>
                        <Pressable onPress={() => setConfirmDel(null)}><Text style={st.link}>Keep</Text></Pressable>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
              {log.length ? <Text style={st.fine}>Press and hold an entry to remove it.</Text> : null}
            </View>
          ) : null}
        </ScrollView>
        {praying ? (
          <PrayerSession visible skipIntro title="Deo gratias" subtitle="Thanksgiving" lines={THANKS_LINES} settle={THANKS_SETTLE} rest={THANKS_REST}
            onFinish={() => {}} onClose={() => { setPraying(false); setStep('done'); }} />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 52, paddingBottom: 8 },
  body: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 60 },
  link: { fontFamily: F.sc, fontSize: 14, letterSpacing: 1.4, color: DIM },
  eyebrow: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 2.2, color: GOLD },
  title: { fontFamily: F.display, fontSize: 48, color: INK },
  h2: { fontFamily: F.display, fontSize: 30, lineHeight: 36, color: INK },
  quote: { fontFamily: F.displayItalic, fontSize: 21, lineHeight: 29, color: INK },
  cite: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1.6, color: DIM, marginTop: -8 },
  text: { fontFamily: F.body, fontSize: 16, lineHeight: 25, color: '#D6C7A2' },
  fine: { fontFamily: F.bodyItalic, fontSize: 13, color: FAINT },
  primary: { borderWidth: 1, borderColor: GOLD, backgroundColor: '#2A200C', borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  primaryText: { fontFamily: F.sc, fontSize: 17, letterSpacing: 1.6, color: INK },
  secondary: { borderWidth: 1, borderColor: '#4A3E26', borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { fontFamily: F.sc, fontSize: 15, letterSpacing: 1.4, color: DIM },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#5A4B2E', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { fontFamily: F.body, fontSize: 14.5, color: INK },
  input: { borderWidth: 1, borderColor: '#4A3E26', borderRadius: 6, padding: 12, minHeight: 70, fontFamily: F.body, fontSize: 15.5, color: INK, textAlignVertical: 'top' },
  tag: { borderWidth: 1, borderColor: '#4A3E26', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontFamily: F.body, fontSize: 13, color: DIM },
  entry: { borderLeftWidth: 2, borderColor: GOLD, paddingLeft: 14, paddingVertical: 4 },
  date: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1.2, color: DIM },
  note: { fontFamily: F.displayItalic, fontSize: 19, lineHeight: 26, color: INK, marginTop: 4 },
  causes: { fontFamily: F.body, fontSize: 14, color: '#D6C7A2', marginTop: 3 },
});
