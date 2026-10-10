import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { F } from '../theme';
import PrayerSession from './PrayerSession';
import { addEntry, clearLog, loadLog, Meditation, MEDITATIONS, REST_SHORT, RefugeEntry, SETTLE_SHORT, TRIGGERS, updateLast } from '../refuge';

type Step = 'home' | 'triggers' | 'choose' | 'after' | 'struggling' | 'thanks' | 'record';

const INK = '#EEE7DA', DIM = '#B4A890', FAINT = '#6E6876', GOLD = '#C4A870', BG = '#111015';

export default function Refuge({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>('home');
  const [picked, setPicked] = useState<string[]>([]);
  const [med, setMed] = useState<Meditation | null>(null);
  const [log, setLog] = useState<RefugeEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => { if (visible) { setStep('home'); setPicked([]); setMed(null); loadLog().then(setLog); } }, [visible]);

  const begin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setLog(await addEntry({ t: new Date().toISOString(), triggers: [] }));
    setStep('triggers');
  };
  const toTriggers = async (skip: boolean) => {
    if (!skip && picked.length) setLog(await updateLast({ triggers: picked }));
    setStep('choose');
  };
  const choose = async (m: Meditation) => { setMed(m); setLog(await updateLast({ med: m.id })); };
  const outcome = async (o: 'passed' | 'struggling') => {
    setLog(await updateLast({ outcome: o }));
    setStep(o === 'passed' ? 'thanks' : 'struggling');
  };
  const toggle = (t: string) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" />
      <View style={st.root}>
        <View style={st.top}>
          {step !== 'home' && step !== 'thanks' ? (
            <Pressable onPress={() => setStep('home')} hitSlop={12}><Text style={st.link}>‹ Refuge</Text></Pressable>
          ) : <View />}
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close"><Text style={st.link}>Close</Text></Pressable>
        </View>

        <ScrollView contentContainerStyle={st.body}>
          {step === 'home' ? (
            <View style={{ gap: 14 }}>
              <Text style={st.eyebrow}>WHEN TEMPTATION COMES</Text>
              <Text style={st.title}>Refuge</Text>
              <Text style={st.quote}>“Our God is our refuge and strength: a helper in troubles.”</Text>
              <Text style={st.cite}>PSALM 45:2</Text>
              <Text style={st.text}>If you are being tempted, you did the right thing by coming here. You won't be asked what it is. Take five minutes with God, and let it pass.</Text>
              <Pressable onPress={begin} style={st.primary} accessibilityRole="button"><Text style={st.primaryText}>I am tempted now</Text></Pressable>
              <Pressable onPress={() => setStep('record')} style={st.secondary}><Text style={st.secondaryText}>Your record</Text></Pressable>
              <Text style={st.fine}>Everything here is kept only on this phone.</Text>
            </View>
          ) : null}

          {step === 'triggers' ? (
            <View style={{ gap: 14 }}>
              <Text style={st.eyebrow}>ONLY IF YOU WISH</Text>
              <Text style={st.h2}>Can you see what stirred it?</Text>
              <Text style={st.text}>Naming what leads you there helps you see it coming next time. Choose any that fit, or none. No details are asked or kept.</Text>
              <View style={st.chips}>
                {TRIGGERS.map((t) => {
                  const on = picked.includes(t);
                  return (
                    <Pressable key={t} onPress={() => toggle(t)} style={[st.chip, on && st.chipOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                      <Text style={[st.chipText, on && { color: BG }]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable onPress={() => toTriggers(false)} style={st.primary}><Text style={st.primaryText}>{picked.length ? 'Continue' : 'Continue without'}</Text></Pressable>
              <Pressable onPress={() => toTriggers(true)} style={{ alignSelf: 'center', padding: 8 }}><Text style={st.link}>Skip</Text></Pressable>
            </View>
          ) : null}

          {step === 'choose' ? (
            <View style={{ gap: 12 }}>
              <Text style={st.eyebrow}>FIVE MINUTES WITH GOD</Text>
              <Text style={st.h2}>Choose where to turn</Text>
              {MEDITATIONS.map((m) => (
                <Pressable key={m.id} onPress={() => choose(m)} style={({ pressed }) => [st.card, pressed && { borderColor: GOLD }]}>
                  <Text style={st.cardTitle}>{m.title}</Text>
                  <Text style={st.cardSub}>{m.sub}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => choose(MEDITATIONS[Math.floor(Math.random() * MEDITATIONS.length)])} style={{ alignSelf: 'center', padding: 8 }}>
                <Text style={st.link}>Choose for me</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'after' ? (
            <View style={{ gap: 14 }}>
              <Text style={st.eyebrow}>{med?.title.toUpperCase()}</Text>
              <Text style={st.h2}>Has it passed?</Text>
              <Pressable onPress={() => outcome('passed')} style={st.primary}><Text style={st.primaryText}>It has passed, thanks be to God</Text></Pressable>
              <Pressable onPress={() => outcome('struggling')} style={st.secondary}><Text style={st.secondaryText}>I am still struggling</Text></Pressable>
              <Pressable onPress={onClose} style={{ alignSelf: 'center', padding: 8 }}><Text style={st.link}>Leave it there</Text></Pressable>
            </View>
          ) : null}

          {step === 'struggling' ? (
            <View style={{ gap: 14 }}>
              <Text style={st.eyebrow}>DO NOT BE DISCOURAGED</Text>
              <Text style={st.h2}>Stay with Him a little longer</Text>
              <Text style={st.text}>Struggling is not failing. The saints were tempted all their lives. Each time you turn back to God, you are already winning.</Text>
              <Pressable onPress={() => setStep('choose')} style={st.primary}><Text style={st.primaryText}>Another five minutes</Text></Pressable>
              <View style={st.tips}>
                <Text style={st.tip}>Go where there are other people, or call someone you trust.</Text>
                <Text style={st.tip}>Put your phone in another room for an hour.</Text>
                <Text style={st.tip}>Do something physical: walk, tidy, cook, pray a decade aloud.</Text>
                <Text style={st.tip}>If you fall, do not despair. Make an act of contrition, and go to confession soon. Mercy is waiting.</Text>
              </View>
            </View>
          ) : null}

          {step === 'thanks' ? (
            <View style={{ gap: 14, alignItems: 'center', paddingTop: 40 }}>
              <Text style={[st.title, { textAlign: 'center' }]}>Deo gratias</Text>
              <Text style={[st.text, { textAlign: 'center' }]}>You turned to God and He held you. Remember this the next time it comes.</Text>
              <Text style={[st.quote, { textAlign: 'center' }]}>“My grace is sufficient for thee: for power is made perfect in infirmity.”</Text>
              <Text style={st.cite}>2 CORINTHIANS 12:9</Text>
              <Pressable onPress={onClose} style={[st.secondary, { alignSelf: 'stretch' }]}><Text style={st.secondaryText}>Return to Ora</Text></Pressable>
            </View>
          ) : null}

          {step === 'record' ? <Record log={log} confirmClear={confirmClear} setConfirmClear={setConfirmClear} onClear={async () => { await clearLog(); setLog([]); setConfirmClear(false); }} /> : null}
        </ScrollView>

        {med ? (
          <PrayerSession visible skipIntro title={med.title} subtitle="Refuge" lines={med.lines} settle={SETTLE_SHORT} rest={REST_SHORT}
            onFinish={() => setStep('after')} onClose={() => { setMed(null); setStep((s) => (s === 'choose' ? 'after' : s)); }} />
        ) : null}
      </View>
    </Modal>
  );
}

function Record({ log, confirmClear, setConfirmClear, onClear }: { log: RefugeEntry[]; confirmClear: boolean; setConfirmClear: (b: boolean) => void; onClear: () => void }) {
  const now = new Date();
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 13 + i); return d; });
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const perDay = days.map((d) => log.filter((e) => sameDay(new Date(e.t), d)).length);
  const max = Math.max(1, ...perDay);
  const week = log.filter((e) => now.getTime() - new Date(e.t).getTime() < 7 * 86400000);
  const passed = log.filter((e) => e.outcome === 'passed').length;
  const parts: [string, (h: number) => boolean][] = [
    ['Morning', (h) => h >= 5 && h < 12], ['Afternoon', (h) => h >= 12 && h < 17], ['Evening', (h) => h >= 17 && h < 22], ['Night', (h) => h >= 22 || h < 5],
  ];
  const partCounts = parts.map(([n, f]) => [n, log.filter((e) => f(new Date(e.t).getHours())).length] as [string, number]);
  const pmax = Math.max(1, ...partCounts.map((p) => p[1]));
  const trig: Record<string, number> = {};
  log.forEach((e) => e.triggers.forEach((t) => { trig[t] = (trig[t] ?? 0) + 1; }));
  const topTrig = Object.entries(trig).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <View style={{ gap: 16 }}>
      <Text style={st.eyebrow}>YOUR RECORD</Text>
      <Text style={st.h2}>Times you turned to God</Text>
      <View style={st.stats}>
        <View style={st.stat}><Text style={st.statN}>{week.length}</Text><Text style={st.statL}>this week</Text></View>
        <View style={st.stat}><Text style={st.statN}>{log.length}</Text><Text style={st.statL}>in all</Text></View>
        <View style={st.stat}><Text style={st.statN}>{passed}</Text><Text style={st.statL}>passed</Text></View>
      </View>

      <Text style={st.small}>LAST TWO WEEKS</Text>
      <View style={st.bars}>
        {perDay.map((n, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{ height: 50, justifyContent: 'flex-end' }}>
              <View style={{ width: 8, height: n ? 6 + (44 * n) / max : 2, backgroundColor: n ? GOLD : '#26222B', borderRadius: 2 }} />
            </View>
            <Text style={st.barL}>{days[i].toLocaleDateString('en-GB', { weekday: 'narrow' })}</Text>
          </View>
        ))}
      </View>

      <Text style={st.small}>TIME OF DAY</Text>
      {partCounts.map(([n, c]) => (
        <View key={n} style={st.row}>
          <Text style={st.rowL}>{n}</Text>
          <View style={st.track}><View style={[st.fill, { width: `${(100 * c) / pmax}%` }]} /></View>
          <Text style={st.rowN}>{c}</Text>
        </View>
      ))}

      {topTrig.length ? (
        <>
          <Text style={st.small}>WHAT YOU NOTICED</Text>
          {topTrig.map(([t, c]) => (
            <View key={t} style={st.row}><Text style={st.rowL}>{t}</Text><Text style={st.rowN}>{c}</Text></View>
          ))}
          <Text style={st.fine}>Knowing these helps. If tiredness or loneliness come up often, plan for them: an earlier night, a friend to call, the phone left in another room.</Text>
        </>
      ) : null}

      {log.length ? (
        confirmClear ? (
          <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
            <Text style={st.fine}>Clear your whole record?</Text>
            <Pressable onPress={onClear}><Text style={[st.link, { color: '#C98B7C' }]}>Clear</Text></Pressable>
            <Pressable onPress={() => setConfirmClear(false)}><Text style={st.link}>Keep</Text></Pressable>
          </View>
        ) : <Pressable onPress={() => setConfirmClear(true)}><Text style={st.link}>Clear record</Text></Pressable>
      ) : <Text style={st.fine}>Nothing recorded yet.</Text>}
      <Text style={st.fine}>Kept only on this phone. Never shared, never sent anywhere.</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 52, paddingBottom: 8 },
  body: { paddingHorizontal: 26, paddingTop: 20, paddingBottom: 60 },
  link: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1.4, color: DIM },
  eyebrow: { fontFamily: F.sc, fontSize: 10.5, letterSpacing: 2.2, color: GOLD },
  title: { fontFamily: F.display, fontSize: 55, color: INK },
  h2: { fontFamily: F.display, fontSize: 33, lineHeight: 39, color: INK },
  quote: { fontFamily: F.displayItalic, fontSize: 23, lineHeight: 31.5, color: INK },
  cite: { fontFamily: F.sc, fontSize: 10, letterSpacing: 1.6, color: DIM, marginTop: -8 },
  text: { fontFamily: F.body, fontSize: 16, lineHeight: 25, color: '#CFC7B9' },
  fine: { fontFamily: F.bodyItalic, fontSize: 13, lineHeight: 19, color: FAINT },
  primary: { borderWidth: 1, borderColor: GOLD, backgroundColor: '#221D27', borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  primaryText: { fontFamily: F.sc, fontSize: 14.5, letterSpacing: 0.4, color: INK },
  secondary: { borderWidth: 1, borderColor: '#36313D', borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { fontFamily: F.sc, fontSize: 13, letterSpacing: 0.4, color: DIM },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#3D3744', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: INK, borderColor: INK },
  chipText: { fontFamily: F.body, fontSize: 14.5, color: INK },
  card: { borderWidth: 1, borderColor: '#2C2731', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#1A171F' },
  cardTitle: { fontFamily: F.display, fontSize: 25.5, color: INK },
  cardSub: { fontFamily: F.bodyItalic, fontSize: 14, color: DIM, marginTop: 2 },
  tips: { gap: 10, marginTop: 8, borderLeftWidth: 2, borderColor: GOLD, paddingLeft: 14 },
  tip: { fontFamily: F.body, fontSize: 15, lineHeight: 23, color: '#CFC7B9' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderWidth: 1, borderColor: '#2C2731', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statN: { fontFamily: F.bodyMedium, fontSize: 30, color: INK, fontVariant: ['tabular-nums'] },
  statL: { fontFamily: F.sc, fontSize: 10, letterSpacing: 1.2, color: DIM },
  small: { fontFamily: F.sc, fontSize: 10, letterSpacing: 1.8, color: DIM, marginTop: 6 },
  bars: { flexDirection: 'row', alignItems: 'flex-end' },
  barL: { fontFamily: F.sc, fontSize: 9, color: FAINT },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowL: { width: 120, fontFamily: F.body, fontSize: 14.5, color: '#CFC7B9' },
  rowN: { fontFamily: F.body, fontSize: 14, color: DIM, minWidth: 20, textAlign: 'right', marginLeft: 'auto' },
  track: { flex: 1, height: 6, backgroundColor: '#26222B', borderRadius: 12, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: GOLD },
});
