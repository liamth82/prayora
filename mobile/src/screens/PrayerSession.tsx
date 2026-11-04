import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { F } from '../theme';
import { BREATH_IN, BREATH_OUT, blessing, HEART_BPM, Line, REST, SETTLE } from '../prayerScript';
import { beat as beatHand, hapticsAvailable, PrayerSound, soundAvailable } from '../sound';
import { load, save } from '../storage';

// Optional native modules: present from the next app build onwards; the experience works without them.
let Speech: any = null;
let KeepAwake: any = null;
try { Speech = require('expo-speech'); } catch { Speech = null; }
try { KeepAwake = require('expo-keep-awake'); } catch { KeepAwake = null; }

export type PrayerLine = Line & { label?: string; clip?: string; hold?: number };
export type Pulse = 'off' | 'breath' | 'heart';
const PULSES: { id: Pulse; label: string }[] = [{ id: 'off', label: 'Off' }, { id: 'breath', label: 'With the breath' }, { id: 'heart', label: 'Heartbeat' }];
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

function Light({ pulse, active }: { pulse: Pulse; active: boolean }) {
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

  // The pulse in the hand: a soft double beat at each in-breath, or with every heartbeat.
  useEffect(() => {
    if (!active || pulse === 'off') return;
    const every = pulse === 'heart' ? 60000 / HEART_BPM : (BREATH_IN + BREATH_OUT) * 1000;
    beatHand(pulse === 'breath');
    const t = setInterval(() => beatHand(pulse === 'breath'), every);
    return () => clearInterval(t);
  }, [active, pulse]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.05] });
  const glow = breath.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.95] });
  const pulseOp = beat.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.38] });
  const pulseScale = beat.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] });
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
      <Animated.View style={[st.pulse, { opacity: pulseOp, transform: [{ scale: pulseScale }] }]} />
      </View>
    </View>
  );
}

export default function PrayerSession({ visible, title, subtitle, lines, onFinish, onClose, settle, rest, intro, skipIntro, voice, church }: {
  visible: boolean; title: string; subtitle?: string; lines: PrayerLine[];
  onFinish: () => void; onClose: () => void;
  settle?: PrayerLine[]; rest?: PrayerLine[]; intro?: string; skipIntro?: boolean;
  /** Recorded clips for this prayer, by line `clip` id. */
  voice?: Record<string, number>;
  /** Offer the bell and the church sound (the Hours). */
  church?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(skipIntro ? 'settle' : 'intro');
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [aloud, setAloud] = useState(false);
  const [sound, setSound] = useState(true);
  const [pulse, setPulse] = useState<Pulse>('breath');
  const audio = useRef<PrayerSound | null>(null);
  const recorded = !!voice && Object.keys(voice).length > 0;
  const offerSound = soundAvailable && (!!church || recorded);

  useEffect(() => {
    load<boolean>('prayer:sound', true).then(setSound);
    load<Pulse>('prayer:pulse', 'breath').then(setPulse);
    load<boolean>('prayer:aloud', false).then(setAloud);
  }, []);
  const chooseSound = (v: boolean) => { setSound(v); save('prayer:sound', v); };
  const choosePulse = (v: Pulse) => { setPulse(v); save('prayer:pulse', v); };
  const chooseAloud = (v: boolean) => { setAloud(v); save('prayer:aloud', v); };
  const useSound = offerSound && sound;

  // Bell and church: begin with the session, a bell as the prayer ends, fade away at the close.
  useEffect(() => {
    if (!visible || phase === 'intro' || audio.current || !useSound) return;
    const a = new PrayerSound();
    audio.current = a;
    a.start(!!church);
    if (church) a.bell(0.75);
  }, [visible, phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase === 'rest' && church) audio.current?.bell(0.55);
    if (phase === 'end') { audio.current?.stop(); audio.current = null; }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { audio.current?.stop(); audio.current = null; }, []);
  useEffect(() => { if (paused) audio.current?.pause(); else audio.current?.resume(); }, [paused]);
  const op = useRef(new Animated.Value(0)).current;
  const run = useRef(0);

  const script: Record<Exclude<Phase, 'intro' | 'end'>, PrayerLine[]> = {
    settle: settle ?? SETTLE,
    prayer: lines,
    rest: rest ?? [...REST, { text: blessing(), secs: 7 }],
  };

  useEffect(() => {
    if (!visible) { setPhase(skipIntro ? 'settle' : 'intro'); setIdx(0); setPaused(false); audio.current?.stop(); audio.current = null; }
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
    const hold = (line.hold ?? 0) * 1000;
    const clip = useSound && line.clip && voice ? voice[line.clip] : undefined;
    if (clip && audio.current) {
      audio.current.play(clip, () => { if (alive()) timer = setTimeout(advance, hold + (phase === 'prayer' ? 700 : 1300)); });
    } else if (aloud && Speech && !recorded) {
      const rate = phase === 'prayer' ? 0.82 : 0.72;
      try {
        Speech.speak(line.text, { rate, pitch: 0.95, language: 'en-GB',
          onDone: () => { timer = setTimeout(advance, hold + (phase === 'prayer' ? 900 : 1600)); },
          onError: () => { timer = setTimeout(advance, line.secs * 1000 - FADE); } });
      } catch { timer = setTimeout(advance, line.secs * 1000 - FADE); }
    } else {
      timer = setTimeout(advance, Math.max(1500, line.secs * 1000 - FADE));
    }
    return () => { run.current++; if (timer) clearTimeout(timer); stopSpeech(); audio.current?.stopClip(); };
  }, [visible, phase, idx, paused, aloud]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { run.current++; stopSpeech(); audio.current?.stop(); audio.current = null; onClose(); };
  const current = phase !== 'intro' && phase !== 'end' ? script[phase][idx] : null;
  const progress = phase === 'settle' ? 'Settling' : phase === 'prayer' ? title : phase === 'rest' ? 'Resting' : '';

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <StatusBar style="light" />
      <View style={st.root}>
        <Light pulse={hapticsAvailable ? pulse : 'off'} active={visible && phase !== 'intro' && phase !== 'end' && !paused} />
        {phase === 'intro' ? (
          <View style={st.intro}>
            <Text style={st.introEyebrow}>{subtitle?.toUpperCase()}</Text>
            <Text style={st.introTitle}>{title}</Text>
            <Text style={st.introText}>{intro ?? 'Find a quiet place. The prayer begins with a minute of stillness, then the words of the Hour, then a moment of rest.'}</Text>
            {offerSound ? (
              <Toggle on={sound} onPress={() => chooseSound(!sound)} label={recorded ? (church ? 'Voice, bell and church' : 'Spoken guidance') : 'Bell and the sound of a church'} />
            ) : null}
            {Speech && !recorded ? <Toggle on={aloud} onPress={() => chooseAloud(!aloud)} label="Read the words aloud" /> : null}
            {hapticsAvailable ? (
              <View style={st.pulseRow}>
                <Text style={st.pulseLabel}>Pulse in your hand</Text>
                <View style={st.pulseSeg}>
                  {PULSES.map((x) => (
                    <Pressable key={x.id} onPress={() => choosePulse(x.id)} style={[st.seg, pulse === x.id && st.segOn]} accessibilityRole="radio" accessibilityState={{ selected: pulse === x.id }}>
                      <Text style={[st.segText, pulse === x.id && st.segTextOn]}>{x.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {!soundAvailable && (church || recorded) ? <Text style={st.note}>Sound arrives with the next version of the app.</Text> : null}
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

function Toggle({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} style={st.toggle} accessibilityRole="switch" accessibilityState={{ checked: on }}>
      <View style={[st.box, on && st.boxOn]}>{on ? <Text style={st.tick}>✓</Text> : null}</View>
      <Text style={st.toggleText}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111015' },
  lightWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-start', paddingTop: '14%' },
  pulse: { position: 'absolute', top: 115, left: 115, width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF7E6' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 30, paddingBottom: 150 },
  label: { fontFamily: F.sc, fontSize: 10.5, letterSpacing: 2.4, color: '#B4A890', marginBottom: 14, textAlign: 'center' },
  line: { textAlign: 'center', color: '#F3EDE2', textShadowColor: 'rgba(0,0,0,0.85)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  guideLine: { fontFamily: F.displayItalic, fontSize: 31, lineHeight: 40 },
  prayerLine: { fontFamily: F.display, fontSize: 26.5, lineHeight: 38, minHeight: 140 },
  intro: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 32, paddingBottom: 110 },
  introEyebrow: { fontFamily: F.sc, fontSize: 11, letterSpacing: 2.4, color: '#C4A870', textAlign: 'center' },
  introTitle: { fontFamily: F.display, fontSize: 57, color: '#F3EDE2', textAlign: 'center', marginTop: 6 },
  introText: { fontFamily: F.body, fontSize: 16, lineHeight: 25, color: '#CFC7B9', textAlign: 'center', marginTop: 16 },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 18 },
  pulseRow: { alignItems: 'center', marginTop: 22 },
  pulseLabel: { fontFamily: F.sc, fontSize: 10.5, letterSpacing: 2, color: '#B4A890', marginBottom: 10 },
  pulseSeg: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(196,168,112,0.6)', borderRadius: 999, padding: 3 },
  seg: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999 },
  segOn: { backgroundColor: 'rgba(196,168,112,0.22)' },
  segText: { fontFamily: F.body, fontSize: 13.5, color: '#9C94A0' },
  segTextOn: { color: '#F3EDE2' },
  box: { width: 22, height: 22, borderRadius: 12, borderWidth: 1.5, borderColor: '#C4A870', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: '#C4A870' },
  tick: { color: '#111015', fontSize: 14, fontWeight: '700' },
  toggleText: { fontFamily: F.body, fontSize: 16, color: '#E6DFD2' },
  note: { fontFamily: F.bodyItalic, fontSize: 13.5, color: '#8A8290', textAlign: 'center', marginTop: 26 },
  begin: { alignSelf: 'center', marginTop: 28, borderWidth: 1, borderColor: '#C4A870', borderRadius: 999, paddingHorizontal: 44, paddingVertical: 14 },
  beginText: { fontFamily: F.sc, fontSize: 15.5, letterSpacing: 0.4, color: '#F3EDE2' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 26 },
  phase: { fontFamily: F.sc, fontSize: 10, letterSpacing: 2, color: '#6E6876' },
  close: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1.6, color: '#B4A890' },
});
