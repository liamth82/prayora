import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { F } from '../theme';
import { BREATH_IN, BREATH_OUT, blessing, HEART_BPM, Line, REST, SETTLE } from '../prayerScript';

// Optional native modules: present from the next app build onwards; the experience works without them.
let Speech: any = null;
let KeepAwake: any = null;
try { Speech = require('expo-speech'); } catch { Speech = null; }
try { KeepAwake = require('expo-keep-awake'); } catch { KeepAwake = null; }

export type PrayerLine = Line & { label?: string };
type Phase = 'intro' | 'settle' | 'prayer' | 'rest' | 'end';

const FADE = 1300;

export function secsFor(text: string) {
  const words = text.split(/\s+/).length;
  return Math.max(4.5, Math.min(16, 2.5 + words * 0.55));
}

/** Split a block of prayer text into lines that can be shown one at a time. */
export function toLines(text: string, label?: string): PrayerLine[] {
  const parts = text.split(/(?<=[.;:!?])\s+/).map((p) => p.trim()).filter(Boolean);
  const merged: string[] = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last && last.split(/\s+/).length < 6) merged[merged.length - 1] = `${last} ${p}`;
    else merged.push(p);
  }
  return merged.map((t, i) => ({ text: t, secs: secsFor(t), label: i === 0 ? label : undefined }));
}

function Light() {
  const breath = useRef(new Animated.Value(0)).current;
  const beat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const b = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: BREATH_IN * 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: BREATH_OUT * 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const period = 60000 / HEART_BPM;
    const h = Animated.loop(Animated.sequence([
      Animated.timing(beat, { toValue: 1, duration: period * 0.12, useNativeDriver: true }),
      Animated.timing(beat, { toValue: 0.35, duration: period * 0.12, useNativeDriver: true }),
      Animated.timing(beat, { toValue: 0.8, duration: period * 0.1, useNativeDriver: true }),
      Animated.timing(beat, { toValue: 0, duration: period * 0.66, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]));
    b.start(); h.start();
    return () => { b.stop(); h.stop(); };
  }, [breath, beat]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.05] });
  const glow = breath.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] });
  const pulse = beat.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] });
  return (
    <View style={st.lightWrap} pointerEvents="none">
      <View style={{ width: 320, height: 320 }}>
      <Animated.View style={{ transform: [{ scale }], opacity: glow }}>
        <Svg width={320} height={320}>
          <Defs>
            <RadialGradient id="g" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#FFF8E6" stopOpacity="1" />
              <Stop offset="0.18" stopColor="#FFF1D2" stopOpacity="0.7" />
              <Stop offset="0.45" stopColor="#E9D3A0" stopOpacity="0.28" />
              <Stop offset="1" stopColor="#C9A84C" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={160} cy={160} r={160} fill="url(#g)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[st.pulse, { opacity: pulse }]} />
      </View>
    </View>
  );
}

export default function PrayerSession({ visible, title, subtitle, lines, onFinish, onClose, settle, rest, intro, skipIntro }: {
  visible: boolean; title: string; subtitle?: string; lines: PrayerLine[];
  onFinish: () => void; onClose: () => void;
  settle?: PrayerLine[]; rest?: PrayerLine[]; intro?: string; skipIntro?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(skipIntro ? 'settle' : 'intro');
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [aloud, setAloud] = useState(false);
  const op = useRef(new Animated.Value(0)).current;
  const run = useRef(0);

  const script: Record<Exclude<Phase, 'intro' | 'end'>, PrayerLine[]> = {
    settle: settle ?? SETTLE,
    prayer: lines,
    rest: rest ?? [...REST, { text: blessing(), secs: 7 }],
  };

  useEffect(() => {
    if (!visible) { setPhase(skipIntro ? 'settle' : 'intro'); setIdx(0); setPaused(false); }
  }, [visible]);

  useEffect(() => {
    if (!visible || phase === 'intro') return;
    try { KeepAwake?.activateKeepAwakeAsync?.('prayer'); } catch {}
    return () => { try { KeepAwake?.deactivateKeepAwake?.('prayer'); } catch {} };
  }, [visible, phase]);

  const stopSpeech = () => { try { Speech?.stop(); } catch {} };

  // Play the current line: fade in, hold (or speak), fade out, advance.
  useEffect(() => {
    if (!visible || paused || phase === 'intro' || phase === 'end') return;
    const list = script[phase];
    const line = list[idx];
    const token = ++run.current;
    const alive = () => token === run.current;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const advance = () => {
      if (!alive()) return;
      Animated.timing(op, { toValue: 0, duration: FADE, useNativeDriver: true }).start(() => {
        if (!alive()) return;
        if (idx + 1 < list.length) setIdx(idx + 1);
        else if (phase === 'settle') { setPhase('prayer'); setIdx(0); }
        else if (phase === 'prayer') { setPhase('rest'); setIdx(0); }
        else { setPhase('end'); onFinish(); setTimeout(onClose, 600); }
      });
    };

    op.setValue(0);
    Animated.timing(op, { toValue: 1, duration: FADE, useNativeDriver: true }).start();
    if (aloud && Speech) {
      const rate = phase === 'prayer' ? 0.82 : 0.72;
      try {
        Speech.speak(line.text, { rate, pitch: 0.95, language: 'en-GB',
          onDone: () => { timer = setTimeout(advance, phase === 'prayer' ? 900 : 1600); },
          onError: () => { timer = setTimeout(advance, line.secs * 1000 - FADE); } });
      } catch { timer = setTimeout(advance, line.secs * 1000 - FADE); }
    } else {
      timer = setTimeout(advance, Math.max(1500, line.secs * 1000 - FADE));
    }
    return () => { run.current++; if (timer) clearTimeout(timer); stopSpeech(); };
  }, [visible, phase, idx, paused, aloud]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { run.current++; stopSpeech(); onClose(); };
  const current = phase !== 'intro' && phase !== 'end' ? script[phase][idx] : null;
  const progress = phase === 'settle' ? 'Settling' : phase === 'prayer' ? title : phase === 'rest' ? 'Resting' : '';

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <StatusBar style="light" />
      <View style={st.root}>
        <Light />
        {phase === 'intro' ? (
          <View style={st.intro}>
            <Text style={st.introEyebrow}>{subtitle?.toUpperCase()}</Text>
            <Text style={st.introTitle}>{title}</Text>
            <Text style={st.introText}>{intro ?? 'Find a quiet place. The prayer begins with a minute of stillness, then the words of the Hour, then a moment of rest.'}</Text>
            {Speech ? (
              <Pressable onPress={() => setAloud(!aloud)} style={st.toggle} accessibilityRole="switch" accessibilityState={{ checked: aloud }}>
                <View style={[st.box, aloud && st.boxOn]}>{aloud ? <Text style={st.tick}>✓</Text> : null}</View>
                <Text style={st.toggleText}>Read the words aloud</Text>
              </Pressable>
            ) : (
              <Text style={st.note}>Reading aloud arrives with the next version of the app.</Text>
            )}
            <Pressable onPress={() => { setPhase('settle'); setIdx(0); }} style={st.begin} accessibilityRole="button">
              <Text style={st.beginText}>Begin</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={st.stage} onPress={() => setPaused(!paused)} accessibilityLabel={paused ? 'Resume' : 'Pause'}>
            {current ? (
              <Animated.View style={{ opacity: op, alignItems: 'center' }}>
                {current.label ? <Text style={st.label}>{current.label.toUpperCase()}</Text> : null}
                <Text style={[st.line, phase === 'prayer' ? st.prayerLine : st.guideLine]}>{current.text}</Text>
              </Animated.View>
            ) : null}
          </Pressable>
        )}
        <View style={st.footer} pointerEvents="box-none">
          <Text style={st.phase}>{paused ? 'PAUSED · TAP TO CONTINUE' : progress.toUpperCase()}</Text>
          <Pressable onPress={close} hitSlop={14} accessibilityRole="button" accessibilityLabel="End prayer"><Text style={st.close}>End</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07060A' },
  lightWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-start', paddingTop: '14%' },
  pulse: { position: 'absolute', top: 115, left: 115, width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF6DC' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 30, paddingBottom: 150 },
  label: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 2.4, color: '#A8946C', marginBottom: 14, textAlign: 'center' },
  line: { textAlign: 'center', color: '#F7EFDC', textShadowColor: 'rgba(0,0,0,0.85)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  guideLine: { fontFamily: F.displayItalic, fontSize: 28, lineHeight: 37 },
  prayerLine: { fontFamily: F.display, fontSize: 24, lineHeight: 35, minHeight: 140 },
  intro: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 32, paddingBottom: 110 },
  introEyebrow: { fontFamily: F.sc, fontSize: 13, letterSpacing: 2.4, color: '#C9A84C', textAlign: 'center' },
  introTitle: { fontFamily: F.display, fontSize: 52, color: '#F7EFDC', textAlign: 'center', marginTop: 6 },
  introText: { fontFamily: F.body, fontSize: 16, lineHeight: 25, color: '#CDBF9F', textAlign: 'center', marginTop: 16 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 30 },
  box: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: '#C9A84C', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: '#C9A84C' },
  tick: { color: '#07060A', fontSize: 14, fontWeight: '700' },
  toggleText: { fontFamily: F.body, fontSize: 16, color: '#EDE3CB' },
  note: { fontFamily: F.bodyItalic, fontSize: 13.5, color: '#8E7F63', textAlign: 'center', marginTop: 26 },
  begin: { alignSelf: 'center', marginTop: 30, borderWidth: 1, borderColor: '#C9A84C', borderRadius: 999, paddingHorizontal: 44, paddingVertical: 14 },
  beginText: { fontFamily: F.sc, fontSize: 18, letterSpacing: 2.4, color: '#F7EFDC' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 26 },
  phase: { fontFamily: F.sc, fontSize: 11.5, letterSpacing: 2, color: '#6F6450' },
  close: { fontFamily: F.sc, fontSize: 14, letterSpacing: 1.6, color: '#A8946C' },
});
